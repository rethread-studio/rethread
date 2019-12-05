#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/oscmethod.py
# <pep8 compliant>
"""Matching of OSC address pattern strings for routing function calls.

:Copyright: LIMSI-CNRS / Laurent Pointal <laurent.pointal@limsi.fr>
:Licence: CECILL V2 (GPL-like licence from and for french research community -
see http://www.cecill.info/licences.en.html )

This module rewrite OSC address pattern matching expressions into Python
regular expressions which are compiled. This allow to have a full RE speed
when matching messages address pattern.
It can be reused anywhere (note that it use definition of OSCMessage from
oscbuildparse module to access members of that named tuple).

Filters are wrapped into MethodFilter which keep some extra informations
used when calling the function - extra parameters to access the calling
context (source of the message, reading channel which receive it), and
eventuelly a specific extra parameter given to the function by the address
pattern filter (not from the message).
MethodFilter also allow to execute functions in other threads or in an
event loop scheme, via a WorkQueue.

You can use it simply like this:

def handler(*args):
    print("Received", args)

methfilter = MethodFilter("/test", handler)

# Build a message...
msg = OSCMessage("/test/1/go", None, ["One, "Two", 3])
# or decode a message (see osc4py3.oscbuildparse)
msg = decode_packet(rawbinarydata)

if methfilter.match(msg.addrpattern):
    methfilter(msg, None)

On top of that you can use your own network communications, list of method
filters, etc.

But, it may be easier to directly use top-level functions of the package, see
modules as_allthreads, as_eventloop, as_comthreads and the correspondind demo
code in allthreads, eventloop, comthreads.
"""

__all__ = [
    "MethodFilter",
    # OSC handlers argument schemes (combinable tuples)
    "OSCARG_DATAUNPACK",
    "OSCARG_DATA",
    "OSCARG_MESSAGE",
    "OSCARG_MESSAGEUNPACK",
    "OSCARG_ADDRESS",
    "OSCARG_TYPETAGS",
    "OSCARG_EXTRAUNPACK",
    "OSCARG_EXTRA",
    "OSCARG_METHODFILTER",
    "OSCARG_PACKOPT",
    "OSCARG_READERNAME",
    "OSCARG_SRCIDENT",
    "OSCARG_READTIME",
    ]

import re


# OSC handlers arguments schemes - allow to specify with what parameters the
# function must be called, in what order (you can add OSCARG_xxx to receive
# different arguments).
# They are defined as 1 item tuple, so that you can add them, in desired order,
# when calling osc_method() or MethodFilter().

# OSC message data tuple as N parameters.
OSCARG_DATAUNPACK = ("data_unpack",)
# OSC message data tuple as one parameter.
OSCARG_DATA = ("data",)
# OSC message as one parameter.
OSCARG_MESSAGE = ("message",)
# OSC message as three parameters (addrpattern typetags arguments).
OSCARG_MESSAGEUNPACK = ("message_unpack",)
# OSC message address as one parameter.
OSCARG_ADDRESS = ("address",)
# OSC message typetags as one parameter.
OSCARG_TYPETAGS = ("typetags",)
# Extra parameter (tuple…) as N parameters.
OSCARG_EXTRAUNPACK = ("extra_unpack",)
# Extra parameter as one parameter.
OSCARG_EXTRA = ("extra",)
# Method filter object as one parameter.
OSCARG_METHODFILTER = ("methodfilter",)
# Packet options object as one parameter - may be None.
OSCARG_PACKOPT = ("packopt",)
# Name of transport channel which receive the OSC packet - may be None.
OSCARG_READERNAME = ("readername",)
# Indentification informations about packet source (ex. (ip,port)) - may be None.
OSCARG_SRCIDENT = ("srcident",)
# Time when the packet was read - may be None.
OSCARG_READTIME = ("readtime",)
# Note: for other advanced attributes, you may require the whole
# PacketOption attribute with OSCARG_PACKOPT.

_OSCARG_SCHEMES = set(OSCARG_DATAUNPACK + OSCARG_DATA + OSCARG_MESSAGE +
                      OSCARG_MESSAGEUNPACK + OSCARG_ADDRESS + OSCARG_TYPETAGS +
                      OSCARG_EXTRAUNPACK + OSCARG_EXTRA + OSCARG_METHODFILTER +
                      OSCARG_PACKOPT +
                      OSCARG_READERNAME + OSCARG_SRCIDENT + OSCARG_READTIME)

