// Pure logic for compute-ladder. No I/O here: every function takes plain data and returns plain data,
// so the hooks and the report are thin wrappers and everything below is unit-tested.

export const PLUGIN = 'compute-ladder';
export const LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'];

const ESCALATIONS = {
  [`${PLUGIN}:escalate-xhigh`]: 'xhigh',
  [`${PLUGIN}:escalate-max`]: 'max',
};

/** Index of an effort level in LEVELS, or null for anything that isn't one. */
export function rank(level) {
  const i = LEVELS.indexOf(level);
  return i === -1 ? null : i;
}

/** The effort level an escalation skill sets, or null when the skill isn't one of ours. */
export function escalationTarget(skill) {
  return Object.hasOwn(ESCALATIONS, skill) ? ESCALATIONS[skill] : null;
}

/**
 * Decide whether an escalation skill may run.
 *
 * A skill's `effort` frontmatter overrides the session level in both directions, so invoking
 * escalate-xhigh in a session already at max would LOWER effort. And CLAUDE_CODE_EFFORT_LEVEL
 * pins effort so that skill overrides are silently ignored. Both cases are denied with a reason
 * Claude sees, so it carries on instead of believing it escalated.
 *
 * @param {{target: string, current: string|null, pinnedBy: string|null}} args
 * @returns {{allow: true} | {allow: false, reason: string, userMessage?: string}}
 */
export function guardDecision({ target, current, pinnedBy }) {
  if (pinnedBy) {
    return {
      allow: false,
      reason: `Effort is pinned by CLAUDE_CODE_EFFORT_LEVEL=${pinnedBy}, so this escalation cannot take effect. Continue the task at the current level.`,
      userMessage: `compute-ladder: escalation to ${target} blocked because CLAUDE_CODE_EFFORT_LEVEL=${pinnedBy} pins effort. Unset it to let the ladder work.`,
    };
  }
  if (rank(current) === null) {
    return {
      allow: false,
      reason: 'The active model reports no effort level, so escalation has no effect. Continue the task without it.',
    };
  }
  if (rank(current) >= rank(target)) {
    return {
      allow: false,
      reason: `Effort is already ${current}, at or above ${target}. Invoking this skill would not raise it and could lower it. Continue the task without escalating.`,
    };
  }
  return { allow: true };
}

/**
 * Build the usage record for a finished turn, plus any messages to show the user.
 *
 * @param {{input: object, state: {requests: Record<string,string>, baselineWarned: boolean}, now: string}} args
 * @returns {{record: object, messages: string[], state: object}}
 */
export function stopOutcome({ input, state, now }) {
  const effort = input.effort?.level ?? null;
  const requested = state.requests[input.prompt_id] ?? null;
  const tookEffect = requested === null ? null : rank(effort) !== null && rank(effort) >= rank(requested);
  const messages = [];
  let baselineWarned = state.baselineWarned;

  if (tookEffect === false) {
    messages.push(
      `compute-ladder: escalation to ${requested} did not take effect (the turn ended at ${effort ?? 'no effort level'}). ` +
        'A maxEffortLevel cap or a model that lacks that level is the likely cause.',
    );
  }
  if (requested === null && rank(effort) !== null && rank(effort) >= rank('xhigh') && !baselineWarned) {
    messages.push(
      `compute-ladder: this session's baseline effort is ${effort}, which leaves little to escalate to. ` +
        "The ladder works best from medium (Opus 5.5's default): run /effort auto, or remove the per-model level from modelSettings.",
    );
    baselineWarned = true;
  }

  return {
    record: {
      ts: now,
      session_id: input.session_id,
      prompt_id: input.prompt_id ?? null,
      transcript_path: input.transcript_path ?? null,
      cwd: input.cwd ?? null,
      effort,
      requested,
      took_effect: tookEffect,
    },
    messages,
    state: { ...state, baselineWarned },
  };
}

/**
 * Split a transcript into turns keyed by promptId, with output tokens and an excerpt of the prompt.
 *
 * Streaming writes one transcript entry per content block, each repeating the message's usage, so
 * output tokens are counted once per message id (taking the largest value seen).
 *
 * @param {object[]} entries parsed transcript lines
 * @returns {Map<string, {outputTokens: number, excerpt: string}>}
 */
export function turnsFromTranscript(entries) {
  const turns = new Map();
  const perMessage = new Map(); // message id -> {promptId, tokens}
  let current = null;

  for (const entry of entries) {
    if (entry?.type === 'user' && typeof entry.promptId === 'string') {
      current = entry.promptId;
      if (!turns.has(current)) turns.set(current, { outputTokens: 0, excerpt: '' });
      const turn = turns.get(current);
      if (!turn.excerpt && !entry.isMeta) turn.excerpt = promptText(entry.message?.content);
    } else if (entry?.type === 'assistant' && current !== null) {
      const id = entry.message?.id;
      const tokens = entry.message?.usage?.output_tokens;
      if (typeof id !== 'string' || typeof tokens !== 'number') continue;
      const seen = perMessage.get(id);
      if (!seen || tokens > seen.tokens) perMessage.set(id, { promptId: seen?.promptId ?? current, tokens });
    }
  }
  for (const { promptId, tokens } of perMessage.values()) turns.get(promptId).outputTokens += tokens;
  return turns;
}

