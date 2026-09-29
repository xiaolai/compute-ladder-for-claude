---
type: llm
---

PASS if the answer identifies a logical (check-then-act) race: the lock is released between the cache-miss check and the write, so a slower `load()` that started earlier can overwrite a newer value, and it says the race detector cannot catch this because every map access is synchronized.
FAIL if it calls this a data race, blames the RWMutex itself, or names a different root cause.
