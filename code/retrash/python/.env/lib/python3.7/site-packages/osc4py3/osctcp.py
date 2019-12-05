#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/osctcp.py
"""TCP (id. stream over IP) communications support.

Inspired from Python standard asyncore module.
"""
# <pep8 compliant>

# !!!!!!!!!!!!!!!!!!!!!!! THIS IS NOT FINISHED !!!!!!!!!!!!!!!!!!!!!!

import socket
import struct
import asyncore

from . import oscchannel

# Maximum packet read in one call.
TCPREAD_BUFSIZE = 8192

class TcpChannel(oscchannel.TransportChannel):
    """Reader/Writer for TCP packets.

    As a writer, a TCP channel can be used to establish a connected stream
    communication between us as a writer, and a remote TCP server.

    As a reader, a TCP channel wait for remote connections and automatically
    create other TcpChannels which them act as reader/writer
    """
    # For action handlers mapped to osc messages.
    chankindprefix = "tcp"

    def __init__(self, name, mode, options):
        # Override and call parent method.
        if ("r" in mode or "w" in mode) and "e" in mode:
            raise ValueError("OSC TCP channel cannot be used to read/write "\
                                "and manage connection simultaneously.")
        self.tcpsock = None
        self.tcpsockspec = None
        self.tcp_reuseaddr = options.get('tcp_reuseaddr', False)
        self.tcp_serverenabled = options.get('tcp_serverenabled', False)
        self.tcpconnected = False
        self.concount = 0
        # Note: this automatically call setup_reader_options() or/and
        # setup_writer_options() or/and setup_event_options();
        super().__init__(name, mode, options)

    def setup_reader_options(self, options):
        # Override and call parent method.
        super().setup_reader_options(options)
        # If the connection is already established, store it (it will be used
        # for reading and writing).
        self.tcpsock = options.get("tcp_consocket", None) 
        self.tcpsockspec = options.get("tcp_consocketspec", None)

    def setup_writer_options(self, options):
        # Override and call parent method.
        super().setup_writer_options(options)

        if options.get("tcp_consocket", None) is None:
            # Setup address specs for writing to TCP port.
            sockspeclist = network_getaddrinfo(options, "tcp", family=0,
                            addrtype=socket.socket.SOCK_STREAM,
                            proto=socket.SOL_TCP)
            # Setup target address - will be reach via udpwrite_outport.
            self.setup_tcpsockspec(sockspeclist)
        # else the connection is already established, and managed by the
        # setup_reader_options part.

    def setup_event_options(self, options):
        # Override and call parent method.
        super().setup_event_options(options)
        s = options.get("tcp_consocket", None)
        if s is not None:
            if self.logger is not None:
                self.logger.error("OSC channel %r cannot become "\
                                "TCP server with existing socket.",
                                 self.chaname, repr(s))
            raise ValueError("TCP connection mixed with communication")

        # Setup address specs for listening TCP port connection.
        sockspeclist = network_getaddrinfo(options, "tcp", family=0,
                        addrtype=socket.socket.SOCK_STREAM,
                        proto=socket.SOL_TCP)
        # Setup target address - will be reach via udpwrite_outport.
        self.setup_udpsockspec(sockspeclist)

    def setup_tcpsockspec(self, sockspeclist):
        if len(sockspeclist) > 1:
            if self.logger is not None:
                self.logger.warning("OSC channel {!r} retrieve multiple "\
                        "specs for host/port: {!r}".format(self.chaname,
                        sockspeclist))

        # If we have IPV6 and IPV4, we prefer IPV4.
        # Note: use tcp_forceipv4 / tcp_forceipv4 options (see
        # network_getaddrinfo() documentation).
        self.tcpsockspec = None
        if len(sockspeclist) > 2:
            for spec in sockspeclist:
                if spec.family == socket.AF_INET:
                    self.tcpsockspec = spec
                    break   # Stop here, we have it.
                elif spec.family == socket.AF_INET6:
                    self.tcpsockspec = spec
                    # but continue to search for INET.
        if self.tcpsockspec is None:
            self.tcpsockspec = sockspeclist[0]

    def open(self):
        # Connection may have been already established if the TcpChannel
        # is the result of a remote connection.
        if self.tcpsock is not None:
            return

        self.tcpsock = socket.socket(self.tcpsockspec.family,
                                          socket.SOCK_STREAM)
        if self.tcp_reuseaddr:
            self.tcpsock.setsockopt(socket.SOL_SOCKET,
                                    socket.SO_REUSEADDR, 1)

        if self.tcp_serverenabled:
            # Bind to address for listening.
            self.tcpsock.bind(self.udpsockspec.sockaddr)
        else:
            # Connect to remote server.
            self.tcpsock.connect(self.udpsockspec.sockaddr)

    def close(self):
        # Override parent method.
        if self.tcpsock is None:
            return

        self.tcpsock.close()
        self.tcpsock = None
        if self.logger is not None:
            self.logger.info("TCP channel %r closed.", self.chaname)

    def fileno(self):
        # Override parent method.
        if self.tcpsock is not None:
            return self.tcpsock.fileno()
        else:
            return None

    def process_monevents(self, deadlinetime, oper):
        # Override parent method.
        if self.logger is not None:
            self.logger.debug("TCP channel %r trigged for transmissions. %s",
                                self.chaname, oper)
        if 'r' in oper:
            if self.tcpmainsocket:
                self.process_accept(deadlinetime)
            elif not self.tcpconnected:
                self.process_connect(deadlinetime)
                self.process_read_raw(deadlinetime)
            else:
                self.process_read_raw(deadlinetime)
        if 'w' in oper:
            self.process_raw_written(deadlinetime)
        if 'e' in oper:
            self.process_sock_event(deadlinetime)

    def process_read_raw(self, deadlinetime):
        pass
 
    def start_write_packet(self):
        pass

    def process_connect(self, deadlinetime):
        err = self.tcpsock.getsockopt(socket.SOL_SOCKET, socket.SO_ERROR)
        if err != 0:
            if self.logger is not None:
                self.logger.error("TCP channel %r error %d. Terminating.",
                                self.chaname, err)
            # Destroy the channel.
            self.terminate()
        else:
            self.tcpconnected = True

    def process_accept(self, deadlinetime):
        """A TCP connection come from client.
        """
        newsock, address = s.accept()

        if self.logger is not None:
            self.logger.debug("TCP channel %r connection from %r",
                                self.chaname, address)

        # Build specs t be usable for debugging problems.
        s = self.tcpsockspec    # shortcut
        n = resolve_dns_identification(address[0])
        newsockspec = oscnettools.AddrInfo(s[0], s[1], s[2], n, address)

        # Make name from this channel, with an incremented client number.
        self.concount += 1
        clientname = "{}__{}".format(self.channame, self.concount)

        # Create a TcpChannel to handle communications.
        chan = TcpChannel(clientname, "rw", options={
                    "tcp_consocket": newsock,
                    "tcp_consocketspec": newsockspec,
                    })

    def process_raw_written(self, deadlinetime):
        pass

    def process_sock_event(self, deadlinetime):
        # A connection occured.
        err = self.tcpsock.getsockopt(socket.SOL_SOCKET, socket.SO_ERROR)
        if err != 0:
            # we can get here when select.select() says that there is an
            # exceptional condition on the socket
            # since there is an error, we'll go ahead and close the socket
            # like we would in a subclassed handle_read() that received no
            # data
            self.handle_close()
        else:
            self.handle_expt()


