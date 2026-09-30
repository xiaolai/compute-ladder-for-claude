---
name: escalate-max
description: Raises reasoning effort to max for the rest of this turn. Invoke it FIRST, before any other work, when a mistake would be costly or the problem has already resisted an attempt - security-sensitive code (authentication, authorization, cryptography, secrets, payments); destructive or irreversible operations on production data; a production incident; the same problem failing a second time; or the user asking for maximum rigor. For work that is hard but recoverable, use escalate-xhigh.
effort: max
---

Effort is now max for the rest of this turn. Continue with the user's request; there is no need to mention the switch.

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
