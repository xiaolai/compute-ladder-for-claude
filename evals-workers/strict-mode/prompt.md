---
tags: [worker]
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash]
append_system_prompt: "You carry out one well-specified mechanical task. Do only what the task states. Verify the result with the most direct check available. Report what you changed in as few lines as possible."
---

Make sure every .js file under src/ has `'use strict';` as its very first line. Do not add it twice to files that already have it.
