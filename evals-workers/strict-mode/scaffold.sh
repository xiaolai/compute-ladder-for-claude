#!/bin/sh
set -e
mkdir -p src
printf 'export const a = 1;\n' > src/a.js
printf "'use strict';\nexport const b = 2;\n" > src/b.js
printf '/* banner */\nexport const c = 3;\n' > src/c.js
