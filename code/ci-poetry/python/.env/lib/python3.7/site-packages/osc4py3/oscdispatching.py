#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/oscdispatching.py
# <pep8 compliant>
"""Dispatching of messages among matching OSC methods.

The high level packet management encoding/decoding (with support for
addrpattern compression/decompression, for checksum, authentication and
encryption) is already in oscbuildparse.

Low-level raw packets transport (read/write with devices or network) is
realized with objects of subclasses of :class:`OSCChannel`. We call these
objects readers and writers.
Readers identify OSC raw packets (datagram or stream based packet control),
source (who send the data) and store them in a received_rawpackets global
queue (defined in oscreadwrite module).
This allow readers to have different read policy (poll, thread, etc)
disconnected from our upper layer management of received data.


"""

import time
import collections
import threading

from . import oscchannel
from . import oscbuildparse
from . import oscscheduling
from . import oscpacketoptions

# How many +- seconds around current time is being considered "current".
# Must be positive of zero.
NOW_RESOLUTION = 0.001      # 1 ms

# Structure to store bundles delayed to late execution.
# Important: when is first field for use in sorting.
PendingBundle = collections.namedtuple("PendingBundle",
                                        "when disp bundle packopt")

# Parameters to use in delay_bundle(*LAST_PENDINGBUNDLE) to signalspecial
# post (generally to have a thread wake up and check its termination flag).
# Important: when is 0,not None, to have the "last" pending bundle
# inserted at beginning and processed immediatly (else we should wait until
# last pending bundle time, who know how long...).
# Tested on object identity.
LAST_PENDINGBUNDLE = PendingBundle(0, None, None, None)

# Bundles waiting their time to be dispatched, *sorted by ascending time tag*.
# A condition variable is used to insert a new bundle and reschedule
# the processing thread.
# We dont use a queue.PriorityQueue() as we need to manipulate "next" item
# not immediatly but only when its time tag has gone.
pending_bundles = []
pending_mutex = threading.Lock()
pending_condvar = threading.Condition(pending_mutex)

# Thread to manage pending bundles if not managed by polling loop.
delayed_thread = None
delayed_terminate = False

# Reference to all created dispatchers by their name.
# Currently we run with only one.
all_dispatchers = {}

