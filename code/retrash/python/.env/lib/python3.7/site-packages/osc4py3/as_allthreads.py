#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/as_allthreads.py
# <pep8 compliant>
"""Use of osc4py3 in own created threads.

Functions defined here allow to use OSC completely from its own threads.
Even message method execution is done in a background thread.
"""

from . import oscscheduling
from . import oscdispatching
from . import oscchannel
from . import oscmethod
from . import osctoolspools
from . import oscdistributing
from . import as__common                 # All doc strings are shared here.

# Useful methods of this module.
__all__ = [
    "osc_startup",
    "osc_terminate",
    "osc_process",
    "osc_method",
    "osc_send",
    "osc_udp_server",
    "osc_udp_client",
    "osc_multicast_server",
    "osc_multicast_client",
    "osc_broadcast_server",
    "osc_broadcast_client",    ]

dispatcher = None
generallogger = None
execute_queue = None    # WorkQueue to execute methods in own pool of threads.
write_queue = None      # WorkQueue to transmit packets in own pool of threads.


def osc_startup(**kwargs):
    global dispatcher, generallogger, execute_queue, write_queue
    if dispatcher is not None:
        return

    if 'logger' in kwargs:
        generallogger = kwargs['logger']

    dispatcher = oscdispatching.Dispatcher("global", {
                    "logger": generallogger,
                    })
    oscdispatching.register_global_dispatcher(dispatcher)
    # This monitoring thread will look at sockets.
    oscscheduling.get_global_socket_monitor(generallogger)
    # This thread will get, decode and process received raw packets.
    oscdistributing.create_rawpackets_thread(generallogger)
    # This thread will encode and transmit packets to send.
    oscdistributing.create_sendingpackets_thread(generallogger)
    # This thread will process delayed bundles.
    oscdispatching.create_delayed_thread(generallogger)

    # To execute methods in a pool of threads.
    execthreadscount = kwargs.get("execthreadscount", 10)
    if execthreadscount > 0:
        execute_queue = osctoolspools.WorkQueue(generallogger)
        execute_queue.add_working_threads(execthreadscount)

    # To send pending packets.
    writethreadscount = kwargs.get("writethreadscount", 10)
    if writethreadscount > 0:
        write_queue = osctoolspools.WorkQueue()
        write_queue.add_working_threads(writethreadscount)


def osc_terminate():
    global dispatcher, manager, execute_queue, write_queue
    if dispatcher is None:
        return

    oscchannel.terminate_all_channels()

    if execute_queue is not None:
        execute_queue.terminate()
        execute_queue = None

    oscdispatching.unregister_global_dispatcher()
    dispatcher = None

    oscscheduling.terminate_global_socket_monitor()
    oscscheduling.terminate_global_polling_monitor()
    oscdistributing.terminate_sendingpackets_thread()
    oscdistributing.terminate_rawpackets_thread()
    oscdispatching.terminate_delayed_thread()

    write_queue.terminate()
    write_queue = None


def osc_process():
    """Function to call from your event loop to receive/process OSC messages.
    """
    pass    # All processing in other threads.


def osc_method(addrpattern, function, argscheme=oscmethod.OSCARG_DATAUNPACK, extra=None):
    # We associate the method to the workqueue to have concurrent processing
    # of methods if it has been defined.
    apf = oscmethod.MethodFilter(addrpattern, function, logger=generallogger,
                                workqueue=execute_queue, argscheme=argscheme,
                                extra=extra)
    oscdispatching.register_method(apf)


def osc_send(packet, names):
    oscdistributing.send_packet(packet, names)


def osc_udp_server(address, port, name):
    from . import oscudpmc   # Only import if necessary.

    chan = oscudpmc.UdpMcChannel(name, "r",
            {
            'udpread_host': address,
            'udpread_port': port,
            'monitor': oscchannel.SCHED_SELECTTHREAD,
            'auto_start': True,     # The channel will automaticaly register
                                    # with monitor..
            'logger': generallogger,
            })


def osc_udp_client(address, port, name):
    global channels

    from . import oscudpmc   # Only import if necessary.

    chan = oscudpmc.UdpMcChannel(name, "w",
            {
            'udpwrite_host': address,
            'udpwrite_port': port,
            'udpwrite_nonblocking': True,
            "write_workqueue": write_queue,
            'monitor': oscchannel.SCHED_SELECTTHREAD,
            'auto_start': True,
            'logger': generallogger,
            })


def osc_multicast_server(address, port, name):
    from . import oscudpmc   # Only import if necessary.

    chan = oscudpmc.UdpMcChannel(name, "r",
            {
            'udpread_host': address,
            'udpread_port': port,
            'monitor': oscchannel.SCHED_SELECTTHREAD,
            'auto_start': True,
            'mcast_enabled': True,
            'logger': generallogger,
            })


def osc_multicast_client(address, port, name, ttl=1):
    from . import oscudpmc   # Only import if necessary.

    chan = oscudpmc.UdpMcChannel(name, "w",
            {
            'udpwrite_host': address,
            'udpwrite_port': port,
            'udpwrite_ttl': ttl,
            "udpwrite_nonblocking": True,
            "write_workqueue": write_queue,
            'monitor': oscchannel.SCHED_SELECTTHREAD,
            'auto_start': True,
            'mcast_enabled': True,
            'logger': generallogger,
            })


def osc_broadcast_server(address, port, name):
    global channels

    from . import oscudpmc   # Only import if necessary.

    chan = oscudpmc.UdpMcChannel(name, "r",
            {
            'udpread_host': address,
            'udpread_port': port,
            'monitor': oscchannel.SCHED_SELECTTHREAD,
            'auto_start': True,
            'bcast_enabled': True,
            'logger': generallogger,
            })


def osc_broadcast_client(address, port, name, ttl=1):
    from . import oscudpmc   # Only import if necessary.

    chan = oscudpmc.UdpMcChannel(name, "w",
            {
            'udpwrite_host': address,
            'udpwrite_port': port,
            'udpwrite_ttl': ttl,
            "udpwrite_nonblocking": True,
            "write_workqueue": write_queue,
            'monitor': oscchannel.SCHED_SELECTTHREAD,
            'auto_start': True,
            'bcast_enabled': True,
            'logger': generallogger,
            })


as__common.apply_docs(globals())
