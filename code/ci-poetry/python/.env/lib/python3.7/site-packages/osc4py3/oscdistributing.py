#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/oscdistributing.py
# <pep8 compliant>
"""Distribute packets between low and high layers.

This call encoding/decoding functions, exchange packets between the
sending and dispatching layer dealing with OSCMessage and OSCBundle,
and the communication layer writing and reading raw data via channels.
"""

import time
import collections
import threading
import queue

from . import oscchannel
from . import oscbuildparse
from . import oscscheduling
from . import oscpacketoptions
from . import oscdispatching

SendingPacket = collections.namedtuple("SendingPacket",
                                        "packet packopt targets")
sending_packets = queue.Queue()

# Same for sending packet thread.
# Tested on identity too.
LAST_SENDINGPACKET = SendingPacket(None, None,  None)

# Reserved names unusable for channel names.
# Note that we reserve all names starting by '_'.
RESERVED_NAMES = {
    "_all",             # To address all channels.
    "_local",           # To bypass peers/channels and dispatch locally.
    }

# Thread to process raw packets if not managed by polling loop.
rawpackets_thread = None
rawpackets_terminate = False

# Thread to process sent packets if not managed by polling loop.
sendpackets_thread = None
sendpackets_terminate = False


# ============================ INTERNAL FUNCTIONS  ==========================
def next_sendpacket(timeout):
    """Return next packet and options to send.

    :param timeout: maximum time to wait for another  packet to send, 0 for
        immediate return, None for infinite wait.
    :type timeout: float or None
    :return: informations about packet to send, data, options, targets
    :rtype: SendingPacket named tuple or None if no data available
    """
    if timeout == 0:    # Would not block.
        if sending_packets.empty():
            return None
            
    try:
        return sending_packets.get(True, timeout)
    except queue.Empty:
        return None


def post_sendpacket(sendingpacket):
    """Send a new packet in the reception queue.

    :param sendingpacket: packet and packet options to send.
    :type sendingpacket: SendingPacket
    """
    sending_packets.put(sendingpacket)


def flat_names(names, _out=None):
    """Flatten nested names containers into a set.

    :param names: nested structures containing names.
    :type names:
    :return: all names found in the structures, in one set.
    :rtype: set
    """
    # Called recursively with an (modified) _out argument.
    # Top call dont provide the _out argument and use the returned value.
    if _out is None:
        _out = set()
    if isinstance(names, str):
        _out.add(names)
    else:   # Assume _names is iterable (list, tuple, dict, set...)
        for n in names:
            if isinstance(n, str):     # Avoid too much recursions.
                _out.add(names)
            else:
                flat_names(n, _out)
    return _out


# ========================== PUBLIC SENDING FUNCTION ========================
def send_packet(packet, names, packopt=None):
    """Send an OSC message or bundle via some channels.

    The names can use some reserved names:

        * _all          To address all standard writer channels.
    An later maybe:
        * _filter       To select standard writer channels with filtering
                        on addrpattern matching.

    :param packet: the bundle or message to send.
    :type packet: OSCMessage or OSCBundle
    :param names: names to select what channels to use.
    :type names: str or nested containers of str
    :param packopt: options for sending the packet.
    :type packopt: PacketOptions
    """
    # Make peername a set of target.
    targets = flat_names(names)

    if packopt is None:
        packopt = oscpacketoptions.PacketOptions()

    if packopt.nodelay:
        # Call the send function with no queue.
        packet_send_function(packet, packopt, targets)
    else:
        # Queue the packet to not consume time here.
        post_sendpacket(SendingPacket(packet, packopt, targets))


