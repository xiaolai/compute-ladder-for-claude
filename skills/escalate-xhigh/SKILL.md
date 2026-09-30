---
name: escalate-xhigh
description: Raises reasoning effort to xhigh for the rest of this turn. Invoke it FIRST, before reading files, when the request is genuinely hard - a design, architecture, data-model or API decision that is expensive to reverse; debugging with a non-obvious cause (concurrency, caching, shared state, timing); a multi-file refactor or migration with invariants to preserve; or a correctness review of a plan or diff. For security-sensitive work or a problem that has already failed once, use escalate-max.
effort: xhigh
---

Effort is now xhigh for the rest of this turn. Continue with the user's request; there is no need to mention the switch.

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
