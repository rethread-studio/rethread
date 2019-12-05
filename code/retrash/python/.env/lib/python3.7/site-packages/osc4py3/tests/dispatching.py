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

import time
import pprint
from osc4py3.oscdispatching import Dispatcher
from osc4py3.oscmethod import *
from osc4py3.oscpacketoptions import PacketOptions
from osc4py3 import oscbuildparse as obp
from testslogger import logger

print("=" * 80)
print("\nTEST DISPATCHING TO PATTERN FILTER'S FUNCTIONS\n")

# The callback.
def matchfct(*args):
    try:
        mf = args[-1]
        args = args[:-1]
        print("===== Called matchfct() on Methodfilter({!r}…) with:".format(mf.addrpattern))
    except:
        print(r"  /!\ Bug: no arg")
    for a in args:
        print("  ",str(a))

# The dispatcher.
disp = Dispatcher("global",{'logger': logger})

# Message filters creation and registration.
filter0 = MethodFilter("/*", matchfct, argscheme=OSCARG_ADDRESS + OSCARG_DATAUNPACK + OSCARG_METHODFILTER)
disp.add_method(filter0)
filter1 = MethodFilter("/just", matchfct, argscheme=OSCARG_DATAUNPACK + OSCARG_METHODFILTER)
disp.add_method(filter1)
filter2 = MethodFilter("//test", matchfct, argscheme=OSCARG_DATAUNPACK + OSCARG_METHODFILTER)
disp.add_method(filter2)
filter3 = MethodFilter("/just/[a-c]/test", matchfct, argscheme=OSCARG_DATAUNPACK + OSCARG_METHODFILTER)
disp.add_method(filter3)
filter4 = MethodFilter("/*/c/", matchfct, argscheme=OSCARG_DATAUNPACK + OSCARG_METHODFILTER)
disp.add_method(filter4)

# Test messages dispatching.
msg = obp.OSCMessage("/just/a/test", None, [1, 2, 3])
print("Dispatching a message:", msg)
disp.dispatch_packet(msg, PacketOptions())

bun = obp.OSCBundle(obp.OSC_IMMEDIATELY, [
        obp.OSCMessage("/just/c/test", None, ["Hello"]),
        obp.OSCMessage("/just/d/test/here", None, [ 3.13, "is", "pi"]),
        ])
print("Dispatching a bundle:", bun)
disp.dispatch_packet(bun, PacketOptions())
