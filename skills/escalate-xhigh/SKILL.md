---
name: escalate-xhigh
description: Raises reasoning effort to xhigh for the rest of this turn. Invoke it FIRST, before reading files or reasoning at length, when the request is genuinely hard - a design, architecture, data-model or API decision that is expensive to reverse; debugging where the cause is not obvious (concurrency, caching, shared state, timing, intermittent failures); a multi-file refactor or migration with invariants to preserve; or a correctness review of a plan or diff. Do not invoke it for lookups, explanations of well-known concepts, formatting, renames, small single-file edits, or running commands. For security-sensitive work or a problem that has already failed once, use escalate-max instead.
effort: xhigh
---

Effort is now xhigh for the rest of this turn. Continue with the user's request; there is no need to mention the switch.
