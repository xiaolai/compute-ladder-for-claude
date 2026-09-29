// End-to-end tests for the hook scripts: real processes, real stdin, a temporary data directory.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const here = import.meta.dirname;

function run(script, input, env = {}) {
  const { CLAUDE_CODE_EFFORT_LEVEL, ...base } = process.env;
  const res = spawnSync('node', [join(here, script)], { input: JSON.stringify(input), env: { ...base, ...env }, encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  return res.stdout.trim() ? JSON.parse(res.stdout) : null;
}

const skillCall = (skill, level, promptId = 'p1') => ({
  session_id: 's1',
  prompt_id: promptId,
  hook_event_name: 'PreToolUse',
  tool_name: 'Skill',
  tool_input: { skill },
  effort: { level },
});

test('guard ignores skills that are not escalations', () => {
  const data = mkdtempSync(join(tmpdir(), 'el-'));
  assert.equal(run('guard.mjs', skillCall('other:thing', 'medium'), { CLAUDE_PLUGIN_DATA: data }), null);
});

test('guard allows a real escalation and the Stop hook confirms it took effect', () => {
  const data = mkdtempSync(join(tmpdir(), 'el-'));
  assert.equal(run('guard.mjs', skillCall('compute-ladder:escalate-max', 'medium'), { CLAUDE_PLUGIN_DATA: data }), null);
  const out = run('stop.mjs', { session_id: 's1', prompt_id: 'p1', transcript_path: '/t', effort: { level: 'max' } }, { CLAUDE_PLUGIN_DATA: data });
  assert.equal(out, null);
  const [record] = readFileSync(join(data, 'turns.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(record.requested, 'max');
  assert.equal(record.took_effect, true);
});

test('guard denies a downgrade with a reason Claude sees', () => {
  const data = mkdtempSync(join(tmpdir(), 'el-'));
  const out = run('guard.mjs', skillCall('compute-ladder:escalate-xhigh', 'max'), { CLAUDE_PLUGIN_DATA: data });
  assert.equal(out.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /already max/);
  assert.equal(existsSync(join(data, 'sessions', 's1.json')), false);
});

test('guard denies when CLAUDE_CODE_EFFORT_LEVEL pins effort, and tells the user', () => {
  const data = mkdtempSync(join(tmpdir(), 'el-'));
  const out = run('guard.mjs', skillCall('compute-ladder:escalate-max', 'low'), { CLAUDE_PLUGIN_DATA: data, CLAUDE_CODE_EFFORT_LEVEL: 'low' });
  assert.equal(out.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(out.systemMessage, /pins effort/);
});

test('stop reports a capped escalation to the user', () => {
  const data = mkdtempSync(join(tmpdir(), 'el-'));
  run('guard.mjs', skillCall('compute-ladder:escalate-max', 'medium'), { CLAUDE_PLUGIN_DATA: data });
  const out = run('stop.mjs', { session_id: 's1', prompt_id: 'p1', effort: { level: 'high' } }, { CLAUDE_PLUGIN_DATA: data });
  assert.match(out.systemMessage, /did not take effect/);
});

test('a missing data directory is reported, not swallowed', () => {
  const out = run('stop.mjs', { session_id: 's1', prompt_id: 'p1', effort: { level: 'medium' } }, { CLAUDE_PLUGIN_DATA: '' });
  assert.match(out.systemMessage, /stop hook failed: CLAUDE_PLUGIN_DATA is not set/);
});

test('a hostile session id cannot escape the data directory', () => {
  const data = mkdtempSync(join(tmpdir(), 'el-'));
  const out = run('stop.mjs', { session_id: '../../evil', prompt_id: 'p1', effort: { level: 'medium' } }, { CLAUDE_PLUGIN_DATA: data });
  assert.match(out.systemMessage, /unexpected session_id/);
});

test('report runs against a real log and transcript', () => {
  const data = mkdtempSync(join(tmpdir(), 'el-'));
  const transcript = join(data, 't.jsonl');
  spawnSync('sh', ['-c', `printf '%s\\n' '{"type":"user","promptId":"p1","message":{"content":"hello"}}' '{"type":"assistant","message":{"id":"m1","usage":{"output_tokens":42}}}' > "${transcript}"`]);
  run('stop.mjs', { session_id: 's1', prompt_id: 'p1', transcript_path: transcript, effort: { level: 'medium' } }, { CLAUDE_PLUGIN_DATA: data });
  const res = spawnSync('node', [join(here, 'report.mjs'), data], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /1 turn\(s\) analyzed, 0 escalated/);
  assert.match(res.stdout, /\| baseline medium \| 1 \| 42 \| 42 \|/);
});

test('subagent-stop logs real agents, skips internal ones, and the report shows delegation', () => {
  const data = mkdtempSync(join(tmpdir(), 'el-'));
  const agentTranscript = join(data, 'agent.jsonl');
  writeFileSync(agentTranscript, `${JSON.stringify({ type: 'assistant', message: { id: 'm1', model: 'claude-sonnet-5-5', usage: { output_tokens: 77 } } })}\n`);
  assert.equal(run('subagent-stop.mjs', { session_id: 's1', prompt_id: 'p1', agent_type: 'compute-ladder:low-worker', agent_transcript_path: agentTranscript }, { CLAUDE_PLUGIN_DATA: data }), null);
  assert.equal(run('subagent-stop.mjs', { session_id: 's1', agent_type: '' }, { CLAUDE_PLUGIN_DATA: data }), null);
  const lines = readFileSync(join(data, 'subagents.jsonl'), 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
  run('stop.mjs', { session_id: 's1', prompt_id: 'p1', transcript_path: '/none', effort: { level: 'medium' } }, { CLAUDE_PLUGIN_DATA: data });
  const res = spawnSync('node', [join(here, 'report.mjs'), data], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /\| compute-ladder:low-worker \| 1 \| claude-sonnet-5-5 \| 77 \|/);
});
