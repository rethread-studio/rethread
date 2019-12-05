#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/tests/udp.py
# <pep8 compliant>

import sys
from os.path import abspath, dirname
# Make osc4py3 available.
PACKAGE_PATH = dirname(dirname(dirname(abspath(__file__))))
if PACKAGE_PATH not in sys.path:
    sys.path.insert(0, PACKAGE_PATH)

import socket
import time
import pprint

from osc4py3.oscudpmc import UdpMcChannel
from osc4py3 import oscchannel

print("=" * 80)
print("\nTRANSMITING LOCAL UDP PACKETS\n")
LENGTH = 18
data = bytes(range(ord('A'), ord('A') + LENGTH))

IP = "127.0.0.1"
PORT = 12021    # Hope it is not used.
sendersock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

reader = UdpMcChannel("testudp", "r",
        {
        'udpread_host': IP,
        'udpread_port': PORT,
        'udpread_identusedns': True,
        'auto_start': True,
        })
reader.activate()   # Open sockets (we dont schedule for our tests)
for i in range(10):
    sendersock.sendto(data, (IP, PORT))
    time.sleep(0.1)
    reader.process_monevents(0, 'r')

print("Received in the received_rawpackets queue:")
received = []
while oscchannel.received_rawpackets.qsize():
    received.append(oscchannel.received_rawpackets.get_nowait())
pprint.pprint(received)
reader.terminate()

if True:
    NBTESTS = 10000

    print("=" * 80)
    print("\nPERFORMANCES TESTS ON {} UDP SEND+RECEIVE+QUEUE EXTRACTION "\
            "OPERATIONS\n".format(NBTESTS))

    reader = UdpMcChannel("speedtestudp", "r",
            {
            'udpread_host': IP,
            'udpread_port': PORT,
            'auto_start': True,
            })
    reader.activate()   # Open sockets (we dont schedule for our tests)
    cpt = 0
    while not oscchannel.received_rawpackets.empty():
        oscchannel.received_rawpackets.get_nowait()
        oscchannel.received_rawpackets.task_done()
    start = time.time()
    for i in range(NBTESTS):
        sendersock.sendto(data, (IP, PORT))
        reader.process_monevents(0, 'r')
        if oscchannel.next_rawpacket(None) is not None:
            cpt += 1
    stop = time.time()
    assert cpt == NBTESTS   # Hope network layers are rapid enough
                            # for local transmissions without packet lost.
    print("Send+Receive UDP datagram+queue extract packets: {:0.3f} sec, "\
            "{:0.3f} µsec "\
            "by packet.".format(
            stop - start, (stop - start) / NBTESTS * 1000000))
    reader.terminate()
