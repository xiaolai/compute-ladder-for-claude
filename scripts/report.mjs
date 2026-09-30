// Effort report: node report.mjs <data-dir> [--days N]
// Joins the Stop hook's usage log with the session transcripts, which are complete by the time
// this runs, and prints a markdown summary.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OVER_MAX_TOKENS, summarize, summarizeDelegation, turnsFromTranscript, usageFromTranscript } from './lib.mjs';

function parseArgs(argv) {
  const [dir, ...rest] = argv;
  if (!dir) throw new Error('usage: report.mjs <data-dir> [--days N]');
  let days = null;
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === '--days') {
      days = Number(rest[(i += 1)]);
      if (!Number.isFinite(days) || days <= 0) throw new Error('--days needs a positive number');
    } else {
      throw new Error(`unknown argument: ${rest[i]}`);
    }
  }
  return { dir, days };
}

function readJsonl(path) {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function loadTurns(path) {
  return existsSync(path) ? turnsFromTranscript(readJsonl(path)) : null;
}

function loadUsage(path) {
  return existsSync(path) ? usageFromTranscript(readJsonl(path)) : null;
}

function renderDelegation(rows) {
  const out = ['', '## Delegation', ''];
  if (rows.length === 0) {
    out.push('No subagent runs logged.');
    return out;
  }
  out.push('| Agent | Runs | Models | Effort | Mean output tokens |', '|---|---:|---|---|---:|');
  for (const r of rows) {
    out.push(`| ${r.agentType} | ${r.runs} | ${r.models.join(', ') || 'unknown'} | ${r.efforts.join(', ') || 'none'} | ${r.meanOutput.toLocaleString('en-US')} |`);
  }
  const missing = rows.reduce((n, r) => n + r.missing, 0);
  if (missing > 0) out.push('', `${missing} subagent run(s) without a readable transcript are counted but not measured.`);
  return out;
}

function render(s, delegation, days) {
  const scope = days ? `last ${days} day(s)` : 'all recorded turns';
  const out = [`# compute-ladder report (${scope})`, ''];
  out.push(`${s.analyzed} turn(s) analyzed, ${s.escalated} escalated (${pct(s.escalated, s.analyzed)}).`);
  if (s.missingTranscripts > 0) out.push(`${s.missingTranscripts} turn(s) skipped: transcript missing or turn not found in it.`);
  out.push('', '| Tier | Turns | Mean output tokens | Median |', '|---|---:|---:|---:|');
  for (const g of s.groups) out.push(`| ${g.label} | ${g.turns} | ${g.mean.toLocaleString('en-US')} | ${g.median.toLocaleString('en-US')} |`);

  section(out, 'Escalations that did not take effect', s.failed, (t) => `requested ${t.requested}, ran at ${t.effort}`);
  section(
    out,
    `Possibly under-escalated (baseline turns ≥ ${s.underThreshold.toLocaleString('en-US')} output tokens)`,
    s.underEscalated.slice(0, 10),
    (t) => `${t.outputTokens.toLocaleString('en-US')} tokens at ${t.effort}`,
  );
  section(
    out,
    `Possibly over-escalated (escalated turns < ${OVER_MAX_TOKENS.toLocaleString('en-US')} output tokens)`,
    s.overEscalated.slice(0, 10),
    (t) => `${t.outputTokens.toLocaleString('en-US')} tokens at ${t.effort}`,
  );
  out.push(...renderDelegation(delegation));
  out.push('', 'Flags are token-size heuristics, not verdicts: read the prompt before concluding it was misrouted.');
  return out.join('\n');
}

function section(out, title, turns, detail) {
  out.push('', `## ${title}`, '');
  if (turns.length === 0) {
    out.push('None.');
    return;
  }
  for (const t of turns) out.push(`- ${t.ts.slice(0, 10)} · ${detail(t)} · "${t.excerpt}"`);
}

function pct(n, d) {
  return d === 0 ? '0%' : `${Math.round((100 * n) / d)}%`;
}

const { dir, days } = parseArgs(process.argv.slice(2));
const cutoff = days ? Date.now() - days * 86_400_000 : 0;
const load = (file) => {
  const path = join(dir, file);
  return existsSync(path) ? readJsonl(path).filter((r) => Date.parse(r.ts) >= cutoff) : null;
};
const turns = load('turns.jsonl');
if (turns === null) {
  console.log(`No turns logged yet at ${join(dir, 'turns.jsonl')}. The Stop hook writes one line per finished turn.`);
  process.exit(0);
}
console.log(render(summarize(turns, loadTurns), summarizeDelegation(load('subagents.jsonl') ?? [], loadUsage), days));