class MethodFilter(object):
    """Storage of a RE matching object and corresponding function.

    :ivar addrpattern: the pattern to match OSC messages.
    :type addrpattern: str
    :ivar function: what to call when the message match the pattern
    :type function: callable
    :ivar patternkind: kind of input pattern, 're' (Python re) or 'osc'
        Default to 'osc'.
    :type patternkind: str
    :ivar repattern: pattern rewritten in Python RE syntax.
    :type repattern: str
    :ivar reobject: compiled Python RE
    :type reobject: SRE_Pattern
    :ivar argscheme: scheme for passing arguments to handler function.
        Default to OSCARG_DATAUNPACK (you can combine OSCARG_… in your required
        order).
    :type argscheme: tuple
    :ivar needpackopt: indicator that packopt required in argscheme.
    :type needpackopt: bool
    :ivar extra: extra parameter for the handler function.
        Default to None.
    :type extra: whatever you need
    :ivar workqueue: workqueue to process the function in a separate thread
        from a workqueue pool (see osctoolspools).
        Default to None
    :type workqueue: WorkQueue or None
    :ivar lock: lock object to acquire before calling the function.
        Default to None.
    :type lock: Lock or RLock
    :ivar logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    """
    def __init__(self, addrpattern, function, patternkind="osc",
                 argscheme=OSCARG_DATAUNPACK, extra=None,
                 workqueue=None, lock=None, logger=None):
        """Build the filter, compile pattern expression.

        If the pattern expression use OSC syntax, it is rewritten as
        Python RE expression.
        Parameters have same names as members.
        """
        assert callable(function)
        self.addrpattern = addrpattern
        if patternkind == "osc":
            self.repattern = convert_osc2re(addrpattern)
        elif patternkind == "re":
            self.repattern = addrpattern
        else:
            raise ValueError("OSC patternkind must be 'osc' or 're'")
        self.reobject = re.compile(self.repattern)
        self.function = function
        self.patternkind = patternkind
        for scheme in argscheme:
            if scheme not in _OSCARG_SCHEMES:
                if logger is not None:
                    logger.error("OSC MethodFilter unknown argument scheme %s",
                                        scheme)
                raise RuntimeError("OSC MethodFilter unknown argument scheme %s" %(scheme,))
        self.argscheme = argscheme
        self.needpackopt = OSCARG_PACKOPT in self.argscheme
        self.extra = extra
        self.workqueue = workqueue
        self.lock = lock
        self.logger = logger

    def __repr__(self):
        sres = []
        sres.append(repr(self.addrpattern))
        sres.append(str(self.function))
        if self.addrpattern == self.repattern:
            sres.append('re')
        if self.patternkind != 'osc':
            sres.append('patternkind={!r}'.format(self.patternkind))
        if self.argschemee != OSCARG_DATAUNPACK:
            sres.append('argschemee={!r}'.format(self.argschemee))
        if self.workqueue is not None:
            sres.append('workqueue={!r}'.format(self.workqueue))
        if self.lock is not None:
            sres.append('lock={!r}'.format(self.lock))
        return "MethodFilter(" + ', '.join(sres) + ")"

    def match(self, msgaddrpattern):
        return self.reobject.match(msgaddrpattern) is not None

    def __call__(self, message, packopt):
        """Prepare arguments and call the function.

        The call can be immediate or deffered to a working thread from a pool.
        """
        # Fill'in packet options in a copy if it will be used.
        # The copy is needed  for possible late execution of the message
        # via a workqueue with each its own packet options.
        if self.needpackopt and packopt is not None:
            packopt = packopt.duplicate()
            packopt.message = message
            packopt.method = self

        # Prepare the function arguments.
        args = []
        for scheme in self.argscheme:
            if scheme == OSCARG_DATAUNPACK[0]:
                args.extend(message.arguments)
            elif scheme == OSCARG_DATA[0]:
                args.append(message.arguments)
            elif scheme == OSCARG_MESSAGE[0]:
                args.append(message)
            elif scheme == OSCARG_MESSAGEUNPACK[0]:
                args.extend(message)
            elif scheme == OSCARG_ADDRESS[0]:
                args.append(message.addrpattern)
            elif scheme == OSCARG_TYPETAGS[0]:
                args.append(message.typetags)
            elif scheme == OSCARG_EXTRAUNPACK[0]:
                try:
                    args.extend(self.extra)
                except:
                    if self.logger is not None:
                        self.logger.error("OSC MethodFilter extra parameters "
                                          "unflattenable")
                    raise
            elif scheme == OSCARG_EXTRA[0]:
                args.append(self.extra)
            elif scheme == OSCARG_METHODFILTER[0]:
                args.append(self)
            elif scheme == OSCARG_PACKOPT[0]:
                args.append(packopt)
            elif scheme == OSCARG_READERNAME[0]:
                if packopt is not None:
                    args.append(packopt.readername)
                else:
                    args.append(None)
            elif scheme == OSCARG_SRCIDENT[0]:
                if packopt is not None:
                    args.append(packopt.srcident)
                else:
                    args.append(None)
            elif scheme == OSCARG_READTIME[0]:
                if packopt is not None:
                    args.append(packopt.readtime)
                else:
                    args.append(None)
        args = tuple(args)
        if self.workqueue is not None:
            # Don't try to send message if we are in termination phase.
            # Workqueue will generate a RuntimeError.
            # Note: we have a little window for WorkQueue state change just
            # between the if terminated and the send_callable()…
            # Best solution would be a send_callable which does this check
            # and protect whole WorkQueue state changes with a mutex.
            if self.workqueue.terminated:
                self.logger.info("Message dismissed due to WorkQueue "
                                 "termination.")
            else:
                self.workqueue.send_callable(self.protected_call, args)
        else:
            self.protected_call(*args)

    def protected_call(self, *args):
        """Wrap the function call with exception and lock management.
        """
        if self.lock is not None:
            self.lock.acquire()
        try:
            self.function(*args)
        except:
            if self.logger is not None:
                self.logger.exception("Failure in message processing.")
        if self.lock is not None:
            self.lock.release()

