// SubagentStop: logs each finished subagent so the report can show which agents ran and on which models.

import { appendRecord, dataDir, readInput, runHook } from './io.mjs';
import { subagentRecord } from './lib.mjs';

runHook('subagent-stop', () => {
  const record = subagentRecord(readInput(), new Date().toISOString());
  if (record) appendRecord(dataDir(), record, 'subagents.jsonl');
});
