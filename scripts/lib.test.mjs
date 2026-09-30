import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escalationTarget, guardDecision, median, rank, stopOutcome, subagentRecord, summarize, typedEscalation, summarizeDelegation, turnsFromTranscript, usageFromTranscript } from './lib.mjs';

test('rank orders levels and rejects anything else', () => {
  assert.equal(rank('low'), 0);
  assert.equal(rank('max'), 4);
  assert.equal(rank('auto'), null);
  assert.equal(rank(undefined), null);
});

test('escalationTarget only recognizes this plugin’s namespaced skills', () => {
  assert.equal(escalationTarget('compute-ladder:escalate-xhigh'), 'xhigh');
  assert.equal(escalationTarget('compute-ladder:escalate-max'), 'max');
  assert.equal(escalationTarget('escalate-max'), null);
  assert.equal(escalationTarget('other-plugin:escalate-max'), null);
  assert.equal(escalationTarget('toString'), null);
  assert.equal(escalationTarget(undefined), null);
});

test('guard allows a real escalation', () => {
  assert.deepEqual(guardDecision({ target: 'xhigh', current: 'medium', pinnedBy: null }), { allow: true });
  assert.deepEqual(guardDecision({ target: 'max', current: 'xhigh', pinnedBy: null }), { allow: true });
});

test('guard denies an escalation that would not raise effort (the downgrade case)', () => {
  const same = guardDecision({ target: 'xhigh', current: 'xhigh', pinnedBy: null });
  assert.equal(same.allow, false);
  const lower = guardDecision({ target: 'xhigh', current: 'max', pinnedBy: null });
  assert.equal(lower.allow, false);
  assert.match(lower.reason, /already max/);
});

test('guard denies when the env var pins effort, and tells the user', () => {
  const d = guardDecision({ target: 'max', current: 'low', pinnedBy: 'low' });
  assert.equal(d.allow, false);
  assert.match(d.userMessage, /CLAUDE_CODE_EFFORT_LEVEL=low/);
});

test('guard denies when the model reports no effort level', () => {
  assert.equal(guardDecision({ target: 'max', current: null, pinnedBy: null }).allow, false);
});

const fresh = { requests: {}, baselineWarned: false };
const stopInput = (level, promptId = 'p1') => ({
  session_id: 's1',
  prompt_id: promptId,
  transcript_path: '/t.jsonl',
  cwd: '/w',
  effort: level ? { level } : undefined,
});

test('stop records a plain baseline turn with no messages', () => {
  const out = stopOutcome({ input: stopInput('medium'), state: fresh, now: 'T' });
  assert.deepEqual(out.record, { ts: 'T', session_id: 's1', prompt_id: 'p1', transcript_path: '/t.jsonl', cwd: '/w', effort: 'medium', requested: null, took_effect: null });
  assert.deepEqual(out.messages, []);
});

test('stop confirms an escalation that took effect', () => {
  const out = stopOutcome({ input: stopInput('max'), state: { requests: { p1: 'max' }, baselineWarned: false }, now: 'T' });
  assert.equal(out.record.requested, 'max');
  assert.equal(out.record.took_effect, true);
  assert.deepEqual(out.messages, []);
});

test('stop reports an escalation that was capped', () => {
  const out = stopOutcome({ input: stopInput('high'), state: { requests: { p1: 'max' }, baselineWarned: false }, now: 'T' });
  assert.equal(out.record.took_effect, false);
  assert.match(out.messages[0], /did not take effect/);
});

test('stop warns about a high baseline once per session, and not on escalated turns', () => {
  const first = stopOutcome({ input: stopInput('xhigh'), state: fresh, now: 'T' });
  assert.match(first.messages[0], /baseline effort is xhigh/);
  assert.equal(first.state.baselineWarned, true);
  const second = stopOutcome({ input: stopInput('xhigh', 'p2'), state: first.state, now: 'T' });
  assert.deepEqual(second.messages, []);
  const escalated = stopOutcome({ input: stopInput('max'), state: { requests: { p1: 'max' }, baselineWarned: false }, now: 'T' });
  assert.equal(escalated.state.baselineWarned, false);
  assert.equal(stopOutcome({ input: stopInput('high'), state: fresh, now: 'T' }).messages.length, 0);
});

const transcript = [
  { type: 'user', promptId: 'p1', message: { content: 'Fix   the\ntypo' } },
  { type: 'assistant', message: { id: 'm1', usage: { output_tokens: 40 } } },
  { type: 'assistant', message: { id: 'm1', usage: { output_tokens: 40 } } },
  { type: 'user', promptId: 'p1', message: { content: [{ type: 'tool_result', content: 'ok' }] } },
  { type: 'user', promptId: 'p1', isMeta: true, message: { content: [{ type: 'text', text: 'Base directory for this skill' }] } },
  { type: 'assistant', message: { id: 'm2', usage: { output_tokens: 10 } } },
  { type: 'assistant', message: { id: 'm2', usage: { output_tokens: 25 } } },
  { type: 'attachment' },
  { type: 'user', promptId: 'p2', message: { content: [{ type: 'text', text: 'x'.repeat(150) }] } },
  { type: 'assistant', message: { id: 'm3', usage: { output_tokens: 7 } } },
];

test('turnsFromTranscript counts each message once, at its largest usage, per prompt', () => {
  const turns = turnsFromTranscript(transcript);
  assert.equal(turns.get('p1').outputTokens, 65);
  assert.equal(turns.get('p2').outputTokens, 7);
});

