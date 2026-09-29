---
description: expects no escalation
tags: [routine, none]
max_turns: 6
timeout_seconds: 900
allowed_tools: [Skill]
---

Rename `usr` to `user` in this function and show the result:

```js
function greet(usr) {
  return `Hi ${usr.name}, you have ${usr.unread} messages`;
}
```
