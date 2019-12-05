#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/oscpeeradapt.py
# <pep8 compliant>
"""Tools to manage high level communications between systems using OSC.

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

This module organize communications on the upper level, receiving and sending
packets from/to different OSC systems. It allows to identify systems (for
the supported communication options listed before) and have specific
processing for some messages (ex. authenticate packets, negociate addrpattern
compression by requesting string/int mapping, etc).
Finally, it call registered functions matching message address pattern.
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


# Bundles waiting their time to be dispatched, *sorted by ascending time tag*.
# A condition variable is used to insert a new bundle and reschedule
# the processing thread.
PendingBundle = collections.namedtuple("PendingBundle",
                                        "when disp bundle packopt")
pending_bundles = []
pending_mutex = threading.Lock()
pending_condvar = threading.Condition(pending_mutex)

SendingPacket = collections.namedtuple("SendingPacket",
                                        "packet packopt targets")
sending_packets = collections.deque()
sending_semaphore = threading.Semaphore(0)

# Parameters to use in delay_bundle(*LAST_PENDINGBUNDLE) to signalspecial
# post (generally to have a thread wake up and check its termination flag).
# Important: when is 0,not None, to have the "last" pending bundle
# inserted at beginning and processed immediatly (else we should wait until
# last pending bundle time, who know how long...).
# Tested on object identity.
LAST_PENDINGBUNDLE = PendingBundle(0, None, None, None)

# Same for sending packet thread.
# Tested on identity too.
LAST_SENDINGPACKET = SendingPacket(None, None,  None)

# Reserved names unusable for channel names.
# Note that we reserve all names starting by '_'.
RESERVED_PEER_NAMES = {
    "_all",             # To address all peer and channels.
    "_allpeers",        # To address all peers (see inpeersgroup).
    "_alladmin",        # To address all admin peers  (see inadmingroup).
    "_allchannels",     # To address all channels.
    "_local",           # To bypass peers/channels and dispatch locally.
    }

# Thread to manage pending bundles if not managed by polling loop.
delayed_thread = None
delayed_terminate = False

# Thread to process raw packets if not managed by polling loop.
rawpackets_thread = None
rawpackets_terminate = False

# Thread to process sent packets if not managed by polling loop.
sendpackets_thread = None
sendpackets_terminate = False

# Reference to all created dispatchers by their name.
all_dispatchers = {}

# General generic dispatcher for all normal messages.
global_dispatcher = None

# Reference to all created peers by their name.
all_peers = {}

# Mapping from (readername, sourceidentifier) to PeerManager objects.
# Allow to have special processing of some incoming packets.
peer_packet_receivers = {}


# ========================= OSC PEERS COMMUNICATIONS  =======================
class PeerManager(object):
    """Indentify another OSC system to support specific communications.

    Subclasses can add extra processing when receiving or sending OSC packets,
    to support things like address pattern compression, peer authentication,
    data encryption, etc.

    This can be also used as a way to group multiple channels with a
    specific name usable in send_packet(), just add wanted writer names
    to the peer with add_writer() and use the peer name as target.

    :ivar peername: readable identifier for the peer
    :type peername: str
    :ivar admindispatch: dispatcher for management methods trigged on
        messages. Or None if not used.
    :type admindispatch: Dispatcher or None
    :ivar adminmanager: peer manager to use for sending admin communications.
        If no adminmanager is specified, then messages use normal writers
        and procedures of the peer manager.
    :type adminmanager: PeerManager
    :ivar inadmingroup: flag to select the peer manager for _alladmin target.
        Default to False.
    :type inadmingroup: bool
    :ivar inpeersgroup: flat to select the peer manager for _allpeers target.
        Default to True.
    :type inpeersgroup: bool
    :ivar writersnames: set of names of transport channels to communicate
        with the peer(s)
    :type writersnames: { str }
    :ivar special_transmit: flag to indicate that manager use special
        encoding or transmission procedure when sending osc data
        (ie. pattern compression, or encryption, etc... cannot use
        a standard shared processus with other managers).
    :type special_transmit: bool
    :ivar addrpattern_compression: mapping of addrpattern to int for
        addrpattern compression when sending messages. Default to {}.
    :type addrpattern_compression: dict
    :ivar addrpattern_decompression: mapping of int to addrpattern for
        addrpattern decompression when reading messages. Default to {}.
    :type addrpattern_decompression: dict
    :ivar inpackopt: options for processing incoming packets,
    :type inpackopt: dict

    """
    def __init__(self, peername, options):
        if peername.startswith('_'):
            raise ValueError("OSC peer name {!r} beginning with _ "\
                            "reserved.".format(peername))
        if peername in oscchannel.all_channels_peers:
            raise ValueError("OSC channel/peer name {!r} already "\
                            "used.".format(peername))

        self.peername = peername
        self.admindispatch = None
        self.adminmanager = None
        self.inadmingroup = options.get("inadmingroup", False)
        self.inpeersgroup = options.get("innormalgroup", True)
        self.writersnames = set()
        self.special_transmit = False
        self.addrpattern_compression = {}
        self.addrpattern_decompression = {}
        self.logger = options.get("logger", None)
        # Default processing options for packets coming to this manager.
        self.inpackopt = oscpacketoptions.PacketOptions()
        self.inpackopt.setup_processing(options)

        all_peers[peername] = self
        oscchannel.all_channels_peers.add(peername)

    def terminate(self):
        """Properly terminate the peer.
        """
        oscchannel.all_channels_peers.remove(self.peername)
        del all_peers[self.peername]

    def register_manager(self, readername, srcident):
        """Install a PeerManager in the incoming OSC data processing path.

        .. note:: Only one manager per reader/source

            You can install only one manager for a (readername, srcident) key,
            especially, there is only one global manager for ("*", "*").

        :param readername: specific reader interresting this manager, or
            "*" for peer manager interrested by all readers.
        :type readername: str
        :param scrident: identification of packets source, or "*" for peer
            manager interested by all packet sources.
        :type srcident: hashable
        """
        if (readername, srcident) in peer_packet_receivers:
            raise ValueError("OSC PeerManager already "\
                    "registered for {}".format((readername, srcident)))
        peer_packet_receivers[(readername, srcident)] = self

    def unregister_manager(self, readername, srcident):
        """Remove a PeerManager from the incoming OSC data processing path.

        :param disp: the peer manager to register
        :type disp: PeerManager
        :param readername: specific reader interresting this manager, or
            "*" for peer manager interrested by all readers.
        :type readername: str
        :param scrident: identification of packets source, or "*" for peer
            manager interested by all packet sources.
        :type srcident: hashable
        """
        if (readername, srcident) not in peer_packet_receivers:
            raise ValueError("OSC no PeerManager "\
                    "registered for {}".format((readername, srcident)))
            if peer_packet_receivers[(readername, srcident)] \
                                                            is not self:
                raise ValueError("OSC different registered packet dispatcher "\
                        "for {}".format((readername, srcident)))
            del peer_packet_receivers[(readername, srcident)]

    @staticmethod
    def get_manager(readername, srcident):
        """Get peer manager to process reader/source incoming packets.

        The peer manager is searched for most specialized to generic,
        matching for (readername, srcident), then for ('*',srcident'),
        then for (readername,'*') and finally for ('*','*').

        :param readername: reader name.
        :type readername: str
        :param scrident: identification of packets source.
        :type srcident: hashable
        :return: the most-specialized manager for the reader/source, or None
            if not found.
        :rtype: PeerManager
        """
        m = peer_packet_receivers.get((readername, srcident),
                                                                None)
        if m is None:
            m = peer_packet_receivers.get(('*', srcident),
                                                                None)
        if m is None:
            m = peer_packet_receivers.get((readername, '*'),
                                                                None)
        if m is None:
            m = peer_packet_receivers.get(('*', '*'), None)

        return m

    def received_rawpacket(self, rawoscdata, packopt):
        """Called when a raw packet come from peer channels.

        :param rawoscdata: raw OSC packet received from peer reader channel
        :type rawoscdata: memoryview
        :param packopt: the packet options for processing
        :type packopt: dict
        :return: the decoded packet and its adjusted processing options, if
            the packet must not be processed further the function return a
            None packet.
        :rtype: OSCMessage or OSCBundle, dict
        """
        try:
            packet = self.decode_rawpacket(rawoscdata, packopt)
            if self.logger is not None:
                self.logger.debug("OSC PeerManager %s, decoded packet "\
                        "id %d: %r", self.peername, id(packet), packet)
        except:
            if self.logger is not None:
                self.logger.exception("OSC PeerManager %s, error when "\
                        "decoding packet %r", self.peername, rawoscdata)
            return None, {}

        packopt.update_processing(self.inpackopt)

        if self.process_adminpacket(packet, packopt):
            return None, {}
        else:
            return packet, packopt

    def decode_rawpacket(self, rawoscdata, packopt):
        """Implement a basic raw OSC data parsing.

        Subclasses can override this method if they have extra process
        to decode the packet.

        :param rawoscdata: binary representation of an OSC packet.
        :type rawoscdata: bytes or bytearray or memoryview
        :param packopt: options for processing the packet
        :type packopt: PacketOptions
        """
        return oscbuildparse.decode_packet(rawoscdata)

    def process_adminpacket(self, packet, packopt):
        """Process the packet as administrative message if it is.

        Subclasses can override this method to test if the message is one
        they have to detect for administrative tasks (ex. setup addrpattern
        compression/decompression scheme), process it and return True, else
        they must return False.

        Base inherited method try to dispatch packet amond the private
        admindispatch Dispatcher, and consider the packet to have been
        processed if at least one method has been immediatly called.

        .. note: Mixing admin / normal messages in bundles.

            With that solution, you should *not* mix admin messages with
            normal messages in the same bundle.

        :param packet: the message or bundle to process as administative
            informations.
        :type packet: OSCMessage or OSCBundle
        :param packopt: options for processing the packet
        :type packopt: PacketOptions
        :return: boolean indicating that packet has been processed as
            admnistrative task (and should not be processed elsewhere).
        :rtype: bool
        """
        if self.admindispatch is None:
            return False
        else:
            admincount = self.admindispatch.dispatch_packet(packet, packopt)
            return admincount != 0

    def send_packet_to_peer(self, packet, packopt):
        """Send a packet using the manager writer(s).

        :param packet: osc message or bundle to send to peer systems.
        :type packet: OSCMessage or OSCBundle
        :param packopt: options for packet transmissions
        :type packopt: PacketOptions
        """
        # Delegate administration packets to special manager if any.
        if packopt.adminpacket and self.adminmanager is not None:
            # We can have a manager for high level communications.
            self.adminmanager.send_packet_to_peer(packet, packopt)
            return

        if self.logger is not None:
            self.logger.debug("OSC PeerManager %s, sending packet id %d: %r",
                                self.peername, id(packet), packet)

        # Do we have a way to send the packet?
        if not self.writersnames:
            if self.logger is not None:
                self.logger.info("OSC PeerManager %s, no writer to send "\
                        "packet id %d: %r", self.peername, id(packet), packet)
            return

        packopt = packopt.duplicate()
        packopt.peertarget = self.peername

        # Use overridable encoding method.
        rawdata = self.encode_packet(packet, packopt)

        # Use overridable transmission method.
        self.transmit_rawpacket(rawdata, packopt)

    def encode_packet(self, packet, packopt):
        """Implement a basic OSC data encoding into raw format.

        Subclasses can override this method if they have extra process
        to encode the packet.
        In such case, they must set special_transmit member to True.

        :param packet: osc message or bundle to encode for peer systems.
        :type packet: OSCMessage or OSCBundle
        :param packopt: options for packet transmissions
        :type packopt: PacketOptions
        """
        return oscbuildparse.encode_packet(packet)

    def transmit_rawpacket(self, rawpacket, packopt):
        """Send the raw OSC packet to writer channels for transmission.

        Subclasses can override this method if they have extra process
        to transmit the packet.
        In such case, they must set special_transmit member to True.

        :param rawpacket: binary representation of osc message or bundle.
        :type rawpacket: bytes or bytearray
        :param packopt: options for packet transmissions
        :type packopt: PacketOptions
        """
        # Simply use function to call writers transmission methods.
        transmit_rawpacket(rawpacket, packopt, self.writersnames, self.logger)

    def add_writer(self, writername):
        """Add a writer(s) for peer communications.

        .. note: Transport channel existence

            This is not tested a this method call time, so the channel itself
            can be installed later.

        :param writername: name of the transport channel object acting as a
            writer.
        :type writername: str
        """
        self.writersnames.add(writername)

    def remove_writer(self, writername):
        """Remove a writer from peer communications.

        :param writername: name of the transport channel object acting as a
            writer.
        :type writername: str
        """
        self.writersnames.remove(writername)

# Q? définir des "adminpeer" ou "parentpeer", qui regroupent
# l'authentification, les clés de compression/décompression, etc...


# Les options de com pourraient aussi être définies par
# Q? in case of multicast sending, shouln't we have a "peers", or a shared
class PeerGroup(object):
    """Identify a group of other OSC systems.

    Define same write methods as Peer to send OSC packets to different
    peer systems.
    """
    def __init__(self):
        self.peers = []

    def add(self, peer):
        self.peers.append(peer)

    def remove(self, peer):
        self.peers.remove(peer)


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


def next_sendpacket(timeout):
    """Return next packet and options to send.

    :param timeout: maximum time to wait for another  packet to send, 0 for
        immediate return, None for infinite wait.
    :type timeout: float or None
    :return: name of reader, identification of source, raw OSC packet data
    :rtype: tuple or None if no data available
    """
    if not sending_semaphore.acquire(True, timeout):
        return None

    if sending_packets:
        return sending_packets.popleft()
    else:
        return None


def post_sendpacket(sendingpacket):
    """Send a new packet in the reception queue.

    :param sendingpacket: packet and packet options to send.
    :type sendingpacket: SendingPacket
    """
    sending_packets.append(sendingpacket)
    # Awake waiting thread if any.
    sending_semaphore.release()


# ========================= SENDING GLOBAL FUNCTIONS =======================
def send_packet(packet, peername, packopt=None):
    """Send an OSC message or bundle to some peers.

    The peername can use some specific names:

        * _all          To address all standard writer channels.
    An later maybe:
        * _filter       To select standard writer channels with filtering
                        on addrpattern matching.

    :param packet: the bundle or message to send.
    :type packet: OSCMessage or OSCBundle
    :param peername: names to select what PeerManagers to use.
    :type peername: str or [str] or {str}
    """
    # Make peername a set of target.
    if isinstance(peername, (set, list, tuple)):
        targets = set(peername)
    else:
        targets = set([peername])

    if packopt is None:
        packopt = oscpacketoptions.PacketOptions()

    if packopt.nodelay:
        # Call the send function with no queue.
        packet_send_function(packet, packopt, targets)
    else:
        # Queue the packet to not consume time here.
        post_sendpacket(SendingPacket(packet, packopt, targets))


def packet_send_function(packet, packopt, targets, logger):
    """Identify peers / channels, and manage transmission.

    Proceed packet sending operations with managing multiple destinations
    with as common operations as possible.

    :param packet: the bundle or message to send.
    :type packet: OSCMessage or OSCBundle
    :param packopt: the options for packet transmission.
    :type packopt: PacketOptions
    :param targets: targetted peers names or channel names.
    :type targets: set
    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    """
    if logger is not None:
        logger.debug("OSC packet_send_function to targets %r with%s",
                     targets, packet)

    if "_local" in targets:
        # Directly call dispatching function, not going through OSC packet
        # sending via network & co.
        if global_dispatcher is not None:
            global_dispatcher.dispatch_packet(packet, packopt)
        else:
            if logger is not None:
                logger.warning("OSC no global dispatcher registered")
            # packet is not processed.
        targets.remove("_local")
        # We continue as we may have _local as only one of the peer targets.

    # Selection of peer manager / channel names with special names.
    if "_all" in targets:
        targets.remove("_all")
        for name in oscchannel.all_channels_peers:
            targets.add(name)
    if "_allpeers" in targets:
        targets.remove("_allpeers")
        for peername in all_peers:
            if all_peers[peername].inpeersgroup:
                targets.add(peername)
    if "_alladmin" in targets:
        targets.remove("_alladmin")
        for peername in all_peers:
            if all_peers[peername].inadmingroup:
                targets.add(peername)
    if "_allchannels" in targets:
        targets.remove("_allchannels")
        for cname in oscchannel.all_channels:
            targets.add(cname)

    # Names of channels who will directly receive the packet, without peer
    # management.
    directchannels = set()

    for tname in targets:
        manager = all_peers.get(tname, None)
        if manager is None:     # Not a manager target.
            if tname in oscchannel.all_channels:
                directchannels.add(tname)
            else:               # Neither a channel target.
                raise ValueError("OSC peer/channel  {!r} "\
                                "unknown".format(tname))
        else:
            if packopt.adminpacket and manager.adminmanager is not None:
                continue    # Manager peer administrator will do the job.
            if manager.special_transmit:
                # Direct send with channel own processing.
                if len(targets):
                    newoptions = packopt.duplicate()
                else:
                    newoptions = packopt
                newoptions.peertarget = tname
                manager.send_packet_to_peer(packet, newoptions)
            else:
                # Collect all channels in a set (ie this will count each
                # channel one time only).
                directchannels.update(manager.writersnames)

    # Now, transmit to all channels needing direct transmission.
    if directchannels:
        rawoscdata = oscbuildparse.encode_packet(packet)
        transmit_rawpacket(rawoscdata, packopt, directchannels, logger)


def transmit_rawpacket(rawpacket, packopt, writersnames, logger):
    """Call writer channels functions to transmit raw data.

    This function transmit the *same* raw OSC packet to a set of transport
    channels.

    :param rawpacket: the binary packet to write.
    :type rawpacket: bytes or bytearray
    :param packopt: the options for packet transmission.
    :type packopt: PacketOptions
    :param writersnames: set of names of writers to send data.
    :type writersnames: [ str ]
    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    :param workqueue: queue of works to planify transmissions in multiple
        threads or in a late event loop execution.
    """
    if logger is not None:
        logger.debug("OSC transmit_rawpacket to channels %r", writersnames)

    for cname in writersnames:
        chanel = oscchannel.all_channels.get(cname, None)
        if chanel is None:
            if logger is not None:
                logger.error("OSC transmit_rawpacket,  channel name "\
                    "%r is not referenced", cname)
            # Dismiss the packet.
            continue
        if not chanel.is_writer:
            if logger is not None:
                logger.error("OSC transmit_rawpacket, writer channel "\
                    "%r has not writing flag",
                    packopt.peertarget, cname)
            # Dismiss the packet.
            continue
        newopt = packopt.duplicate()
        newopt.chantarget = cname
        chanel.transmit_data(rawpacket, newopt)


# ====================== EVENT LOOP PUBLIC FUNCTIONS  ======================
def sendingpackets_process_loop(deadlinetime=0, logger=None):
    """Manage encoding and sending of packets.

    Called as a thread entry point, or as a simple function in a envent
    loop.

    :param deadlinetime: exit from loop after this time, even if there are
        remaining packets to send. Its an *absolute* time in seconds,
        in same time base as time.time().
        A 0 value do process all packets until the queue is empty then return.
        A None value is used when in own thread.
    :param deadlinetime: float or None
    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    """
    try:
        if deadlinetime is None and logger is not None:
            logger.info("OSC Starting sendingpackets_process_loop()")

        while True:
            timeout = oscscheduling.deadline2timeout(deadlinetime)
            nextsend = next_sendpacket(timeout)

            # If no packet while in event loop, return.
            if nextsend is None and deadlinetime == 0:
                return

            # If no packet while in own thread, continue with waiting.
            if nextsend is None and deadlinetime is None:
                continue

            # Proper termination via a special tuple.
            if nextsend is LAST_SENDINGPACKET:
                if rawpackets_terminate:
                    break       # Properly exit from function (from thread...)
                else:
                    nextsend = None

            if nextsend is not None:
                if logger is not None:
                    logger.debug("OSC send packets processing %r", nextsend)

                packet, packopt,  targets = nextsend
                packet_send_function(packet, packopt, targets, logger)

            # If has deadline elapsed, continue with waiting.
            if deadlinetime and time.time() > deadlinetime:
                break

        if deadlinetime is None and logger is not None:
            logger.info("OSC Finishing sendingpackets_process_loop()")
    except:
        if  logger is not None:
            logger.exception("OSC Failure in sendingpackets_process_loop()")


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


def rawpackets_process_loop(deadlinetime=0, logger=None):
    """Called by readers when some raw data come from the system.

    Process all queued packets until the queue is empty or a the deadlinetime
    is reach.

    :param deadlinetime: exit from loop after this time, even if there are
        remaining packets to process. Its an *absolute* time in seconds,
        in same time base as time.time().
        A 0 value do process all messages until the queue is empty then return.
        A None value is used when in own thread.
    :param deadlinetime: float or None
    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    """
    try:
        if deadlinetime is None and logger is not None:
            logger.info("OSC Starting rawpackets_process_loop()")

        while True:
            timeout = oscscheduling.deadline2timeout(deadlinetime)
            nextpacket = oscchannel.next_rawpacket(timeout)

            # If no packet while in event loop, return.
            if nextpacket is None and deadlinetime == 0:
                return

            # If no packet while in own thread, continue with waiting.
            if nextpacket is None and deadlinetime is None:
                continue

            # Proper termination via a special tuple.
            if nextpacket == oscchannel.LAST_RAWPACKET:
                if rawpackets_terminate:
                    break       # Properly exit from function (from thread...)
                else:
                    nextpacket = None

            if nextpacket is not None:
                if logger is not None:
                    logger.debug("OSC raw packets processing %r", nextpacket)

                # Identify peer manager for decoding.
                rawoscdata, packopt = nextpacket
                readername = packopt.readername
                srcident = packopt.srcident

                peermanager = PeerManager.get_manager(readername, srcident)

                if peermanager is None:
                    # No peer manager, just call standard OSC decoding
                    # and use default packet procssing options.
                    packet = oscbuildparse.decode_packet(rawoscdata)
                    packopt = oscpacketoptions.PacketOptions()
                else:
                    # There is a peer manager for the raw packet, call
                    # it to get the packet content and its processing options.
                    packet, packopt = peermanager.received_rawpacket(
                                                        rawoscdata, packopt)
                    # If peer manager has already processed the message
                    # (or dont want it to be dispatched), it simply
                    # return a None packet.
                if packet is not None:
                    if global_dispatcher is None:
                        if logger is not None:
                            logger.warning("OSC no global dispatcher "\
                                            "registered")
                        # packet is not processed.
                    else:
                        global_dispatcher.dispatch_packet(packet, packopt)
            # If has deadline elapsed, continue with waiting.
            if deadlinetime and time.time() > deadlinetime:
                break

        if deadlinetime is None and logger is not None:
            logger.info("OSC Finishing rawpackets_process_loop()")
    except:
        if  logger is not None:
            logger.exception("OSC Failure in rawpackets_process_loop()")


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


def create_rawpackets_thread(logger=None):
    """Build a thread to manage dispatching messages by calling functions.

    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    """
    global rawpackets_terminate, rawpackets_thread

    if rawpackets_thread is not None:
        return

    rawpackets_terminate = False
    rawpackets_thread = threading.Thread(target=rawpackets_process_loop,
                                args=(None, logger),  # Its not polling.
                                name="RawPackThread")
    rawpackets_thread.daemon = False
    rawpackets_thread.start()


def terminate_rawpackets_thread():
    """Set a flag and signal condition variable to finish delayed thread.

    Wait for the effective thread termination.
    Note: remaining packets in the received queue are ignored.
    """
    global rawpackets_terminate, rawpackets_thread

    rawpackets_terminate = True
    oscchannel.post_rawpacket(oscchannel.LAST_RAWPACKET)
    rawpackets_thread.join()
    rawpackets_thread = None


def create_sendingpackets_thread(logger=None):
    """Build a thread to manage dispatching messages by calling functions.

    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    """
    global sendpackets_thread, sendpackets_terminate

    if sendpackets_thread is not None:
        return

    sendpackets_terminate = False
    sendpackets_thread = threading.Thread(target=sendingpackets_process_loop,
                                args=(None, logger),  # Its not polling.
                                name="SendPackThread")
    sendpackets_thread.daemon = False
    sendpackets_thread.start()


def terminate_sendingpackets_thread():
    """Set a flag and signal condition variable to finish delayed thread.

    Wait for the effective thread termination.
    Note: remaining packets in the received queue are ignored.
    """
    global sendpackets_thread, sendpackets_terminate

    sendpackets_terminate = True
    post_sendpacket(LAST_SENDINGPACKET)
    sendpackets_thread.join()
    sendpackets_thread = None


# ======================= DISPATCHING PUBLIC FUNCTIONS  =====================
# To setup dispatcher and install OSC methods.

def register_method(method):
    """Install an OSC method to be called when receiving some messages.

    :param method: object to filter and call the method.
    :type method: MethodFilter
    """
    if global_dispatcher is None:
        raise RuntimeError("OSC no global dispatcher registered")
    global_dispatcher.add_method(method)


def unregister_method(method):
    """Remove ann installed OSC method.

    :param method: object to filter and call the method.
    :type method: MethodFilter
    """
    if global_dispatcher is None:
        raise RuntimeError("OSC no global dispatcher registered")
    global_dispatcher.remove_method(method)


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
    global_dispatcher = None
