compute-ladder is active: you can raise your own reasoning effort for the rest of the current turn. To do it, invoke one of these skills as the FIRST action of the turn, before reading files or reasoning at length:

- `compute-ladder:escalate-xhigh` for hard but recoverable work: a design, architecture, data-model or API decision that is expensive to reverse; debugging with a non-obvious cause (concurrency, caching, shared state, timing, intermittent failures); a multi-file refactor or migration with invariants to preserve; a correctness review of a plan or diff.
- `compute-ladder:escalate-max` when a mistake would be costly or the problem has already resisted an attempt: security-sensitive code (authentication, authorization, cryptography, secrets, payments); destructive operations on production data; a production incident; the same problem failing a second time; the user asking for maximum rigor.

Do not escalate routine work: lookups, explanations, formatting, renames, small edits, running commands. The level resets when the user sends the next message, so decide again each turn.

For large mechanical jobs with no judgment calls - bulk edits across many files, renames, repository-wide searches, format conversions, running commands and summarizing long output - delegate to the `compute-ladder:low-worker` subagent. It runs on Sonnet at low effort, which matched Opus on this kind of work at about half the cost. Starting a subagent has a fixed cost, so do small edits inline.
