#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/oscchannel.py
# <pep8 compliant>
"""Base classe for OSC data transmission.

TransportChannel provides basic options common to communication.

TransportChannel subclasses are used for communication with peer OSC
systems. They wrap transmission of OSC packets via different ways.

A channel can be just a reader or just a writer (for packet based
communications like UDP or multicast), or both (for connected stream
based communications like TCP or serial USB).
"""
#TODO: add slip2pacekt when writing  if necessary.

# To have a clean separation between channel readers and OSC management,
# we use an intermediate queue. It allow to have different policies
# for readers (ex. polling, own thread, global thread...) but same
# processing for message dispatching.
# Note: the queu manage concurrent access to storage.

# Note: I setup a Semaphore to support blocking threads on waiting for
# some packet availability in received_rawpackets queue (there is no wait
# method on deque). But it required Python3.2 for the Semaphore.wait timeout
# support, made the code unnecessarily less readable, and wasted some more
# time in system calls (TransportChannel.received_packet()+next_rawpacket cost
# twice).
# So I discard it.
# If necessary, next_rawpacket() callers should install a semi-active wait
# with frequent polling and some blocking with timeout.

import struct
import collections
import threading
import time
import queue

from .oscnettools import slip2packet
from . import oscscheduling
from . import oscpacketoptions
from . import oscbuildparse
# Problem with cycle in imports - finally, the function using this module
# does import one time when oscdispatching is None.
#from . import oscdispatching
oscdispatching = None

# These two limits + control are mainly fos DOS prevention. Maybe they are
# too high (would need limit use case to setup .
# Note: if you modify the value, modify TransportChannel documentation.
# Maximum packet size allowed if using simple header size field.
MAX_PACKET_SIZE_WITH_HEADER = 1024 * 1024
# Maximum concurrent clients allowed to send packets to same reader
# (with partial packet data staying in buffers).
MAX_SOURCES_ALLOWED = 500

# To group data and options in a named tuple when posting packets.
ReceivedPacket = collections.namedtuple("ReceivedPacket", "rawosc packopt")
# Parameters to use in post_rawpacket(*LAST_RAWPACKET) to signalspecial
# post (generally to have a thread wake up and check its termination flag).
LAST_RAWPACKET = ReceivedPacket(None, None)

# To group a packet to send and its options.
PendingPacket = collections.namedtuple("PendingPacket", "rawosc packopt")

# Monitor constants for automatically setup scheduling management.
SCHED_SELECTTHREAD = "selectthread"
SCHED_POLLTHREAD = "pollthread"
SCHED_OWNTHREAD = "ownthread"

# Queue of received raw OSC packets waiting to be processed.
# Each item is a tuple: (readername, sourceidentifier, oscrawdata)
# Note: oscrawdata is a memoryview on the packet data.
# Q? should we provide a maximum deque length for that ?
received_rawpackets = queue.Queue()

# Reference to all created channels by their name.
# Use the Python global lock to protect (rare) updates.
all_channels = {}

# Reference to channel by their peer identifiers.
all_channels_peers = {}


def get_channel(name):
    """Return a channel from a name.

    :param name: the channel name to find channel.
    :type name: str
    """
    return all_channels.get(name, None)


