#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File: osc4py3/tests/buildparse.py
# <pep8 compliant>

import sys
from os.path import abspath, dirname
# Make osc4py3 available.
PACKAGE_PATH = dirname(dirname(dirname(abspath(__file__))))
if PACKAGE_PATH not in sys.path:
    sys.path.insert(0, PACKAGE_PATH)

import time
import pprint
from osc4py3.oscbuildparse import *

print("=" * 80)
print("\nEXAMPLES FROM OSC DOCUMENTATION AT "\
        "http://opensoundcontrol.org/\n")
print('-' * 80)
raw1 = bytes([0x2f, 0x6f, 0x73, 0x63,    # 2f (/)  6f (o)  73 (s)  63 (c)
                0x69, 0x6c, 0x6c, 0x61,    # 69 (i)  6c (l)  6c (l)  61 (a)
                0x74, 0x6f, 0x72, 0x2f,    # 74 (t)  6f (o)  72 (r)  2f (/)
                0x34, 0x2f, 0x66, 0x72,    # 34 (4)  2f (/)  66 (f)  72 (r)
                0x65, 0x71, 0x75, 0x65,    # 65 (e)  71 (q)  75 (u)  65 (e)
                0x6e, 0x63, 0x79, 0x00,    # 6e (n)  63 (c)  79 (y)  0 ()
                0x2c, 0x66, 0x00, 0x00,    # 2c (,)  66 (f)  0 ()    0 ()
                0x43, 0xdc, 0x00, 0x00,    # 43 (C)  dc (Ü)  0 ()    0 ()
            ])
print("""\
The OSC Message with the OSC Address Pattern "/oscillator/4/frequency"
and the floating point number 440.0 as the single argument would be
represented by the following 32-byte message:""")
dumphex_buffer(raw1)
msglist1 = decode_packet(raw1)
print("Decoded:")
pprint.pprint(msglist1)
raw1bis = encode_packet(OSCMessage("/oscillator/4/frequency", ",f",
                            (440.0,)))
print("Encoded with {} bytes".format(len(raw1bis)))
dumphex_buffer(raw1bis)

print('-' * 80)
raw2 = bytes([0x2f, 0x66, 0x6f, 0x6f,    # 2f (/)  66 (f)  6f (o)  6f (o)
                0x00, 0x00, 0x00, 0x00,    # 0 ()    0 ()    0 ()    0 ()
                0x2c, 0x69, 0x69, 0x73,    # 2c (,)  69 (i)  69 (i)  73 (s)
                0x66, 0x66, 0x00, 0x00,    # 66 (f)  66 (f)  0 ()    0 ()
                0x00, 0x00, 0x03, 0xe8,    # 0 ()    0 ()    3 ()    e8 (è)
                0xff, 0xff, 0xff, 0xff,    # ff (ÿ)  ff (ÿ)  ff (ÿ)  ff (ÿ)
                0x68, 0x65, 0x6c, 0x6c,    # 68 (h)  65 (e)  6c (l)  6c (l)
                0x6f, 0x00, 0x00, 0x00,    # 6f (o)  0 ()    0 ()    0 ()
                0x3f, 0x9d, 0xf3, 0xb6,    # 3f (?)  9d ()   f3 (ó)  b6 (¶)
                0x40, 0xb5, 0xb2, 0x2d,    # 40 (@)  b5 (µ)  b2 (”)  2d (-)
            ])

print("""\
The next example shows the 40 bytes in the representation of the
OSC Message with OSC Address Pattern "/foo" and 5 arguments:
The int32 1000
The int32 -1
The string "hello"
The float32 1.234
The float32 5.678""")
dumphex_buffer(raw2)
msglist2 = decode_packet(raw2)
print("Decoded:")
pprint.pprint(msglist2)
raw2bis = encode_packet(OSCMessage("/foo", ",iisff",
                (1000, -1, "hello", 1.234, 5.678)))
print("Encoded with {} bytes".format(len(raw2bis)))
dumphex_buffer(raw2bis)

