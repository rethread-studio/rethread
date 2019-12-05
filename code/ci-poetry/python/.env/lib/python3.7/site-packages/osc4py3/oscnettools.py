#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/oscnettools.py
# <pep8 compliant>
"""Utility functions for network or serial line communications.

Two functions, :func:`packet2slip` and :func:`slip2packet` allow to
encode and decode SLIP packets to deal with stream based communications
using this protocol to delimit packets.

A function :func:`network_getaddrinfo` wrap call to getaddrinfo(), dealing
with the general osc4py3 system of dictionnary of options (it extract
address, port, eventually some preferences from keys in the dictionnary).

"""

import socket
import collections


#=============================== SLIP SUPPORT =============================
# SLIP = Serial Line Internet Protocol. See RFC1055
SLIP_ESC_CODE = 219
SLIP_ESC_CHAR = b'\333'
SLIP_ESC_REPL = b'\333\335'
SLIP_END_CODE = 192
SLIP_END_CHAR = b'\300'
SLIP_END_REPL = b'\333\334'     # Note: no END inside escape sequenc.


def packet2slip(rawdata, flagsatstart=True):
    """Build a SLIP packet from raw data.

    :param rawdata: a buffer of bytes to encode into SLIP.
    :type rawdata: bytes or bytearray
    :param flagsatstart: put an END SLIP char also at start of the packet
    :type flagsatstart: bool
    :return: encoded data with SLIP protocol
    :rtype: bytes
    """
    rawdata = rawdata.replace(SLIP_ESC_CHAR, SLIP_ESC_REPL)
    rawdata = rawdata.replace(SLIP_END_CHAR, SLIP_END_REPL)

    if flagsatstart:
        return SLIP_END_CHAR + rawdata + SLIP_END_CHAR
    else:
        return rawdata + SLIP_END_CHAR


def slip2packet(rawdata):
    """Split a buffer into decoded SLIP packet part and remaining data.

    If no SLIP END is found, the packet part returned is just empty and
    remaining data stay like data.
    If a SLIP END is at the beginning, the packet part returned is empty
    but remaining data loose its starting END byte.

    .. note:: You should call this function only when you encounter a
              SLIP_END_CODE byte in a SLIP encoded stream.

    :param rawdata: buffer where you accumulate read bytes
    :type rawdata: bytearray
    :return: decoded packet with SLIP protocol (or None) and remaining bytes
        after packet.
    :rtype: (bytearray or None, bytearray)
    """
    # Searching for the end of SLIP packet - note: END cannot be present
    # out of packet delimitation as they have been replaced by an escape
    # sequence without END.
    endindex = rawdata.find(SLIP_END_CHAR)
    if endindex < 0:
        # There is no SLIP packet decoded, all data remain as is...
        return None, rawdata

    # Note: if we have a SLIP END char at the beginning, we just have an empty
    # packet and all bytes in the remaining.
    remain = rawdata[endindex + 1:]

    # Unescape END and ESC from identified packet.
    packet = rawdata[:endindex]
    packet = packet.replace(SLIP_END_REPL, SLIP_END_CHAR)
    packet = packet.replace(SLIP_ESC_REPL, SLIP_ESC_CHAR)

    return packet, remain


#========================== NETWORK ADDRESS EXTRACTION ======================
AddrInfo = collections.namedtuple("AddrInfo",
            "family, socktype, proto, canonname, sockaddr")

