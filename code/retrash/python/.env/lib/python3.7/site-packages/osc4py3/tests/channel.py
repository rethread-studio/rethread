#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/tests/dispatching.py
# <pep8 compliant>

import sys
from os.path import abspath, dirname
# Make osc4py3 available.
PACKAGE_PATH = dirname(dirname(dirname(abspath(__file__))))
if PACKAGE_PATH not in sys.path:
    sys.path.insert(0, PACKAGE_PATH)

from osc4py3.oscchannel import (TransportChannel, received_rawpackets,
            next_rawpacket)
from osc4py3.oscnettools import packet2slip

import pprint
import time
import struct

LENGTH = 18
print("=" * 80)
print("\nSIMULATING RECEPTION OF DATA WITH PACKET HEAD\n")
data = bytes(range(ord('A'), ord('A') + LENGTH))

headreader = TransportChannel("headreader", "r",
                        {'read_withheader': True})
data2 = struct.pack("!I", LENGTH) + data
for i in range(1, 11):
    srcname = "withheader{}".format(i)
    print("Source {}, raw data: {}".format(srcname, data2))
    # We simulate the data reception in two parts.
    headreader.received_data(srcname, data2[:LENGTH // 2])
    headreader.received_data(srcname, data2[LENGTH // 2:])

print("\nSIMULATING RECEPTION OF DATA WITH PACKET SLIP\n")
slipreader = TransportChannel("slipreader", "r",
                        {'read_withslip': True})
data2 = packet2slip(data)
for i in range(1, 11):
    srcname = "withslip{}".format(i)
    print("Source {}, raw data: {}".format(srcname, data2))
    # We simulate the data reception in two parts.
    slipreader.received_data(srcname, data2[:LENGTH // 2])
    slipreader.received_data(srcname, data2[LENGTH // 2:])

print("\nSIMULATING RECEPTION OF DATA WITH DATAGRAM PACKETS\n")
datagramreader = TransportChannel("datagramreader", "r",
                        {'read_datagram': True})
for i in range(1, 11):
    srcname = "withheader{}".format(i)
    print("Source {}, raw data: {}".format(srcname, data))
    # !!! We simulate the data reception in only one part
    datagramreader.received_data(srcname, data)

print("\nDATA IN THE RECEIVED RAW PACKETS QUEUE\n")

while not received_rawpackets.empty():
    d, po = received_rawpackets.get()
    received_rawpackets.task_done()
    print("Received from {} via reader {}: {}".format(po.srcident,
                        po.readername, bytes(d)))

print("=== Remaining data in buffers:")
for r in (headreader, slipreader, datagramreader):
    print("Reader:", r.chaname)
    pprint.pprint(r.read_buffers)

if True:
    NBTESTS = 10000
    while not received_rawpackets.empty():
        received_rawpackets.get_nowait()
        received_rawpackets.task_done()

    print("=" * 80)
    print("\nPERFORMANCES TESTS ON {} RECEIVE+NEXT EXTRACTION "\
            "OPERATIONS\n".format(NBTESTS))
    datagramreader = TransportChannel("datagramreader2", "r",
                            {'read_datagram': True})
    data = bytes(range(ord('A'), ord('A') + LENGTH))
    srcname = "asource"
    start = time.time()
    for i in range(NBTESTS):
        datagramreader.received_packet(srcname, data)
        next_rawpacket(None)
    stop = time.time()
    print("Receive datagram+extract packets: {:0.3f} sec, {:0.3f} µsec "\
            "by packet.".format(
            stop - start, (stop - start) / NBTESTS * 1000000))
