# Worker model

Why `low-worker` runs on Sonnet 5.5, and how that was measured.

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
Moving to a newer Sonnet is a deliberate change: re-run the suite with it (command in `AGENTS.md`), then update the
pin, this table and `hooks/policy.md` together.
