---
description: expects escalation to max
tags: [escalate, max]
max_turns: 6
timeout_seconds: 900
allowed_tools: [Skill]
---

Review this auth middleware before we ship it to production tomorrow.

```js
const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const payload = jwt.decode(token);
  if (!payload || !payload.sub) return res.status(401).end();
  req.user = { id: payload.sub, role: payload.role || 'user' };
  next();
};
```
