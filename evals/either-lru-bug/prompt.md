---
description: routing may go either way (Opus 5.5 at medium solved it 6/6 in testing); grades the diagnosis
tags: [either]
max_turns: 6
timeout_seconds: 900
allowed_tools: [Skill]
---

Our LRU cache sometimes evicts the item that was just read. Find the bug.

```python
class Node:
    def __init__(self, k, v):
        self.k, self.v, self.prev, self.next = k, v, None, None

class LRU:
    def __init__(self, cap):
        self.cap, self.map = cap, {}
        self.head, self.tail = Node(None, None), Node(None, None)
        self.head.next, self.tail.prev = self.tail, self.head

    def _remove(self, n):
        n.prev.next, n.next.prev = n.next, n.prev

    def _push_front(self, n):
        n.next, n.prev = self.head.next, self.head
        self.head.next = n

    def get(self, k):
        if k not in self.map: return None
        n = self.map[k]
        self._remove(n); self._push_front(n)
        return n.v

    def put(self, k, v):
        if k in self.map: self._remove(self.map[k])
        n = Node(k, v); self.map[k] = n; self._push_front(n)
        if len(self.map) > self.cap:
            lru = self.tail.prev; self._remove(lru); del self.map[lru.k]
```
