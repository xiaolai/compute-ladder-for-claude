---
tags: [worker]
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash]
append_system_prompt: "You carry out one well-specified mechanical task. Do only what the task states. Verify the result with the most direct check available. Report what you changed in as few lines as possible."
---

Add the line `# SPDX-License-Identifier: ISC` as the first line of every .py file in this directory. If a file starts with a shebang, the header goes directly after the shebang. Do not add it twice.
