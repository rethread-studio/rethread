#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File: osc4py3/oscbuildparse.py
# <pep8 compliant>
"""Support for building (encoding) and parsing (decoding) OSC packets.

:Copyright: LIMSI-CNRS / Laurent Pointal <laurent.pointal@limsi.fr>
:Licence: CECILL V2 (GPL-like licence from and for french research community -
see http://www.cecill.info/licences.en.html )

See http://opensoundcontrol.org/ for complete OSC documentation.

This module is only here to translate OSC packets from/to Python values.
It can be reused anywhere as is (only depend on Python3 standard modules).

Please, see extended documentation in msgbund.rst (and osc4py3
html produced documentation at
http://osc4py3.readthedocs.org/en/latest/msgbund.html )

Supported atomic data types
---------------------------

In addition to the required OSC1.1 ``ifsbTFNIt`` type tag chars,
we support optional types of OSC1.0 protocol ``hdScrm[]``
(support for new types is easy to add if necessary):

Automatic type tagging
----------------------

===================  ====================================
        What            Type tag and corresponding data
===================  ====================================
value None           ``N`` without data
value True           ``T`` without data
value False          ``F`` without data
type int             ``i`` with int32
type float           ``f`` with float32
type str             ``s`` with string
type bytes           ``b`` with raw binary
type bytearray       ``b`` with raw binary
type memoryview      ``b`` with raw binary
type OSCrgba         ``r`` with four byte values
type OSCmidi         ``m`` with four byte values
type OSCbang         ``I`` without data
type OSCtimetag      ``t`` with two int32
===================  ====================================


Out Of Band
-----------

A collection of options can be transmitted to modify some processing,
activate/deactivate checks, activate dumps...
This is realized via an ``oob`` dictionary parameter given optionally in
top-level functions and transmitted to other functions while processing.


"""

# I use flake8 to check PEP8 compliance and detect some bugs, but it failed
# on the code
#        print("Decoded {} ({} bytes): {!r}".format(val.__class__.__name__,
#                        len(val), _dumpmv(val, 60)),
#                        file=oob.get('dumpfile', sys.stdout))
# It found an invalid syntax at the "file=..." parameter.
# Looks like flake8 run under Python2 and have problem to parse the Python3
# code. The futur definition below resolve this problem.
from __future__ import print_function

# Note: Use memoryview objects when splitting rawoscdata in parts.
# Careful: A memoryview supports slicing to expose its data. Taking
# a single index will return a single element as a bytes object (not
# an integer as does bytes[n]). Full slicing will result in a subview.
# Happily, struct.unpack() works with memoryview as is.
#
# Note: I initially started the module with one class per data type, with
# their encoding/decoding methods and attributes, and making all these
# classes available at the user level, with some get/set methods to access
# Python value or OSC binary value.
# But, this not the way I would like to use OSC, its too Java-ish, not
# Pythonic.
# Finally, it built a simple interface where user mainly deal with Python
# standard types or some namedtuple, and two top-level functions to encode.
# and decode OSC packets..

import copy
from collections import namedtuple
import sys
import struct
import time

__all__ = [
    # Main functions for users.
    "encode_packet",
    "decode_packet",
    # Top-level structures for OSC encoding/decoding.
    "OSCBundle",
    "OSCMessage",
    # Second level structures for OSC messages arguments.
    "OSCtimetag",
    "OSCmidi",
    "OSCrgba",
    "OSCbang",
    # Exceptions classes.
    "OSCError",
    "OSCCorruptedRawError",
    "OSCInternalBugError",
    "OSCInvalidDataError",
    "OSCInvalidRawError",
    "OSCInvalidSignatureError",
    "OSCUnknownTypetagError",
    # Top level useful constants.
    "OSC_IMMEDIATELY",
    "OSC_IMPULSE",
    "OSC_INFINITUM",
    "OSC_BANG",
    # Timetag conversion functions.
    "float2timetag",
    "timetag2float",
    "timetag2unixtime",
    "unixtime2timetag",
    # Other functions.
    'dumphex_buffer',
    ]

# Internal constants for type tags.
OSCTYPE_STRING = ord('s')
OSCTYPE_STRINGALT = ord('S')
OSCTYPE_INT32 = ord('i')
OSCTYPE_FLOAT32 = ord('f')
OSCTYPE_BLOB = ord('b')
OSCTYPE_INT64 = ord('h')
OSCTYPE_TIMETAG = ord('t')
OSCTYPE_FLOAT64 = ord('d')
OSCTYPE_CHAR = ord('c')
OSCTYPE_RGBA = ord('r')
OSCTYPE_MIDI = ord('m')
OSCTYPE_TRUE = ord('T')
OSCTYPE_FALSE = ord('F')
OSCTYPE_NIL = ord('N')
OSCTYPE_IMPULSE = ord('I')      # Named Infinitum in OSC 1.0
OSCTYPE_ARRAYBEGIN = ord('[')
OSCTYPE_ARRAYEND = ord(']')

# Some data used to identify parts in OSC raw data.
# Note: rawoscdata[0] can be (one) bytes (when taken from memoryview), or
#       the integer byte code (when taken from bytes). So in some places
#       tests use 'in' / 'not in' operators with 1 bytes value or its code,
#       or extract slices rawoscdata[:1] in place of single element.
BEGIN_ADDRPATTERN = b'/'
BEGIN_ADDRPATTERN_CODE = ord(BEGIN_ADDRPATTERN)
BEGIN_TYPETAG = b','
BEGIN_TYPETAG_CODE = ord(BEGIN_TYPETAG)
BEGIN_BUNDLE = b'#bundle\000'

# Gone from Named tuples to classes for sphinx doc generation.

class OSCMessage(namedtuple('OSCMessage', 'addrpattern typetags arguments')):
    """
    :code:`OSCMessage(addrpattern, typetags, arguments)` → named tuple

    :ivar string addrpattern: a string beginning by ``/`` and used by OSC dispatching protocol.
    :ivar string typetags: a string beginning by ``,`` and describing how to encode values
    :ivar list|tuple arguments: a list or tuple of values to encode.
    """

class OSCBundle(namedtuple('OSCBundle', 'timetag elements')):
    """
    :code:`OSCBundle(timetag, elements)` → named tuple

    :ivar timetag: a time representation using two int values, sec:frac
    :ivar list|tuple elements: a list or tuple of mixed OSCMessage / OSCBundle values
    """

