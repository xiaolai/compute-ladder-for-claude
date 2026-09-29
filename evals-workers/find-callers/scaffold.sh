#!/bin/sh
set -e
mkdir -p src/d
printf 'import { legacyFetch } from "./net";\nexport const load = () => legacyFetch("/a");\n' > src/a.js
printf 'export function legacyFetchAll(urls) {\n  return urls.map((u) => legacyFetchAll([u]));\n}\n' > src/b.js
printf '// legacyFetch( is deprecated, use fetchJson instead\nexport const x = 1;\n' > src/c.js
printf 'export const run = (api) => api.legacyFetch("/e");\n' > src/d/e.js
printf 'export function legacyFetch(url) { return fetch(url); }\n' > src/net.js
