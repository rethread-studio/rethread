#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/tests/nettools.py
# <pep8 compliant>

import sys
from os.path import abspath, dirname
# Make osc4py3 available.
PACKAGE_PATH = dirname(dirname(dirname(abspath(__file__))))
if PACKAGE_PATH not in sys.path:
    sys.path.insert(0, PACKAGE_PATH)

from osc4py3.oscnettools import (packet2slip, slip2packet,
                                network_getaddrinfo, dns_cache,
                                SLIP_ESC_CHAR, SLIP_END_CHAR)

import pprint
import time
import struct

import socket

import time

if True:    # ------------------- SLIP TESTS ----------------------------
    NBTESTS = 10000
    print("=" * 80)
    print("\nSLIP ENCODE/DECODE PERFORMANCES TESTS ON {} "\
                            "OPERATIONS\n".format(NBTESTS))
    # We test on several examples, one with different count of control
    # bytes.
    for data in [
            b' ' * 80,
            b'Just a text \333to replace with chars \300' \
            b' to check if we retrieve \333 the input \300 here.',
            (b'\333' * 10 + b'\300' * 10) * 4
            ]:
        esccount = data.count(SLIP_ESC_CHAR)
        endcount = data.count(SLIP_END_CHAR)
        print("* Case  {} bytes with {} control "\
                    "codes".format(len(data), esccount + endcount))
        start = time.time()
        for i in range(NBTESTS):
            buff = packet2slip(data, True)
        stop = time.time()
        print("  Encoding buffer for SLIP: {:0.3f} sec, {:0.3f} µsec "\
                "by buffer (output length {}).".format(
                stop - start, (stop - start) / NBTESTS * 1000000,
                len(buff)))
        start = time.time()
        for i in range(NBTESTS):
            while buff:
                packet, buff = slip2packet(buff)
        stop = time.time()
        print("  Decoding buffer for SLIP: {:0.3f} sec, {:0.3f} µsec "\
                "by buffer (output length {}).".format(
                stop - start, (stop - start) / NBTESTS * 1000000,
                len(packet)))
        if data != packet:
            print("BUG: encoding/decoding lead to different content.:")
            print("Data  : {!r}".format(data))
            print("Packet: {!r}".format(packet))

if True:    # --------------- ADDRESS INFO TESTS ---------------------
    import pprint
    print("=" * 80)
    print("\nADDRESS INFORMATIONS TESTS\n".format(NBTESTS))
    print("Whole reply with addrtest_host_port:")
    res = network_getaddrinfo({
            'addrtest_host': "www.python.org",
            'addrtest_port': "80",
                }, "addrtest")
    pprint.pprint(res)
    print("Restricted to IPV4:")
    res = network_getaddrinfo({
            'addrtest_host': "www.python.org",
            'addrtest_port': 80,
            'addrtest_forceipv4': True,
                }, "addrtest")
    pprint.pprint(res)
    print("Restricted to TCP on IPV4:")
    res = network_getaddrinfo({
            'addrtest_host': "www.python.org",
            'addrtest_port': 80,
            'addrtest_forceipv4': True,
                }, "addrtest", proto=socket.SOL_TCP)
    pprint.pprint(res)
    print("Whole reply with addrtest_host and addrtest_port:")
    res = network_getaddrinfo({
            'addrtest_host': "www.python.org",
            'addrtest_port': "80",
                }, "addrtest")
    pprint.pprint(res)
    print("Some others network_getaddrinfo(), then display cache:")
    res = network_getaddrinfo({
            'addrtest_host': "opensoundcontrol.org",
            'addrtest_port': 80,
                }, "addrtest")
    res = network_getaddrinfo({
            'addrtest_host': "www.google.com",
            'addrtest_port': 80,
                }, "addrtest")
    res = network_getaddrinfo({
            'addrtest_host': "smtp.gmail.com",
            'addrtest_port': 25,
                }, "addrtest")
    pprint.pprint(dns_cache)
