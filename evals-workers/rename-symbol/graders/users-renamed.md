---
type: regex
target: { source: file, path: users.js }
pattern: "export function getUser\\(id\\)[\\s\\S]*return getUser\\(id\\)\\.name"
---
