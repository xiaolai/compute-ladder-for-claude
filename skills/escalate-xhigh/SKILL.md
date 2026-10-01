---
name: escalate-xhigh
description: Raises effort to xhigh for this turn. Invoke it FIRST, before reading files, for genuinely hard work - a costly-to-reverse design, architecture, data-model or API decision; debugging a non-obvious cause (concurrency, caching, timing); a multi-file refactor or migration with invariants to preserve; a correctness review of a plan or diff. Security or a repeat failure goes to escalate-max.
effort: xhigh
---

This skill requests xhigh effort for subsequent calls in this turn. Continue with the user's request. Do not claim that effort actually increased solely because the skill loaded; the routing report must confirm the observed level. If the host ignores the override, continue at the actual level and preserve the failed-escalation report.

Scope: this skill only raises effort for the current turn. For security-sensitive work or a repeated failure, use `compute-ladder:escalate-max`; to see how escalation has been going, use `compute-ladder:report`.

## Examples

<example>
Context: The user asks for a schema that will be hard to migrate later.
user: "Design the tables for multi-tenant feature flags with per-user overrides and an audit history."
assistant: Invokes escalate-xhigh first, then designs the schema at xhigh effort.
</example>

<example>
Context: The user asks for a one-line fix.
user: "Fix the typo in the README heading."
assistant: Fixes it directly; routine work does not escalate.
</example>
