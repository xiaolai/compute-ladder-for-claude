# compute-ladder — Developer Notes

## What it does

Routes Claude Code's compute along two axes, each at the boundary where switching is cheap:

- **Effort, inside a conversation.** Claude Code has no automatic effort routing: `/effort auto` only clears the saved
  level and falls back to the model default. The one mechanism that lets Claude change effort itself is a skill's
  `effort:` frontmatter, which overrides the session level for the rest of the turn and keeps the prompt cache. The
  plugin packages that as an **escalate-only** ladder: the session runs at a modest baseline, and Claude invokes an
  escalation skill when a turn is genuinely hard.
- **Model, at subagent boundaries.** Claude can't switch the main thread's model itself (see the table below), and a
  model switch would rebuild the whole context in a new cache anyway. A subagent starts from a fresh, small context,
  so a cheaper model pays off there. `low-worker` runs large mechanical jobs on Sonnet at `low` effort; the model was
  chosen by measurement (see "Worker model").

```
SessionStart  → cat hooks/policy.md                      (policy into context; survives skill-listing truncation)
Claude        → Skill compute-ladder:escalate-xhigh|max  (effort: frontmatter raises the level for this turn)
PreToolUse    → scripts/guard.mjs                        (deny downgrades and pinned sessions; record the request)
Stop          → scripts/stop.mjs                         (log the turn; warn if the escalation didn't take effect)
Claude        → Agent compute-ladder:low-worker          (large mechanical jobs on Sonnet 5.5, low effort)
SubagentStop  → scripts/subagent-stop.mjs                (log each subagent run for the report's Delegation section)
/compute-ladder:report → scripts/report.mjs              (join the log with transcripts; flag likely misroutes)
```

## Verified platform behaviour (Claude Code 2.1.285, Opus 5.5, 2026-09-30)

Each line was observed with a logging hook or the transcript, not read from docs. Re-verify after a Claude Code
upgrade before trusting the guard's assumptions.

| Behaviour | Consequence for this plugin |
|---|---|
| A model-invoked skill's `effort:` applies from the next model call in the same turn | Escalation works without the user typing anything |
| It also works when the skill ships inside a plugin | Plugin packaging is viable |
| The override **lowers** effort too: session `max` + `effort: xhigh` skill → `xhigh` | `guard.mjs` denies any escalation at or below the current level |
| `--effort` does not block the override, but `CLAUDE_CODE_EFFORT_LEVEL` silently does | `guard.mjs` denies when the env var is set, and tells the user |
| Effort returns to the session level on the next user prompt | Each turn decides afresh; nothing sticks |
| Switching effort mid-turn keeps the prompt cache (cache reads kept growing across the switch) | Escalation costs no cache rebuild |
| `PostToolUse(Skill)` still reports the old level; the next `PreToolUse`/`Stop` report the new one | "Did it take effect?" is checked in `stop.mjs`, not after the skill |
| `effort` in hook input (and `$CLAUDE_EFFORT`) is accurate in `PreToolUse`/`Stop`, but **stale** in `SessionStart`/`UserPromptSubmit` (reported `high` in a `--effort max` session) | Never read effort from those two events |
| With many skills installed, the listing drops descriptions of the least-invoked skills first | The policy is injected by `SessionStart` rather than relying on skill descriptions |
| Stop input carries `prompt_id`; transcript user entries carry `promptId` | The report joins log and transcript on it |
| A skill's `model:` applies when the **user** types `/skill`, but **not** when Claude invokes the skill (stayed on Opus, with and without `--model`; no model-switch hook fired) | No in-thread model routing; models are routed through subagents |
| A plugin agent's `model: sonnet` frontmatter is honored when Claude delegates to it | `low-worker` runs on Sonnet |
| A subagent writes its own cache from scratch (~31k tokens for a Haiku subagent) | Delegation has a fixed cost; the policy says to do small edits inline |
| A full model ID (`claude-sonnet-5-5`) works in a plugin agent's `model:` | `low-worker` is pinned to the model that was measured |
| SubagentStop carries `agent_type` and `agent_transcript_path`; subagent transcript entries carry `message.model` | The report shows which model each agent type really ran on |
| `plugins: []` in an eval case does **not** unload the plugin under test (its Stop hook still wrote a log in the sandbox) | Measure without the plugin through the `--ablation with-without` "without" arm |

## Worker model

`evals-workers/` holds 10 mechanical tasks. Each builds a small fixture repository with traps: a similarly named
identifier, a quoted comma in a CSV, a shebang that must stay first, a dependency sharing the bumped version. Output
files are graded by exact regex. `scripts/check-worker-graders.mjs` checks that each case's correct output passes
every grader and a plausible wrong output fails one.

Results on 2026-09-30 from the "without" arm (no plugin loaded, as a real subagent sees it), 3 runs per task, all at
`CLAUDE_CODE_EFFORT_LEVEL=low`:

| Model | Fully correct runs | Cost per run | Median time |
|---|---:|---:|---:|
| Opus 5.5 | 30/30 | $0.090 | 10 s |
| **Sonnet 5.5** | **30/30** | **$0.049** | **9 s** |
| Haiku 4.5 | 27/30 | $0.034 | 15.5 s |

Sonnet matched Opus at 54% of the cost. Haiku's extra saving ($0.015 a run) doesn't pay for one run in ten being
wrong; across all 90 Haiku runs, with and without the plugin, 12 were wrong. The "with" arm scored the same as
"without" for Opus and Sonnet (Δ 0.00), so the plugin's policy doesn't change worker quality; it adds about 10% to
cost because the policy text is in context.

After this run, the `json-to-env` fixture's hostname changed from `db.internal` to `db.example.com` so public-repo
scanners stop flagging it. A re-run of that case on all three models passed 6 of 6 each (both arms).

`low-worker` is pinned to `claude-sonnet-5-5`, so the policy's "matched Opus at about half the cost" stays true.
Moving to a newer Sonnet is a deliberate change: re-run the suite with it, then update the pin, this table and
`hooks/policy.md` together.

## Project structure

```
.claude-plugin/plugin.json          — identity and metadata
.claude-plugin/marketplace.json     — per-plugin marketplace listing (workspace convention)
hooks/hooks.json                    — SessionStart, PreToolUse(Skill), Stop, SubagentStop
hooks/policy.md                     — the policy text SessionStart injects; keep it in step with skill and agent descriptions
skills/escalate-xhigh/SKILL.md      — effort: xhigh
skills/escalate-max/SKILL.md        — effort: max
skills/report/SKILL.md              — runs scripts/report.mjs against ${CLAUDE_PLUGIN_DATA}
agents/low-worker.md                — model: claude-sonnet-5-5 (pinned), effort: low, for large mechanical delegated work
scripts/lib.mjs                     — all logic, pure functions
scripts/io.mjs                      — stdin, data dir, session state, output
scripts/guard.mjs, stop.mjs         — hook entry points
scripts/subagent-stop.mjs           — SubagentStop entry point
scripts/report.mjs                  — report CLI
scripts/check-worker-graders.mjs    — proves the worker suite's graders tell right from wrong
scripts/*.test.mjs                  — unit tests (lib) and end-to-end hook tests (real processes)
evals/                              — effort routing suite
evals-workers/                      — worker model suite
```

Data lives in `${CLAUDE_PLUGIN_DATA}`: `turns.jsonl` (one line per Stop, no prompt text), `subagents.jsonl` (one
line per finished subagent, no prompt text) and `sessions/<session_id>.json` (escalation requests, baseline-warning
flag). Prompt excerpts are read from the
transcripts only when the report runs.

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

The routing suite mostly measures **routing accuracy**. `none-*` cases require that nothing fired (`no-escalation`).
`xhigh-*`/`max-*` cases require an escalation (`escalated`, weight 1) and grade the tier (`right-tier`, weight 0.5).
The three `either-*` cases are self-contained questions with a textbook answer: two snippet bugs and a password
hashing review. Opus 5.5 at `medium` answered all of them correctly (12 of 12 snippet runs, 4 of 4 checked
password runs, all five expert points each time), whether or not it escalated. Its consistent pattern is to escalate
for open-ended design, destructive production work, code about to ship, and repeated failure, and to skip questions
it can answer confidently. Escalating on the `either-*` cases changes cost, not the answer, so they grade the answer
with an `llm` judge (pass `--judge-model sonnet`) instead of the routing. Don't turn them back into must-escalate
cases without a run showing that `medium` gets them wrong. `max-auth-review` escalates in about 94% of runs, measured over 60 runs on two description variants (the
difference between them was not significant); the misses gave complete answers. At that rate a single 3-run suite
fails the case about 2% of the time, so re-run before treating one 1-of-3 as a regression. Run the suite with `--ablation none`:
without the plugin no escalation can fire, so a baseline arm measures nothing. Eval sandboxes load no user
settings, so they run at the model default (`medium` on Opus 5.5) and with a short skill listing. A real setup with
a large listing relies on the SessionStart policy instead.

## Known limits

- The model decides whether to escalate. At `medium`, Opus 5.5 sometimes solves a hard-looking problem correctly
  without escalating, so a missed escalation is not always a wrong answer. Judge routing with the report and the
  eval suite, not with single turns.
- The thinking that decides to escalate happens at the baseline level; only the rest of the turn runs higher.
- A `maxEffortLevel` cap or a model without the requested level makes escalation a no-op; `stop.mjs` reports it.
- For a job one shell command can do, Claude may correctly skip delegation and do it inline; that isn't a miss.