class TcpChannel():
    """Base class for different TCP channels.
    """
    chankindprefix = "tcp"
    
    def fileno(self):
        # Override parent method.
        if self.tcpsock is not None:
            return self.tcpsock.fileno()
        else:
            return None


class TcpEndPointChannel():
    """Class for a TCP client or a connected side of TCP server.

    Manage TCP communications and disconnection.
    """


class TcpClientChannel(TcpEndPointChannel):
    """Class for a TCP client or a connectec side of TCP server.

    Initiate TCP communication from client side, let superclass manage 
    communications and disconnection.
    """

class TcpCxPointChannel():
    """Class for a TCP connection point server.

    Manage initial TCP connection and create end-point for 
    """


""" NOTES / IDEAS

When a TCP connection occure, dispatch an OSC message like
    /osc4py3/tcp/channame/conreq   channame  connum  remoteaddr
Where connnum is incremeted for each connexion.

After, build a special channel channame__connum to manage the
read/write.

When it is established:
    /osc4py3/tcp/channame/connum/connected   channame  connum  remoteaddr


Q? a way to wait for an osc /osc4py3 messsage to be executed ?
==> no way, there may be no handler, and it may be managed asynchronously.
The ony synchrone solution is to support possible special *callbacks* via
options.

/osc4py3/udp/channame/opened
"""

