#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/as_eventloop.py
# <pep8 compliant>
"""Use of osc4py3 in an external event loop.

Functions defined here allow to simply use OSC completely from within a
monothreaded event loop, with no wait on communications, and with support
of delayed time tagged bundles.
"""

from . import oscscheduling
from . import oscdispatching
from . import oscmethod
from . import osctoolspools
from . import oscchannel
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
    "osc_broadcast_client",
    ]

select_monitor = None
pool_monitors = []
dispatcher = None
generallogger = None
write_queue = None


def osc_startup(**kwargs):
    global dispatcher, generallogger, write_queue
    if dispatcher is not None:
        return

    if 'logger' in kwargs:
        generallogger = kwargs['logger']

    # To dispatch bundles and messages.
    dispatcher = oscdispatching.Dispatcher("global", {
                    "logger": generallogger,
                    })
    oscdispatching.register_global_dispatcher(dispatcher)

    # To send pending packets. This is just used as a fifo queue to
    # store jobs between osc_send() and osc_process(), no thread is
    # created (its add_working_thread() method is not called).
    write_queue = osctoolspools.WorkQueue()


def osc_terminate():
    global dispatcher, select_monitor, pool_monitors, write_queue

    if dispatcher is None:
        return

    oscchannel.terminate_all_channels()

    oscdispatching.unregister_global_dispatcher()
    dispatcher = None


    # In case someone called for these global monitors (this must no occure
    # as these monitors use background threads)
    oscscheduling.terminate_global_socket_monitor()
    oscscheduling.terminate_global_polling_monitor()

    # Terminate our event-loop monitors.
    if select_monitor:
        select_monitor.terminate()
        select_monitor = None
    for mon in pool_monitors:
        mon.terminate()
    del pool_monitors[:]

    write_queue.terminate()
    write_queue = None


def osc_process():
    # Process packets to be written.
    oscdistributing.sendingpackets_process_loop(0, generallogger)
    while True:
        job = write_queue.wait_for_job(0)
        if job is osctoolspools.LAST_JOB or job is None:
            break
        try:
            job()
        except:
            generallogger.exception("Failure in channel write job")

    # Check for data in channels.
    if select_monitor:
        select_monitor.monitor_oneloop(0)

    for mon in pool_monitors:
        mon.monitor_oneloop(0)

    # Process received data (call functions upon matched addrpatterns).
    oscdistributing.rawpackets_process_loop(0, generallogger)

    # Process delayed bundles.
    oscdispatching.delayed_process_loop(0, generallogger)


def osc_method(addrpattern, function, argscheme=oscmethod.OSCARG_DATAUNPACK, extra=None):
    apf = oscmethod.MethodFilter(addrpattern, function, logger=generallogger,
                                argscheme=argscheme, extra=extra)
    oscdispatching.register_method(apf)


def osc_send(packet, names):
    oscdistributing.send_packet(packet, names)


def osc_udp_server(address, port, name):
    from . import oscudpmc   # Only import if necessary.

    chan = oscudpmc.UdpMcChannel(name, "r",
            {
            'udpread_host': address,
            'udpread_port': port,
            'monitor': _select_monitor(),
            'auto_start': True,
            'logger': generallogger,
            })


def osc_udp_client(address, port, name):
    from . import oscudpmc   # Only import if necessary.

    chan = oscudpmc.UdpMcChannel(name, "w",
            {
            'udpwrite_host': address,
            'udpwrite_port': port,
            "udpwrite_nonblocking": True,
            "write_workqueue": write_queue,
            'monitor': _select_monitor(),
            'auto_start': True,
            'logger': generallogger,
            })


def osc_multicast_server(address, port, name):
    from . import oscudpmc   # Only import if necessary.

    chan = oscudpmc.UdpMcChannel(name, "r",
            {
            'udpread_host': address,
            'udpread_port': port,
            'monitor': _select_monitor(),
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
            'monitor': _select_monitor(),
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
            'monitor': _select_monitor(),
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
            'monitor': _select_monitor(),
            'auto_start': True,
            'bcast_enabled': True,
            'logger': generallogger,
            })



def _select_monitor():
    """Return - create if necessary - select() monitor.

    We just create one monitor, with no thread as it is used with periodic
    non-blocking test.
    """
    # Create the slect monitor if necessary.
    global select_monitor
    if select_monitor is None:
        select_monitor = oscscheduling.create_platform_socket_monitor(
                                                            generallogger)
    return select_monitor


as__common.apply_docs(globals())
