#!/bin/sh
set -e
printf '{\n  "name": "demo",\n  "version": "1.4.2",\n  "dependencies": {\n    "left-pad": "1.4.2"\n  }\n}\n' > package.json
printf '# demo\n\n![version](https://img.shields.io/badge/version-1.4.2-blue)\n' > README.md
printf '# Changelog\n\n## 1.4.2 - 2026-09-01\n\n- Fix padding.\n' > CHANGELOG.md
