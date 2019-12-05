#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/as__common.py
# <pep8 compliant>
"""
Each :mod:`as_eventloop`, :mod:`as_allthreads` and :mod:`as_comthreads`
module define the same set of functions documented here.
"""
# Share code and documentation for as_xxx modules.

from . import oscmethod

__all__ = [
    "osc_startup",
    "osc_terminate",
    "osc_process",
    "osc_method",
    "osc_send",
    "osc_udp_server",
    "osc_udp_client",
    "osc_multicast_server",
    "osc_multicast_client",
    "osc_broadcast_server",
    "osc_broadcast_client",
    ]


def osc_startup(**kwargs):
    """\
    Once call startup function for all osc processing in the event loop.

    Create the global dispatcher and register it for all packets and messages.
    Create threads for background processing when used with as_allthreads or
    as_comthreads scheduling.

    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    :param execthreadscount: number of execution threads for methods to
        create. Only used with as_allthreads scheduling.
        Default to 10.
    :type execthreadscount: int
    :param writethreadscount:  number of write threads for packet sending to
        create. Only used with as_allthreads scheduling.
        Default to 10.
    :type writethreadscount: int
    """
    pass


def osc_terminate():
    """\
    Once call termination function for clean the exit of process.
    """
    pass


def osc_process():
    """\
    Function to call from your event loop to receive/process OSC messages.
    """
    pass


def osc_method(addrpattern, function, argscheme=oscmethod.OSCARG_DATAUNPACK, extra=None):
    """\
    Add a method filter handler to automatically call a function.

    Note: there is no unregister function at this level of osc4py use.

    :param addrpattern: OSC pattern to match
    :type addrpattern: str
    :param function: code to call with the message arguments
    :type function: callable
    :param argscheme: scheme for handler function arguments.
        By default message data are transmitted, flattened as N parameters.
    :type argscheme: tuple
    :param extra: extra parameters for the function (must be specified in argscheme too).
    :type extra: anything
    """
    pass


def osc_send(packet, names):
    """\
    Send the packet using channels via names.

    :param packet: the message or bundle to send.
    :type packet: OSCMessage or OSCBundle
    :param names: name of target channels (can be a string, list or set).
    :type names: str or list or set
    """
    pass


def osc_udp_server(name, address, port):
    """\
    Create an UDP server channel to receive OSC packets.

    :param name: internal identification of the channel server.
    :type name: str
    :param address: network address for binding UDP socket
    :type address: str
    :param port: port number for binding UDP port
    :type port: int
    """
    pass


def osc_udp_client(name, address, port):
    """\
    Create an UDP client channel to send OSC packets.

    :param name: internal identification of the channel client.
    :type name: str
    :param address: network address for binding UDP socket
    :type address: str
    :param port: port number for binding UDP port
    :type port: int
    """
    pass


def osc_multicast_server(name, address, port):
    """\
    Create a multicast server to receive OSC packets.

    :param name: internal identification of the channel server.
    :type name: str
    :param address: network address for binding socket
    :type address: str
    :param port: port number for binding port
    :type port: int
    """
    pass


def osc_multicast_client(name, address, port, ttl):
    """\
    Create a multicast client channel to send OSC packets.

    :param name: internal identification of the channel client.
    :type name: str
    :param address: multicast network address for binding socket
    :type address: str
    :param port: port number for binding port
    :type port: int
    :param ttl: time to leave for multicast packets.
        Default to 1 (one hop max).
    :type ttl: int
    """
    pass


def osc_broadcast_server(name, address, port):
    """\
    Create a broadcast server channel to receive OSC packets.

    :param name: internal identification of the UDP server.
    :type name: str
    :param address: network address for binding UDP socket
    :type address: str
    :param port: port number for binding UDP port
    :type port: int
    """
    pass


def osc_broadcast_client(name, address, port, ttl):
    """\
    Create a broadcast client channel to send OSC packets.

    :param name: internal identification of the channel client.
    :type name: str
    :param address: broadcast network address for binding socket
    :type address: str
    :param port: port number for binding port
    :type port: int
    :param ttl: time to leave for broadcast packets.
        Default to 1 (one hop max).
    :type ttl: int
    """
    pass


def apply_docs(namespace):
    # Associate documentation to functions in as_xxx module.
    for name in __all__:
        setattr(namespace[name], '__doc__', getattr(globals()[name], '__doc__'))
