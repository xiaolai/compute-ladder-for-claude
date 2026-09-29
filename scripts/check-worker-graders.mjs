// Checks the worker suite's graders: each case's gold output must pass every grader, and a plausible wrong
// output must fail at least one. Run: node scripts/check-worker-graders.mjs evals-workers

import { existsSync, readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const root = resolve(process.argv[2] ?? "evals-workers");
// gold = correct final files; bad = one plausible wrong output per case
const gold = {
  'find-callers': { 'callers.txt': 'src/a.js\nsrc/d/e.js\n' },
  'rename-symbol': { 'users.js': 'export function getUser(id) { return db.get(id); }\nexport function getUsrName(id) { return getUser(id).name; }\n', 'app.js': 'import { getUser, getUsrName } from "./users.js";\nconsole.log(getUser(1), getUsrName(1));\n' },
  'strict-mode': { 'src/a.js': "'use strict';\nexport const a = 1;\n", 'src/b.js': "'use strict';\nexport const b = 2;\n", 'src/c.js': "'use strict';\n/* banner */\nexport const c = 3;\n" },
  'csv-filter': { 'active.txt': 'Ana\nLee, Ann\nZed\n' },
  'run-and-report': { 'p95.txt': '187ms\n' },
  'move-imports': { 'a.js': 'import { fmt } from "./lib/format.js";\n', 'sub/b.js': 'import { fmt } from "../lib/format.js";\n', 'c.js': 'const { fmt } = require("./lib/format");\n' },
  'license-header': { 'a.py': '# SPDX-License-Identifier: ISC\nprint("a")\n', 'b.py': '#!/usr/bin/env python3\n# SPDX-License-Identifier: ISC\nprint("b")\n', 'c.py': '# SPDX-License-Identifier: ISC\nprint("c")\n' },
  'version-bump': { 'package.json': '{\n  "name": "demo",\n  "version": "1.5.0",\n  "dependencies": {\n    "left-pad": "1.4.2"\n  }\n}\n', 'README.md': '![version](https://img.shields.io/badge/version-1.5.0-blue)\n', 'CHANGELOG.md': '# Changelog\n\n## 1.5.0 - 2026-09-30\n\n- Minor release.\n\n## 1.4.2 - 2026-09-01\n\n- Fix padding.\n' },
  'dedupe-lines': { 'list.txt': 'apple\nbanana\nCherry\ncherry\n' },
  'json-to-env': { '.env': 'DB_HOST=db.example.com\nDB_PORT=5432\nDEBUG=true\n' },
};
const bad = {
  'find-callers': { 'callers.txt': 'src/a.js\nsrc/b.js\nsrc/d/e.js\n' },
  'rename-symbol': { 'app.js': 'import { getUser, getUserName } from "./users.js";\n' },
  'strict-mode': { 'src/b.js': "'use strict';\n'use strict';\nexport const b = 2;\n" },
  'csv-filter': { 'active.txt': 'Ana\n"Lee\nZed\n' },
  'run-and-report': { 'p95.txt': 'p95=187ms\n' },
  'move-imports': { 'c.js': 'const { fmt } = require("./lib/format.js");\n' },
  'license-header': { 'b.py': '# SPDX-License-Identifier: ISC\n#!/usr/bin/env python3\nprint("b")\n' },
  'version-bump': { 'package.json': '{\n  "version": "1.5.0",\n  "dependencies": {\n    "left-pad": "1.5.0"\n  }\n}\n' },
  'dedupe-lines': { 'list.txt': 'apple\nbanana\nCherry\n' },
  'json-to-env': { '.env': 'DB_HOST="db.example.com"\nDB_PORT=5432\nDEBUG=true\n' },
};
function grade(dir, g) {
  let content; try { content = readFileSync(join(dir, g.path), 'utf8'); } catch { return false; }
  const re = new RegExp(g.pattern, g.flags || '');
  if (g.match === 'not_contains') return !re.test(content);
  if (g.match?.startsWith('count:')) return (content.match(new RegExp(g.pattern, 'g' + (g.flags || ''))) || []).length === Number(g.match.slice(6));
  return re.test(content);
}
function parse(file) {
  const fm = readFileSync(file, 'utf8').split('---')[1];
  const get = (k) => { const m = fm.match(new RegExp(`^${k}: (.*)$`, 'm')); return m ? m[1] : undefined; };
  return { path: get('target').match(/path: (.*) \}/)[1], pattern: JSON.parse(get('pattern')), match: get('match') && JSON.parse(get('match')), flags: get('flags') };
}
let problems = 0;
for (const c of readdirSync(root).filter((d) => existsSync(join(root, d, 'case.yaml')))) {
  if (!gold[c] || !bad[c]) throw new Error(`case ${c} has no gold/bad fixture in this script`);
  const graders = readdirSync(join(root, c, 'graders')).map((f) => [f, parse(join(root, c, 'graders', f))]);
  for (const [label, files, expectAll] of [['gold', gold[c], true], ['bad', bad[c], false]]) {
    const dir = mkdtempSync(join(tmpdir(), 'g-'));
    execSync(`sh ${join(root, c, 'scaffold.sh')}`, { cwd: dir });
    for (const [p, body] of Object.entries(files)) writeFileSync(join(dir, p), body);
    const results = graders.map(([f, g]) => [f, grade(dir, g)]);
    const ok = expectAll ? results.every(([, r]) => r) : results.some(([, r]) => !r);
    if (!ok) { problems++; console.log(`PROBLEM ${c} ${label}:`, JSON.stringify(results)); }
  }
}
console.log(problems === 0 ? 'all graders: gold passes, bad caught' : `${problems} problem(s)`);
process.exit(problems ? 1 : 0);
