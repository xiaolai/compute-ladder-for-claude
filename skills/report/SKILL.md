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

Scope: this skill only reports. Effort is raised by `compute-ladder:escalate-xhigh` and `compute-ladder:escalate-max`, and large mechanical jobs go to the `compute-ladder:low-worker` agent.

## Examples

<example>
Context: The user wants to know whether escalation is paying off.
user: "/compute-ladder:report --days 7"
assistant: Runs the report for the last 7 days and shows it unchanged, then notes whether escalation looks too eager or too timid.
</example>

<example>
Context: The user asks in plain words.
user: "Is the effort routing working?"
assistant: Runs the report for all recorded turns and summarizes the flagged turns by their prompt excerpts.
</example>
