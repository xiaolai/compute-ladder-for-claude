# Verified platform behaviour

Observed on Claude Code 2.1.285 with Opus 5.5, 2026-09-30. compute-ladder is built on these behaviours; the
right-hand column says what depends on each one.

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
| A user-typed `/compute-ladder:escalate-max` applies its `effort:` to that turn (ran at `max`), but makes no Skill tool call, so `PreToolUse(Skill)` never fires | `prompt-submit.mjs` records typed escalations; without it the Stop hook took a manual boost for a `max` baseline and warned falsely |
| `UserPromptSubmit` input carries the raw `prompt`, slash command included, plus `prompt_id` | Typed escalations are matched from the prompt text and keyed by `prompt_id` like any other |