# General generic dispatcher for all normal messages.
global_dispatcher = None

    
# ========================= OSC METHODS EXECUTION  ==========================
class Dispatcher(object):
    """System to call code when receiving decoded OSC packets to call methods.

    :ivar methodfilters: list of filters and associated functions to
        call for address-pattern matching of messages.
    :type methodfilters: [ MethodFilter ]
    :ivar logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    """
    def __init__(self, dispname, options):
        if dispname in all_dispatchers:
            raise ValueError("OSC dispatcher name {!r} already "\
                    "used".format(dispname))
        self.dispname = dispname
        self.methodfilters = []
        self.logger = options.get("logger", None)

        all_dispatchers[dispname] = self

    def terminate(self):
        """Terminate properly the dipatcher.
        """
        del all_dispatchers[self.dispname]

    def add_method(self, method):
        """Register a new pattern filter with the dispatcher.

        Note: a filter can be registered among different dispatchers.
        If a filter is found several times when matching a message, its
        function is called several times.

        :param method: the filter to register.
        :type method: MethodFilter
        """
        self.methodfilters.append(method)

    def remove_method(self, method):
        """Unregister a pattern filter from the dispatcher.
        """
        self.methodfilters.remove(method)

    def dispatch_packet(self, packet, packopt):
        """Dispatch an OSC packet to ad-hoc processing.

        :param packet: OSC packet
        :type packet: OSCMessage or OSCBundle
        :param packopt: options for the packet processing
        :type packopt: dict
        :return: count of methods immediatly called for the packet
            (delayed bundles are not considered).
        :rtype: int
        """
        if isinstance(packet, oscbuildparse.OSCMessage):
            # For message packet, execution is immediate.
            count = self.execute_message(packet, packopt)
        elif isinstance(packet, oscbuildparse.OSCBundle):
            # Check if we have to dispatch the bundle or not. This test is
            # here and not in dispatch_bundle as only timetag of top bundle
            # is considered.
            if packet.timetag != oscbuildparse.OSC_IMMEDIATELY:
                when = oscbuildparse.timetag2unixtime(packet.timetag)
                when += packopt.timetag_offset
            else:
                when = None
            if when is not None and packopt.honor_timetag and \
                                    packopt.forget_oldmsg:
                if when < (time.time() - NOW_RESOLUTION):
                    # Too late bundle, forget it.
                    if self.logger is not None:
                        self.logger.exception("OSC dispatcher %s, too late "\
                            "bundle packet %r", self.dispname, packet)
                    return
            count = self.dispatch_bundle(packet, packopt)
        else:
            raise ValueError("OSC unknown packet kind")
        return count

    def dispatch_bundle(self, bundle, packopt):
        """
        When this method is called, the bundle is known to be executed at
        some time (late bundle is already processed).

        :param bundle: the bundle to execute.
        :type bundle: OSCBundle
        :param packopt: the packet options associated to the bundle
        :type packopt: dict
        :return: count of methods called for the Bundle's *immediate* messages
            (delayed bundles are not considered).
        :rtype: int
        """
        timetag, elements = bundle

        if timetag != oscbuildparse.OSC_IMMEDIATELY:
            when = oscbuildparse.timetag2unixtime(timetag)
            when += packopt.timetag_offset
        else:
            when = None

        if when is not None and packopt.honor_timetag:
            if when < (time.time() + NOW_RESOLUTION):
                # Bundle just in time, process it now.
                count = self.execute_bundle(bundle, packopt)
            else:
                # Bundle in advance, queue it in pending ones.
                delay_bundle(when, self, bundle, packopt)
                count = 0   # Zero executed immediatly.
        else:
            # No time tag / time tag not managed, process the bundle now.
            count = self.execute_bundle(bundle, packopt)
        return count

    def execute_bundle(self, bundle, packopt):
        """Execute elements of a bundle.

        :param bundle: the bundle to execute.
        :type bundle: OSCBundle
        :param packopt: the packet options associated to the message
        :type packopt: dict
        :return: count of methods called for the Bundle's *immediate* messages
            (delayed bundles are not considered).
        :rtype: int
        """
        timetag, elements = bundle

        if packopt.honor_timetag and timetag != oscbuildparse.OSC_IMMEDIATELY:
            when = oscbuildparse.timetag2unixtime(timetag)
            when += packopt.timetag_offset
        else:
            when = None

        # Note: if a bundle execution is required, it will all be executed,
        # sub-bundle time tag can be considered for delaying but not for
        # forgetting the bundle.
        count = 0
        for elem in elements:
            if isinstance(elem, oscbuildparse.OSCMessage):
                count += self.execute_message(elem, packopt)
            elif isinstance(elem, oscbuildparse.OSCBundle):
                # Should I check sub-bundle timetag against container bundle
                # timetag ?
                if when is not None and packopt.check_subbundle_timetag and \
                            elem.timetag != oscbuildparse.OSC_IMMEDIATELY:
                    elemtime = oscbuildparse.timetag2unixtime(elem.timetag) + \
                                                        packopt.timetag_offset
                    # Check sub-bundle timetag is >= container bundle timetag.
                    if elemtime < when:
                        raise ValueError("OSC invalid timetag in sub-bundle, "\
                                        "must be >= parent bundle timetag")
                # Dispatch the bundle, it will be immadiatly executed or
                # delayed upon its timetag.
                count += self.dispatch_bundle(elem, packopt)
            else:
                raise ValueError("OSC unknown packet kind")
        return count

    def execute_message(self, msg, packopt):
        """Execute a message with matching method filters.

        .. note: thread execution / late execution

            pattern matching AND call is done is this context. If you
            want to have call realized in another thread, or at another time,
            just associate a workqueue to the MethodFilter and this workqueue
            will be used for execution.

        :param msg: the message to execute.
        :type msg: OSCMessage
        :param packopt: the packet options associated to the message
        :type packopt: dict
        :return: count of methods called for the message
        :rtype: int
        """
        # Go through dispatchers and match methodfilters.
        matchcount = 0
        # Note: we work on a copy of the list to avoid a lock on that list
        # (use the Python global lock to have list copy atomic).
        for matcher in self.methodfilters[:]:
            if matcher.match(msg.addrpattern):
                matchcount += 1
                # Note: AddrPatternFilter wrap message execution so they
                # are safe (no exception).
                matcher(msg, packopt)
        if self.logger is not None:
            self.logger.debug("OSC dispatcher %s found %d matchs for "\
                    "message %r", self.dispname, matchcount, msg)

        return matchcount


# ============================ INTERNAL FUNCTIONS  ==========================
def delay_bundle(when, disp, bundle, packopt):
    """Insert a bundle in the pending queue for late execution.

    :param when: absolute time in seconds to execute the bundle.
    :type when: float
    :param disp:
    :type disp: Dispatcher
    """
    if disp is not None and disp.logger is not None:
        disp.logger.debug("OSC dispatcher %s, delayed bundle id %d",
                                disp.dispname, id(bundle))

    delayed = PendingBundle(when, disp, bundle, packopt)
    pending_condvar.acquire()
    pending_bundles.append(delayed)
    pending_bundles.sort()
    pending_condvar.notify()    # Delayed thread may have to reschedule
                                # early than previously planned.
    pending_condvar.release()