# ========================= INTERNAL SENDING FUNCTIONS ======================
def packet_send_function(packet, packopt, targets, logger):
    """Identify peers / channels, and manage transmission.

    Proceed packet sending operations with managing multiple destinations
    with as common operations as possible.

    :param packet: the bundle or message to send.
    :type packet: OSCMessage or OSCBundle
    :param packopt: the options for packet transmission.
    :type packopt: PacketOptions
    :param targets: targetted peers names or channel names.
    :type targets: set
    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    """
    if logger is not None:
        logger.debug("OSC packet_send_function to targets %r with %s",
                     targets, packet)

    if "_local" in targets:
        targets.remove("_local")
        # Directly call dispatching function, not going through OSC packet
        # sending via network & co.
        oscdispatching.globdisp().dispatch_packet(packet, packopt)
        if not targets:     # There was only local delivery
            return

    # Selection of channel names with special names.
    if "_all" in targets:
        targets.remove("_all")
        for name in oscchannel.all_channels:
            # We only select channels which are writers.
            chan = oscchannel.get_channel(name)
            if chan.is_writer:
                targets.add(name)

    # Names of channels who will receive the packet with standard processing.
    stdchannels = set()

    for cname in targets:
        chan = oscchannel.get_channel(cname)
        if chan is None:
            if logger is not None:
                logger.error("OSC packet_send_function have unknown "\
                        "targets channel %r", cname)
            continue
        res = chan.handle_action("encodepacket", (packet, packopt))
        if res == (None, None):
            # The action handler must have completly processed the packet,
            # including transmission.
            continue
        elif res is None:
            # No interesting processing, will directly send the same encoded
            # packet to the channel like others.
            stdchannels.add(cname)
        else:
            # The action handler encode the packet from its own, and may have
            # modified packet options - directly transmit the result of its
            # processing.
            transmit_rawpacket(res[0], res[1], {cname}, logger)

    # Now, transmit to all channels accepting direct transmission (ie. with
    # no special encoding).
    if stdchannels:
        rawoscdata = oscbuildparse.encode_packet(packet)
        transmit_rawpacket(rawoscdata, packopt, stdchannels, logger)


def transmit_rawpacket(rawpacket, packopt, writersnames, logger):
    """Call writer channels functions to transmit raw data.

    This function transmit the *same* raw OSC packet to a set of transport
    channels.

    :param rawpacket: the binary packet to write.
    :type rawpacket: bytes or bytearray
    :param packopt: the options for packet transmission.
    :type packopt: PacketOptions
    :param writersnames: set of names of writers to send data.
    :type writersnames: { str }
    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    :param workqueue: queue of works to planify transmissions in multiple
        threads or in a late event loop execution.
    """
    if logger is not None:
        logger.debug("OSC transmit_rawpacket to channels %r", writersnames)

    for cname in writersnames:
        chanel = oscchannel.get_channel(cname)
        if chanel is None:
            if logger is not None:
                logger.error("OSC transmit_rawpacket,  channel name "\
                    "%r is not referenced", cname)
            continue  # Dismiss the packet.
        if not chanel.is_writer:
            if logger is not None:
                logger.error("OSC transmit_rawpacket,  channel name "\
                    "%r is not a writer", cname)
            continue  # Dismiss the packet.
        newopt = packopt.duplicate()
        newopt.chantarget = cname
        chanel.transmit_data(rawpacket, newopt)


# ====================== EVENT LOOP PUBLIC FUNCTIONS  ======================
def sendingpackets_process_loop(deadlinetime=0, logger=None):
    """Manage encoding and sending of packets.

    Called as a thread entry point, or as a simple function in a envent
    loop.

    :param deadlinetime: exit from loop after this time, even if there are
        remaining packets to send. Its an *absolute* time in seconds,
        in same time base as time.time().
        A 0 value do process all packets until the queue is empty then return.
        A None value is used when in own thread.
    :param deadlinetime: float or None
    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    """
    try:
        if deadlinetime is None and logger is not None:
            logger.info("OSC Starting sendingpackets_process_loop()")

        while True:
            timeout = oscscheduling.deadline2timeout(deadlinetime)
            nextsend = next_sendpacket(timeout)

            # If no packet while in own thread, continue with waiting.
            if nextsend is None and deadlinetime is None:
                continue

            # If no packet while in event loop, return.
            if nextsend is None and deadlinetime == 0:
                return

            # Proper termination via a special tuple.
            if nextsend is LAST_SENDINGPACKET:
                if sendpackets_terminate:
                    break       # Properly exit from function (from thread...)
                else:
                    nextsend = None

            if nextsend is not None:
                if logger is not None:
                    logger.debug("OSC send packets processing %r", nextsend)

                packet, packopt,  targets = nextsend
                packet_send_function(packet, packopt, targets, logger)

            # If has deadline elapsed, continue with waiting.
            if deadlinetime and time.time() > deadlinetime:
                break

        if deadlinetime is None and logger is not None:
            logger.info("OSC Finishing sendingpackets_process_loop()")
    except:
        if  logger is not None:
            logger.exception("OSC Failure in sendingpackets_process_loop()")


