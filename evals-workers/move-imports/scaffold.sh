#!/bin/sh
set -e
mkdir -p lib sub
printf 'export const fmt = (x) => String(x);\n' > lib/format.js
printf 'import { fmt } from "./utils/format.js";\nexport const a = fmt(1);\n' > a.js
printf 'import { fmt } from "../utils/format.js";\nexport const b = fmt(2);\n' > sub/b.js
printf 'const { fmt } = require("./utils/format");\nmodule.exports = fmt(3);\n' > c.js
