// Filesystem and process plumbing shared by the hooks. Kept apart from lib.mjs so the logic stays pure.

import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function readInput() {
  return JSON.parse(readFileSync(0, 'utf8'));
}

/** The plugin's persistent data directory. Fails loudly rather than guessing a fallback path. */
export function dataDir() {
  const dir = process.env.CLAUDE_PLUGIN_DATA;
  if (!dir) throw new Error('CLAUDE_PLUGIN_DATA is not set');
  mkdirSync(join(dir, 'sessions'), { recursive: true });
  return dir;
}

/** Session ids become file names, so anything outside a strict charset is rejected. */
function statePath(dir, sessionId) {
  if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) {
    throw new Error(`unexpected session_id: ${JSON.stringify(sessionId)}`);
  }
  return join(dir, 'sessions', `${sessionId}.json`);
}

export function loadState(dir, sessionId) {
  try {
    return JSON.parse(readFileSync(statePath(dir, sessionId), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return { requests: {}, baselineWarned: false };
    throw err;
  }
}

export function saveState(dir, sessionId, state) {
  const path = statePath(dir, sessionId);
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(state));
  renameSync(tmp, path);
}

export function appendRecord(dir, record, file = 'turns.jsonl') {
  appendFileSync(join(dir, file), `${JSON.stringify(record)}\n`);
}

export function emit(output) {
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

/**
 * Run a hook body. A failure is reported to the user as a systemMessage instead of crashing the
 * hook, so a broken install is visible without blocking the session.
 */
export function runHook(name, body) {
  try {
    body();
  } catch (err) {
    emit({ systemMessage: `compute-ladder: ${name} hook failed: ${err.message}` });
  }
}
