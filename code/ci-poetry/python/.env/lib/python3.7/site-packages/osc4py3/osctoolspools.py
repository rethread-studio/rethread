#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/osctoolspools.py
# <pep8 compliant>
"""Some tools making resources reusable.

Avoid to release/reallocate system resources by keeping them reusable in
pools. Support pools of threads processing jobs .
"""
import threading
import collections

LAST_JOB = "last job"

# ============================ EVENTS POOL =================================
# Queue to store a poll of sometime-needed events for synchronization.
# Usage of a poll avoid to dispose/re-create those system-level resources
# too often.
# Use allocate_event() and release_event() functions to get events from
# the poll and release them to the poll.
events_pool = collections.deque(maxlen=40)


def allocate_event():
    """Return an Event object for synchronization.

    An event is searched in the events poll, and if none is available a
    new event is allocated.
    The event state is unknown, its the caller responsibility to set or clear
    it.

    :return: an event for synchronization
    :rtype: threading.Event
    """
    try:
        evt = events_pool.pop()
    except IndexError:
        evt = threading.Event()
    return evt


def release_event(evt):
    """Return an event in the poll of available events.

    .. note:: Poll size is normally limited, so extra events will be destroyed.

    :param evt: the event to return to the poll
    :type evt: threading.Event
    """
    events_pool.append(evt)


# ======================== THREAD(s) WORK QUEUES ============================
class WorkJob:
    """A job to queue, with all needed data for execution.
    """
    def __init__(self, function, paramstuple, needsync=False):
        self.finished = False
        self.result = None
        self.function = function
        self.paramstuple = paramstuple
        if needsync:
            self.finishsync = allocate_event()
            self.finishsync.clear()
        else:
            self.finishsync = None

    def __del__(self):
        if self.finishsync is not None:
            # Put back event in the poll.
            release_event(self.finishsync)

    def job_finished(self, res):
        """Called by work thread after end of work.

        The function call return value is providen as res parameter and
        stored in the workjob. The workjob is signaled as terminated and
        its synchronization event set (if any).

        :param res: function call return value.
        :type res: anything
        """
        self.result = res
        self.finished = True
        if self.finishsync is not None:
            self.finishsync.set()

    def is_finished(self):
        """Test finished flag of hthe workjob."""
        return self.finished

    def wait_finished(self):
        """Wait for end of workjob execution."""
        if self.finishsync is None:
            raise RuntimeError("OSC work has no synchronization to wait on.")
        else:
            self.finishsync.wait()

    def __call__(self):
        try:
            res = self.function(*self.paramstuple)
            self.job_finished(res)
        except Exception as e:
            self.job_finished(e)
            raise


class WorkQueue:
    """A queue for one or multipe working thread(s).

    Used to post some jobs to processing threads.

    :ivar logger: Python logger to trace activity.
        Default to None
    :type logger: logging.Logger
    :ivar threadcount: counter when creating threads from workqueue method.
    :type threadcount: int
    :ivar ownthreads: threads running for this work queue
    :type ownthreads: list of Thread
    :ivar jobs: operations to do.
    :type jobs: deque
    :ivar sem: synchronization to wait for available job.
    :type sem: Semaphore
    :ivar terminated: flag to avoid new jobs on a terminated work queue.
    :type terminated: bool
    """
    def __init__(self, logger=None):
        self.logger = logger
        self.threadcount = 0
        self.ownthreads = []
        self.jobs = collections.deque()
        # Semaphore is initially for empty queue.
        self.sem = threading.Semaphore(0)
        self.terminated = False

    def send_callable(self, function, paramstuple, needsync=False):
        job = WorkJob(function, paramstuple, needsync)
        self.send_job(job)

    def send_job(self, newjob):
        """schedule a job at the end of the queue.

        If the queue is terminated, then an exception is raised.

        :ivar newjob: informations needed by worker thread(s) to do the job.
        :type newjob: WorkJob
        """
        if self.logger is not None:
            self.logger.info("OSC workqueue %d sending job %d",
                                id(self), id(newjob))
        assert newjob is not None
        if self.terminated:
            raise RuntimeError("WorkQueue jobs terminated.")
        self.jobs.append(newjob)
        self.sem.release()  # Indicate availability of a new job.

    def send_terminate(self):
        """Schedule a termination event in the queue.

        Just post a None job and set the terminated flag.
        """
        self.terminated = True
        self.jobs.append(LAST_JOB)
        self.sem.release()

    def terminate(self):
        """Request end of workqueue and wait for all its threads termination.
        """
        self.send_terminate()
        self.join()

    def wait_for_job(self, timeout=None):
        """Called by a working thread to get next job.

        If working thread get a LAST_JOB job, then they must exit.

        :param timeout: maximum seconds to wait for a job, None for infinite,
            0 for just polling.
            Default to None (infinite wait).
        :type timeout: float or None
        :return: informations needed by worker thread(s) to do the job, or
            None if if exited with a timeout, or LAST_JOB it the workqueue
            is terminating.
        :rtype: WorkJob
        """
        if not self.sem.acquire(timeout):  # Wait for an available job.
            return None
        job = self.jobs.popleft()
        if job is LAST_JOB:
            # In case there is another thread waiting for a job
            self.send_terminate()
        return job

    @staticmethod
    def working_thread_loop(wq):
        """Entry point for a working thread processing jobs from a queue.

        :param wq: workqueue to process.
        :type wq: WorkQueue
        """
        while True:
            job = wq.wait_for_job()
            if job is LAST_JOB:
                break   # End of thread.
            elif job is not None:
                try:
                    job()   # Do the stuff.
                except:
                    if wq.logger is not None:
                        wq.logger.exception("OSC workqueue %d failure in "\
                                            "job %d", id(wq), id(job))

    def add_working_threads(self, count=1, makejoignable=True):
        """Add new thread to process jobs in work queue.

        The threads are specifically associated to this workqueue.

        :param count: number of threads to create.
        :type count: int
        :param makejoignable: flag to append created threads to the ownthreads.
            Default to True.
        :type makejoignable: bool
        """
        for i in range(count):
            self.threadcount += 1
            tname = "workqueue{}.{:02d}".format(id(self), self.threadcount)
            t = threading.Thread(target=WorkQueue.working_thread_loop,
                        name=tname, args=(self,))
            t.daemon = False    # Must ensure
            if makejoignable:
                self.ownthreads.append(t)
            t.start()

    def join(self, removethreads=True):
        """Join all own working threads of the workqueue.

        :param removethreads: flag to remove the threads from ownthreads
            once they have all been joined.
            Default to True.
        :type removethreads: bool
        """
        for t in self.ownthreads[:]:
            t.join()
        if removethreads:
            del self.ownthreads[:]