# ============================ INTERNAL FUNCTIONS  ==========================
# Rewriting RE and function for : OSC {x,y,z} ==> RE (?:x)|(?:y)|(?:z)
optlistmatcher = re.compile(r"\{([^\}]*)(?:,[^|}]*)*\}")


def optlistsubstituer(matchobj):
    """Substitution function called in re.sub().

    :param matchobj: the matching object identified in text
    :type matchobj: SRE_Match
    :return: replacement string
    :rtype: str
    """
    words = matchobj.groups()[0].split(',')
    # As | stop at first match, we put longest words at beginning.
    words.sort(key=len, reverse=True)
    repl = "(?:(?:" + ")|(?:".join(words) + "))"
    return repl


def convert_osc2re(expr):
    """Construct Python regular expression from OSC pattern.

    The OSC pattern is rewritten as Python regular expression pattern.

    OSC use / separators between "levels", as in a file path. Its
    syntax use this meaning:
        * operator stop at / boundary
        // at beginning allow any level deep from start
        ? any single char
        [abcdef] match any any char in abcdef
        [a-z] match any char from a to z
        [!a-z] match any char non from a to z
        {truc,machin,chose} match  truc or machin or chose

    :param expr: expression of OSC address pattern
    :type expr: str
    :return: corresponding expression in Python regular expression syntax.
    :rtype: str
    """
    # Escape symbols from Python RE.
    expr = expr.replace("\\", "\\\\")
    expr = expr.replace(r".", r"\.")
    expr = expr.replace(r"^", r"\^")
    expr = expr.replace(r"|", r"\|")
    expr = expr.replace(r"$", r"\$")
    expr = expr.replace(r"+", r"\+")
    expr = expr.replace(r"(", r"\(")
    expr = expr.replace(r")", r"\)")
    # Rewrite special OSC pattern symbols with RE expressions.
    # Careful, order of these replacement is important.
    expr = expr.replace(r"*", r"[^/]*")     # Stop * at / boundary
    expr = expr.replace(r"?", r"[^/]")      # Dont match /
    expr = expr.replace(r"[!", r"[^")       # Use RE set inversion
    expr = optlistmatcher.sub(optlistsubstituer, expr)  # substitute {x,y,z}
    expr = expr.replace(r"//", r"/?.*/")        # OSC 1.1 from xpath

    # Match from beginning of text and keep remaining.
    expr = "^" + expr + ".*$"
    return expr
