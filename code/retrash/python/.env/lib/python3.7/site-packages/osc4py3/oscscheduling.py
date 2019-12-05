#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/oscscheduling.py
# <pep8 compliant>
"""Scheduling to ensure transmissions and processiong of OSC messages.

Tools here manage monitoring of communications to activate data read
and data write when necessary, doing jobs as possible in background
tasks.

"""

import time
import threading
import collections
import socket
try:
    import select
    SELECT_AVAILABLE = True
    if hasattr(select, 'poll'):     # Unix specific
        POLL_AVAILABLE = True
    #if hasattr(select, 'epoll'):     # Linux specific
    #    EPOLL_AVAILABLE = True
    #if hasattr(select, ''):
    #    KQUEUE_AVAILABLE = True     # BSD / MacOSX specific
except:
    SELECT_AVAILABLE = False
    POLL_AVAILABLE = False
    #EPOLL_AVAILABLE = False
    #KQUEUE_AVAILABLE = False

# Simple strings to transmit interresting or occured events on files.
MONITORING_EVENTS_MAP = {
    #r  w  e
    (0, 0, 0): '',
    (0, 0, 1): 'e',
    (0, 1, 0): 'w',
    (0, 1, 1): 'we',
    (1, 0, 0): 'r',
    (1, 0, 1): 're',
    (1, 1, 0): 'rw',
    (1, 1, 1): 'rwe',
    }

# ============================ GLOBAL MONITORING  ===========================
# We distinguish two global monitoring threads, one for files (sockets), which
# have specific system calls, and one for simple channels polling method calls
# at periodic times.
sockmon_lock = threading.Lock()
sockmon_monitor = None
sockmon_thread = None
SOCKMON_GRACE_PERIOD = 60  # At least one wake up all x seconds.

pollmon_lock = threading.Lock()
pollmon_monitor = None
pollmon_thread = None
POLLMON_SLEEP_PERIOD = 0.1  # At least one wake up all x seconds.

#evtloopmon_lock = threading.Lock()
#evtloopmon_monitor = None


def get_global_socket_monitor(logger=None):
    """Access to monitoring object for global socket monitoring thread.

    If the monitor is not created, then the function automatically create
    it and its associated global thread.

    :return: a monitor managed by one global thread.
    :rtype: Monitor
    """
    global sockmon_lock, sockmon_monitor, sockmon_thread

    with sockmon_lock:
        if sockmon_monitor is None:
            sockmon_monitor = create_platform_socket_monitor(logger)
            sockmon_thread = create_monitoring_thread(sockmon_monitor,
                                    SOCKMON_GRACE_PERIOD, "SocketThread")
        return sockmon_monitor


def terminate_global_socket_monitor():
    """Require termination of global sockets monitor

    The function wait for termination to be completed.
    """
    global sockmon_monitor, sockmon_thread

    with sockmon_lock:
        if sockmon_monitor is not None:
            sockmon_monitor.terminate()
            sockmon_monitor.join()
            sockmon_monitor = None
            sockmon_thread = None


def get_global_polling_monitor(logger=None):
    """Access to monitoring object for global poll monitoring thread.

    If the monitor is not created, then the function automatically create
    it and its associated global thread.

    :return: a monitor managed by one global thread.
    :rtype: Monitor
    """
    global pollmon_lock, pollmon_monitor, pollmon_thread

    with pollmon_lock:
        if pollmon_monitor is None:
            pollmon_monitor = create_polling_monitor(logger)
            pollmon_thread = create_monitoring_thread(pollmon_monitor,
                                POLLMON_SLEEP_PERIOD, "PollThread")
        return pollmon_monitor


def terminate_global_polling_monitor():
    """Require termination of global polling monitor

    The function wait for termination to be completed.
    """
    global pollmon_monitor, pollmon_thread

    with pollmon_lock:
        if pollmon_monitor is not None:
            pollmon_monitor.terminate()
            pollmon_monitor.join()
            pollmon_monitor = None
            pollmon_thread = None