def rawpackets_process_loop(deadlinetime=0, logger=None):
    """Called by readers when some raw data come from the system.

    Process all queued packets until the queue is empty or a the deadlinetime
    is reach.

    :param deadlinetime: exit from loop after this time, even if there are
        remaining packets to process. Its an *absolute* time in seconds,
        in same time base as time.time().
        A 0 value do process all messages until the queue is empty then return.
        A None value is used when in own thread.
    :param deadlinetime: float or None
    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    """
    try:
        if deadlinetime is None and logger is not None:
            logger.info("OSC Starting rawpackets_process_loop()")

        while True:
            timeout = oscscheduling.deadline2timeout(deadlinetime)
            nextpacket = oscchannel.next_rawpacket(timeout)

            # If no packet while in event loop, return.
            if nextpacket is None and deadlinetime == 0:
                return

            # If no packet while in own thread, continue with waiting.
            if nextpacket is None and deadlinetime is None:
                continue

            # Proper termination via a special tuple.
            if nextpacket == oscchannel.LAST_RAWPACKET:
                if rawpackets_terminate:
                    break       # Properly exit from function (from thread...)
                else:
                    nextpacket = None

            if nextpacket is not None:
                if logger is not None:
                    logger.debug("OSC raw packet processing %r", nextpacket)

                # Identify peer manager for decoding.
                rawoscdata, packopt = nextpacket
                readername = packopt.readername

                chan = oscchannel.get_channel(readername)
                if chan is None:
                    # This should never occure (!)
                    if logger is not None:
                        logger.error("OSC raw packet from unknown %r channel",
                                readername)
                    continue

                res = chan.handle_action("decodepacket", (rawoscdata, packopt))
                if res == (None, None):
                    # The action handler must have completly processed the
                    # packet, including dispatching.
                    packet = packopt = None
                elif res is None:
                    # No interesting processing, we decode the packet
                    # ourself and it will be dispatched.
                    packet = oscbuildparse.decode_packet(rawoscdata)
                else:
                    # The action handler decode the packet from its own, and
                    # may have modified packet options - directly use
                    # the result of this processing.
                    packet, packopt = res

                if packet is not None:
                    oscdispatching.globdisp().dispatch_packet(packet, packopt)

            # If has deadline elapsed, continue with waiting.
            if deadlinetime and time.time() > deadlinetime:
                break

        if deadlinetime is None and logger is not None:
            logger.info("OSC Finishing rawpackets_process_loop()")
    except:
        if logger is not None:
            logger.exception("OSC Failure in rawpackets_process_loop()")


# ================== BACKGROUND THREADS PUBLIC FUNCTIONS  ===================
def create_rawpackets_thread(logger=None):
    """Build a thread to manage dispatching messages by calling functions.

    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    """
    global rawpackets_terminate, rawpackets_thread

    if rawpackets_thread is not None:
        return

    rawpackets_terminate = False
    rawpackets_thread = threading.Thread(target=rawpackets_process_loop,
                                args=(None, logger),  # Its not polling.
                                name="RawPackThread")
    rawpackets_thread.daemon = False
    rawpackets_thread.start()


def terminate_rawpackets_thread():
    """Set a flag and signal condition variable to finish delayed thread.

    Wait for the effective thread termination.
    Note: remaining packets in the received queue are ignored.
    """
    global rawpackets_terminate, rawpackets_thread

    rawpackets_terminate = True
    oscchannel.post_rawpacket(oscchannel.LAST_RAWPACKET)
    rawpackets_thread.join()
    rawpackets_thread = None


def create_sendingpackets_thread(logger=None):
    """Build a thread to manage dispatching messages by calling functions.

    :param logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    """
    global sendpackets_thread, sendpackets_terminate

    if sendpackets_thread is not None:
        return

    sendpackets_terminate = False
    sendpackets_thread = threading.Thread(target=sendingpackets_process_loop,
                                args=(None, logger),  # Its not polling.
                                name="SendPackThread")
    sendpackets_thread.daemon = False
    sendpackets_thread.start()


def terminate_sendingpackets_thread():
    """Set a flag and signal condition variable to finish delayed thread.

    Wait for the effective thread termination.
    Note: remaining packets in the received queue are ignored.
    """
    global sendpackets_thread, sendpackets_terminate

    sendpackets_terminate = True
    post_sendpacket(LAST_SENDINGPACKET)
    sendpackets_thread.join()
    sendpackets_thread = None