function promptText(content) {
  let text = '';
  if (typeof content === 'string') text = content;
  else if (Array.isArray(content)) {
    if (content.some((block) => block?.type === 'tool_result')) return '';
    text = content.find((block) => block?.type === 'text')?.text ?? '';
  }
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > 100 ? `${oneLine.slice(0, 99)}…` : oneLine;
}

export function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export const UNDER_MIN_TOKENS = 15_000;
export const UNDER_FACTOR = 3;
export const OVER_MAX_TOKENS = 2_000;

/**
 * Merge usage records with per-turn transcript data and summarize.
 *
 * Several Stop events can fire for one prompt (a stop hook continuing the turn, a background task
 * waking it). Records are merged per prompt_id: the latest effort wins, and an escalation request
 * on any of them marks the turn as escalated.
 *
 * @param {object[]} records usage records, oldest first
 * @param {(path: string) => Map<string, {outputTokens: number, excerpt: string}> | null} loadTurns
 */
export function summarize(records, loadTurns) {
  const byPrompt = new Map();
  for (const r of records) {
    if (!r.prompt_id) continue;
    const prev = byPrompt.get(r.prompt_id);
    byPrompt.set(r.prompt_id, {
      ...r,
      requested: r.requested ?? prev?.requested ?? null,
      took_effect: r.requested ? r.took_effect : (prev?.took_effect ?? null),
    });
  }

  const transcripts = new Map();
  let missingTranscripts = 0;
  const turns = [];
  for (const r of byPrompt.values()) {
    if (!transcripts.has(r.transcript_path)) transcripts.set(r.transcript_path, r.transcript_path ? loadTurns(r.transcript_path) : null);
    const data = transcripts.get(r.transcript_path)?.get(r.prompt_id);
    if (!data) {
      missingTranscripts += 1;
      continue;
    }
    turns.push({ ...r, outputTokens: data.outputTokens, excerpt: data.excerpt });
  }

  const groups = new Map();
  for (const t of turns) {
    const key = t.requested ? `escalated → ${t.requested}` : `baseline ${t.effort ?? 'unknown'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t.outputTokens);
  }

  const baseline = turns.filter((t) => !t.requested);
  const baselineMedian = median(baseline.map((t) => t.outputTokens));
  const underThreshold = Math.max(UNDER_MIN_TOKENS, UNDER_FACTOR * baselineMedian);

  return {
    promptCount: byPrompt.size,
    analyzed: turns.length,
    missingTranscripts,
    escalated: turns.filter((t) => t.requested).length,
    groups: [...groups.entries()]
      .map(([label, tokens]) => ({ label, turns: tokens.length, mean: Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length), median: median(tokens) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    underThreshold,
    underEscalated: baseline.filter((t) => t.outputTokens >= underThreshold).sort((a, b) => b.outputTokens - a.outputTokens),
    overEscalated: turns.filter((t) => t.requested && t.took_effect && t.outputTokens < OVER_MAX_TOKENS),
    failed: turns.filter((t) => t.took_effect === false),
  };
}

/**
 * Build the log record for a finished subagent, or null for Claude Code's internal agents (empty agent_type),
 * which aren't delegation decisions.
 */
export function subagentRecord(input, now) {
  if (!input.agent_type) return null;
  return {
    ts: now,
    session_id: input.session_id,
    prompt_id: input.prompt_id ?? null,
    agent_type: input.agent_type,
    agent_transcript_path: input.agent_transcript_path ?? null,
  };
}

/** Output tokens (each message counted once, at its largest usage) and the models that answered. */
export function usageFromTranscript(entries) {
  const perMessage = new Map();
  const models = new Set();
  for (const entry of entries) {
    if (entry?.type !== 'assistant') continue;
    const { id, model, usage } = entry.message ?? {};
    if (typeof model === 'string' && model !== '<synthetic>') models.add(model);
    if (typeof id !== 'string' || typeof usage?.output_tokens !== 'number') continue;
    perMessage.set(id, Math.max(perMessage.get(id) ?? 0, usage.output_tokens));
  }
  let outputTokens = 0;
  for (const tokens of perMessage.values()) outputTokens += tokens;
  return { outputTokens, models: [...models].sort() };
}

/**
 * Group subagent runs by agent type.
 *
 * @param {object[]} records subagent records
 * @param {(path: string) => {outputTokens: number, models: string[]} | null} loadUsage
 */
export function summarizeDelegation(records, loadUsage) {
  const groups = new Map();
  for (const r of records) {
    if (!groups.has(r.agent_type)) groups.set(r.agent_type, { agentType: r.agent_type, runs: 0, missing: 0, tokens: [], models: new Set() });
    const g = groups.get(r.agent_type);
    g.runs += 1;
    const usage = r.agent_transcript_path ? loadUsage(r.agent_transcript_path) : null;
    if (!usage) {
      g.missing += 1;
      continue;
    }
    g.tokens.push(usage.outputTokens);
    for (const m of usage.models) g.models.add(m);
  }
  return [...groups.values()]
    .map((g) => ({
      agentType: g.agentType,
      runs: g.runs,
      missing: g.missing,
      models: [...g.models].sort(),
      meanOutput: g.tokens.length ? Math.round(g.tokens.reduce((a, b) => a + b, 0) / g.tokens.length) : 0,
    }))
    .sort((a, b) => b.runs - a.runs || a.agentType.localeCompare(b.agentType));
}
