#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/tests/udpbc.py
# <pep8 compliant>
"""This file can be used as a start point for broadcast usage.

For quick test, it doesn't use osc4py3 monitors (nonblocking options set to false),
and directly target low level communication functions.
This should be modified for a realworld use case.
"""

# https://pymotw.com/3/socket/multicast.html

import sys
from os.path import abspath, dirname
# Make osc4py3 available.
PACKAGE_PATH = dirname(dirname(dirname(abspath(__file__))))
if PACKAGE_PATH not in sys.path:
    sys.path.insert(0, PACKAGE_PATH)

import socket
import time
import pprint
import logging
from osc4py3 import oscchannel
from osc4py3.oscudpmc import UdpMcChannel
from osc4py3.oscpacketoptions import PacketOptions

# A logger to monitor activity... and debug.
logging.basicConfig(format='%(asctime)s - %(threadName)s ø %(name)s - '
    '%(levelname)s - %(message)s')
logger = logging.getLogger("osc")
logger.setLevel(logging.DEBUG)


print("=" * 80)
print("\nTRANSMITING LOCAL UDP MULTICAST PACKETS\n")
LENGTH = 18
DURATION = 20

data = bytes(range(ord('A'), ord('A') + LENGTH))


IP = "127.0.0.1"
PORT = 50000    # Hope it is not used.

# Note: we rely on network buffers (send small amount of data). Else we may need
# nonblocking write with parallel read.

writer = UdpMcChannel("testwriter", "w",
            {
            'udpwrite_host': IP,
            'udpwrite_port': PORT,
            'auto_start': True,
            'bcast_enabled': True,
            'udpwrite_nonblocking': False,  # Else we need a Monitor
            'udpwrite_forceipv4': True,     # localhost may resolve in ::1
            'logger': logger,
            })
writer.activate()

reader = UdpMcChannel("testreader", "r",
            {
            'udpread_host': "0.0.0.0",
            'udpread_port': PORT,
            'auto_start': True,
            'bcast_enabled': True,
            'udpread_nonblocking': False,
            'udpread_identusedns': False,   # Dont care about reader hostname
            'logger': logger,
            })
reader.activate()

print("Sending in the received_rawpackets queue:")
for i in range(10):
    writer.transmit_data(data, PacketOptions())
    writer.process_monevents(0, 'w')
    time.sleep(0.1)
    reader.process_monevents(0, 'r')

print("Received in the received_rawpackets queue:")
received = []
while oscchannel.received_rawpackets.qsize():
    received.append(oscchannel.received_rawpackets.get_nowait())
pprint.pprint(received)

reader.terminate()
writer.terminate()

#TODO: Write high level test code with as_xxx functions for broadcast client/server.

