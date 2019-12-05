#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/oscudpmc.py
# <pep8 compliant>
"""UDP and multicast/broadcast (id. datagram over IP) communications support.

Note: only simple UDP has been tested.
"""

import socket
import struct

from . import oscchannel
from .oscnettools import network_getaddrinfo, resolve_dns_identification
from . import oscscheduling

# Maximum packet read in one call.
UDPREAD_BUFSIZE = 8192


class UdpMcChannel(oscchannel.TransportChannel):
    """Reader/Writer for UDP or Multicast packets.

    For netword address management, see also network_getaddrinfo() function
    in oscnettools module, using prefix udpread or udpwrite.

    One UDPChannel object can be used to manage only one UDP port, for
    reading datagrams or for writing datagrams - not both.
    It can be used only for one multicast group (formultiple groups, create
    multiple channels).

    Writing
    -------

    We need an address specification to identify the protocol family to use
    (IPV4/IPV6), you can simply use 0.0.0.0 for IPV4 or :: for IPV6.
    You may eventually also provide a non-zero port to  force a bind on this
    port and have a known output port when sending datagrams (usage: make
    firewall configuration easier, make sender application identification
    easier).
    Note that binding use your providen address specification, ensure that
    this address can reach your destinations.

    Multicast
    ---------

    You have to define the multicast hosts group as a class D IP address in the
    IPV4 range 224.0.0.1 to 239.255.255.255 and simply specify it as UDP address.
    When building the UdpMcChannel, you must provide parameters in options
    dictionnary for reader (OSC server) channel:

    - 'mcast_enabled' → True
    - 'udpread_host' → GROUP_ADDRESS
    - 'udpread_port' → GROUP_PORT

    For writer channels (OSC client), you may specify:

    - 'mcast_enabled' → True
    - 'mcast_loop' → False (to not send packets to local host too,
      default to True)
    - 'udpwrite_ttl' → time to live stored in multicast datagram headers.
    - 'udpwrite_host' → GROUP_ADDRESS
    - 'udpwrite_port' → GROUP_PORT

    Broadcast
    ---------

    You have to use an IP broadcast address for the writer channel (OSC client).
    Your server(s) can listen on universal IPV4 0.0.0.0 address or on a network
    address. For IPV6, use special multicast address like ff02::1 (link nodes),
    ff02::2 node routers), ff02::3 (link hosts), ff02::5 (site routes)…
    When building the UdpMcChannel, you must provide parameters in options
    dictionnary for reader (OSC server) channel:

    - 'bcast_enabled' → True
    - 'udpread_host' → ADDRESS
    - 'udpread_port' → BORADCSAT_PORT

    For writer channels (OSC client), you may specify

    - 'bcast_enabled' → True
    - 'udpwrite_host' → BROADCAST_ADDRESS
    - 'udpwrite_port' → BROADCAST_PORT

    Parameters
    ----------

    :ivar udpread_buffersize: maximum bytes size in one read call.
        Default 8KBi to read potential large packet.
    :type udpread_buffersize: int
    :ivar udpread_host: address of host to bind. Can be a DNS name or an IPV4
        or IPV6 address.
    :type udpread_host: str
    :ivar udpread_port: number of port to bind.
    :type udpread_port: int
    :ivar udpread_forceipv4: flag to prefer IPV4 in case of multiples addresses
        for the DNS name.
        Default to False.
    :type udpread_forceipv4: bool
    :ivar udpread_forceipv6: flag to prefer IPV6 in case of multiples addresses
        for the DNS name.
        Default to False.
    :type udpread_forceipv6: bool
    :ivar udpread_dontcache: flag to not cache data in case of DNS resolution.
        Default to False (ie. cache enabled).
    :type udpread_dontcache: bool
    :ivar udpread_reuseaddr: flag to enable ioctl settings for reuse of
        socket address
        Default to True.
    :type udpread_reuseaddr: bool
    :ivar udpread_nonblocking: flag to enable non-blocking on the socket.
        Default to True.
    :type udpread_nonblocking: bool
    :ivar udpread_identusedns: translate address to DNS name using oscnettools
        DNS addresses cache.
        Default to False.
    :type udpread_identusedns: bool
    :ivar udpread_identfields: count of fields of remote address identification
        to use for source identification.
        Use 0 for all fields.
        Default to 2 for (hostname, port) even with IPV6
    :type udpread_identfields: int
    :ivar udpread_asstream: process UDP packets with stream-based methods,
        to manage rebuild of OSC packets from multiple UDP reads.
        Bad idea - but if you need it, don't miss to setup options like
        read_withslip, read_withheader...
        Default to False.
    :type udpread_asstream: bool

    :ivar udpwrite_host: address of host to write to. Can be a DNS name or an
        IPV4 or IPV6 address.
    :type udpwrite_host: str
    :ivar udpwrite_port: number of port to write to.
    :type udpwrite_port: int
    :ivar udpwrite_outport: number of port to bind the socket locally.
        Default to 0 (auto-select).
    :type udpwrite_outport: int
    :ivar udpwrite_forceipv4: flag to prefer IPV4 in case of multiples
        addresses for the DNS name.
        Default to False.
    :type udpwrite_forceipv4: bool
    :ivar udpwrite_forceipv6: flag to prefer IPV6 in case of multiples
        addresses for the DNS name.
        Default to False.
    :type udpwrite_forceipv6: bool
    :ivar udpwrite_dontcache: flag to not cache data in case of DNS resolution.
        Default to False (ie. cache enabled).
    :ivar udpwrite_reuseaddr: fla to enable ioctl settings for reuse of
        socket address
        Default to True.
    :type udpwrite_reuseaddr: bool
    :ivar udpwrite_nonblocking: flag to enable non-blocking on the socket.
        Default to True.
    :type udpwrite_nonblocking: bool
    :ivar udpwrite_ttl: time to leave counter for packets, also used for
        multicast hops with IPV6.
        Default to None (use OS socket default).
    :type udpwrite_ttl: int

    :ivar mcast_enabled: flag to enable multicast.
        If True, writer's udpwrite_host must be a multicast group,
        and its a good idea to set udpwrite_ttl to 1 (or more if need
        to reach furthest networks).
        Default to False.
    :type mcast_enabled: bool
    :ivar mcast_loop: flag to enable/disable looped back multicast packets
        to host.
        Default to True (it is normally enabled by default at the OS level).
    :type mcast_loop: bool
    :ivar bcast_enabled: flag to enable broadcast.
        If True, the udpwrite_host must be a network broadcast address,
        and its a good idea to set udpwrite_ttl to 1 (or more if need
        to reach furthest networks).
        Default to False.
    :type bcast_enabled: bool
    """
    # NOTE: for multicast, may have to specify the multicast interface to use, like:
    # intf = socket.gethostbyname(socket.gethostname())
    # s.setsockopt(socket.SOL_IP, socket.IP_MULTICAST_IF, socket.inet_aton(intf))

    # For action handlers mapped to osc messages.
    chankindprefix = "udpmc"

    def __init__(self, name, mode, options):
        # Override and call parent method.
        if "r" in mode and "w" in mode:
            raise ValueError("OSC UDP channel cannot be used to read and "\
                             "write simultaneously.")
        self.udpsock = None
        self.udpsockspec = None
        self.mcast_enabled = options.get('mcast_enabled', False)
        self.mcast_loop = options.get('mcast_loop', True)
        self.mcast_ttl = options.get('mcast_ttl', None)
        self.bcast_enabled = options.get('bcast_enabled', False)
        # Note: this automatically call setup_reader_options() or/and
        # setup_writer_options() or/and setup_event_options();
        super().__init__(name, mode, options)

    def setup_reader_options(self, options):
        # Override and call parent method.
        super().setup_reader_options(options)
        self.udpread_buffersize = options.get('udpread_buffersize',
                                                    UDPREAD_BUFSIZE)
        self.udpread_reuseaddr = options.get('udpread_reuseaddr', True)
        self.udpread_nonblocking = options.get('udpread_nonblocking', True)
        self.udpread_identusedns = options.get('udpread_identusedns', False)
        self.udpread_identfields = options.get('udpread_identfields', 2)
        self.udpread_asstream = options.get('udpread_asstream', False)

        # Setup address specs for reading on UDP port.
        sockspeclist = network_getaddrinfo(options, "udpread", family=0,
                        addrtype=socket.SOCK_DGRAM, proto=socket.SOL_UDP)
        self.setup_udpsockspec(sockspeclist)

    def setup_writer_options(self, options):
        # Override and call parent method.
        super().setup_writer_options(options)
        self.udpwrite_reuseaddr = options.get('udpwrite_reuseaddr', False)
        self.udpwrite_ttl = options.get('udpwrite_ttl', None)
        self.udpwrite_nonblocking = options.get('udpwrite_nonblocking', True)
        self.udpwrite_outport = options.get('udpwrite_outport', 0)

        # Setup address specs for writing on UDP port.
        sockspeclist = network_getaddrinfo(options, "udpwrite", family=0,
                        addrtype=socket.SOCK_DGRAM, proto=socket.SOL_UDP)
        # Setup target address - will be reach via udpwrite_outport.
        self.setup_udpsockspec(sockspeclist)
        if self.monitor is None and self.udpwrite_nonblocking:
            if self.logger is not None:
                self.logger.error("OSC channel {!r} cannot use "\
                        "nonblocking write without a monitor".format(
                        self.chaname))
            raise RuntimeError("cannot use nonblocking write without "\
                                "a monitor")

    def setup_udpsockspec(self, sockspeclist):
        if len(sockspeclist) > 1:
            if self.logger is not None:
                self.logger.warning("OSC channel {!r} retrieve multiple "\
                        "specs for host/port: {!r}".format(self.chaname,
                        sockspeclist))

        # If we have IPV6 and IPV4, we prefer IPV4.
        # Note: use udpwrite_forceipv4 / udpwrite_forceipv6 options (see
        # network_getaddrinfo() documentation).
        self.udpsockspec = None
        if len(sockspeclist) > 2:
            for spec in sockspeclist:
                if spec.family == socket.AF_INET:
                    self.udpsockspec = spec
                    break   # Stop here, we have it.
                elif spec.family == socket.AF_INET6:
                    self.udpsockspec = spec
                    # but continue to search for INET.
        if self.udpsockspec is None:
            self.udpsockspec = sockspeclist[0]

    def open(self):
        # Override parent method.
        if self.is_reader:
            # Open socket with family (IPV4, IPV6, UNIX...) and type.
            self.udpsock = socket.socket(self.udpsockspec.family,
                                          socket.SOCK_DGRAM)
            self.udpsock.setblocking(False)
            if self.udpread_reuseaddr:
                self.udpsock.setsockopt(socket.SOL_SOCKET,
                                        socket.SO_REUSEADDR, 1)
                # For BSD muticast - allow multiple applications to bind to
                # same port (seem SO_REUSEADDR does it on Linux).
                # see http://www.unixguide.net/network/socketfaq/4.11.shtml
                if self.mcast_enabled and hasattr(socket, "SO_REUSEPORT"):
                    self.udpsock.setsockopt(socket.SOL_SOCKET,
                                        socket.SO_REUSEPORT, 1)
            if self.udpread_nonblocking:
                self.udpsock.setblocking(False)
            self.udpsock.bind(self.udpsockspec.sockaddr)
            if self.logger is not None:
                self.logger.info("UDP channel %r open read on %s.",
                                 self.chaname, repr(self.udpsockspec))

        if self.is_writer:
            # Open socket with family (IPV4, IPV6, UNIX...) and type.
            self.udpsock = socket.socket(self.udpsockspec.family,
                                          socket.SOCK_DGRAM)

            # Set reuse address for port binding.
            if self.udpwrite_reuseaddr:
                # Note: if udpwrite_outport is 0, then it is automatically
                # allocated to a free port, so dont need this.
                self.udpsock.setsockopt(socket.SOL_SOCKET,
                                        socket.SO_REUSEADDR, 1)

                # For BSD muticast - allow multiple applications to bind to
                # same port (seem SO_REUSEADDR does it on Linux).
                # see http://www.unixguide.net/network/socketfaq/4.11.shtml
                if self.mcast_enabled and hasattr(socket, "SO_REUSEPORT"):
                    self.udpsock.setsockopt(socket.SOL_SOCKET,
                                        socket.SO_REUSEPORT, 1)

            # Set Time To Leave for packets (or mcast hops for ipv6).
            if self.udpwrite_ttl is not None:
                ttl_bin = struct.pack('@i', self.udpwrite_ttl)
                if self.udpsockspec.family == socket.AF_INET: # IPv4
                    self.udpsock.setsockopt(socket.IPPROTO_IP,
                        socket.IP_MULTICAST_TTL, ttl_bin)
                elif self.udpsockspec.family == socket.AF_INET6:
                    self.udpsock.setsockopt(socket.IPPROTO_IPV6,
                        socket.IPV6_MULTICAST_HOPS, ttl_bin)

            # Set loop for multicsat packets.
            if self.mcast_enabled and self.mcast_loop:
                loop_bin = struct.pack('@i', 1 if self.mcast_loop else 0)
                if self.udpsockspec.family == socket.AF_INET: # IPv4
                    self.udpsock.setsockopt(socket.IPPROTO_IP,
                        socket.IP_MULTICAST_LOOP, loop_bin)
                elif self.udpsockspec.family == socket.AF_INET6:
                    self.udpsock.setsockopt(socket.IPPROTO_IPV6,
                        socket.IPV6_MULTICAST_LOOP, loop_bin)

            # Todo: support selection of output interface via:
            # IPV6_MULTICAST_IF & IP_MULTICAST_IF
            # IPV6_UNICAST_IF

            # Set non blocking.
            if self.udpwrite_nonblocking:
                self.udpsock.setblocking(False)

            # Bind to network corresponding to family, this ensure we stay on
            # the same port for each write (and maybe avoid some extra work
            # at each sent).
            addr = self.udpsockspec.sockaddr
            if self.udpsockspec.family == socket.AF_INET:
                addr = ("0.0.0.0", self.udpwrite_outport)
            elif self.udpsockspec.family == socket.AF_INET6:
                addr = ("::", self.udpwrite_outport) + addr[2:]
            self.udpsock.bind(addr)

            # Enable broadcast.
            if self.bcast_enabled:
                if self.udpsockspec.family == socket.AF_INET6:
                    if self.logger is not None:
                        self.logger.info("UDP channel %r can only do "\
                                "broadcastt with IPV4 - use special IPV6 "\
                                "multicast address or prefer IPV4.",
                                self.chaname)
                        raise ValueError("no broadcast with IPV6")
                self.udpsock.setsockopt(socket.SOL_SOCKET,
                                        socket.SO_BROADCAST, 1)

            if self.logger is not None:
                self.logger.info("UDP channel %r open write on %s target %s.",
                            self.chaname, repr(addr), repr(self.udpsockspec))

        # Join multicast group  (Xinne -> for writer and reader).
        if self.mcast_enabled:
            group_bin = socket.inet_pton(self.udpsockspec.family,
                                self.udpsockspec.sockaddr[0])
            if self.udpsockspec.family == socket.AF_INET: # IPv4
                mreq = group_bin + struct.pack('=I', socket.INADDR_ANY)
                self.udpsock.setsockopt(socket.IPPROTO_IP,
                                    socket.IP_ADD_MEMBERSHIP, mreq)
            elif self.udpsockspec.family == socket.AF_INET6:
                mreq = group_bin + struct.pack('@I', 0)
                self.udpsock.setsockopt(socket.IPPROTO_IPV6,
                                    socket.IPV6_JOIN_GROUP, mreq)
            if self.logger is not None:
                self.logger.info("UDP channel %r member of group %s.",
                            self.chaname, repr(group_bin))


    def close(self):
        # Override parent method.
        if self.udpsock is None:
            return

        if self.is_writer:
            # Leave multicast group.
            if self.mcast_enabled:
                group_bin = socket.inet_pton(self.udpsockspec.family,
                                    self.udpsockspec.sockaddr[0])
                if self.udpsockspec.family == socket.AF_INET: # IPv4
                    mreq = group_bin + struct.pack('=I', socket.INADDR_ANY)
                    self.udpsock.setsockopt(socket.IPPROTO_IP,
                                        socket.IP_DROP_MEMBERSHIP, mreq)
                elif self.udpsockspec.family == socket.AF_INET6:
                    mreq = group_bin + struct.pack('@I', 0)
                    self.udpsock.setsockopt(socket.IPPROTO_IPV6,
                                        socket.IPV6_LEAVE_GROUP, mreq)

        self.udpsock.close()
        self.udpsock = None
        if self.logger is not None:
            self.logger.info("UDP channel %r closed.", self.chaname)

    def fileno(self):
        # Override parent method.
        if self.udpsock is not None:
            return self.udpsock.fileno()
        else:
            return None

    def poll_monitor(self, deadlinetime, rwe):
        # In case someone choose a poll monitoring on an UDP socket.
        return oscscheduling.wait_select_deadline(self.fileno(),
                                                    deadlinetime, rwe)

    def process_monevents(self, deadlinetime, oper):
        # Override parent method.
        if self.logger is not None:
            self.logger.debug("UDP channel %r trigged for transmissions. %s",
                                self.chaname, oper)
        if 'r' in oper:
            self.process_read_raw(deadlinetime)
        if 'w' in oper:
            self.process_raw_written(deadlinetime)

    def process_read_raw(self, deadlinetime):
        # Read data - consider UDP return one whole datagram in one read.
        # Note: use setblocking() on socket as Windows dont know about socket.MSG_DONTWAIT
        try:
            newread, srcaddress = self.udpsock.recvfrom(self.udpread_buffersize)
        except BlockingIOError:
            # On Windows, get a BlockingIOError: [WinError 10035] not immediatly finished
            # non blocking operation on a socket.
            newread, srcaddress = "", None
        if len(newread) == 0:
            return   # Nothing to read.

        # Adjust source address for natural usage by higher layers.
        if self.udpread_identusedns:
            newaddress = resolve_dns_identification(srcaddress[0],
                                                    forceresolution=True)
            # Note: forceresolution to have DNS resolution one time, if it
            # fail the failure is cached and None systematically returned
            # with no more try.
            if newaddress is not None:
                # For IPV6 the srcaddress may have more than host,port fields.
                srcaddress = (newaddress,) + srcaddress[1:]

        if self.udpread_identfields == 1:
            # Just keep address.
            srcaddress = srcaddress[0]
        elif self.udpread_identfields > 1:
            # Keep address, port... maybe more with IPV6.
            srcaddress = srcaddress[:self.udpread_identfields]

        # Process received packet.
        if self.udpread_asstream:
            self.received_data(srcaddress, newread)
        else:
            self.received_packet(srcaddress, newread)

    def start_write_packet(self):
        # Call network write function.
        if self.logger is not None:
            self.logger.debug("UDP sendto(%r (...), %s)",
                    self.write_running.rawosc[:40], self.udpsockspec.sockaddr)
        self.udpsock.sendto(self.write_running.rawosc,
                            self.udpsockspec.sockaddr)
        if not self.udpwrite_nonblocking:
            # A-priori a synchronous call, need to call packet_written()
            # ourself as there is no need of enabling monitor to detect it.
            self.packet_written()

    def process_raw_written(self, deadlinetime):
        # A write event occured on the socket (ie write finished).
        # Signal packet sent.
        if self.udpwrite_nonblocking:
            self.packet_written()
        # In case of blocking write, we may have called this method with a
        # direct call to transmit_data (for tests).
        #else:
        #    if self.logger is not None:
        #       self.logger.error("UDP channel %r should not be monitored on "
        #                        "writing as it uses blocking write.",
        #                        self.chaname)
