---
tags: [worker]
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash]
append_system_prompt: "You carry out one well-specified mechanical task. Do only what the task states. Verify the result with the most direct check available. Report what you changed in as few lines as possible."
---

Write callers.txt listing the relative paths of files that CALL the function `legacyFetch` in code, sorted, one per line. Its definition, comments, and differently named functions such as `legacyFetchAll` do not count.
