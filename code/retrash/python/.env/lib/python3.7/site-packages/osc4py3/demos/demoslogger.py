#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/demos/demoslogger.py
# <pep8 compliant>

import logging

# A logger to monitor activity... and debug.
logging.basicConfig(format='%(asctime)s - %(threadName)s ø %(name)s - '
    '%(levelname)s - %(message)s')
logger = logging.getLogger("osc")
logger.setLevel(logging.DEBUG)
