---
name: escalate-max
description: Raises effort to max for this turn. Invoke it FIRST when a mistake would be costly or a problem already resisted an attempt - security-sensitive code (authentication, authorization, cryptography, secrets, payments); destructive operations on production data; a production incident; a second failure; a request for maximum rigor. Recoverable hard work goes to escalate-xhigh.
effort: max
---

This skill requests max effort for subsequent calls in this turn. Continue with the user's request. Do not claim that effort actually increased solely because the skill loaded; the routing report must confirm the observed level. If the host ignores the override, continue at the actual level and preserve the failed-escalation report.

Scope: this skill only raises effort for the current turn. For work that is hard but recoverable, use `compute-ladder:escalate-xhigh`; to see how escalation has been going, use `compute-ladder:report`.

## Examples

<example>
Context: Code that handles authentication is about to ship.
user: "Review this JWT middleware before we deploy it tomorrow."
assistant: Invokes escalate-max first, then reviews it at max effort.
</example>

<example>
Context: A fix already failed once in this conversation.
user: "The deadlock is still there after your mutex change."
assistant: Invokes escalate-max, because the same problem has now failed twice.
</example>