test('turnsFromTranscript takes the excerpt from the real prompt, collapsed and truncated', () => {
  const turns = turnsFromTranscript(transcript);
  assert.equal(turns.get('p1').excerpt, 'Fix the typo');
  assert.equal(turns.get('p2').excerpt.length, 100);
  assert.ok(turns.get('p2').excerpt.endsWith('…'));
});

test('median handles odd, even and empty input', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 3);
  assert.equal(median([]), 0);
});

test('summarize merges repeated Stop records, groups tiers and flags outliers', () => {
  const rec = (prompt_id, effort, requested, took_effect) => ({ ts: '2026-09-30T00:00:00Z', prompt_id, transcript_path: '/t', effort, requested, took_effect });
  const records = [
    rec('a', 'medium', null, null),
    rec('b', 'medium', null, null),
    rec('c', 'medium', null, null),
    rec('d', 'max', 'max', true),
    rec('d', 'max', 'max', true), // second Stop for the same prompt
    rec('e', 'high', 'max', false),
    rec('lost', 'medium', null, null),
  ];
  const tokens = { a: 1000, b: 1200, c: 40_000, d: 500, e: 9000 };
  const loadTurns = () => new Map(Object.entries(tokens).map(([k, v]) => [k, { outputTokens: v, excerpt: k }]));
  const s = summarize(records, loadTurns);

  assert.equal(s.promptCount, 6);
  assert.equal(s.analyzed, 5);
  assert.equal(s.missingTranscripts, 1);
  assert.equal(s.escalated, 2);
  assert.deepEqual(s.groups.map((g) => [g.label, g.turns]), [['baseline medium', 3], ['escalated → max', 2]]);
  assert.deepEqual(s.underEscalated.map((t) => t.prompt_id), ['c']);
  assert.deepEqual(s.overEscalated.map((t) => t.prompt_id), ['d']);
  assert.deepEqual(s.failed.map((t) => t.prompt_id), ['e']);
});

test('summarize loads each transcript once and survives a missing one', () => {
  let loads = 0;
  const s = summarize(
    [
      { ts: 'T', prompt_id: 'a', transcript_path: '/gone', effort: 'medium', requested: null },
      { ts: 'T', prompt_id: 'b', transcript_path: '/gone', effort: 'medium', requested: null },
    ],
    () => {
      loads += 1;
      return null;
    },
  );
  assert.equal(loads, 1);
  assert.equal(s.missingTranscripts, 2);
});

test('subagentRecord logs real agents and skips Claude Code internal ones', () => {
  const rec = subagentRecord({ session_id: 's', prompt_id: 'p', agent_type: 'compute-ladder:low-worker', agent_transcript_path: '/a.jsonl' }, 'T');
  assert.deepEqual(rec, { ts: 'T', session_id: 's', prompt_id: 'p', agent_type: 'compute-ladder:low-worker', agent_transcript_path: '/a.jsonl' });
  assert.equal(subagentRecord({ session_id: 's', agent_type: '' }, 'T'), null);
});

test('usageFromTranscript counts messages once and lists real models and effort levels only', () => {
  const u = usageFromTranscript([
    { type: 'assistant', effort: 'medium', message: { id: 'm1', model: 'claude-sonnet-5-5', usage: { output_tokens: 5 } } },
    { type: 'assistant', effort: 'low', message: { id: 'm1', model: 'claude-sonnet-5-5', usage: { output_tokens: 9 } } },
    { type: 'assistant', effort: 'bogus', message: { id: 'm2', model: '<synthetic>', usage: { output_tokens: 1 } } },
    { type: 'user', effort: 'max', message: { content: 'x' } },
  ]);
  assert.deepEqual(u, { outputTokens: 10, models: ['claude-sonnet-5-5'], efforts: ['low', 'medium'] });
});

test('summarizeDelegation groups by agent, measures what it can and counts the rest', () => {
  const rows = summarizeDelegation(
    [
      { agent_type: 'compute-ladder:low-worker', agent_transcript_path: '/w1' },
      { agent_type: 'compute-ladder:low-worker', agent_transcript_path: '/w2' },
      { agent_type: 'Explore', agent_transcript_path: '/gone' },
    ],
    (p) =>
      ({
        '/w1': { outputTokens: 100, models: ['claude-sonnet-5-5'], efforts: ['low'] },
        '/w2': { outputTokens: 300, models: ['claude-sonnet-5-5'], efforts: ['xhigh', 'low'] },
      })[p] ?? null,
  );
  assert.deepEqual(rows, [
    { agentType: 'compute-ladder:low-worker', runs: 2, missing: 0, models: ['claude-sonnet-5-5'], efforts: ['low', 'xhigh'], meanOutput: 200 },
    { agentType: 'Explore', runs: 1, missing: 1, models: [], efforts: [], meanOutput: 0 },
  ]);
});

test('typedEscalation recognises a typed escalation skill, namespaced or bare', () => {
  assert.equal(typedEscalation('/compute-ladder:escalate-max review this'), 'max');
  assert.equal(typedEscalation('  /compute-ladder:escalate-xhigh'), 'xhigh');
  assert.equal(typedEscalation('/escalate-max fix it'), 'max');
});

test('typedEscalation ignores mentions, other plugins and near-misses', () => {
  assert.equal(typedEscalation('please use /compute-ladder:escalate-max'), null);
  assert.equal(typedEscalation('/other:escalate-max'), null);
  assert.equal(typedEscalation('/compute-ladder:escalate-maximum'), null);
  assert.equal(typedEscalation('/compute-ladder:report'), null);
  assert.equal(typedEscalation(undefined), null);
});
