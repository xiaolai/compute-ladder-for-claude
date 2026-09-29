#!/bin/sh
set -e
printf 'export function getUsr(id) { return db.get(id); }\nexport function getUsrName(id) { return getUsr(id).name; }\n' > users.js
printf 'import { getUsr, getUsrName } from "./users.js";\nconsole.log(getUsr(1), getUsrName(1));\n' > app.js
