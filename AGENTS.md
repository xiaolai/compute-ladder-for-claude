# compute-ladder — Developer Notes

## What it does

Routes Claude Code's compute along two axes, each at the boundary where switching is cheap:

- **Effort, inside a conversation.** A skill's `effort:` frontmatter requests an override of the session level for the rest of the
  turn and keeps the prompt cache. The plugin packages that as an **escalate-only** ladder: the session runs at a
  modest baseline, and Claude invokes an escalation skill when a turn is genuinely hard.
- **Model, at subagent boundaries.** Claude can't switch the main thread's model itself, and a switch would rebuild
  the whole context in a new cache. `low-worker` runs large mechanical jobs on Sonnet 5.5 at `low` effort.

```
SessionStart  → cat hooks/policy.md                      (policy into context; survives skill-listing truncation)
UserPromptSubmit → scripts/prompt-submit.mjs             (record an escalation the user typed as /compute-ladder:escalate-*)
Claude        → Skill compute-ladder:escalate-xhigh|max  (effort: frontmatter raises the level for this turn)
PreToolUse    → scripts/guard.mjs                        (deny downgrades and pinned sessions; record the request)
Stop          → scripts/stop.mjs                         (log the turn; warn if the escalation didn't take effect)
Claude        → Agent compute-ladder:low-worker          (large mechanical jobs on Sonnet 5.5, low effort)
SubagentStop  → scripts/subagent-stop.mjs                (log each subagent run for the report's Delegation section)
/compute-ladder:report → scripts/report.mjs              (join the log with transcripts; flag likely misroutes)
```

The evidence behind the design lives in `docs/`:

| File | Read it before |
|---|---|
| `docs/platform-behaviour.md` | Changing `guard.mjs`, `stop.mjs` or any hook, or after a Claude Code upgrade |
| `docs/worker-model.md` | Changing `low-worker`'s model or the delegation policy |
| `docs/evals.md` | Changing an eval case or treating an eval failure as a regression |

## Project structure

```
.claude-plugin/plugin.json          — identity and metadata
.claude-plugin/marketplace.json     — per-plugin marketplace listing (workspace convention)
hooks/hooks.json                    — SessionStart, UserPromptSubmit, PreToolUse(Skill), Stop, SubagentStop
hooks/policy.md                     — the policy text SessionStart injects; keep it in step with skill and agent descriptions
skills/escalate-xhigh/SKILL.md      — effort: xhigh
skills/escalate-max/SKILL.md        — effort: max
skills/report/SKILL.md              — runs scripts/report.mjs against ${CLAUDE_PLUGIN_DATA}
agents/low-worker.md                — model: claude-sonnet-5-5 (pinned), effort: low, for large mechanical delegated work
scripts/lib.mjs                     — all logic, pure functions
scripts/io.mjs                      — stdin, data dir, session state, output
scripts/guard.mjs, stop.mjs         — hook entry points
scripts/subagent-stop.mjs           — SubagentStop entry point
scripts/prompt-submit.mjs           — UserPromptSubmit entry point; must print nothing, its stdout enters Claude's context
scripts/report.mjs                  — report CLI
scripts/check-worker-graders.mjs    — proves the worker suite's graders tell right from wrong
scripts/*.test.mjs                  — unit tests (lib) and end-to-end hook tests (real processes)
evals/                              — effort routing suite
evals-workers/                      — worker model suite
docs/                               — evidence: platform behaviour, worker model, routing evals
```

Data lives in `${CLAUDE_PLUGIN_DATA}`: `turns.jsonl` (one line per Stop, no prompt text), `subagents.jsonl` (one
line per finished subagent, no prompt text) and `sessions/<session_id>.json` (escalation requests, baseline-warning
flag). Prompt excerpts are read from the transcripts only when the report runs.

## Checks

```bash
node --test scripts/*.test.mjs                        # unit + hook tests; the glob matters, a bare directory fails
claude plugin validate --strict .claude-plugin/plugin.json
cd "$(mktemp -d)" && claude -p 'Reply ok' --plugin-dir <abs-plugin-dir> --debug-file /tmp/load.log --max-turns 1 && grep -E '\[(WARN|ERROR)\]' /tmp/load.log

# effort routing suite; --threshold 0.66 means 2 of 3 runs (2/3 = 0.667, so 0.67 would fail it)
claude plugin eval . --runs 3 --ablation none --model claude-opus-5-5 --judge-model sonnet --trust-plugin --no-publish -j 4 --threshold 0.66

# worker model suite: check the graders first, then run it once per candidate model
node scripts/check-worker-graders.mjs evals-workers
CLAUDE_CODE_EFFORT_LEVEL=low claude plugin eval . --eval-dir evals-workers --runs 3 --ablation with-without --model <model> --scaffold --allow-tools Bash Edit Write --trust-plugin --no-publish -j 4 --threshold 0
```

## Rules

- Never read effort from `SessionStart` or `UserPromptSubmit` hook input; it is stale there. `prompt-submit.mjs` reads
  only the prompt text. `PreToolUse` and `Stop`
  are accurate.
- Keep the guard's downgrade and `CLAUDE_CODE_EFFORT_LEVEL` denials: a skill's `effort:` can lower the level, and
  the env var silently blocks the override.
- Moving `low-worker` to a newer Sonnet is deliberate: re-run the worker suite with it, then update the pin,
  `docs/worker-model.md` and `hooks/policy.md` together.
- Don't turn the `either-*` eval cases back into must-escalate cases without a run showing that `medium` gets them
  wrong.
- A single 1-of-3 on `max-auth-review` is expected about 2% of the time; re-run before treating it as a regression.
- Measure a worker model without the plugin through the `--ablation with-without` "without" arm; `plugins: []` in a
  case does not unload it.
- Keep `hooks/policy.md` in step with the skill and agent descriptions.

## Known limits

- The latest Claude Code 2.1.286 probes did not reproduce skill-triggered effort overrides. Treat invocation as a request and confirm observed effort in the report; see `docs/platform-behaviour.md`.

- The model decides whether to escalate. At `medium`, Opus 5.5 sometimes solves a hard-looking problem correctly
  without escalating, so a missed escalation is not always a wrong answer. Judge routing with the report and the
  eval suite, not with single turns.
- The thinking that decides to escalate happens at the baseline level; only the rest of the turn runs higher.
- A `maxEffortLevel` cap or a model without the requested level makes escalation a no-op; `stop.mjs` reports it.
- For a job one shell command can do, Claude may correctly skip delegation and do it inline; that isn't a miss.
