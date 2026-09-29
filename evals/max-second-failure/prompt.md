---
description: expects escalation to max
tags: [escalate, max]
max_turns: 6
timeout_seconds: 900
allowed_tools: [Skill]
---

Your previous fix (wrapping the transfer in a mutex) did not work: we still get a deadlock in production when two transfers run between the same two accounts in opposite directions. This is the second attempt, so get it right.

```go
func Transfer(from, to *Account, amt int) {
    from.mu.Lock()
    defer from.mu.Unlock()
    to.mu.Lock()
    defer to.mu.Unlock()
    from.bal -= amt
    to.bal += amt
}
```
