#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/tests/method.py
# <pep8 compliant>

import sys
from os.path import abspath, dirname
# Make osc4py3 available.
PACKAGE_PATH = dirname(dirname(dirname(abspath(__file__))))
if PACKAGE_PATH not in sys.path:
    sys.path.insert(0, PACKAGE_PATH)

from osc4py3.oscmethod import *

print("=" * 80)
print("\nTEST PATTERN MATCHING REWRITE FROM OSC TO PYTHON RE\n")


def nothing(*args):
    pass


def show_match(apflist, slist):
    for apf in apflist:
        print("\n=== Pattern: {!r}".format(apf.addrpattern))
        print("    RE     : {!r}".format(apf.repattern))
        for s in slist:
            m = apf.match(s)
            print("{!r}: {}".format(s, m))

show_match([
        MethodFilter("/third/*", nothing),
        MethodFilter("/third/*/d", nothing),
        MethodFilter("/third/*/*/e", nothing),
        ], [
        "/third/a",
        "/third/b",
        "/third/c",
        "/third/c/d",
        "/third/c/d/e",
        "/first/second/third/a",
        ])

show_match([
        MethodFilter("/trigger/chan[0-9]/", nothing),
        MethodFilter("/trigger/chan*/", nothing),
        ], [
        "/trigger/chan1/",
        "/trigger/chan2/",
        "/trigger/chan34/",
        "/trigger/chan2/go",
        "/first/trigger/chan2/third/a",
        ])

show_match([
        MethodFilter("/trigger/chan?/set", nothing),
        ], [
        "/trigger/chan5/set",
        "/trigger/chanX/setit",
        "/trigger/chanXY/set",
        ])

show_match([
        MethodFilter("/first/this/one", nothing),
        ], [
        "/first/this/one",
        "/first/this/one/win",
        "/first/second/third/a",
        ])

# Options lists
show_match([
        MethodFilter("/items/{first,this,one}", nothing),
        MethodFilter("/items/{this,first}/{bad,good}", nothing),
        ], [
        "/noitems/this/bad",
        "/items/this/bad",
        "/items/one/chance",
        "/items/first/good",
        "/items/first",
        ])

# Root to leaf
show_match([
        MethodFilter("//here", nothing),
        ], [
        "/nothinghere",
        "/there/here/it/is",
        "/here/i/am",
        ])

# Root to leaf
show_match([
        MethodFilter("/here//something", nothing),
        ], [
        "/here/there/is/something",
        "/there/here/it/is",
        "/here/i/am/with/something/to/do",
        ])

# All !
show_match([
        MethodFilter("*", nothing),
        ], [
        "/here/there/is/something",
        "/there/here/it/is",
        "/here/i/am/with/something/to/do",
        ])
