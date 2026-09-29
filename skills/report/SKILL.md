---
name: report
description: Reports how compute-ladder has been escalating effort - escalation rate, output tokens per effort tier, escalations that did not take effect, and turns that look under- or over-escalated. Use when the user asks how compute-ladder's routing is performing or whether its routing is working.
argument-hint: "[--days N]"
allowed-tools: Bash(node *)
---

Run this command and show its markdown output to the user unchanged:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/report.mjs" "${CLAUDE_PLUGIN_DATA}" $ARGUMENTS
```

After the output, add at most three sentences: whether escalation looks too eager or too timid, based on the flagged turns. The flags are token-size heuristics, so judge each one by its prompt excerpt before calling it a misroute.