#def get_global_eventloop_poll_monitor(logger=None):
    #global evtloopmon_lock, evtloopmon_monitor

    #with evtloopmon_lock:
        #if evtloopmon_monitor is None:
            #evtloopmon_monitor = create_polling_monitor(logger)
        #return evtloopmon_monitor

#def terminate_global_eventloop_poll_monitor():
    #global evtloopmon_lock, evtloopmon_monitor
    #with evtloopmon_lock:
        #if evtloopmon_monitor is not None:
            #evtloopmon_monitor.terminate()
            #evtloopmon_monitor.join()
            #evtloopmon_monitor = None
 

# ========================= MONITOR / THREAD CREATION =======================
def create_polling_monitor(logger=None):
    """Create a polling monitor.
    """
    return PollingMonitor(logger)


def create_platform_socket_monitor(logger=None):
    """Create a monitor and on some files (sockets).

    The function adapt the kind of monitor created to the kind of monitoring
    system call available on the platform.
    """
    #if POLL_AVAILABLE:
        #return PollSocketMonitor(logger)
    #elif SELECT_AVAILABLE:
        #return SelectSocketMonitor(logger)
    #else:
        #RuntimeError("OSC dont know kind of monitor to build")
    return SelectSocketMonitor(logger)


def create_monitoring_thread(monitor, threadperiod, threadname):
    """Create a thread to work on a specific monitor.
    """
    thread = threading.Thread(
                        target=Monitor.monitoring_function,
                        args=(monitor, threadperiod),
                        name=threadname)
    thread.daemon = False
    thread.start()
    return thread


# ========================= MONITORING CHANNELS =============================
# Simple tuple to transmit operations to monitoring threads.
# The fileno is mainly for file-event (socket) based monitors, and
# must be set to channel id for monitors which dont use files.
MonitorOperation = collections.namedtuple('MonitorOperation',
                        'operation fileno, channel, rwe')


