// PreToolUse(Skill): lets an escalation skill run only when it would actually raise effort,
// and records the request so the Stop hook can check that it took effect.

import { dataDir, emit, loadState, readInput, runHook, saveState } from './io.mjs';
import { escalationTarget, guardDecision } from './lib.mjs';

runHook('guard', () => {
  const input = readInput();
  const target = escalationTarget(input.tool_input?.skill);
  if (target === null) return;

  const decision = guardDecision({
    target,
    current: input.effort?.level ?? null,
    pinnedBy: process.env.CLAUDE_CODE_EFFORT_LEVEL || null,
  });

  if (!decision.allow) {
    emit({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: decision.reason,
      },
      ...(decision.userMessage && { systemMessage: decision.userMessage }),
    });
    return;
  }

  const dir = dataDir();
  const state = loadState(dir, input.session_id);
  if (input.prompt_id) {
    saveState(dir, input.session_id, { ...state, requests: { ...state.requests, [input.prompt_id]: target } });
  }
});
