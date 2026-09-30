# compute-ladder

Let Claude spend the right amount of compute per task: more reasoning effort when a turn is genuinely hard, a
cheaper model for large mechanical jobs, instead of you switching `/effort` and `/model` by hand.

Claude Code has no automatic routing for either. compute-ladder routes each one at the boundary where switching is
cheap:

- **Effort escalation, inside the conversation.** Two skills set effort for the rest of the turn. `escalate-xhigh` handles hard but recoverable work: design decisions, non-obvious bugs, and risky refactors. `escalate-max` handles costly mistakes: security-sensitive code, production data, and a problem that has already failed once. Claude invokes one as the first step of a turn, and the level resets when you send your next message. Switching effort keeps the prompt cache.
- **A cheaper model, at the subagent boundary.** Claude can't switch the main conversation's model on its own, and switching would rebuild the whole context in a new cache. So large mechanical jobs (bulk edits, renames, repository-wide searches) go to the `low-worker` subagent. It runs on Sonnet 5.5 at `low` effort, which matched Opus on a 10-task mechanical suite (30/30 runs each) at 54% of the cost. Haiku was cheaper still but got 1 run in 10 wrong.
- **A guard.** A skill's `effort:` can also *lower* the level, and `CLAUDE_CODE_EFFORT_LEVEL` silently blocks the override. The guard denies both cases, so Claude never escalates into a downgrade or believes it escalated when it didn't.
- **A report.** `/compute-ladder:report` shows the escalation rate, output tokens per tier, escalations that didn't take effect, turns that look under- or over-escalated, and which models your subagents actually ran on.

## Install

```bash
claude plugin install compute-ladder@xiaolai --scope user
```

Then set a modest baseline, so there is something to escalate from. On Opus 5.5 the default is already `medium`.
Run `/effort auto`, or remove the model's entry from `modelSettings` in `~/.claude/settings.json`. If the baseline
is `xhigh` or higher, the plugin says so once per session.

## Check how it routes

```
/compute-ladder:report
/compute-ladder:report --days 7
```

The flags in the report are token-size heuristics, not verdicts. Read the prompt before deciding a turn was misrouted.

## How it was measured

- [Worker model](docs/worker-model.md): the 10-task suite behind "Sonnet matched Opus at 54% of the cost".
- [Routing evals](docs/evals.md): what the escalation suite grades, and how often Claude escalates on each kind of case.
- [Platform behaviour](docs/platform-behaviour.md): the Claude Code behaviours the plugin relies on, each observed directly.

## Requirements

Tested on Claude Code 2.1.285. Needs a model that supports effort levels (Opus 5.5, Sonnet 5.5, Fable 5.1 and their
recent predecessors), and access to Sonnet 5.5 for `low-worker`. Node.js 20 or later for the hooks.

## License

ISC