class Monitor:
    """Superclass for a thread monitoring one or multiple channels.

    Monitor base wok is to check if there are operations pending on some
    transmission channel. These operations are just queued in a list to be
    processed in sequence.

    :ivar logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    :ivar controlqueue: queue of operations on monitoring.
    :type controlqueue: deque
    :ivar terminated: flag set when monitor will be terminated, to prevent
        control operations.
    :type terminated: bool
    :ivar threads: references of threads working only on the monitor, unused
        for event loop thread (use global lock for concurrent access
        protection).
    :type threads: list
    :ivar readdict: mapping fileno -> channel for read-monitoring
    :type readdict: dict
    :ivar writedict: mapping fileno -> channel for write-monitoring
    :type writedict: dict
    :ivar eventdict: mapping fileno -> channel for event-monitoring
    :type eventdict: dict
    :ivar pending: trigged rwe flag and associated channels needing
        some work.
    :type pending: deque
    """
    def __init__(self, logger=None):
        self.logger = logger
        self.controlqueue = collections.deque()
        self.terminated = False
        self.threads = []
        self.readdict = {}
        self.writedict = {}
        self.eventdict = {}
        self.pending = collections.deque()
        if self.logger is not None:
            self.logger.debug("monitor %d created (%s).",
                                id(self), self.__class__.__name__)

    # ----- Monitoring threads ----------------------------------------------
    # Not used if the monitor is used in a polling system.
    def reference_thread(self, thread):
        self.threads.append(thread)

    def unreference_thread(self, thread):
        self.threads.remove(thread)

    def join(self):
        for t in self.threads[:]:
            t.join()

    # ----- Control operations  ---------------------------------------------
    def control_operations(self):
        """Called to proceed monitoring control operations.

        Note: called in context of the monitoring thread.
        """
        while self.controlqueue:
            oper = self.controlqueue.popleft()
            if oper.operation == "ADD":
                if 'r' in oper.rwe and oper.fileno not in self.readdict:
                    self.readdict[oper.fileno] = oper.channel
                if 'w' in oper.rwe and oper.fileno not in self.writedict:
                    self.writedict[oper.fileno] = oper.channel
                if 'e' in oper.rwe and oper.fileno not in self.eventdict:
                    self.eventdict[oper.fileno] = oper.channel
                self.do_fileno_added(oper.fileno, oper.rwe)
                if self.logger is not None:
                    self.logger.info("monitor %d added channel %s for %s.",
                                        id(self), oper.channel.chaname,
                                        oper.rwe)
            elif oper.operation == "REMOVE":
                if 'r' in oper.rwe and oper.fileno in self.readdict:
                    del self.readdict[oper.fileno]
                if 'w' in oper.rwe and oper.fileno in self.writedict:
                    del self.writedict[oper.fileno]
                if 'e' in oper.rwe and oper.fileno in self.eventdict:
                    del self.eventdict[oper.fileno]
                self.do_fileno_removed(oper.fileno, oper.rwe)
                if self.logger is not None:
                    self.logger.info("monitor %d removed channel %s for %s.",
                                        id(self), oper.channel.chaname,
                                        oper.rwe)
            elif oper.operation == "TERMINATE":
                self.do_terminate_monitoring()
                if self.logger is not None:
                    self.logger.info("monitor %d terminating.", id(self),)
                # TODO: cleaup monitored files - update members and call
                # subclasses methods so they update their data.

    # ----- Monitored files -------------------------------------------------
    def need_fileno(self):
        """Indicate monitor need real fileno (socket) to work.

        Overriden in subclasses which work on filenos.
        """
        return False

    def add_monitoring(self, fileno, channel, readwriteevent):
        """Add a fileid to the monitoring.

        Called from out of monitoring thread.

        :param fileno: file id for select, or just channel id
        :type fileno: int
        :param channel: communication object to monitor
        :type channel: TransportChannel subclass object
        :param readwriteevent: indicators of what to monitor on the file,
            'r' for read, 'w' for write, 'e' for event, mixable.
        :type readwriteevent: str
        """
        if self.terminated:
            raise RuntimeError("OSC monitoring control is closed")

        if self.logger is not None:
            self.logger.debug("monitor %d req add channel %d->%s for %s.",
                            id(self), fileno, channel.chaname, readwriteevent)

        self.controlqueue.append(MonitorOperation("ADD", fileno, channel,
                                                    readwriteevent))
        self.do_wake_up_monitor()

    def remove_monitoring(self, fileno, channel, readwriteevent):
        """Remove a fileid from the monitoring.

        Called from out of monitoring thread.

        :param readwriteevent: indicators of what to monitor on the file,
            'r' for read, 'w' for write, 'e' for event, mixable.
        :type readwriteevent: str
        """
        if self.terminated:
            raise RuntimeError("OSC monitoring control is closed")

        if self.logger is not None:
            self.logger.debug("monitor %d request to remove channel "\
                    "%s for %s.", id(self), channel.chaname, readwriteevent)

        self.controlqueue.append(MonitorOperation("REMOVE", fileno, channel,
                                                    readwriteevent))
        self.do_wake_up_monitor()

    def terminate(self):
        """Stop the monitor and remove all resources.
        """
        if self.logger is not None:
            self.logger.debug("monitor %d request to terminate.", id(self))

        self.terminated = True  # Prevent other control operations.
        self.controlqueue.append(MonitorOperation("TERMINATE",
                                                None, None, None))
        self.do_wake_up_monitor()

    def do_wake_up_monitor(self):
        """Automatically called when some control operations are added.
        """
        raise NotImplementedError("do_wake_up_monitor must be overriden")

    # ----- Blocking/timedout monitoring ------------------------------------
    def wait_events(self, timeout):
        """Wait on new event with a deadline parameter.

        Called from within a monitor thread.
        This method must be overrident in subclasses to do effective wait
        on events on the channels present in readdict, writedict and
        eventdict.

        :param timeout: maximum time in seconds to stay in the waiting state,
            0 for immediate return, None for blocking.
        :type timeout: float or None
        :return: lists of read ready, write ready and event files
        :rtype: [int],[int],[int]
        """
        raise NotImplementedError("wait_events must be overriden")

    def monitor_oneloop(self, deadlinetime):
        """Do one loop of monitoring from within monitoring thread.

        Can be used as an exemple of on monitoring thread iteration, or
        directly be called as a processing part of an event loop.

        :return: flag to indicate to continue the monitoring loop (if True).
        :rtype: bool
        """
        # Do all pending operations on Monitor internal data.
        self.control_operations()
        # Wait for a communication event or deadline.
        timeout = deadline2timeout(deadlinetime)
        rready, wready, eready = self.wait_events(timeout)
        # Do all pending operations on Monitor internal data.
        self.control_operations()

        # Identify (from filenos) OSC channels having operations.
        # Note: A channel may have been removed in a control operation,
        #       check it.
        # We use two steps and intermediate queues. This is necessary if we
        # want to manage a deadline time but to be sure that all ready
        # channels have their communication functions called sometimes.
        for i in rready:
            if i in self.readdict:
                chan = self.readdict[i]
                if ('r', chan) not in self.pending:
                    self.pending.append(('r', chan))
        for i in wready:
            if i in self.writedict:
                chan = self.writedict[i]
                if ('w', chan) not in self.pending:
                    self.pending.append(('w', chan))
        for i in eready:
            if i in self.writedict:
                chan = self.writedict[i]
                if ('e', chan) not in self.pending:
                    self.pending.append(('e', chan))

        # Only now, we process pending trigged rwe flags (at least one if any).
        while self.pending:
            oper, chan = self.pending.popleft()
            if self.logger is not None:
                self.logger.debug("monitor %d detected %s on channel %s.",
                            id(self), oper, chan.chaname)
            chan.process_monevents(deadlinetime, oper)
            # Manage deadline.
            if deadlinetime is not None:
                if time.time() > deadlinetime:
                    break
                    # We leave remaining pending operations as is, they
                    # will be processed next time the onelopp will be
                    # called in current order.

        return not self.terminated

    def monitoring_loop(self, period):
        """Complete monitoring loop.

        Note: the period parameter is here to ensure some periodic wake-up of
        the thread, but modifications on monitoring object or events on files
        normally automatically wake it up.

        :param period: period time in seconds, None for no periodic wake up,
            0 for completly active thread (bad idea).
        :type period: float
        """
        try:
            if self.logger is not None:
                self.logger.info("OSC Monitoring thread started "\
                            "for monitor %d.", id(self))
            if period is not None:
                period = abs(period)
            while True:
                if period is None:
                    deadlinetime = None
                elif period == 0:
                    deadlinetime = 0
                else:
                    deadlinetime = time.time() + period
                if not self.monitor_oneloop(deadlinetime):
                    break
            if self.logger is not None:
                self.logger.info("OSC Monitoring thread terminated "\
                            "for monitor %d.", id(self))
        except:
            if self.logger is not None:
                self.logger.exceptio("OSC Failure in monitoring thread "\
                            "for monitor %d.", id(self))

    @staticmethod
    def monitoring_function(monitor, period):
        """Basic function for monitoring loop as a thread function.

        Note: the period parameter is here to ensure some periodic wake-up of
        the thread, but modifications on monitoring object or events on files
        normally automatically wake it up.

        :param monitor: the set of files to monitor.
        :type monitor: Monitor
        :param period: period time in seconds, None for no periodic wake up,
            0 for completly active thread (bad idea).
        :type period: float
        """
        monitor.monitoring_loop(period)

    # ----- Subclasses overriden --------------------------------------------
    def do_fileno_added(self, fileno):
        """Called to handle insertion of the fileno into monitoring.

        Overrident by subclasses.
        """
        pass

    def do_fileno_removed(self, fileno):
        """Called to handle remove of the fileno from monitoring.

        Overriden by subclasses.
        """
        pass

    def do_wait_deadline(self, deadlinetime):
        """
        :return: lists of read ready, write ready and event files
        :rtype: [int],[int],[int]
        """
        # May be overriden by subclasses.
        timeout = deadline2timeout(deadlinetime)
        return self.do_wait_timeout(timeout)

    def do_wait_timeout(self, timeout):
        """
        :return: lists of read ready, write ready and event files
        :rtype: [int],[int],[int]
        """
        # Must be Overriden by subclasses.
        raise NotImplementedError("do_wait_timeout must be overriden "\
                                    "in subclass")