print("=" * 80)
print("\nEXAMPLES PROCESSING OTHER MESSAGES\n")
for data in [
        # With basic types.
        OSCMessage("/basetypes", ",ifsc",
                    [1, 2.3, "mystring", "A"]),
        OSCMessage("/basetypes", None,
                    [1, 2.3, "mystring"]),
        # With constant types
        OSCMessage("/constants", ",iNTFI",
                    [42, None, True, False, OSC_INFINITUM]),
        OSCMessage("/constants", None,
                    [42, None, True, False, OSC_INFINITUM]),
        # With 64 bytes types
        OSCMessage("/64bytes", ",hd",
                    [2 ** 48, 3.1415926535897932384e100]),
        # This fail! for int and for float, too large for 32 bits:
        # OSCMessage("/32bytes", ",if",
        #             [2 ** 48, 3.1415926535897932384e100]),
        # With a blob (raw data)
        OSCMessage("/blob", ",ibb",
                    [42, b'A first blob', b'A second blob']),
        OSCMessage("/blob", None,
                    [42, b'A first blob', b'A second blob']),
        OSCMessage("/blob", ",ibb",
                    [42, bytearray(b'A first blob'),
                    memoryview(b'A second blob')]),
        OSCMessage("/blob", None,
                    [42, bytearray(b'A first blob'),
                    memoryview(b'A second blob')]),
        # With RGBA and MIDI
        OSCMessage("/constructed", ',irm',
                    [42, OSCrgba(16, 32, 64, 128),
                    OSCmidi(17, 33, 65, 129)]),
        OSCMessage("/constructed", None,
                    [42, OSCrgba(16, 32, 64, 128),
                            OSCmidi(17, 33, 65, 129)]),
        # With array of values.
        OSCMessage("/array", ",i[bbf]",
                    [42, (b'A first blob', b'A second blob', 11.2)]),
        OSCMessage("/array", None,
                    [42, (b'A first blob', b'A second blob', 11.2)]),
        # With nested array of values.
        OSCMessage("/array/nested", ",i[b[bf]]",
                    [42, (b'A first blob', (b'A second blob', 11.2))]),
        OSCMessage("/array/nested", None,
                    [42, (b'A first blob', (b'A second blob', 11.2))]),
        # With some strnigs already encoded, eventually with a final zero.
        OSCMessage("/binarystrings", ',sSs',
                    [b"Bravo a vous", b"Bravo a vous",
                    b"Bravo a vous\000"]),
        # This fail! cannot have a zero byte inside a string - only allowed
        # at the end... and removed when decoding.
        #OSCMessage("/encodedstrings", ',s', (b"Bravo a \000vous")),
        # This failt! non-ascii not allowed in OSC strings/
        #OSCMessage("/badasciistr", ',s',
        #            ["Avé la façon"]),
        # With a simple bundle...
        OSCBundle(unixtime2timetag(time.time()), [
                OSCMessage("/basetypes", ",ifsc",
                    [1, 2.3, "mystring", "A"]),
                OSCMessage("/blob", ",ibb",
                    [42, b'A first blob', b'A second blob']),
                OSCMessage("/array", ",i[bbf]",
                    [42, (b'A first blob', b'A second blob', 11.2)]),
                ]),
        # With recursive bundles.
        OSCBundle(unixtime2timetag(time.time()), [
                OSCMessage("/basetypes", ",ifsc",
                    [1, 2.3, "mystring", "A"]),
                OSCMessage("/blob", ",ibb",
                    [42, b'A first blob', b'A second blob']),
                OSCMessage("/array", ",i[bbf]",
                    [42, (b'Again first blob', b'Again second blob', 11.2)]),
                OSCBundle(unixtime2timetag(time.time()), [
                    OSCMessage("/arrayhere", ",i[ccc]",
                        [42, ("a", "b", "c")]),
                    OSCMessage("/constructed", ',irm',
                        [42, OSCrgba(16, 32, 64, 128),
                        OSCmidi(17, 33, 65, 129)]),
                    ]),
                ]),
        # Special time tag in a bundle.
        OSCBundle(OSC_IMMEDIATELY, [
                OSCMessage("/emergency", ",iT", [1, True]),
                ]),
        ]:
    print('-' * 80)
    print(">>> Data:", data)
    start = time.time()
    raw = encode_packet(data)
    stop = time.time()
    print(">>> Encoded to packet in {:0.0f} µsec with {} bytes:".format(
                (stop - start) * 1000000, len(raw)))
    dumphex_buffer(raw)
    start = time.time()
    result = decode_packet(raw)
    stop = time.time()
    print(">>> Decoded from packet in {:0.0f} µsec:".format(
                (stop - start) * 1000000))
    pprint.pprint(result)

if True:    # For some debugging, I dont want the perfs tests.
    NBTESTS = 10000
    print("=" * 80)
    print("\nPERFORMANCES TESTS ON {} OPERATIONS\n".format(NBTESTS))

    start = time.time()
    for i in range(NBTESTS):
        buff = encode_packet(OSCMessage("/basetypes", ",ifsc",
                    (1, 2.3, "mystring", "A")))
    stop = time.time()
    print("Encoding simple message: {:0.3f} sec, {:0.3f} µsec "\
            "by message.".format(
            stop - start, (stop - start) / NBTESTS * 1000000))

    start = time.time()
    for i in range(NBTESTS):
        decode_packet(buff)
    stop = time.time()
    print("Decoding simple message: {:0.3f} sec, {:0.3f} µsec "\
            "by message.".format(
            stop - start, (stop - start) / NBTESTS * 1000000))
