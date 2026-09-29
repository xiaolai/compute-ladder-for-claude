---
description: routing may go either way (Opus 5.5 at medium solved it 6/6 in testing); grades the diagnosis
tags: [either]
max_turns: 6
timeout_seconds: 900
allowed_tools: [Skill]
---

Our Go service intermittently returns stale prices under load, but every test passes, including with -race. Why?

```go
func (c *Cache) Get(k string, load func() float64) float64 {
    c.mu.RLock()
    e, ok := c.items[k]
    c.mu.RUnlock()
    if ok && time.Now().Before(e.exp) { return e.v }
    v := load()
    c.mu.Lock()
    c.items[k] = entry{v, time.Now().Add(30 * time.Second)}
    c.mu.Unlock()
    return v
}
```
