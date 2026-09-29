---
tags: [worker]
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash]
append_system_prompt: "You carry out one well-specified mechanical task. Do only what the task states. Verify the result with the most direct check available. Report what you changed in as few lines as possible."
---

Release version 1.5.0: update the package version in package.json and the version badge in README.md, and add a `## 1.5.0 - 2026-09-30` section with the single bullet `- Minor release.` above the 1.4.2 section in CHANGELOG.md. Change nothing else.