# ======================= POLL CHANNEL MONITORING ===========================
class PollingMonitor(Monitor):
    """Class for monitoring with directly calling poll function on channels.

    :ivar semaphore: synchronization for waiting/timeout and possibly
        waking-up when some control operations occure.
    :type semaphore: Semaphore
    :ivar rweflags: mapping of filenos to (rwe flag and channel)
    :type rweflags: dict [fileno] -> ('rwe', channel)
    """
    def __init__(self, logger=None):
        super().__init__(logger)
        self.semaphore = threading.Semaphore()
        self.rweflags = {}

    def do_wake_up_monitor(self):
        """Send a datagram on monitor control socket to unlock its thread.
        """
        self.semaphore.release()

    def wait_events(self, timeout):
        # Our wait is active polling, there MUST be a (small) timeout to
        # ensure caller will loop around this method frequently.
        assert timeout is not None
        self.semaphore.acquire(True, timeout)
        return self.poll_events()

    def poll_events(self):
        """Build read, write, event lists from polling results.

        Call poll function on each polled channel and build fileno compatible
        lists from results.
        """
        rready, wready, elist = [], [], []
        for fileno in self.rweflags:
            rweflag, chan = self.rweflags[fileno]
            # Note: the timeout is only used for semaphore.
            rwe = chan.poll_monitor(None, rweflag)
            if 'r' in rwe:
                rready.append(fileno)
            if 'w' in rwe:
                wready.append(fileno)
            if 'e' in rwe:
                elist.append(fileno)
        return rready, wready, elist

    def do_fileno_added(self, fileno):
        # Update our rweflags member.
        rwe = MONITORING_EVENTS_MAP[(int(fileno in self.readdict)),
                                    (int(fileno in self.writedict)),
                                    (int(fileno in self.eventdict))]
        self.setup_rweflags(fileno, rwe)

    def do_fileno_removed(self, fileno):
        # Update our rweflags member.
        if fileno not in self.rweflags:
            return
        rwe = MONITORING_EVENTS_MAP[(int(fileno in self.readdict)),
                                    (int(fileno in self.writedict)),
                                    (int(fileno in self.eventdict))]
        if not rwe:
            del self.rweflags[fileno]
        else:
            self.setup_rweflags(fileno, rwe)

    def setup_rweflags(self, fileno, rwe):
        # Calculate then update our rweflags member.
        if 'r' in rwe:
            chan = self.readdict[fileno]
        elif 'w' in rwe:
            chan = self.writedict[fileno]
        elif 'e' in rwe:
            chan = self.eventdict[fileno]
        else:
            chan = None
        # Associate rwe flag and channel to fileno.
        if chan is not None:
            self.rweflags[fileno] = (rwe, chan)


