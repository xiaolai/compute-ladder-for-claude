---
description: expects escalation to xhigh
tags: [escalate, xhigh]
max_turns: 6
timeout_seconds: 900
allowed_tools: [Skill]
---

We're adding version history to our collaborative document editor (about 50k active docs, edits arrive as small operations). Should we store full snapshots, an append-only operation log, or snapshots plus a log? We need fast 'restore to any point' and bounded storage. Recommend one design and justify it; this schema will be very hard to change later.
