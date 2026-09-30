// UserPromptSubmit: records an escalation the user typed as a slash command, so the Stop hook and the report treat
// it like one Claude invoked. Prints nothing on success: this hook's stdout would be added to Claude's context.

import { dataDir, loadState, readInput, runHook, saveState } from './io.mjs';
import { typedEscalation } from './lib.mjs';

runHook('prompt-submit', () => {
  const input = readInput();
  const target = typedEscalation(input.prompt);
  if (target === null || !input.prompt_id) return;

  const dir = dataDir();
  const state = loadState(dir, input.session_id);
  saveState(dir, input.session_id, { ...state, requests: { ...state.requests, [input.prompt_id]: target } });
});
