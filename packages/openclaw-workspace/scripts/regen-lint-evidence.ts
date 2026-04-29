#!/usr/bin/env node
/**
 * regen-lint-evidence — re-pull `openclaw/openclaw` issue counts via the
 * `gh` CLI and print a per-class summary.
 *
 * **Advisory script, not a CI gate.** Run optionally before pushing PR-1
 * so the author can decide whether the cited numbers in `EVIDENCE.md` +
 * PR description need a manual refresh. The script does not write files
 * and does not fail anything; it just prints counts to stdout for the
 * human to read.
 *
 * Rationale: openclaw's issue tracker churns fast enough (~100 open
 * config-titled at last pull) that any "fail on drift" threshold would
 * be arbitrary. The author reading the diff before push is the right
 * gate.
 *
 * Usage:
 *   node scripts/regen-lint-evidence.ts
 *
 * Requires: `gh` CLI authenticated against github.com.
 */

import { execFileSync } from 'node:child_process';

interface IssueRecord {
  readonly number: number;
  readonly title: string;
  readonly state: 'OPEN' | 'CLOSED';
}

const SEARCHES: ReadonlyArray<{ label: string; query: string }> = [
  { label: 'unrecognized-key', query: 'is:issue Unrecognized key in:title,body' },
  { label: 'redacted-placeholder', query: 'is:issue OPENCLAW_REDACTED in:title,body' },
  { label: 'plugin-id-collision', query: 'is:issue duplicate plugin id in:title,body' },
  { label: 'trailing-comma', query: 'is:issue trailing comma JSON5 in:title,body' },
  { label: 'config-secret-ref', query: 'is:issue secret_token_in_config in:title,body' },
];

function ghIssueSearch(query: string): IssueRecord[] {
  const out = execFileSync(
    'gh',
    [
      'issue',
      'list',
      '--repo',
      'openclaw/openclaw',
      '--search',
      query,
      '--state',
      'all',
      '--limit',
      '100',
      '--json',
      'number,title,state',
    ],
    { encoding: 'utf8' },
  );
  return JSON.parse(out) as IssueRecord[];
}

function main(): void {
  const aggregate: Record<string, IssueRecord[]> = {};
  for (const search of SEARCHES) {
    aggregate[search.label] = ghIssueSearch(search.query);
  }
  console.log(`# openclaw/openclaw issue counts (live pull)`);
  console.log(`# Compare these to tests/lint/fixtures/EVIDENCE.md before pushing PR-1.`);
  console.log(`# Manual update required if drift is meaningful.`);
  console.log('');
  for (const [label, records] of Object.entries(aggregate)) {
    const open = records.filter((r) => r.state === 'OPEN').length;
    const closed = records.filter((r) => r.state === 'CLOSED').length;
    console.log(`${label}: ${open} open, ${closed} closed`);
  }
}

main();
