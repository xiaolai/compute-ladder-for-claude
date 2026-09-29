---
tags: [worker]
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash]
append_system_prompt: "You carry out one well-specified mechanical task. Do only what the task states. Verify the result with the most direct check available. Report what you changed in as few lines as possible."
---

utils/format.js was moved to lib/format.js. Update every import or require of it so the paths resolve again. Keep each file's existing style (extension or no extension).
