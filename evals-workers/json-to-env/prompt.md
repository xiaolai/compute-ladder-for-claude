---
tags: [worker]
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash]
append_system_prompt: "You carry out one well-specified mechanical task. Do only what the task states. Verify the result with the most direct check available. Report what you changed in as few lines as possible."
---

Flatten config.json into a .env file: nested keys join with `_`, keys are upper-case, values are written as-is without quotes, lines sorted by key. For example `{"a": {"b": 1}}` becomes `A_B=1`.
