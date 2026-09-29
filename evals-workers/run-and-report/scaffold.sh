#!/bin/sh
set -e
printf 'console.log("count=120");\nconsole.log("p50=41ms");\nconsole.log("p95=187ms");\nconsole.log("max=920ms");\n' > stats.js