# ====================== SOCKET CHANNEL MONITORING ==========================
class SocketMonitor(Monitor):
    """Superclass for efficient multiple file (socket) monitoring.

    Specific subclasses must override the do_xxxx methods to do the real
    job of polling on filenos.

    Multithreading: all operations on internal data go through method call
    and are routed to the monitoring thread via a queue and a socket.
    External threads must not directly access members data.

    :ivar controlpipe: monitor control file handler to be able to wake up
        monitoring thread from its file-waiting operations
    :type controlsock: socket
    :ivar controladdress: target to send datagrams to awake monitoring thread.
    :type controladdress: socket address
    """
    def __init__(self, logger=None):
        super().__init__(logger)
        self.controlsock = None
        self.controlfileno = None
        self.controladdress = None
        self.wakeupsock = None
        # Now create monitoring socket and store socket, address, fileno.
        self.create_monitor_sockets()

    def do_terminate_monitoring(self):
        self.controlsock.close()
        self.controlsock = None
        self.controlfileno = None
        self.wakeupsock.close()
        self.wakeupsock = None
        # TODO: cleaup monitored files - update members and call
        # subclasses methods so they update their data.

    # ----- Control socket -------------------------------------------------
    def create_monitor_sockets(self):
        """Create sockets to use to awake monitoring thread.

        One to receive the wakeup (used in select()) and one to send the
        wakeup.
        """
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.setblocking(False)
        s.bind(("127.0.0.1", 0))     # port 0 = let system choose.
        self.controlsock = s
        self.controlfileno = s.fileno()
        self.controladdress = s.getsockname()
        self.wakeupsock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.wakeupsock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.wakeupsock.setblocking(False)

    def do_wake_up_monitor(self):
        """Send a datagram on monitor control socket to unlock its thread.
        """
        self.wakeupsock.sendto(b"wakeup", self.controladdress)

    def need_fileno(self):
        return True

    def wait_events(self, timeout):
        """Wait on new event.

        Called from within a monitor thread.

        :return: lists of read ready, write ready and event files
        :rtype: [int],[int],[int]
        """
        rready, wready, elist = self.wait_socket_event(timeout)
        # As we setup first read socket as a way to wake-up monitoring
        # thread for control events, we must remove it from rready.
        if self.controlfileno in rready:
            # Cleanup UDP socket from received data.
            self.controlsock.recv(512)
            rready.remove(self.controlfileno)
        return rready, wready, elist


