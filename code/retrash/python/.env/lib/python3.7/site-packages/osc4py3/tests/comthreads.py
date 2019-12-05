#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File: osc4py3/tests/comthreads.py
# <pep8 compliant>

# To fix daylanKifky identified bug.
# https://github.com/Xinne/osc4py3/issues/4

import sys
from os.path import abspath, dirname
# Make osc4py3 available.
PACKAGE_PATH = dirname(dirname(dirname(abspath(__file__))))
if PACKAGE_PATH not in sys.path:
    sys.path.insert(0, PACKAGE_PATH)

import time
import logging

from osc4py3.as_comthreads import *
from osc4py3 import oscbuildparse

# A logger to monitor activity... and debug.
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("osc")
logger.setLevel(logging.DEBUG)


# Handler to print the message (and see dispatching).
def handler(*args):
    print(">>>>>>>>>>>>>>>>>>> Called with:", args)

osc_startup(logger=logger)
osc_method('/test/me', handler)
# Make client channels to send packets.
osc_udp_client("127.0.0.1", 7000, "local")
# Build a simple message and send it.
msg = oscbuildparse.OSCMessage("/test/me", ",sif", ["text", 672, 8.871])
osc_send(msg, "_local")
#time.sleep(0.1)     # give some time to communication thread !
osc_process()
osc_terminate()

