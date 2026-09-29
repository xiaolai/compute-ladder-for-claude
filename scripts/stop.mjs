// Stop: logs the finished turn for the effort report, and tells the user when an escalation
// didn't take effect or the session baseline leaves nothing to escalate to.

import { appendRecord, dataDir, emit, loadState, readInput, runHook, saveState } from './io.mjs';
import { stopOutcome } from './lib.mjs';

runHook('stop', () => {
  const input = readInput();
  const dir = dataDir();
  const before = loadState(dir, input.session_id);
  const { record, messages, state } = stopOutcome({ input, state: before, now: new Date().toISOString() });

  appendRecord(dir, record);
  if (state.baselineWarned !== before.baselineWarned) saveState(dir, input.session_id, state);
  if (messages.length > 0) emit({ systemMessage: messages.join('\n') });
});