# Note: for RGBA and MIDI, we don't check that values are in 0..255 range,
# but using a specific tuple type allow to identify data types for message
# construction, and add meaning to fields.
OSCrgba = namedtuple('OSCrgba', 'red green blue alpha')
OSCmidi = namedtuple('OSCmidi', 'portid status data1 data2')
OSCbang = namedtuple('OSCbang', '')
OSC_BANG = OSCbang()
OSC_IMPULSE = OSCbang()
OSC_INFINITUM = OSCbang()


class OSCtimetag(namedtuple('OSCtimetag', 'sec frac')):
    """
    OSCtimetag(sec, frac) → named tuple

    Time tags are represented by a 64 bit fixed point number of
    seconds relative to 1/1/1900, same as Internet NTP timestamps .

    .. warning::
        We don't check that sec and frac parts fill in 32 bits integers,
        this is detected by struct.pack() function.

    :attribute int sec: first 32 bits specify the number of seconds since midnight on
                        January 1, 1900,
    :attribute int frac: last 32 bits specify fractional parts of a
                         second to a precision of about 200 picoseconds.
    """
    def __add__(self, other):
        return float2timetag(timetag2float(self) + other)
    def __radd__(other, self):
        return float2timetag(other + timetag2float(self))
    def __sub__(self, other):
        return float2timetag(timetag2float(self) - other)

# Number of seconds between 1/1/1900 (NTP base time) and 1/1/1970 (Unix epoch).
# See http://www.fourmilab.ch/documents/calendar/
# (french version here: http://geneom.free.fr/gomol/CalendFr.html )
OSCTIME_1_JAN1970 = 2208988800

# The time tag value consisting of 63 zero bits followed by a one in
# the least signifigant bit is a special case meaning "immediately."
OSC_IMMEDIATELY = OSCtimetag(0x0, 0x01)

# Attrfilter for packet containig embedded packet with controls.
ADVANCED_PACKET_CONTROL = "/packet"

# Bytes for padding to fill 4 bytes alignment and eventually a zero termination
# at end of a string. Note: for string, you must add 4 padding bytes in case
# of a string length multiple of 4 bytes (ie there must be a zero after
# the content).
padding = {}
for i in range(0, 5):
    padding[i] = b'\000' * i


#==================== HIERARCHY OF OSC ERRORS =============================
class OSCError(Exception):
    """Parent class for OSC errors.
    """
    pass


class OSCInvalidRawError(OSCError):
    """Problem detected in raw OSC input decoding.
    """
    pass


class OSCUnknownTypetagError(OSCError):
    """Found an invalid (unknown) type tag.
    """
    pass


class OSCInternalBugError(OSCError):
    """Detected a bug in OSC module.
    """
    pass


class OSCInvalidDataError(OSCError):
    """Problem detected in OSC data encoding.
    """
    pass


class OSCInvalidSignatureError(OSCError):
    """Signature of raw data refused (bad source or data modified).
    """
    pass


class OSCCorruptedRawError(OSCError):
    """Data corruption detected on raw data.
    """
    pass