# =========================== GENERIC POLLING ==============================
class SelectSocketMonitor(SocketMonitor):
    """Monitor a set of file descriptors via select() system call.

    Note: On Windows, only for socket file descriptors..

    :ivar rlist: sockets monitored for read
    :type rlist: list
    :ivar wlist: sockets monitored for write
    :type wlist: list
    :ivar elist: sockets monitored for event
    :type elist: list
    """
    def __init__(self, logger=None):
        super().__init__(logger)
        self.rlist = [self.controlfileno]
        self.wlist = []
        self.elist = []

    def do_fileno_added(self, fileno, rwe):
        if 'r' in rwe:
            self.rlist.append(fileno)
        if 'w' in rwe:
            self.wlist.append(fileno)
        if 'e' in rwe:
            self.elist.append(fileno)

    def do_fileno_removed(self, fileno, rwe):
        if 'r' in rwe:
            self.rlist.remove(fileno)
        if 'w' in rwe:
            self.wlist.remove(fileno)
        if 'e' in rwe:
            self.elist.remove(fileno)

    def wait_socket_event(self, timeout):
        if self.logger is not None and timeout != 0:
            # If running in an event loop (generally the case with a zero
            # timeout), avoid fulling logs with that debug information.
            self.logger.debug("monitor %d wait sockets(r%r w%r e%r %r).",
                    id(self), self.rlist, self.wlist, self.elist, timeout)
        rready, wready, evt = select.select(self.rlist, self.wlist,
                                                self.elist, timeout)
        return rready, wready, evt


