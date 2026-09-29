#!/bin/sh
set -e
printf 'print("a")\n' > a.py
printf '#!/usr/bin/env python3\nprint("b")\n' > b.py
printf '# SPDX-License-Identifier: ISC\nprint("c")\n' > c.py
