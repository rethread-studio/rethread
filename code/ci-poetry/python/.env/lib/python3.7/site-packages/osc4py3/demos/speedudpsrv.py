#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/demos/speedudpsrv.py
# <pep8 compliant>
"""Client to test send speed OSC messages to a server via UDP.

Hope we will not loose an UDP packet.
"""

SCHEDULING = "comthreads"       #  "eventloop" or "allthreads" or "comthreads"
print("SCHEDULING:",SCHEDULING)

# Make osc4py3 available.
import sys
from os.path import abspath, dirname
PACKAGE_PATH = dirname(dirname(dirname(abspath(__file__))))
if PACKAGE_PATH not in sys.path:
    sys.path.insert(0, PACKAGE_PATH)
import time
import threading
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

start = 0
stop = 0

# The function called to handle matching messages.
hlock = threading.Lock()
hcount = 0
def handlerfunction(*args):
    global hlock, hcount, start, stop
    with hlock:
        hcount += 1
        if hcount % 10 == 0:
            print(".", end="")
        if hcount == 1:
            start = time.time()
        if hcount == MESSAGES_COUNT:
            stop = time.time()
            print("\nElapsed time to receive/process {} messages: {:.3f} sec "\
                    "between first and last.".format(MESSAGES_COUNT,
                    stop-start))
            if SCHEDULING in ("eventloop", "comthreads"):
                print("You can press enter to close server.")


osc_startup(logger=logger)
osc_udp_server(IP, PORT, "udplisten")
osc_method("/test", handlerfunction)

print("Will print one dot per 10 method call.")
print("Now, you can start the client.")
if SCHEDULING in ("eventloop", "comthreads"):
    print("Processing in eventloop...")
    while hcount < MESSAGES_COUNT:
        osc_process()
else:
    input("Waiting while processing...")
osc_terminate()
print("Done.")