# ======================== UNIX SPECIFIC POLLING ===========================
# TODO: TEST !!! 
class PollSocketMonitor(SocketMonitor):
    """Monitor a set of file descriptors via poll() system call.

    Note: Unix only.

    :ivar p: poll object to manage status monitoring.
    :type p: socket.poll() result
    :ivar registered: collection of fileno which have been registered in the
        poll.
    :type registered: set
    """
    def __init__(self, logger=None):
        super().__init__(logger)
        self.p = select.poll()
        self.registered = set()
        self.registered.add(self.controlsock.fileno())

    def do_fileno_added(self, fileno, rwe):
        self.poll_add(fileno)

    def do_fileno_removed(self, fileno, rwe):
        self.poll_remove(fileno)

    def poll_mask(self, fileno):
        eventmask = 0
        if fileno in self.readdict:
            eventmask |= select.POLLIN
        if fileno in self.writedict:
            eventmask |= select.POLLOUT
        if fileno in self.eventdict:
            #eventmask |= select.POLLOUT
            #? what flag to set ?
            pass
        return eventmask

    def poll_add(self, fileno):
        # We may register the fileno, or just modify its poll mask.
        eventmask = self.poll_mask(fileno)
        if fileno in self.registered:
            self.p.modify(fileno, eventmask)
        else:
            self.p.register(fileno, eventmask)
            self.registered.add(fileno)

    def poll_remove(self, fileno):
        # We may unregister the fileno, or just modify its poll mask.
        if fileno not in self.registered:
            return
        eventmask = self.poll_mask(fileno)
        if eventmask == 0:
            self.p.unregister(fileno)
            self.registered.remove(fileno)
        else:
            self.p.modify(fileno, eventmask)

    def wait_socket_event(self, timeout):
        pollstatus = self.p.poll(timeout)
        rready, wready, elist = [], [], []
        for fd, event in pollstatus:
            if event & select.POLLIN:
                rready.append(fd)
            if event & select.POLLOUT:
                wready.append(fd)
            # ? what event flags ?
            #if event &
            #    eready.append(fd)
        return rready, wready, elist



# !! Linux only
#class EPollSocketMonitor()
#http://scotdoyle.com/python-epoll-howto.html


# ========================== DEADLINE ==> TIEMOUT ===========================
def deadline2timeout(deadlinetime):
    """Convert a deadline time into a timeout delay.

    :param deadlinetime: absolute time limit in seconds, None for
        infinite wait, zero for immediate return.
    :type deadlinetime: float (or None)
    :return: corresponding timeout (0 => 0, None => None)
    :rtype: float (or None)
    """
    if deadlinetime is None:
        timeout = None
    elif deadlinetime == 0:
        timeout = 0
    else:
        timeout = deadlinetime - time.time()
        if timeout < 0:
            timeout = 0
    return timeout


# =========================== SELECT SIMPLIFIED =============================
def wait_select_deadline(fileno, deadlinetime, waitevents):
    """Wait for new event on a file with a deadline parameter.

    Just a simple function to hide select() system call processing.

    :param deadlinetime: deadline time in seconds to wait, None to wait without
        limit, 0 to return immediatly.
    :type timeout: float
    :param waitevents: r for read, w for write, e for event in a string,
        corresponding to monitored status for the file.
    :type waitevents: str
    :return: r for read, w for write, e for event in a string, corresponding
        to available status for the file.
    :rtype: str
    """
    return wait_select_timeout(fileno, deadline2timeout(deadlinetime),
                                waitevents)


def wait_select_timeout(self, fileno, timeout, waitevents):
    """Wait for new event on a file with a timeout parameter

    Just a simple function to hide select() system call processing.

    :param timeout: maximum time in seconds to wait for status notification,
        None to wait without limit, 0 to return immediatly.
    :type timeout: float
    :param waitevents: r for read, w for write, e for event in a string,
        corresponding to monitored status for the file.
    :type waitevents: str
    :return: r for read, w for write, e for event in a string, corresponding
        to available status for the file.
    :rtype: str
    """
    rlist = [fileno] if 'r' in waitevents else []
    wlist = [fileno] if 'w' in waitevents else []
    elist = [fileno] if 'e' in waitevents else []
    assert rlist or wlist or elist  # Three empty list disallowed on windows.
    rready, wready, evt = select.select(rlist, wlist, elist, timeout)
    return MONITORING_EVENTS_MAP[len(rready), len(wready), len(evt)]
