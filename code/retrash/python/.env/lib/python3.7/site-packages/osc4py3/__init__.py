#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# File: osc4py3/__init__.py
"""Use OSC with Python3.
"""

__version__ = "1.0.8"

__all__ = []

import sys

# Allow Python2 for documentation generation.
if "sphinx" not in sys.modules:
    # Prevent using the package with unsupported Python version.
    if sys.version_info.major < 3 or (sys.version_info.major == 3 and sys.version_info.minor<2):
        print(r"/!\ osc4py3 only runs with Python3.2 or greater.")
        sys.exit(-1)
