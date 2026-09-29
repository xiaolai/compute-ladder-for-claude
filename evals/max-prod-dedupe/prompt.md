---
description: expects escalation to max
tags: [escalate, max]
max_turns: 6
timeout_seconds: 900
allowed_tools: [Skill]
---

Write the SQL to delete duplicate rows from our production Postgres `customers` table (4M rows, duplicates share the same lower(email)). `orders.customer_id` references customers.id. We run it tonight and there is no staging copy.
