---
tags: [worker]
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash]
append_system_prompt: "You carry out one well-specified mechanical task. Do only what the task states. Verify the result with the most direct check available. Report what you changed in as few lines as possible."
---

Rename the function `getUsr` to `getUser` everywhere it is referenced. Do not change other identifiers that merely start with `getUsr`, such as `getUsrName`.