#============ FUNCTIONS FOR (NOT ENOUGH BASIC) BASE TYPES =================
def _decode_str(rawoscdata, typerefs, oob):
    """
    :param rawoscdata: raw OSC data to decode
    :type rawoscdata: memoryview
    :param typerefs: references for the OSC type
    :type typerefs: OSCTypeRef
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of decoded bytes, decoded content
    :rtype: int, str
    """
    # Search first zero byte.
    for zeroindex, char in enumerate(rawoscdata):
        if char in (b'\000', 0):
            break
    else:
        raise OSCInvalidRawError("OSC non terminated string in raw data for " \
                         "{}".format(_dumpmv(rawoscdata)))
    # Align for 0 to 3 padding bytes after the zero end-of-string.
    byteslength = (zeroindex // 4) * 4 + 4
    if byteslength > len(rawoscdata):
        raise OSCInvalidRawError("OSC invalid align/length for string in "\
                            "raw data for {}".format(_dumpmv(rawoscdata)))
    # Just take the string bytes.
    # Note: there is a solution with direct memoryview, decoding byte by byte:
    #>>> s = "Un essai de laurent."
    #>>> r = s.encode("ascii")
    #>>> m = memoryview(r)
    #>>> s2 = codecs.iterdecode(m,'ascii')
    #>>> for c in s2: print(type(c),c)
    # But a direct extraction of the bytes and a decode method call seem
    # more efficient that a Python code loop.
    extract = bytes(rawoscdata[:zeroindex])
    # We stay kind with people sending non-ascii chars, just replace them.
    strcodec, error = oob.get('str_decode', ('ascii', 'strict'))
    val = extract.decode(strcodec, error)
    # Return consumed bytes, value.
    return byteslength, val


def _encode_str(val, typerefs, tobuffer, oob):
    """
    :param tobuffer: bytes collection to collect built result.
    :type tobuffer: bytearray
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of bytes produced.
    :rtype: int
    """
    # Build string representation.
    if isinstance(val, (bytes, bytearray)):
        # Directly binary format, check for presence of zero inside but
        # not at the end.
        zeroindex = val.find(b'\000')
        if zeroindex > 0 and zeroindex < len(val) - 1:
            raise OSCInvalidDataError("OSC string cannot contain zero byte " \
                             "except one at the end (removed)")
        # Allow one extra zero byte at the end, in case the string come from
        # a C string from elsewhere.
        if val[-1] == 0:
            val = val[:-1]
    elif isinstance(val, memoryview):
        if val.format != 'B':
            raise OSCInvalidDataError("OSC only accept to use "\
                                    "memoryview of bytes")
        if b'\000' in val[:-1]:
            raise OSCInvalidDataError("OSC string cannot contain zero byte " \
                             "except one at the end (removed)")
        if val[-1] == b'\000':
            val = val[:-1]
    else:
        # If you use non-string data, we simply convert it.
        val = str(val)
        # We stay kind with people sending non-ascii chars, just replace them.
        # If you want to transmit a string in another encoding, use a blob and
        # decode in user space.
        strcodec, error = oob.get('str_encode', ('ascii', 'strict'))
        val = val.encode(strcodec, error)

    # Align content to 32 bits.
    if len(val) % 4 == 0:
        # 4 bytes aligned string length, add 4 zeroes pad bytes.
        padbytes = padding[4]
    else:
        padbytes = padding[4 - len(val) % 4]

    tobuffer.extend(val)
    tobuffer.extend(padbytes)

    return len(val) + len(padbytes)


def _decode_blob(rawoscdata, typerefs, oob):
    """
    :param rawoscdata: raw OSC data to decode
    :type rawoscdata: memoryview
    :param typerefs: references for the OSC type
    :type typerefs: OSCTypeRef
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of decoded bytes, decoded content
    :rtype: int, memoryview
    """
    # Care of padding zeroes for remaining bytes (maybe no pad byte)!
    count, length = _decode_osc_type(rawoscdata, OSCTYPE_INT32, oob)
    padbytes = (4 - length % 4) % 4
    totalsize = 4 + length + padbytes
    if totalsize > len(rawoscdata):
        raise OSCInvalidRawError("OSC invalid length for blob in "\
                        "raw data for {}".format(_dumpmv(rawoscdata)))
    val = rawoscdata[4:4 + length]
    # Return consumed bytes, value.
    # Should I cast val to bytes to detach it from memoryview ?
    # If blob is big relatively to message, this is not interesting.
    # So... let that operation done by OSC user if he wants.
    return totalsize, val


def _encode_blob(val, typerefs, tobuffer, oob):
    """
    :param tobuffer: bytes collection to collect built result.
    :type tobuffer: bytearray
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of bytes produced.
    :rtype: int
    """
    length = len(val)
    # Compute padding zeroes for 32 bits alignment (maybe no pad byte)!
    padbytes = (4 - length % 4) % 4
    totalsize = 4 + length + padbytes
    # Append bytes of parts to the buffer.
    tobuffer.extend(struct.pack(">i", length))
    tobuffer.extend(val)
    if padbytes:
        tobuffer.extend(padding[padbytes])

    # Return count of produced bytes.
    return totalsize


def _decode_char(rawoscdata, typerefs, oob):
    """
    :param rawoscdata: raw OSC data to decode
    :type rawoscdata: memoryview
    :param typerefs: references for the OSC type
    :type typerefs: OSCTypeRef
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of decoded bytes, decoded content
    :rtype: int, str
    """
    # Decode ASCII (only).
    val = bytes(rawoscdata[0:1]).decode(oob.get('char_decode', 'ascii'),
                                                                'replace')
    # Return consumed bytes, value.
    return 4, val


def _encode_char(val, typerefs, tobuffer, oob):
    """
    :param tobuffer: bytes collection to collect built result.
    :type tobuffer: bytearray
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of bytes produced.
    :rtype: int
    """
    # Build string representation.
    if isinstance(val, (bytes, bytearray, memoryview)):
        if len(val) != 1:
            raise OSCInvalidDataError("OSC char must use only one byte")
        if isinstance(val, (bytes, bytearray)):
            val = val[0]
        else:
            val = val[0][0]    # memoryview[0] --> bytes, bytes[0] --> int
    elif isinstance(val, (int, float, bool)):
        val = int(val)
    else:
        # If you use non-string data, we simply convert it.
        val = str(val)
        # We stay kind with people sending non-ascii chars, just replace them.
        # If you want to transmit a string in another encoding, use a blob and
        # decode in user space.
        val = val.encode(oob.get('char_encode', 'ascii'), 'replace')
        if len(val) != 1:
            raise OSCInvalidDataError("OSC ascii char must use only one byte")
        val = val[0]

    if not (0 <= val <= 255):
        raise OSCInvalidDataError("OSC value of char must fill in one byte")

    # Append bytes of parts to the buffer.
    tobuffer.append(val)
    tobuffer.extend(padding[3])

    # Return count of produced bytes.
    return 4


#======================= FUNCTIONS FOR BASE TYPES ==========================

# A named tuple to store references for encoding/decoding data.
OSCTypeRef = namedtuple('OSCTypeRef', 'typetag typename pytype byteslen ' \
                                     'defvalue decode encode')

NODEFAULT = "nodefault"     # To be able to have None as real default value.
osctypes_refs = {
    OSCTYPE_INT32:
        # 32-bit big-endian two's complement integer.
        OSCTypeRef('i', "int32", int, 4, NODEFAULT, ">i", ">i"),
    OSCTYPE_TIMETAG:
        # 64-bit big-endian fixed-point time tag.
        #
        # Time tags are represented by a 64 bit fixed point number.
        # The first 32 bits specify the number of seconds since midnight on
        # January 1, 1900, and the last 32 bits specify fractional parts of a
        # second to a precision of about 200 picoseconds.
        OSCTypeRef('t', "timetag", OSCtimetag, 8, NODEFAULT, '>II', '>II'),
    OSCTYPE_FLOAT32:
        # 32-bit big-endian IEEE 754 floating point number.
        OSCTypeRef('f', "float32", float, 4, NODEFAULT, ">f", ">f"),
    OSCTYPE_STRING:
        # A sequence of non-null ASCII characters followed by a null,
        # followed by 0-3 additional null characters to make the total number
        # of bits a multiple of 32.
        OSCTypeRef('s', "string", str, None, NODEFAULT, _decode_str,
                                                        _encode_str),
    OSCTYPE_STRINGALT:
        # 'S' tag is for alternate type represented as an OSC-string (for
        # example for systems that differentiate "symbols" from "strings")
        OSCTypeRef('S', "string", str, None, NODEFAULT, _decode_str,
                                                        _encode_str),
    OSCTYPE_BLOB:
        # An int32 size count, followed by that many 8-bit bytes of arbitrary
        # binary data, followed by 0-3 additional zero bytes to make the total
        # number of bits a multiple of 32.
        OSCTypeRef('b', "blob", bytes, None, NODEFAULT, _decode_blob,
                                                        _encode_blob),
    OSCTYPE_INT64:
        # 64 bit big-endian two's complement integer.
        OSCTypeRef('h', "int64", int, 8, NODEFAULT, ">q", ">q"),
    OSCTYPE_FLOAT64:
        # 64 bit ("double") IEEE 754 floating point number.
        OSCTypeRef('d', "float64", float, 8, NODEFAULT, ">d", ">d"),
    OSCTYPE_CHAR:
        #  An ascii character, sent as 32 bits.
        OSCTypeRef('c', "char", str, None, NODEFAULT, _decode_char,
                                                      _encode_char),
    OSCTYPE_RGBA:
        # 32 bit RGBA color.
        OSCTypeRef('r', "rgba", OSCrgba, 4, NODEFAULT, "BBBB", "BBBB"),
    OSCTYPE_MIDI:
        # 4 byte MIDI message.
        # Bytes from MSB to LSB are: port id, status byte, data1, data2.
        OSCTypeRef('m', "midi", OSCmidi, 4, NODEFAULT, "BBBB", "BBBB"),
    OSCTYPE_TRUE:
        # True or False. No bytes are allocated in the argument data.
        OSCTypeRef('T', "booltrue", bool, 0, True, None, None),
    OSCTYPE_FALSE:
        # True or False. No bytes are allocated in the argument data.
        OSCTypeRef('F', "boolfalse", bool, 0, False, None, None),
    OSCTYPE_NIL:
        # Nil. No bytes are allocated in the argument data.
        OSCTypeRef('N', "nil", None, 0, None, None, None),
    OSCTYPE_IMPULSE:
        # Infinitum. No bytes are allocated in the argument data.
        OSCTypeRef('I', "impulse", OSCbang, 0, OSC_INFINITUM, None, None),
    # Array ('[' and ']') is not processed via this table.
    }


def _decode_osc_type(rawoscdata, typetag, oob):
    """Decode an OSC stream into a single base value from its type tag.

    Remaining bytes in the stream must be processed elsewhere (offset by
    count bytes returned).

    .. Note:: the count of consumed bytes may be zero for values directly
              encoded in the type tag.

    :param rawoscdata: sequences of bytes containing OSC data,
    :type rawoscdata: memoryview
    :param typetag: value of the tag to identify data type.
    :param oob: out of band extra parameters / options
    :type oob: dict
    :type typetag: int (ord(char) if you have a char)
    :return: count of consumed bytes, decoded value
    """
    if oob.get('restrict_typetags', False):
        restrict = oob.get('restrict_typetags')
        if not chr(typetag) in restrict:
            raise OSCUnknownTypetagError("OSC type tag {!r} not in "\
                        "resticted when decoding".format(chr(typetag)))

    try:
        typerefs = osctypes_refs[typetag]
    except KeyError:
        # Transform the exception - make it more selectable.
        raise OSCUnknownTypetagError("OSC unknown type tag {!r} when "\
                                "decoding".format(chr(typetag)))

    if callable(typerefs.decode):
        # Decoding service providen by a special function.
        count, val = typerefs.decode(rawoscdata, typerefs, oob)
    else:
        if isinstance(typerefs.decode, str):
            # Decode contains the struct format for the value.
            val = struct.unpack(typerefs.decode,
                                rawoscdata[:typerefs.byteslen])
            if typerefs.pytype in (tuple, list, OSCrgba, OSCmidi, OSCtimetag):
                val = typerefs.pytype(*val)
            else:
                val = typerefs.pytype(val[0])
        elif typerefs.defvalue is not NODEFAULT:
            # A default value is providen: mainly for values directly inside
            # type tags (booleans true/false, nil, infinite).
            val = typerefs.defvalue
        else:
            raise OSCInternalBugError("OSC BUG: don't know how to process "\
                    "typecode {} in osctypes_refs".format(typerefs.typetag))
        count = typerefs.byteslen

    if oob.get('dump_decoded_values', False):
        if isinstance(val, (bytes, bytearray, memoryview)):
            # This trig flake8/pylint bug, file=... is considered
            # invalid syntax (but accepted by Python3).
            print("Decoded {} ({} bytes): {}".format(val.__class__.__name__,
                            len(val), _dumpmv(val, 60)),
                            file=oob.get('dumpfile', sys.stdout))
        else:
            print("Decoded {}: {}".format(val.__class__.__name__, val),
                        file=oob.get('dumpfile', sys.stdout))

    # Return count of consumed bytes, value.
    return count, val


def _encode_osc_type(val, typetag, tobuffer, oob):
    """Encode a single base value as OSC data at the end of a buffer.

    For some values, like rgba or midi, the "single" value can be composed
    of four integer values in a tuple.

    Note: the count of produced  bytes may be zero for values directly
    encoded in the type tag.

    :param val: value to encode.
    :type val: depend on type tag.
    :param typetag: value of the tag to identify data type.
    :type typetag: int (ord(char) if you have a char)
    :param tobuffer: bytes collection to collect built result.
    :type tobuffer: bytearray
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of bytes produced.
    :rtype: int
    """
    if oob.get('restrict_typetags', False):
        restrict = oob.get('restrict_typetags')
        if not chr(typetag) in restrict:
            raise OSCUnknownTypetagError("OSC type tag {!r} not in "\
                        "resticted when encoding".format(chr(typetag)))

    try:
        typerefs = osctypes_refs[typetag]
    except KeyError:
        # Transform the exception - make it more selectable.
        raise OSCUnknownTypetagError("OSC unknown type tag {!r} when "\
                                "encoding".format(chr(typetag)))

    if callable(typerefs.encode):
        # Encoding service providen by a special function.
        count = typerefs.encode(val, typerefs, tobuffer, oob)
    else:
        if isinstance(typerefs.encode, str):
            # Encode contains the struct format for the value.
            if typerefs.pytype in (tuple, list, OSCrgba, OSCmidi, OSCtimetag):
                rawoscdata = struct.pack(typerefs.encode, *val)
            else:
                rawoscdata = struct.pack(typerefs.encode, typerefs.pytype(val))
        elif typerefs.byteslen == 0:
            # The value may directly be encoded inside the tag (booleans
            # true/false, nil, infinite).
            rawoscdata = b''

        tobuffer.extend(rawoscdata)
        count = len(rawoscdata)

    # Return count of produced bytes.
    return count


#==================== FUNCTIONS FOR CONSTRUCTED TYPES =======================

def _decode_bundle(rawoscdata, oob):
    """Decode an OSC bundle raw data into an OSCBundle object.

    :param rawoscdata: sequences of bytes containing OSC data,
    :type rawoscdata: memoryview
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of consumed bytes, decoded value
    :rtype: int, OSCBundle
    """
    # An OSC Bundle consists of the OSC-string "#bundle" followed by an OSC
    # Time Tag, followed by zero or more OSC Bundle Elements. The OSC-timetag
    # is a 64-bit fixed point time tag whose semantics are described below.
    #
    # An OSC Bundle Element consists of its size and its contents.
    # The size is an int32 representing the number of 8-bit bytes in the
    # contents, and will always be a multiple of 4. The contents are either
    # an OSC Message or an OSC Bundle.
    #
    # Note this recursive definition: bundle may contain bundles.
    totalcount = 0

    # Check if first part is an osc string with #bundle
    count, bundlehead = _decode_osc_type(rawoscdata, OSCTYPE_STRING, oob)
    if bundlehead != "#bundle":
        raise OSCInvalidRawError("OSC invalid bundle header in message:" \
                        "{}".format(_dumpmv(rawoscdata)))
    totalcount += count
    rawoscdata = rawoscdata[count:]

    count, timetag = _decode_osc_type(rawoscdata, OSCTYPE_TIMETAG, oob)
    totalcount += count
    rawoscdata = rawoscdata[count:]

    # Will process the whole bundle, element by element.
    elements = []
    elemcount = 0
    while len(rawoscdata):
        elemcount += 1
        # Get size of next element.
        count, size = _decode_osc_type(rawoscdata, OSCTYPE_INT32, oob)
        if size + count > len(rawoscdata):
            raise OSCInvalidRawError("OSC invalid bundle element {} size "\
                    "in message: size {} for remaining {} "\
                    "bytes, size&data: {}".format(elemcount, size,
                        len(rawoscdata) - count, _dumpmv(rawoscdata)))
        totalcount += count
        rawoscdata = rawoscdata[count:]

        # Get element data and process it. Use function common with packet
        # to identify bundle/message from raw beginning.
        subpart = rawoscdata[:size]
        count, elem = _decode_element(subpart, oob)
        elements.append(elem)
        totalcount += size
        rawoscdata = rawoscdata[size:]

    return totalcount, OSCBundle(timetag, tuple(elements))


def _encode_bundle(bundle, tobuffer, oob):
    """
    :param tobuffer: bytes collection to collect built result.
    :type tobuffer: bytearray
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of bytes produced.
    :rtype: int
    """
    return _encode_bundle_fields(bundle.timetag, bundle.elements,
                                tobuffer, oob)


def _encode_bundle_fields(timetag, elements, tobuffer, oob):
    """Encode a set of elements into a bundle.

    Note: OSC doc indicates that contained bundles must have timetag greater
    or equal than container bundle, but this is not enforced neither checked
    by this function.

    :param timetag: time tag value.
    :type timetag: float or OSCtimetag
    :param elements: already encoded representation of bundle elements.
    :type elements: bytes or bytearray
    :param tobuffer: bytes collection to collect built result.
    :type tobuffer: bytearray
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of bytes produced.
    :rtype: int
    """
    totalcount = 0
    # First, the bundle.
    totalcount += _encode_osc_type(BEGIN_BUNDLE, OSCTYPE_STRING, tobuffer, oob)
    # Second, the time tag.
    totalcount += _encode_osc_type(timetag, OSCTYPE_TIMETAG, tobuffer, oob)
    for elem in elements:
        # Preserve room for element size.
        elemsizeindex = len(tobuffer)
        totalcount += _encode_osc_type(0, OSCTYPE_INT32, tobuffer, oob)
        # Encode element.
        if isinstance(elem, OSCBundle):
            elemsize = _encode_bundle(elem, tobuffer, oob)
        elif isinstance(elem, OSCMessage):
            elemsize = _encode_message(elem, tobuffer, oob)
        else:
            raise OSCInvalidDataError("OSC element {!r} is not OSCBundle or "\
                    "OSCMessage.".format(elem.__class__.__name__))
        # Update element size inside bundle encoded data.
        elemsizebuffer = bytearray()
        _encode_osc_type(elemsize, OSCTYPE_INT32, elemsizebuffer, oob)
        tobuffer[elemsizeindex:elemsizeindex + 4] = elemsizebuffer

        totalcount += elemsize

    return totalcount


def _encode_bundle_from_buffers(timetag, elements, tobuffer, oob):
    """Encode a set of pre-encoded elements into a bundle.

    .. warning:: this function don't check that your elements are valid,
                 neither that contained bundle time tags are greater
                 than or equal to container time tag.

    :param timetag: time tag value.
    :type timetag: float or OSCtimetag
    :param elements: already encoded representation of bundle elements.
    :type elements: bytes or bytearray
    :param tobuffer: bytes collection to collect built result.
    :type tobuffer: bytearray
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of bytes produced.
    :rtype: int
    """
    totalcount = 0
    # First, the bundle.
    totalcount += _encode_osc_type(BEGIN_BUNDLE, OSCTYPE_STRING, tobuffer, oob)
    # Second, the time tag.
    totalcount += _encode_osc_type(timetag, OSCTYPE_TIMETAG, tobuffer, oob)
    for elem in elements:
        totalcount += _encode_osc_type(len(elem), OSCTYPE_INT32, tobuffer, oob)
        tobuffer.extend(elem)
        totalcount += len(elem)
    return totalcount


def _decode_message(rawoscdata, oob):
    """Decode a raw OSC message into an OSCMessage named tuple.

    Raw data is processed to retrieve the message.
    Return count of bytes processed, and one OSCMessage named tuple.

    :param rawoscdata: raw OSC data to decode
    :type rawoscdata: memoryview
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of decoded bytes, decoded content
    :rtype: int, OSCMessage
    """
    totalcount = 0
    # Search for message beginning addrpattern.
    if len(rawoscdata) < 4:
        raise OSCInvalidRawError("OSC invalid too short raw message: "\
                "{}".format(_dumpmv(rawoscdata)))
    if rawoscdata[0] not in (BEGIN_ADDRPATTERN, BEGIN_ADDRPATTERN_CODE):
        raise OSCInvalidRawError("OSC invalid raw message don't start by /: " \
                "{}".format(_dumpmv(rawoscdata)))
    count, addrpattern = _decode_osc_type(rawoscdata, OSCTYPE_STRING, oob)
    totalcount += count
    rawoscdata = rawoscdata[count:]

    # Message address pattern decompression.
    if addrpattern == '/' and oob.get('addrpattern_decompression', False):
        count, msgkey = _decode_osc_type(rawoscdata, OSCTYPE_INT32, oob)
        totalcount += count
        rawoscdata = rawoscdata[count:]
        decompmap = oob.get('addrpattern_decompression')
        addrpattern = decompmap.get(msgkey, None)
        if addrpattern is None:
            raise OSCInvalidRawError("OSC compressed addrpattern {} unknown "\
                "in addrpattern_decompression mapping".format(msgkey))

    if oob.get('check_addrpattern', False):
        nameslist = addrpattern.split('/')
        for name in nameslist:
            for c in name:
                if not c.isprintable() or c in ' #*,/?[]{}':
                    raise OSCInvalidRawError("OSC addrpattern name "\
                            "contains invalid char code {} "\
                            "({!r} in {!r})".format(
                            ord(c), name, addrpattern))
    # Search for typetag.
    if len(rawoscdata) < 4:
        if oob.get('force_typetags', True):
            raise OSCInvalidRawError("OSC invalid type tags in raw message: "
                            "{}".format(_dumpmv(rawoscdata)))
    if bytes(rawoscdata)[:1] != BEGIN_TYPETAG:
        if oob.get('force_typetags', True):
            raise OSCInvalidRawError("OSC invalid type tags, don't "\
                "start by ,: {}".format(_dumpmv(rawoscdata)))
        else:
            # Note: some older implementations of OSC may omit the OSC
            # Type Tag string. Until all such implementations are updated,
            # OSC implementations should be robust in the case of a
            # missing OSC Type Tag String.
            typetags = ","  # Consider no value (ie just an addrpattern).
    else:
        count, typetags = _decode_osc_type(rawoscdata, OSCTYPE_STRING, oob)
        totalcount += count
        rawoscdata = rawoscdata[count:]

    # Extract individual data - pass initial ','.
    typetagsiter = iter(typetags)
    next(typetagsiter)     # pass the heading ','.
    count, arguments = _decode_arguments(typetagsiter, rawoscdata, oob)
    totalcount += count

    # Return consumed bytes, message.
    msg = OSCMessage(addrpattern, typetags, arguments)
    return totalcount, msg


def _encode_message(message, tobuffer, oob):
    """Build OSC representation of a message.

    Message representation is added at the end of tobuffer (generally an
    bytearray).

    To build a message without an OSCMessage object (directly with
    message parts), use function :func:`_encode_message_fields`.

    :param message: message object to encode.
    :param message: OSCMessage
    :param tobuffer: bytes collection to collect built result.
    :type tobuffer: bytearray
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of bytes produced.
    :rtype: int
    """
    return _encode_message_fields(message.addrpattern, message.typetags,
                                  message.arguments, tobuffer, oob)


def _encode_message_fields(addrpattern, typetags, arguments, tobuffer, oob):
    """Build OSC representation of a message.

    If providen, the typetags must have the first , at beginning.
    If not providen, the typetags is guessed from Python data types (see
    :func:`_osctypefor` function and osctypes_encoderefs map.

    Message representation is added at the end of tobuffer (generally an
    bytearray).

    To build a message directly with an OSCMessage object, use function
    :func:`_encode_message`.

    .. note:: for arguments, when using tuples, take care for tuple of one
              element written ("value",) - prefer to use lists to avoid
              errors.

    :param typetags: type tags for the data or None.
    :param typetags: str or None
    :param arguments: collection of Python values.
    :type arguments: list or tuple
    :param tobuffer: bytes collection to collect built result.
    :type tobuffer: bytearray
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of bytes produced.
    :rtype: int
    """
    if not typetags:
        typetags = ',' + _osctypetags4(arguments, oob)

    if not addrpattern.startswith('/'):
        raise OSCInvalidDataError("OSC invalid addrpattern beginning: "\
                                    "missing /")
    if not typetags.startswith(','):
        raise OSCInvalidDataError("OSC invalid typetags beginning: "\
                                    "missing ,")

    if oob.get('check_addrpattern', False):
        nameslist = addrpattern.split('/')
        for name in nameslist:
            for c in name:
                if not c.isprintable() or c in ' #*,/?[]{}':
                    raise OSCInvalidDataError("OSC addrpattern name contain "
                            "invalid char code {} ({!r} in {!r})".format(
                            ord(c), name, addrpattern))

    # Message address pattern compression.
    if oob.get('addrpattern_compression', False):
        compmap = oob.get('addrpattern_compression')
        msgkey = compmap.get(addrpattern, None)
        if msgkey is not None:
            addrpattern = "/"   # Information will be in msgkey int value.
    else:
        msgkey = None

    totalcount = 0

    totalcount += _encode_osc_type(addrpattern, OSCTYPE_STRING, tobuffer, oob)
    if msgkey is not None:    # Message address pattern compression int key.
        totalcount += _encode_osc_type(msgkey, OSCTYPE_INT32, tobuffer, oob)
    totalcount += _encode_osc_type(typetags, OSCTYPE_STRING, tobuffer, oob)
    typetagsiter = iter(typetags)
    next(typetagsiter)     # pass the heading ','.
    totalcount += _encode_arguments(typetagsiter, arguments, tobuffer, oob)
    return totalcount


# Correspondance for automatic encoding of data without providing type tags.
# It only match with types. Values are matched directly with the function.
osctypes_encoderefs = {
    int: OSCTYPE_INT32,
    float: OSCTYPE_FLOAT32,
    str: OSCTYPE_STRING,
    bytes: OSCTYPE_BLOB,
    bytearray: OSCTYPE_BLOB,
    memoryview: OSCTYPE_BLOB,
    OSCrgba: OSCTYPE_RGBA,
    OSCmidi: OSCTYPE_MIDI,
    OSCtimetag: OSCTYPE_TIMETAG,
    OSCbang: OSCTYPE_IMPULSE,
    }


def _osctypetags4(arguments, oob):
    """Build OSC type tags string for list/tuple of Python values.

    :param arguments: collection of OSC compatible Python values.
    :param arguments: list or tuple
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: type tags identified for the arguments, without heading ',' char.
    :rtype: str
    """
    # Used by _encode_message() when typetags parameter is None (ie. autodetect
    # arguments types).
    typetags = []
    for x in arguments:
        if type(x) is bool:
            # Cannot process bool values in the mapping as 1 map to True.
            if x:
                typetags.append(chr(OSCTYPE_TRUE))
            else:
                typetags.append(chr(OSCTYPE_FALSE))
        elif x is None:
            typetags.append(chr(OSCTYPE_NIL))
        elif type(x) in osctypes_encoderefs:    # --- By type.
            typetags.append(chr(osctypes_encoderefs[type(x)]))
        elif isinstance(x, (tuple, list)):      # --- An array.
            # Recursively identify types within the array.
            typetags.append('[')
            typetags.append(_osctypetags4(x, oob))
            typetags.append(']')
        else:
            raise RuntimeError("OSC cannot detect type from Python "\
                            "value {!r}".format(x))
    typetags = ''.join(typetags)
    return typetags


def _encode_arguments(typetagsiter, arguments, tobuffer, oob):
    """Internal function, encode a list/tuple of Python values.

    Iterators is used for typetags to manage array and recursive call.
    The heading ',' char of typetags must be already passed by the iterator.

    :param typetagsiter: iterator type tags.
    :param typetagsiter: str iterator
    :param arguments: collection of Python values.
    :type arguments: list or tuple
    :param tobuffer: bytes collection to collect built result.
    :type tobuffer: bytearray
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: count of bytes produced.
    :rtype: int
    """
    # Used by _encode_message(), code moved into function to support recursive
    # call in case of array argument.
    index = 0
    totalcount = 0
    for tag in typetagsiter:
        if tag == '[':
            totalcount += _encode_arguments(typetagsiter, arguments[index],
                                            tobuffer, oob)
        elif tag == ']':
            break
        else:
            tagnum = ord(tag)   # Use numeric representation of tag as keys.
            totalcount += _encode_osc_type(arguments[index], tagnum,
                                            tobuffer, oob)
        index += 1
    # Because of recursive calls and use of iterator on typetags, we con only
    # detect bad arguments count here.
    if len(arguments) != index:
        raise OSCInvalidDataError("OSC typetags don't correspond to "\
                                    "total count of arguments")
    return totalcount


def _decode_arguments(typetagsiter, rawoscdata, oob):
    """Internal function, decode a list/tuple of Python values.

    :param typetagsiter: iterator on type tags
    :param typetagsiter: str iterator
    :param rawoscdata: raw OSC data to decode
    :type rawoscdata: memoryview
    :param oob: out of band extra parameters / options
    :type oob: dict
    """
    # Used by _decode_message(), code moved into function to support recursive
    # call in case of array argument.
    totalcount = 0
    arguments = []

    for tag in typetagsiter:
        tagnum = ord(tag)
        if tagnum in osctypes_refs:
            count, arg = _decode_osc_type(rawoscdata, tagnum, oob)
        elif tagnum == OSCTYPE_ARRAYBEGIN:
            count, arg = _decode_arguments(typetagsiter, rawoscdata, oob)
        elif tagnum == OSCTYPE_ARRAYEND:
            break
        else:
            raise OSCUnknownTypetagError("OSC unknown type tag "\
                                         "{!r}".format(tag))
        totalcount += count
        rawoscdata = rawoscdata[count:]
        arguments.append(arg)

    return totalcount, tuple(arguments)


def _decode_element(rawoscdata, oob):
    """Internal function - decode bundle element / packet content.

    Return an OSCBundle or an OSCMessage .

    (common code for packet content and buffer content)

    The data can be either a message or a bundle (OSCMessage or OSCBundle).

    :param rawoscdata: raw OSC data to decode
    :type rawoscdata: memoryview
    :param oob: out of band extra parameters / options
    :type oob: dict
    :return: decoded content of the raw data
    :rtype: OSCBundle or OSCMessage
    """
    # !rawoscdata[0] is 
    if rawoscdata[0] in (BEGIN_ADDRPATTERN, BEGIN_ADDRPATTERN_CODE):
        # Content is just a message.
        count, res = _decode_message(rawoscdata, oob)
    elif rawoscdata[0:len(BEGIN_BUNDLE)] == BEGIN_BUNDLE:
        # Content is a bundle.
        count, res = _decode_bundle(rawoscdata, oob)
    else:
        raise OSCInvalidRawError("OSC unknown raw data structure:" \
                            "{}".format(_dumpmv(rawoscdata)))
    if len(rawoscdata) > count:
        raise OSCInvalidRawError("OSC remaining data after raw structures:" \
            " {}".format(_dumpmv(rawoscdata)))

    return count, res


def decode_packet(rawoscdata, oob=None):
    """From a raw OSC packet, extract the list of OSCMessage.

    Generally the packet come from an OSC channel reader (UDP, multicast, USB port,
    serial port, etc). It can contain bundle or message.
    The function guess the packet content and call ah-hoc decoding.

    This function map a memoryview on top of the raw data. This allow
    sub-called functions to not duplicate data when processing.
    You can provide directly a memoryview if you have a packet from which
    just a part is the osc data.

    :param rawoscdata: content of packet data to decode.
    :type rawoscdata: bytes or bytearray or memoryview (indexable bytes)
    :param oob: out of band extra parameters (see :ref:`oob options`).
    :type oob: dict
    :return: decoded OSC messages from the packet, in decoding order.
    :rtype: [ OSCMessage ]
    """
    rawoscdata = memoryview(rawoscdata)
    if rawoscdata.format != 'B':
        raise  OSCInvalidRawError("OSC packet base type must be bytes.")

    if oob is None:
        oob = {}

    if oob.get('decode_packet_dumpraw', False):
        print("OSC decoding packet:", file=oob.get('dumpfile', sys.stdout))
        dumphex_buffer(rawoscdata, oob.get('dumpfile', None))

    size = len(rawoscdata)
    if size == 0 or size % 4 != 0:
        raise OSCInvalidRawError("OSC packet must be a multiple of 4 bytes" \
                        "length: {}".format(_dumpmv(rawoscdata)))

    # Call code common to decode bundle elements and packet content.
    count, packet = _decode_element(rawoscdata, oob)

    if oob.get('decode_packet_dumpacket', False):
        print("OSC decoded packet:", file=oob.get('dumpfile', sys.stdout))
        print(packet, file=oob.get('dumpfile', sys.stdout))

    # Futur advanced control on OSC data transmission.
    if oob.get('advanced_packet_control', False):
        # You can pass extra parameters to advanced packet control functions
        # in the oob dictionnary.

        if not isinstance(packet, OSCMessage) or \
                    packet.addrpattern != ADVANCED_PACKET_CONTROL:
            raise OSCInvalidRawError("OSC packet don't match data for "\
                        "advanced packet control (not an OSCMessage "\
                        "or without "\
                        "{!r} addrpattern.".format(ADVANCED_PACKET_CONTROL))

        # Get advanced control data.
        cheksumprot = packet.arguments[0]
        rawcksum = packet.arguments[1]
        authprot = packet.arguments[2]
        rawckauth = packet.arguments[3]
        cryptprot = packet.arguments[4]
        rawoscdata = packet.arguments[5]

        # Decrypt the raw packet to retrieve normal data.
        fdecrypt = oob.get('packet_decrypt_fct', None)
        if fdecrypt is not None:
            # The fdecrypt must return binary representation of uncrypted data.
            rawoscdata = fdecrypt(rawoscdata, cryptprot, oob)
            # Ensure its a memoryview for other functions.
            rawoscdata = memoryview(rawoscdata)

        # Check signature of the raw packet.
        fckauthsign = oob.get('packet_ckauthsign_fct', None)
        if fckauthsign is not None:
            # The fckauthsign must check raw data with signature and raise an
            # exception if they don't match.
            fckauthsign(rawoscdata, rawckauth, authprot, oob)

        # Check checksum of the raw packet.
        fchecksumcheck = oob.get('packet_ckcheksum_fct', None)
        if fchecksumcheck is not None:
            # The fchecksumcheck must check raw data with checksum and raise an
            # exception if they don't match.
            fchecksumcheck(rawoscdata, rawcksum, cheksumprot, oob)

        # Extract real content from raw representation.
        oobnocontrol = copy.copy(oob)
        oobnocontrol['advanced_packet_control'] = False
        packet = decode_packet(rawoscdata, oobnocontrol)

    return packet


def encode_packet(content, oob=None):
    """From an OSCBundle or an OSCMessage, build OSC raw packet.

    :param content: data of packet to encode
    :type content: OSCMessage or OSCBundle
    :param oob: out of band extra parameters (see :ref:`oob options`).
    :type oob: dict
    :return: raw representation of the packet
    :rtype: bytearray
    """
    if oob is None:
        oob = {}

    if oob.get('encode_packet_dumpacket', False):
        print("OSC encoding packet:", file=oob.get('dumpfile', sys.stdout))
        print(content, file=oob.get('dumpfile', sys.stdout))

    # We will collect data here.
    tobuffer = bytearray()

    if isinstance(content, OSCBundle):
        _encode_bundle(content, tobuffer, oob)
    elif isinstance(content, OSCMessage):
        _encode_message(content, tobuffer, oob)
    else:
        raise OSCInvalidDataError("OSC content {!r} is not OSCBundle or "\
                "OSCMessage.".format(content.__class__.__name__))

    if oob.get('encode_packet_dumpraw', False):
        print("OSC encoded packet:", file=oob.get('dumpfile', sys.stdout))
        dumphex_buffer(tobuffer, oob.get('dumpfile', None))

    # Futur advanced control on OSC data transmission.
    if oob.get('advanced_packet_control', False):
        # You can pass extra parameters to advanced packet control functions
        # in the oob dictionnary.

        # Checksum the raw packet.
        fchecksum = oob.get('packet_mkchecksum_fct', None)
        cksumprot = oob.get('packet_checksum_prot', "")
        if fchecksum is not None:
            # The fchecksum must return blob representation of the checksum
            # for data control.
            cksum = fchecksum(tobuffer, cksumprot, oob)
        else:
            cksum = ""
        # Sign the raw packet.
        fauthsign = oob.get('packet_mkauthsign_fct', None)
        authprot = oob.get('packet_authsign_prot', "")
        if fauthsign is not None:
            # The fauthsign must return blob representation of the signed data
            # for authentication control.
            authsign = fauthsign(tobuffer, authprot, oob)
        else:
            authsign = ""
        # Encrypt the raw packet.
        fencrypt = oob.get('packet_encrypt_fct', None)
        cryptprot = oob.get('packet_crypt_prot', "")
        if fencrypt is not None:
            # The fencrypt must return binary representation of crypted data.
            tobuffer = fencrypt(tobuffer, cryptprot, oob)

        controlledpacket = OSCMessage(ADVANCED_PACKET_CONTROL, ",sbsbsb",
                [cksumprot, cksum, authprot, authsign, cryptprot, tobuffer])

        oobnocontrol = copy.copy(oob)
        oobnocontrol['advanced_packet_control'] = False
        tobuffer = encode_packet(controlledpacket, oobnocontrol)

    return tobuffer


#============================== EXTRA TOOLS =================================
def _dumpmv(data, length=20):
    """Return printable version of a memoryview sequence of bytes.

    This function is called everywhere we raise an error and wants to
    attach part of raw data to the exception.

    :param data: some raw data to format.
    :type data: bytes or memoryview
    :param length: how many bytes to dump, length<=0 to dump all bytes.
        Default to 20 bytes.
    :type length: int
    """
    if length <= 0:
        length = len(data)
    if isinstance(data, memoryview):
        data = bytes(data[:length])
    linetext = []
    # The length
    if length != len(data):
        linetext.append("({} first bytes) ".format(length))
    else:
        linetext.append("({} bytes) ".format(len(data)))
    # First n bytes as hexa codes.
    linetext.extend(("{:02x} ".format(v) for v in data))
    linetext.append('   ')
    # First n bytes as text.
    for v in data[:length]:
        if 32 <= v <= 126:
            linetext.append(chr(v))
        else:
            linetext.append('.')
    return "".join(linetext)


def dumphex_buffer(rawdata, tofile=None):
    """Dump hexa codes of OSC stream, group by 4 bytes to identify parts.

    :param data: some raw data to format.
    :type data: bytes
    :param tofile: output stream to receive dump
    :type tofile: file (or file-like)
    """
    if tofile is None:
        tofile = sys.stdout

    i = 0
    linebytes = []
    linetext = []
    ofs = 0
    while i < len(rawdata):
        v = rawdata[i]
        linebytes.append("{:02x}".format(v))
        if 32 <= v <= 126:
            linetext.append(chr(v))
        else:
            linetext.append('.')
        if (i + 1) % 16 == 0 or i == len(rawdata) - 1:
            bytes = ''.join(linebytes)
            text = ''.join(linetext)
            print("{:03d}:{:40s}{}".format(ofs, bytes, text), file=tofile)
            linetext = []
            linebytes = []
            ofs = i + 1     # Index of *next* value.
        elif (i + 1) % 4 == 0:
            linebytes.append(' ')
            linetext.append(' ')
        i += 1


def timetag2float(timetag):
    """Convert a timetag tuple into a float value in seconds from 1/1/1900.

    :param timetag: the tuple time to convert
    :type timetag: OSCtimetag
    :return: same time in seconds, with decimal part
    :rtype: float
    """
    sec, frac = timetag
    return (float(sec) + frac / 2 ** 32)


def timetag2unixtime(timetag):
    """Convert a timetag tuple into a float value of seconds from 1/1/1970.

    :param timetag: the tuple time to convert
    :type timetag: OSCtimetag
    :return: time in unix seconds, with decimal part
    :rtype: float
    """
    return timetag2float(timetag) - OSCTIME_1_JAN1970


def float2timetag(ftime):
    """Convert a float value of seconds from 1/1/1900 into a timetag tuple.

    :param ftime: number of seconds to convert, with decimal part
    :type ftime: float
    :return: same time in sec,frac tuple
    :rtype: OSCtimetag
    """
    sec = int(ftime)
    frac = int((ftime - sec) * 2 ** 32 + 0.5)
    return OSCtimetag(sec, frac)


def unixtime2timetag(ftime=None):
    """Convert a float value of seconds from 1/1/1970 into a timetag tuple.

    :param ftime: number of seconds to convert, with decimal part.
                  If not specified, the function use current Python time.time().
    :type ftime: float
    :return: same time in sec,frac tuple
    :rtype: OSCtimetag
    """
    if ftime is None:
        ftime = time.time()
    return float2timetag(ftime + OSCTIME_1_JAN1970)