#======================= COMMUNICATIONS ABSTRACTION =========================
class TransportChannel(object):
    """A communication way with an OSC peer for read and/or write.

    Channel names can be built by subclasses from construction parameters.
    By example, an USB connection can use the USB device name in its name.

    Automatically called wrapper functions allow insertion of flow control
    in communications.
    Support for SLIP protocol and packet-length header in streams can be
    automatically setup just via options.

    Set a auto_activate flag to True in construction options to have the
    channel automatically enabled and running after construction.

    :ivar chaname: key to identify the OSC stream.
    :type chaname str
    :ivar mode: access read/write to the transport, 'r' or 'w' or 'rw'
    :type mode: str
    :ivar is_reader: flag to use the channel for reading.
    :type is_reader: bool
    :ivar is_writer: flag to use the channel for writing.
    :type is_writer: bool
    :ivar logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    :ivar actions_handlers: map of action verb and code or message to call.
        Default to empty map.
    :type actions_handlers: { str : callable or str }

    :ivar is_activated: flag set when the channel has been correctly activated.
    :type is_activated: bool
    :ivar is_scheduled: flag set when the channel has been inserted in
        scheduling (ie. read/write are monitored).
    :type is_scheduled: bool
    :ivar monitor: monitor used for this channel - the channel register itself
        among this monitor when becoming scheduled.
        This is the tool used to detect state modification on the channel
        and activate reading or writing of data.
    :type monitor: Monitoring
    :ivar monitor_terminate: flag to indicate that our monitor must be
        terminated with the channel deletion.
        Default upon automatic monitor, or use monitor_terminate key in
        options, default to False.
    :type monitor_terminate: bool
    :ivar monitored_writing: flag to indicate that channel is currently
        monitored for writing (which is not mandatory).
    :type monitored_writing: bool

    :ivar read_buffers: currently accumulated read and not processed data per
        identified source, used when data dont come by complete
        packets but by chuncks needing to be aggregated before identifying
        packets boundaries.
        Default to None, dict created when calling received_data() method.
    :type read_buffers: { identifier: bytearray }
    :ivar read_forceident: indexable informations to use for peer
        identification on read data (dont use other identification ways).
        Default to None
    :ivar read_dnsident: use address to DNS mapping automatically built
        from oscnettools module.
        Default to True
    :ivar read_datagram: flag to consider received data as entire datagrams
        (no data remain in the buffer, its all processed when received).
        Default to False.
    :type read_datagram: bool
    :ivar read_maxsources: maximum different sources allowed to send
        data to this reader simultaneously, used to limit an eventuel DOS on
        the system by sending incomplete packets.
        Set it to 0 to disable the limit.
        Default to MAX_SOURCES_ALLOWED (500).
    :type read_maxsources: int
    :ivar read_withslip: flag to enable SLIP protocol on received data.
        Default to False.
    :type read_withslip: bool
    :ivar read_withheader: flag to enable detection of packet size in the
        beginning of data.
        Default to False.
    :type read_withheader: bool
    :ivar read_headerunpack: either string data for automatic use of
        struct.unpack() or a function to call.
        For struct.unpack(), data is a tuple with: the format to decode header,
        the fixed header size, and the index of packet length value within the
        header tuple returned by unpack().
        For function, it will receive the currently accumulated data and
        must return a tuple with: the packet size extracted from the header,
        and the total header size.
        If there is no enough data in header to extract packet size, the
        function must return (0, 0).
        Default to  ("!I", 4, 0) to detect a packet length encoded in 4 bytes
        unsigned int with network bytes order.
        If the function need to pass some data in the current buffer
        (ex. remaining of an old failed communication), it can return an
        header size corresponding to the bytes count to ignore, and a
        packet size of 0 ; this will consume data with an -ignored- empty
        packet.
    :type read_headerunpack: (str,int,int) or fct(data) -> packsize,headsize
    :ivar read_headermaxdatasize: maximum count of bytes allowed in a packet
        size field when using headers.
        Set it to 0 to disable the limit.
        Default to MAX_PACKET_SIZE_WITH_HEADER (1 MiB).
    :type read_headermaxdatasize: int
    :ivar read_sequencing: indicate how the reader is used to effectively
        proceed to read.
    :type read_sequencing: int flag

    :ivar write_pending: queue of pending OSC raw packets to write with its
        options.
    :type write_pending: dequ of PendingPacket
    :ivar write_running: the OSC raw packet being written with its options
    :type write_running: PendingPacket
    :ivar write_lock: lock for concurrent access management to
        write_pending, write_running & Co.
    :type write_lock: Lock
    :ivar write_workqueue: queue of write jobs to execute. This allow to manage
        initial writing to peers in their own threads (nice for blocking
        write() calls) or in an event loop if working without thread.
        The queue will be filled when we detect that a write can occur
        (ie same channel will have maximum one write operation in
        the workqueue, even if there are multiple pending operations in
        the write_pending queue).
    :type write_workqueue: WorkQueue or None
    :ivar write_wqterminate: flag to indicate to call work queue termination
        when terminating the channel.
        Default to False.
    :type write_wqterminate: bool
    :ivar write_withslip: flag to enable SLIP protocol on sent data.
        Default to False.
    :type write_withslip: bool
    :ivar write_slip_flagatstart: flag to insert the SLIP END code (192) at
        beginning of sent data (when using SLIP).
        Default to True.
    :type write_slip_flagatstart:bool
    """
    def __init__(self, name, mode, options):
        """Setup an TransportChannel.

        :param name: identifier for the channel
        :type name: str
        :param mode: flag(s) for channel mode, MODE_READER, MODE_WRITER or
            MODE_READERWRITER.
        :type mode: set
        :param options: map of key/value options for the reader control, usage
            of a map allow to store some options in pref files, and to add
            options independantly of intermediate classes.
            See description of options with members of TransportChannel
            (option keys use same names as attributes).
        :type options: dict
        """
        if name.startswith('_'):
            raise ValueError("OSC channel name {!r} beginning with _ "\
                            "reserved.".format(name))
        if name in all_channels:
            raise ValueError("OSC channel/peer name {!r} already "\
                            "used.".format(name))
        self.chaname = name
        self.mode = mode
        self.logger = options.get("logger", None)
        self.actions_handlers = options.get("actions_handlers", {})
        self.monitor = options.get("monitor", None)
        if self.monitor == SCHED_SELECTTHREAD:
            self.monitor = oscscheduling.get_global_socket_monitor()
            self.monitor_terminate = False
        elif self.monitor == SCHED_POLLTHREAD:
            self.monitor = oscscheduling.get_global_polling_monitor()
            self.monitor_terminate = False
        elif self.monitor == SCHED_OWNTHREAD:
            self.monitor = oscscheduling.create_polling_monitor()
            self.monitor_terminate = False
            # And... we automatically create the thread here.
            period = options.get("monitor_period", 0.1)
            oscscheduling.create_monitoring_thread(
                                self.monitor, period, "mon-" + self.chaname)
        else:
            self.monitor_terminate = options.get("monitor_terminate", False)
        self.monitored_writing = False  # needed even if not a writer, for
                                        # monitoring flags computation.
        self.is_reader = False
        self.is_writer = False
        self.is_event = False
        self.is_activated = False
        self.is_scheduled = False

        if "r" in mode:
            self.setup_reader_options(options)
        if "w" in mode:
            self.setup_writer_options(options)
        if "e" in mode:
            self.setup_event_options(options)

        # Channel is constructed, can reference it.
        all_channels[self.chaname] = self

        if options.get('auto_start', True):
            self.activate()
            self.begin_scheduling()

    def terminate(self):
        """Called when channel is no longer used.

        This is the __init__() correspondance at end of life, it finish
        to correctly close / dissasemble / destroy the channel and remove
        it from internal use.

        The channel is normally never used after this call.
        """
        if self.is_writer and self.write_wqterminate and \
                              self.write_workqueue is not None:
            self.write_workqueue.terminate()    # Do join() if threads.

        if self.is_scheduled:
            self.end_scheduling()

        if self.monitor_terminate and self.monitor is not None:
            self.monitor.terminate()

        if self.is_activated:
            self.deactivate()

        del all_channels[self.chaname]

    def setup_reader_options(self, options):
        if self.logger is not None:
            self.logger.info("OSC channel %r setup as reader.", self.chaname)
        self.is_reader = True
        self.read_buffers = None
        self.read_forceident = options.get('read_forceident', None)
        self.read_dnsident = options.get('read_dnsident', True)
        self.read_datagram = options.get('read_datagram', False)
        self.read_maxsources = options.get('read_maxsources',
                                            MAX_SOURCES_ALLOWED)
        self.read_buffersize = options.get('read_buffersize', 4096)
        self.read_withslip = options.get("read_withslip", False)
        self.read_withheader = options.get("read_withheader", False)
        self.read_headerunpack = options.get('read_headerunpack', ("!I", 4, 0))
        self.read_headermaxdatasize = options.get("read_headermaxdatasize",
                                            MAX_PACKET_SIZE_WITH_HEADER)

    def setup_writer_options(self, options):
        if self.logger is not None:
            self.logger.info("OSC channel %r setup as writer.", self.chaname)
        self.is_writer = True
        self.write_pending = collections.deque()
        self.write_running = None
        self.write_lock = threading.RLock()
        # Will store tuples of: raw binary data, event to signal or None.
        #Q? management of a priority queue?
        self.write_withslip = options.get("write_withslip", False)
        self.write_slip_flagatstart = options.get("write_slip_flagatstart",
                                                    True)
        self.write_withheader = options.get("write_withheader", False)
        self.write_workqueue = options.get("write_workqueue", None)
        self.write_wqterminate = options.get("write_wqterminate", False)

    def setup_event_options(self, options):
        if self.logger is not None:
            self.logger.info("OSC channel %r setup as event.", self.chaname)
        self.is_event = True

    def handle_action(self, verb, parameters):
        """Special management in transport time operations.

        At some times transport channel methods call handle_action() to
        enable management of special operations in the system.
        This is controlled by the actions_handlers dictionnary, which
        map action verbs to OSC messages or direct callable.

        OSC messages have the advantage to simply integrate inside the
        general dispatching system, but disavantage of being generally
        processed asynchronously.
        When using OSC messages, the action parameters must be basic
        Python types usable as OSC values.

        Direct callable are processed immediately, they receive three
        parameters:
        - channel name
        - verb
        - action parameters tuple

        The OSC pattern is build from:

        - handler string (maybe empty, else start by /)
        - channel oscidentifier:

           - channel kind prefix (channel class specific)
           - channel name

        - verb

        It receives three parameters like for direct callable function:
        - channel name
        - verb
        - action paramters tuple

        OSCMessage example for a connexion request on a TCP channel, where
        the handler is set to string "/osc4py3", and the parameters is
        the IPV4 remote address and port tuple:

        * addrpattern: /osc4py3/tcp/camera/conreq
        * arguments: camera conreq (("123.152.12.4", 0),)

        OSCMessage example after having installed the connexion requested
        on this TCP channel, with same handler string "/osc4py3", when
        this is the second connexion occuring on the channel - there is no
        parameter but an ad-hoc channel has been created for the read and
        write operations:

        * addrpattern: /osc4py3/tcp/camera/2/connected
        * arguments: camera__2 connected ()

        OSCMessage example for a socket opened on an UDP channel, where the
        handler is set to empty string, and the parameter is the local bound
        port for the socket:

        * addrpattern: /udp/soundservice/bound
        * arguments: soundservice bound (17232, )

        :param verb: indication of the occuring action
        :type verb: str
        :param parameters: simple informations about the action
        :type parameters: tuple
        :return: callback return value or None, all times None for message
            handlers.
        :rtype: callback dependant
        """
        global oscdispatching
        handler = self.actions_handlers.get(verb, None)
        if handler is None:
            return
        if isinstance(handler, str):
            pattern = handler + self.oscidentifier() + "/" + verb
            msg = oscbuildparse.OSCMessage(pattern, None, parameters)
            if oscdispatching is None:  # Import here to avoid import cycle
                import oscdispatching
            oscdispatching.send_packet(msg, "_local")
            return None
        elif callable(handler):
            return handler(self.chaname, verb, parameters)
        else:
            if self.logger is not None:
                self.logger.debug("OSC channel %r handle_action %s with "\
                        "unusable handler %r.", self.chaname, verb,
                        handler)
            raise ValueError("OSC channel {!r} invalid action handler for "\
                        "verb {}".format(self.chaname, verb))

    # Default channel kind prefix, overriden in subclasses (ex. "udp", "tcp",
    # "usb", "serial"...).
    chankindprefix = "chan"

    def oscidentifier(self):
        """Return an identifier usable as a message pattern.

        The identifier must begin with /, not be terminate by / and follow
        OSC pattern names rules.
        """
        return "/" + self.chankindprefix + "/" + self.chaname

    def activate(self):
        """Open the channel and install it inside channels scheduling.
        """
        if self.is_activated:
            if self.logger is not None:
                self.logger.debug("OSC channel %r already activated.",
                            self.chaname)
            return
        if self.logger is not None:
            self.logger.debug("OSC opening channel %r.", self.chaname)
        self.handle_action("activating", ())
        self.open()
        self.is_activated = True
        self.handle_action("activated", ())
        if self.logger is not None:
            self.logger.info("OSC channel %r activated.", self.chaname)

    def deactivate(self):
        """Remove the channel from channels scheduling and close it.
        """
        if not self.is_activated:
            if self.logger is not None:
                self.logger.debug("OSC channel %r already deactivated.",
                            self.chaname)
            return

        if self.is_scheduled:   # Security
            if self.logger is not None:
                self.logger.warning("OSC preventively unscheduling "\
                        "channel %r before deactivating it.",
                        self.chaname)
            self.end_scheduling()

        if self.logger is not None:
            self.logger.debug("OSC closing channel %r.", self.chaname)

        self.handle_action("deactivating", ())
        try:
            self.close()
        except:
            if self.logger is not None:
                self.logger.exception("OSC channel %r failure during close",
                    self.chaname)
            # By default we consider that the failure dont prevent the file
            # close.

        self.is_activated = False
        self.handle_action("deactivated", ())
        if self.logger is not None:
            self.logger.info("OSC channel %r deactivated.", self.chaname)

    def begin_scheduling(self):
        """Start channel communication monitoring.
        """
        if self.logger is not None:
            self.logger.debug("OSC scheduling channel %r.", self.chaname)

        self.handle_action("scheduling", ())

        if not self.is_activated:
            raise RuntimeError("OSC channel must be activated before "\
                                "being scheduled")

        if self.monitor is not None:
            fno, rwe = self.calc_monitoring_fileno_flags()
            if rwe:
                self.monitor.add_monitoring(fno, self, rwe)

        self.is_scheduled = True
        self.handle_action("scheduled", ())
        if self.logger is not None:
            self.logger.info("OSC channel %r scheduled.", self.chaname)

    def end_scheduling(self):
        """Terminate channel communication monitoring.
        """
        if self.logger is not None:
            self.logger.debug("OSC unscheduling channel %r.", self.chaname)
        self.handle_action("unscheduling", ())

        if self.monitor is not None:
            fno, rwe = self.calc_monitoring_fileno_flags()
            if rwe:
                self.monitor.remove_monitoring(fno, self, rwe)

        self.is_scheduled = False
        self.handle_action("unscheduled", ())
        if self.logger is not None:
            self.logger.info("OSC channel %r unscheduled.", self.chaname)

    def calc_monitoring_fileno_flags(self):
        """Calculate fileno and rwe flags for monitoring.

        This function must only be called when there is a monitor.
        """
        # Note: write is not monitored by default but activated when
        # some data are written, using enable_write_monitoring() method.
        rwe = oscscheduling.MONITORING_EVENTS_MAP[
                            (int(self.is_reader),
                            int(self.monitored_writing),
                            int(self.is_event))]
        if self.monitor.need_fileno():
            fno = self.fileno()
        else:
            fno = id(self)
        return fno, rwe

    def open(self):
        """Called when must start the channel.

        When this method is called, resources needed to communicate with
        the peer via the channel mmust be setup.
        """
        pass

    def close(self):
        """Called when must stop the channel.

        When this method is called, resources needed to communicate with
        the peer via the channel mmust be released.
        """
        pass

    def fileno(self):
        """Return integer used for select()/poll to check/wait for data.

        """
        # Subclasses dealing with sockets must return the read fileno !!!
        return None

    def poll_monitor(self, deadlinetime, rwe):
        """Called by poll function to check transmissions status.

        When this method os called, it should try to just read the status
        of the channel and return it. If this imply some transmission,
        this must be considered when process_monevents() is called.

        :param deadlinetime: for possibly long read operations, absolute time
            to not past over.
            Can be None to indicate no deadline.
            Can be 0 to indicate to return as soon as possible.
        :type deadlinetime: float
        :param oper: operations to do, 'r' for read, 'w' for write, 'e' for
            event processing - there may be multiple operations.
        :type oper: str
        """
        raise NotImplementedError("poll_monitor must be overriden")

    def process_monevents(self, deadlinetime, oper):
        """Read next available raw data from the reader, or None.

        When this method is called, there is normally some data to read
        (or already read and cached somewhere), or write become possible
        or some event occured.
        The time spent here should be short - just the system call to
        retrieve or send data.
        In some case, some methods must be called to notify the end of a
        transmission (ex. received_data() or received_packet() when
        reading, packet_written() when writing).

        :param deadlinetime: for possibly long read operations, absolute time
            to not past over.
            Can be None to indicate no deadline.
            Can be 0 to indicate to return as soon as possible.
        :type deadlinetime: float
        :param oper: operations to do, 'r' for read, 'w' for write, 'e' for
            event processing - there may be multiple operations.
        :type oper: str
        """
        raise NotImplementedError("process_monevents must be overriden")

    #TODO: Use read_forceident and read_dnsident
    def received_data(self, identifier, data):
        """Called by subclass when *part* of an OSC packet has been received.

        Called by stream based readers to manage the stream itself.
        The method manage SLIP and header based identification of packets in
        streams.

        If the method can identify that a full packet has been received,
        then it call ad-hoc method to process it.

        .. note: Datagram readers

            Datagram based readers should directly call received_packet()
            method, unless they need support of some received_data()
            processing (multiple read concatenation, packet delimitation...).

        :param identifier: idenfifier of OSC peer origin of new data
        :type identifier: indexable value
        :param data: new data received.
        :type data: bytes
        """
        if self.logger is not None:
            self.logger.debug("OSC channel %r receive data from %s: %s",
                        self.chaname, repr(identifier), repr(data))

        if self.read_datagram:
            thebuffer = data
        else:
            # Ensure we have buffer management ready.
            if self.read_buffers is None:
                self.read_buffers = {}

            # Locally use the buffer.
            thebuffer = self.read_buffers.get(identifier, bytearray())
            if self.read_maxsources and \
                        len(self.read_buffers) > self.read_maxsources:
                # DOS security check.
                raise RuntimeError("OSC reader {}, maximum sources reach "\
                        "({})".format(self.chaname, self.read_maxsources))
            thebuffer.extend(data)

        # Will loop over buffer, extracting all available packets.
        while True:
            rawoscdata = None
            if self.read_withslip:
                rawoscdata, remain = slip2packet(thebuffer)
                if rawoscdata is None:  # No END found in slip data.
                    break
                # Split: received packet data / remaining data for next packet.
                rawoscdata = memoryview(rawoscdata)
                thebuffer = remain
            elif self.read_withheader:
                # Extract packet size from header if possible.
                if callable(self.read_headerunpack):
                    packetsize, headersize = self.read_headerunpack(thebuffer)
                else:
                    sformat, headersize, index = self.read_headerunpack
                    if len(thebuffer) < headersize:
                        headersize = 0
                    else:
                        packetsize = struct.unpack(sformat,
                                        thebuffer[:headersize])[index]
                        if self.read_headermaxdatasize and \
                                    packetsize > self.read_headermaxdatasize:
                            # This is a security, in case header is
                            # incorrectly aligned, or someone send too
                            # much data.
                            raise ValueError("OSC reader {} from client {}, "\
                                "packet size indicated in header ({}) is "\
                                "greater than max allowed "\
                                "({})".format(self.chaname, identifier,
                                packetsize, self.read_headermaxdatasize))

                if not headersize or headersize + packetsize > \
                        len(thebuffer):     # Not enough data.
                    break
                # Split: received packet data / remaining data for next packet.
                rawoscdata = memoryview(thebuffer)
                rawoscdata = rawoscdata[headersize:headersize + packetsize]
                thebuffer = thebuffer[headersize + packetsize:]
            elif self.read_datagram:
                break
            else:
                raise RuntimeError("OSC reader {} has no way to detect "\
                        "packets".format(self.chaname))

            if rawoscdata:
                self.received_packet(identifier, rawoscdata)

        if self.read_datagram:
            # We must proceed all datagram.
            if thebuffer:
                self.received_packet(identifier, memoryview(thebuffer))
        else:
            if thebuffer:
                # Store remaining data inside buffers dictionnary.
                self.read_buffers[identifier] = thebuffer
            elif identifier in self.read_buffers:
                del self.read_buffers[identifier]
                # or (?):
                #self.read_buffers[identifier] =  bytearray()

    def received_packet(self, sourceidentifier, rawoscdata):
        """Called by subclasses when a complete OSC packet has been received.

        This method deal with an eventual wrapper to manipulate packet data
        before it is transmited into higher OSC layers for decoding and
        dispatching.
        It can be called directly by message based readers.

        :param sourceidentifier: identification of the data source
        :type sourceidentifier: hashable value
        :param rawoscdata: OSC raw packet received from somewhere
        :type rawoscdata: memoryview
        """
        if self.logger is not None:
            self.logger.info("OSC channel %r receive packet from %s: %s",
                self.chaname, repr(sourceidentifier), repr(bytes(rawoscdata)))

        # Build the packet options, just update packet identification.
        packopt = oscpacketoptions.PacketOptions()
        packopt.readername = self.chaname
        packopt.srcident = sourceidentifier
        packopt.readtime = time.time()

        post_rawpacket(ReceivedPacket(rawoscdata, packopt))

    def transmit_data(self, rawoscdata, packopt):
        """Install the osc data into the transmission queue for writing.

        Called by distributing when an OSC packet is sent.

        :param rawoscdata: OSC raw packet prepared by peer manager.
        :type rawoscdata: bytearray
        :param packopt: options for packet sending
        :type packopt: PacketOptions
        """
        # May add a flag to check for writing initialization ready.
        # Systematic use of the write_pending queue ensure that packets
        # are written in the right order, even in multithread context.
        if self.logger is not None:
            self.logger.debug("OSC channel %r transmit_data via "\
                            "write_pending queue", self.chaname)

        tosend = PendingPacket(rawoscdata, packopt)

        with self.write_lock:
            if packopt.nodelay:
                # Install packet before other packets to send.
                self.write_pending.append_left(tosend)
            else:
                self.write_pending.append(tosend)
        self.schedule_write_packet()

    def packet_written(self):
        """Called by subclasses when current written packet is finished.

        * Terminate properly current write, managing internal status.
        * Schedule a new write if any available.
        """
        if self.logger is not None:
            self.logger.debug("OSC channel %r notification of written packet",
                            self.chaname)

        with self.write_lock:
            if self.write_running is None:
                if self.logger is not None:
                    self.logger.warning("OSC channel %r packet_written "\
                        "called with no packet running", self.chaname)
            else:
                # Finished with this packet.
                self.write_running.packopt.signal_event()
                self.write_running = None

        self.schedule_write_packet()

    def schedule_write_packet(self):
        """Install a new packet for writting if possible.

        To install a new packet ther must not be a currently running packet.
        """
        # Note: this method may be called recursively in case of blocking
        # write operations where start_write_packet() exit only when
        # transmission is finished.
        # Such case dont need monitoring, but should immediatly re-schedule
        # a new write at the end of start_write_packet() by calling
        # packet_written() (which call schedule_write_packet()).
        # This is the reason we use newwrite to start write operations out
        # of the write_lock protected zone.
        newwrite = False

        # Search next packet to write.
        with self.write_lock:
            # write_running must have been cleared when a packet has been
            # written, else we consider someone start writting somewhere else.
            if self.write_running is None and self.write_pending:
                if self.logger is not None:
                    self.logger.debug("OSC channel %r another write packet "\
                                    "available", self.chaname)
                # Install another packet to write.
                self.write_running = self.write_pending.popleft()
                newwrite = True
            if self.write_running is None:
                self.enable_write_monitoring(False)

        if newwrite:
            if self.logger is not None:
                self.logger.debug("OSC channel %r schedule of packet to "\
                                    "write", self.chaname)
            # If a special workqueue is attached to the channel write, then
            # writing operations take place as jobs of that workqueue - this
            # allow monitoring thread for multiple channels (ex. socket
            # monitoring threads) to only be used a a trigger detecting
            # when a channel become available.
            # Note that the same write workqueue can be shared between
            # different channels.
            if self.write_workqueue is None:
                self.write_operation()
            else:
                self.write_workqueue.send_callable(self.write_operation, ())

    def write_operation(self):
        """Start to write the data, and enable monitoring.

        This code is extracted from schedule_write_packet() to be callable
        in the context of a workqueue (either on multithreading or in
        an event loop).
        """
        self.start_write_packet()
        self.enable_write_monitoring(True)

    def enable_write_monitoring(self, enable):
        """Called to enable or disable monitoring of the channel for writing.

        Default method call the monitor method if its present.
        Enabling or disabling monitoring more than once is managed, and
        monitor methods are only called one time.

        Subclasses can override this method if they have their own write
        monitoring management or dont need it.
        They must manage self.monitored_writing attribute to True/False if a
        monitoring deactivation must be done at end of scheduling.

        They can call packet_written() if their write are synchronous,
        this will directly start another write operation if there is
        one pending.

        :param enable: flag to enable/disable write monitoring.
        :type enable: bool
        """
        if self.monitor is not None:
            with self.write_lock:
                # Manage possible recursive call with complete send in the
                # subclass start_write_packet() method which directly call
                # packet_written() with no more packet to write and no need
                # for monitoring.
                # So, if there is no running packet, disable monitoring.
                if self.write_running is None:
                    enable = False

                if enable == self.monitored_writing:
                    pass    # Already done.
                else:
                    if self.logger is not None:
                        self.logger.debug("OSC channel %r monitoring set "\
                                    "to %r", self.chaname, enable)
                    # Note: we call this method for the fileno, but we only
                    # change the "w" monitoring status.
                    fno, rwe = self.calc_monitoring_fileno_flags()
                    if enable:
                        self.monitor.add_monitoring(fno, self, "w")
                    else:
                        self.monitor.remove_monitoring(fno, self, "w")
                    self.monitored_writing = enable

    def start_write_packet(self):
        """Called to start writing of a packet.

        When his method is called there is a pending packet to write in
        self.write_running attribute (PendingPacket tuple).
        The override method must activate real writing of the data to OSC peer.

        After this method call, the enable_write_monitoring() method is
        automatically called with True.
        """
        raise NotImplementedError("start_write_packet must be overriden")


# ========================= CHANNEL PUBLIC FUNCTIONS  =======================
def terminate_all_channels():
    """Terminate and wait for end of all channels.
    """
    # Close transport channels.
    for chan in list(all_channels.values()):
        chan.terminate()


# ==================== TOP-LEVEL ACCESS TO RECEIVED DATA ====================
def next_rawpacket(timeout):
    """Return next packet extracted from the received queue.

    :param timeout: maximum time to wait for a new packet, 0 for immediate
        return, None for infinite wait.
    :type timeout: float or None
    :return: received packet informations
    :rtype: ReceivedPacket named tuple or None if no data available
    """
    if timeout == 0:    # Would not block.
        if received_rawpackets.empty():
            return None

    try:
        packet = received_rawpackets.get(True, timeout)
        received_rawpackets.task_done()
        return packet
    except queue.Empty:
        return None


def post_rawpacket(receivedpacket):
    """Send a new packet in the reception queue.

    .. note: at this level packet options is used to associate reception
        informations with the raw data (source, read time...).

    :param receivedpacket: received data from peer and packet options
    :type receivedpacket: ReceivedPacket
    """
    received_rawpackets.put(receivedpacket)