def next_bundle(timeout):
    """Return next available pending bundle.

    Return None if there is no *in-time* pending bundle and timeout elapse.
    Return LAST_PENDINGBUNDLE PendingBundle if it has been posted to indicate
    a thread termination request.

    :param timeout: maximum time to wait for a new pending bundle, 0 for
        immediate return, None for infinite wait.
    :type timeout: float or None
    :return: the next in-time bundle or None or LAST_PENDINGBUNDLE.
    :rtype: PendingBundle or None
    """
    pending_condvar.acquire()   # === Can work on que list.

    # Search for a pending bundle in time for execution.
    pb = None
    if pending_bundles:
        # As list is sorted - and first item in tuples are 'when', the
        # next scheduled bundle is first.
        nextwhen = pending_bundles[0].when
        # Note: delay is used for "now" test but also as wait() timeout
        # parameter.
        delay = nextwhen - time.time()

        if delay < 0 or abs(delay) < NOW_RESOLUTION:
            pb = pending_bundles.pop(0)
        elif timeout is not None and delay > timeout:
            delay = timeout
    else:
        delay = timeout

    # Wait for a new bundle to be signaled (and then be called again
    # to recalculate timings), or for delay to next bundle to elapse.
    if pb is None:
        # Note that the conditional variable wait() relase the lock,
        # so an extern thread can work on pending_bundles during that
        # time.
        pending_condvar.wait(delay)

    pending_condvar.release()   # === Must no longer work on the list.

    return pb


# ====================== EVENT LOOP PUBLIC FUNCTIONS  ======================
def delayed_process_loop(deadlinetime=0, logger=None):
    """Manage bundles delayed up to their time tag.

    Called as a thread entry point, or as a simple function in a envent
    loop.

    :param deadlinetime: exit from loop after this time, even if there are
        remaining bundles to process. Its an *absolute* time in seconds,
        in same time base as time.time().
        A 0 value do process all bundles until the queue is empty then return.
        A None value is used when in own thread.
    :param deadlinetime: float or None
    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    """
    try:
        if deadlinetime is None and logger is not None:
            logger.info("OSC Starting delayed_process_loop()")

        while True:
            timeout = oscscheduling.deadline2timeout(deadlinetime)
            pb = next_bundle(timeout)

            # If no bundle while in event loop, return.
            if pb is None and deadlinetime == 0:
                return

            # If no bundle while in own thread, continue with waiting.
            if pb is None and deadlinetime is None:
                continue

            if pb is LAST_PENDINGBUNDLE:
                if delayed_terminate:
                    break       # Properly exit from function (from thread...)
                else:
                    pb = None

            if pb is not None:
                if pb.disp.logger is not None:
                    pb.disp.logger.debug("OSC dispatcher %s, delay elapsed "\
                            "for bundle id %d",
                            pb.disp.dispname, id(pb.bundle))
                pb.disp.execute_bundle(pb.bundle, pb.packopt)

            # If has deadline elapsed, continue with waiting.
            if deadlinetime and time.time() > deadlinetime:
                break

        if deadlinetime is None and logger is not None:
            logger.info("OSC Finishing delayed_process_loop()")
    except:
        if  logger is not None:
            logger.exception("OSC Failure in delayed_process_loop()")


# ================== BACKGROUND THREADS PUBLIC FUNCTIONS  ===================
def create_delayed_thread(logger=None):
    """Build a thread to manage dispatching messages by calling functions.

    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    """
    global delayed_thread, delayed_terminate

    if delayed_thread is not None:
        return

    delayed_terminate = False
    delayed_thread = threading.Thread(target=delayed_process_loop,
                                args=(None, logger),  # Its not polling.
                                name="DelayThread")
    delayed_thread.daemon = False
    delayed_thread.start()


def terminate_delayed_thread():
    """Set a flag and signal condition variable to finish delayed thread.

    Wait for the effective thread termination.
    Note: remaining bundles in the pending list are ignored.
    """
    global delayed_terminate, delayed_thread
    pending_condvar.acquire()
    pending_bundles.append(LAST_PENDINGBUNDLE)
    delayed_terminate = True
    pending_condvar.notify()
    pending_condvar.release()
    delayed_thread.join()
    delayed_thread = None


# ======================= DISPATCHING PUBLIC FUNCTIONS  =====================
# To setup dispatcher and install OSC methods.

def register_method(method):
    """Install an OSC method to be called when receiving some messages.

    :param method: object to filter and call the method.
    :type method: MethodFilter
    """
    globdisp().add_method(method)


def unregister_method(method):
    """Remove ann installed OSC method.

    :param method: object to filter and call the method.
    :type method: MethodFilter
    """
    globdisp().remove_method(method)


def register_global_dispatcher(disp):
    """Install the dispatcher for global dispatching of OSC messages.

    :param disp: the dispatcher to use or None to have a new standard
        dispatcher created with no special option.
    :type disp: Dispatcher
    """
    global global_dispatcher
    if global_dispatcher is not None:
        raise RuntimeError("OSC global dispatcher already registered")
    if disp is None:
        disp = Dispatcher("global", {})
    global_dispatcher = disp


def unregister_global_dispatcher():
    """
    """
    global global_dispatcher
    if global_dispatcher is None:
        raise RuntimeError("OSC no global dispatcher registered")
    global_dispatcher.terminate()
    global_dispatcher = None


def globdisp():
    """Return the global dispatcher, create it if necessary.
    """
    global global_dispatcher
    if global_dispatcher is None:
        raise RuntimeError("OSC no global dispatcher registered")
    return global_dispatcher

