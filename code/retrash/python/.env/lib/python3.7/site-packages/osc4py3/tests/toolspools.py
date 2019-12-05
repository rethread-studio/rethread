#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/tests/toolspools.py
# <pep8 compliant>

import sys
from os.path import abspath, dirname
# Make osc4py3 available.
PACKAGE_PATH = dirname(dirname(dirname(abspath(__file__))))
if PACKAGE_PATH not in sys.path:
    sys.path.insert(0, PACKAGE_PATH)

from osc4py3.osctoolspools import (WorkQueue)

import pprint
import threading
import struct
import time
import random
import sys

sys.setswitchinterval(1e-6)     # Maximimze threads scheduling.

print("=" * 80)
print("\nTEST WORK THREADS ON SOME JOBS\n")

NBWORKERS = 20
NBTESTS = 1000
WITHPRINT = True

glock = threading.Lock()
plock = threading.Lock()    # For print()
counter = 0

def thefunction(x,y,z):
    # Note: there may be scheduling between here and the glock protected
    # section, so the order of counter increment may differ from the order
    # of x.
    global counter
    with glock:     # Ensure proper incrementation in multithread.
        counter += 1
        c = counter
    if WITHPRINT:
        with plock:
            print(threading.current_thread().name,
                    "calling thefunction with",x, "at", time.time())
    # A sleep to simulate different processing times.
    time.sleep(random.random()/100)

with plock:
    print("Main thread creating work queue and its", NBWORKERS, "threads")
wq = WorkQueue()
wq.add_working_threads(count=NBWORKERS, makejoignable=True)
for i in range(NBTESTS):
    with plock:
        print("Main thread adding job for", i)
    wq.send_callable(thefunction, (i, i*2, i**2), needsync=False)
wq.send_terminate()
with plock:
    print("Main thread waiting for jobs completion")
wq.join()
with plock:
    print("Main thread jobs completed")
print(NBTESTS, "vs", counter)   # Should be the same.
