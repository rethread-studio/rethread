#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/demos/speedudpcli.py
# <pep8 compliant>
"""Client to test send speed OSC messages to a server via UDP.

Hope we will not loose an UDP packet.
"""

SCHEDULING = "eventloop"       #  "eventloop" or "allthreads" or "comthreads"
print("SCHEDULING:",SCHEDULING)

# Make osc4py3 available.
import sys
from os.path import abspath, dirname
PACKAGE_PATH = dirname(dirname(dirname(abspath(__file__))))
if PACKAGE_PATH not in sys.path:
    sys.path.insert(0, PACKAGE_PATH)
import time
import logging

from osc4py3 import oscbuildparse
if SCHEDULING == "eventloop":
    from osc4py3.as_eventloop import *
elif SCHEDULING == "allthreads":
    from osc4py3.as_allthreads import *
elif SCHEDULING == "comthreads":
    from osc4py3.as_comthreads import *

from speedudpcommon import MESSAGES_COUNT, IP, PORT

from demoslogger import logger
logger.setLevel(logging.ERROR)      # Speed test - limit to log errors.

osc_startup(logger=logger)
osc_udp_client(IP, PORT, "udpclient")

start = time.time()
for i in range(MESSAGES_COUNT):
    msg = oscbuildparse.OSCMessage("/test/here/{}".format(i+1), ",si",
                    ["message", i+1])
    osc_send(msg, "udpclient")
    if SCHEDULING == "eventloop":
        osc_process()   # To start sending.
stop = time.time()

print("Scheduled writing of {} OSC messages.".format(MESSAGES_COUNT))
print("Elapsed time to send {} messages: {:.3f} sec in user "\
                        "thread.".format(MESSAGES_COUNT, stop-start))

if SCHEDULING == "eventloop":
    print("Sending in event loop using 10 sec delay")
    delay = time.time() + 10    # leave 10 sec.
    while time.time() < delay:
        osc_process()
else:
    print("Sending in event loop using 10 sec delay")
    input("When server has all received, you can press enter to close client.")

osc_terminate() 
print("Done.")
