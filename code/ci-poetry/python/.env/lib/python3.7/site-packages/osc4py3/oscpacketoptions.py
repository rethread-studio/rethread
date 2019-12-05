#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/oscpacketoptions.py
# <pep8 compliant>
"""Container class to transmis packet informations among processing.
"""

import threading    # To test with isinstance


class PacketOptions(object):
    """Packet processing options passed among packets, messages, bundles.

    :ivar honor_timetag: flag to schedule messages considering the timetag
        attribute (for bundled messages).
        Default to True.
    :type honor_timetag: bool
    :ivar forget_oldmsg: flag to not process messages arriving with a
        past timetag.
        Default to False
    :type forget_oldmsg: bool
    :ivar timetag_offset: time in seconds to add to incoming timetags
        and to substact from outgoing timetags.
        Not used for immediate messages.
        Default to 0.
    :type timetag_offset: float
    :ivar check_subbundle_timtag: flag to check that sub-bundle time tag
        is correctly >= parent bundle time tag.
        Default to False.
    :type check_subbundle_timtag: bool
    :ivar readername: name of the transport channel which receive the packet.
        Default to "undefined".
    :type readername: str
    :ivar srcident: identification information of the packet source (typically
        tuple with IP address and port).
        Default to None:
    :type srcident: haschable
    :ivar readtime: time() when the packet has been read.
    :ivar message: message being processed, or None if not in message
        execution.
    :type message: OSCMessage
    :ivar method: method filter which activate the message execution, or None
        if not in message execution. Allow function to know the way is was
        called.
        Filled with message.
    :type method: MethodFilter
    :ivar chantarget: name of the channel transport to transmit the
        packet.
    :type chantarget: str
    :ivar nodelay: flag to require bypassing intermediate queues and process
        ASAP.
        Default to False.
    :type nodelay: bool
    :ivar event: event to set when packet processing is finished. We support
        different types for event as a simple Event may be not enough if a
        write operations must occurre on multiple channels by example.
        An Event has its set() method called.
        A Semaphore has its release() method called.
        A callable (function / bound method) is simply called with the packet
        options object as parameter.
        Default to None.
    :type event: Event or Semaphore or callable
    """
    def __init__(self):
        # Processing options (ex. Bundles timetag management).
        self.honor_timetag = True
        self.forget_oldmsg = False
        self.timetag_offset = 0
        self.check_subbundle_timetag = False
        # Packets identification informations (where it comes from, when...).
        self.readername = "undefined"
        self.srcident = "undefined"
        self.readtime = 0
        self.message = None
        self.method = None
        # Packet send informations (system packet, targetted peer...)
        self.chantarget = ""
        self.nodelay = False
        self.event = None

    def __str__(self):
        """Representation of object attributes for debugging purpose."""
        res = ["PacketOptions("]
        for n in ('honor_timetag', 'forget_oldmsg', 'timetag_offset',
                'check_subbundle_timetag', 'readername', 'srcident',
                'readtime', 'message', 'method', 'chantarget'
                'nodelay', 'event'):
            v = getattr(self, n)
            res.append("{}={},".format(n, v))
        res[-1] = res[-1][:-1] + ')'    # Replace last , by )
        return "\n    ".join(res)

    def __lt__(self, o):
        # Dummy operator just to have PacketOptions sortable when mixed with
        # bundle.
        return id(self) < id(o)

    def setup_processing(self, options):
        """Update the packet options using an options dictionnary.

        All packet options not in the dictionary keep their old value.

        :param options: dictionary of options.
        :type options: dict
        """
        self.honor_timetag = options.get("honor_timetag",
                                        self.honor_timetag)
        self.forget_oldmsg = options.get("forget_oldmsg",
                                        self.forget_oldmsg)
        self.timetag_offset = options.get("timetag_offset",
                                        self.timetag_offset)
        self.check_subbundle_timetag = options.get("check_subbundle_timetag",
                                        self.check_subbundle_timetag)

    def update_processing(self, procopt):
        """Update the packet processing options (only).
        """
        self.honor_timetag = procopt.honor_timetag
        self.forget_oldmsg = procopt.forget_oldmsg
        self.timetag_offset = procopt.timetag_offset
        self.check_subbundle_timetag = procopt.check_subbundle_timetag

    def duplicate(self):
        """Make a copy of the packet options.

        :return: a new packets options, first level copy of this one.
        :rtype: PacketOptions
        """
        po = PacketOptions()
        po.__dict__.update(self.__dict__)
        return po

    def signal_event(self):
        """Call event code to signal end of writing packet operation.

        Note that the event is not used when dispatching a message from
        an incoming packet, and it may not be called if no target is
        found for the sent packet.
        So use this at your own risk.
        """
        if self.event is None:
            return
        if isinstance(self.event, threading.Semaphore):
            self.event.release()
        elif isinstance(self.event, threading.Event):
            self.event.set()
        elif callable(self.event):
            self.event(self)
