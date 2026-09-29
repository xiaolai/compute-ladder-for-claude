---
description: expects escalation to xhigh
tags: [escalate, xhigh]
max_turns: 6
timeout_seconds: 900
allowed_tools: [Skill]
---

Design the database schema for multi-tenant feature flags: per-tenant defaults, per-user overrides, percentage rollouts that must stay sticky per user, and a full audit history of every change. It will be hard to migrate later, so get the model right. Give the tables and the key constraints.
