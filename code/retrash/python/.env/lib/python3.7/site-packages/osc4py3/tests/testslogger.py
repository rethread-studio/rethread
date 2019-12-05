#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/tests/testslogger.py
# <pep8 compliant>
"""Build a logger for test modules.
"""

import logging

# A logger to monitor activity... and debug.
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("osc")
logger.setLevel(logging.DEBUG)