def network_getaddrinfo(options, prefix, family=0, addrtype=0, proto=0):
    """

    Return socket.getaddrinfo() corresponding to the address given in options
    via keys using the prefix. Port can be set to "None" to pass a None value
    to underlying function.
    In place of a list of simlpe tuples, we return a list of named tuple
    AddrInfo which usage is more readable with fields identification.

    Exemples (IPV4, IPV6, DNS):

    IP address and port number are set with two separated keys:
        `prefix_host`
        `prefix_port`

    Other options can be used to specify some parts:
        `prefix_forceipv4` as boolean True
        `prefix_forceipv6` as boolean True

    :param family: protocol family to restrict list of replies (AF_INET or
        AF_INET6 or AF_UNIX or other protocol families).
        Options prefix_forceipv4 and prefix_forceipv6 can also be set to
        boolean True to force a specific address family.
        Default to 0 (all protocol families).
    :type family: int (overriden by options providen)
    :param addrtype: type of socket to restrict list of replies (SOCK_STREAM
        or socket.SOCK_DGRAM or other socket types).
        Default to 0 (all socket types).
    :type addrtype: int
    :param proto: protocol specified to restrict list of replies (ex. just
        retrieve UDP with socket.SOL_UDP, or just retrieve TCP
        with socket.SOL_TCP).
        Default to 0 (all protocols).
    :type proto: int
    :return: list of address informations to use by socket().
    :rtype: [ AddrInfo ]
    """
    flags = 0
    flags |= socket.AI_CANONNAME

    forceipv4 = options.get(prefix + '_forceipv4', False)
    forceipv6 = options.get(prefix + '_forceipv6', False)
    if forceipv4 and forceipv6:
        raise ValueError("OSC {} force IPV4 and IPV6 simultaneously in "\
                                "options.".format(prefix))


    host = options.get(prefix + '_host', None)
    port = options.get(prefix + '_port', None)

    if host is None:
        raise ValueError("OSC {} missing host "\
                            "information.".format(prefix))

    if host == "*":     # Our match for all interfaces.
        host = None     # for getaddrinfo()
        flags |= socket.AI_PASSIVE
    else:
        host = host.strip()

        # Remove possible [] around IPV6 address (great for URL-like but
        # not supported by getaddrinfo().
        if host.startswith('[') and host.endswith(']'):
            host = host[1:-1]

    # Note: removed port cast to int as getaddrinfo() allow to use port
    # service names in place of port numbers.
    if isinstance(port, str):
        port = port.strip()
        if port.lower() == "none":
            port = 0
        else:
            port = int(port)

    if forceipv4:
        family = socket.AF_INET
    elif forceipv6:
        family = socket.AF_INET6
    else:
        # We give possibility to caller to specify family at his level
        # (ie. dont override a providen family).
        pass

    # Note: use AI_CANONNAME as we may try to use DNS names for peer
    # identification.
    res = socket.getaddrinfo(host, port, family, addrtype, proto,
                                flags=flags)

    if not res:
        raise ValueError("OSC {} get no addrinfo for host/port with "\
                            "specified protocol/family".format(prefix))

    # Translate to more readable named tuple.
    res = [ AddrInfo(*r) for r in res ]

    # Automatically populate DNS cache for source identification.
    if not options.get(prefix + '_dontcache', False):
        cache_from_addr_info(res)

    return res


#=========================== IDENTIFICATION CACHE ===========================
# As we would use host names for identification of peers, we need a quick
# way to go from an address (IPV4/IPV6) to a host name.
# If channel classes correctly use network_getaddrinfo(), this correspondance
# is normally automatically setup.
dns_cache = {}


def cache_dns_identification(address, identification, override=False):
    """Cache an IP address (IPV4/IPV6) and its associated DNS name.

    Override to force update of mapping if the entry is already present.
    """
    global dns_cache
    # If an addre has already been mapped, dont remap it (this allow top
    # level program to make its own mapping out of DNS, using non fqdn
    # names or completly arbitrary names).
    if address not in dns_cache or override:
        dns_cache[address] = identification


def cache_from_addr_info(addrinfo):
    """Build DNS cache entries from a result of getaddrinfo() call.
    """
    # Search for a canonical name.
    canonname = None
    for r in addrinfo:
        if r[3]:
            canonname = r[3]
            break
    if canonname:
        # Cache addresses corresponding to canonname.
        for r in addrinfo:
            cache_dns_identification(r[4][0], canonname)


def resolve_dns_identification(address, forceresolution=False):
    """Retrieve the DNS name from an IP address.

    Used to have readable identifiers for peer OSC systems.

    Return None if there is no cached information (eventually after trying
    to force DNS resolution for cache update).
    """
    if address in dns_cache:
        return dns_cache[address]
    elif forceresolution:
        # Setup DNS resolution mapping (port number ?).
        res = socket.getaddrinfo(address, 1, flags=socket.AI_CANONNAME)
        cache_from_addr_info(res)
        # Recursive call, but without forceresolution.
        if address in dns_cache:
            return dns_cache[address]
        else:   # prevent future try to resolve address/port
            dns_cache[address] = None
    # Default, not found.
    return None
