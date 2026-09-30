# compute-ladder

Let Claude spend the right amount of compute per task: more reasoning effort when a turn is genuinely hard, a
cheaper model for large mechanical jobs, instead of you switching `/effort` and `/model` by hand.

Claude Code has no automatic routing for either. compute-ladder routes each one at the boundary where switching is
cheap:

- **Effort escalation, inside the conversation.** Two skills set effort for the rest of the turn. `escalate-xhigh` handles hard but recoverable work: design decisions, non-obvious bugs, and risky refactors. `escalate-max` handles costly mistakes: security-sensitive code, production data, and a problem that has already failed once. Claude invokes one as the first step of a turn, and the level resets when you send your next message. Switching effort keeps the prompt cache.
- **A cheaper model, at the subagent boundary.** Claude can't switch the main conversation's model on its own, and switching would rebuild the whole context in a new cache. So large mechanical jobs (bulk edits, renames, repository-wide searches) go to the `low-worker` subagent. It runs on Sonnet 5.5 at `low` effort, which matched Opus on a 10-task mechanical suite (30/30 runs each) at 54% of the cost. Haiku was cheaper still but got 1 run in 10 wrong.
- **A guard.** A skill's `effort:` can also *lower* the level, and `CLAUDE_CODE_EFFORT_LEVEL` silently blocks the override. The guard denies both cases, so Claude never escalates into a downgrade or believes it escalated when it didn't.
- **A report.** `/compute-ladder:report` shows the escalation rate, output tokens per tier, escalations that didn't take effect, turns that look under- or over-escalated, and which models and effort levels your subagents actually ran on.

## Install

```bash
claude plugin install compute-ladder@xiaolai --scope user
```

That's all the setup. The plugin escalates from your normal effort level, and Opus 5.5 already defaults to
`medium`. If you once saved a higher level with `/effort`, run `/effort medium` once; the plugin reminds you when
your level is `xhigh` or above.

## Use

**Day to day, do nothing.** Claude escalates hard turns by itself, and each turn starts again from your normal level.
You can tell a turn was escalated by this line in the transcript:

```
Skill(compute-ladder:escalate-xhigh)
```

**To boost one turn yourself,** start your message with the skill:

```
/compute-ladder:escalate-max  review this auth change before we ship it
```

It applies to that turn only, so there's nothing to switch back, unlike `/effort max`. Use `escalate-xhigh` for
hard design or debugging work, and `escalate-max` for security, production data, or a problem that already failed.

**To see how it's been routing:**

```
/compute-ladder:report
/compute-ladder:report --days 7
```

The report's flags are token-size heuristics, not verdicts. Read the prompt before deciding a turn was misrouted.

## How it was measured

- [Worker model](docs/worker-model.md): the 10-task suite behind "Sonnet matched Opus at 54% of the cost".
- [Routing evals](docs/evals.md): what the escalation suite grades, and how often Claude escalates on each kind of case.
- [Platform behaviour](docs/platform-behaviour.md): the Claude Code behaviours the plugin relies on, each observed directly.

## Requirements

Tested on Claude Code 2.1.285. Needs a model that supports effort levels (Opus 5.5, Sonnet 5.5, Fable 5.1 and their
recent predecessors), and access to Sonnet 5.5 for `low-worker`. Node.js 20 or later for the hooks.

## License

ISC
