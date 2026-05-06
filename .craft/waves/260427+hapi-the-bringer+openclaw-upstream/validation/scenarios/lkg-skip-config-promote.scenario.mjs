/**
 * lkg-skip-config-promote — exposes F-021: workspace.json `lkg.skipPaths`
 * is honored by `cage status` but IGNORED by `cage promote`. Promote
 * captures EVERY canonical artifact regardless of the operator's skip
 * config, including high-churn paths like sessions/*.
 *
 * F-021 (open: substrate fix): symmetry needs PromoteAllOptions to take
 * a path filter. Non-trivial because of label-cohort atomicity. Tracked
 * for upstream review; this scenario locks the current asymmetric
 * behavior so future fixes don't regress.
 */
export const slug = 'lkg-skip-config-promote';
export const description = 'F-021: cage promote ignores lkg.skipPaths (status honors it)';

const SESSION_LOG = `{"event":"start","ts":"2026-05-05T10:00:00Z"}
{"event":"end","ts":"2026-05-05T10:00:01Z"}
`;

export const setup = {
  files: {
    'AGENTS.md': `# Agent\n## Boundaries\n- none\n`,
    'gateway.jsonc': `{ "version": "0.1.0" }\n`,
    'sessions/session-abc.jsonl': SESSION_LOG,
    'workspace.json': `{
  "lkg": { "skipPaths": ["sessions/*"] }
}
`,
  },
};

export const steps = [
  {
    name: 'promote with skipPaths sessions/* set',
    run: ['cage', 'promote', '.'],
    expect: { exitCode: 0, ok: true },
  },
  {
    // Surfaces F-021: promote ignores lkg.skipPaths and writes a
    // companion for sessions/* even though the operator asked to skip.
    // When F-021 is fixed, flip this to {exists: false}.
    name: 'F-021: session log WAS promoted despite lkg.skipPaths (asymmetry vs status)',
    file: { 'sessions/session-abc.jsonl.lkg': { exists: true } },
  },
  {
    name: 'gateway.jsonc WAS promoted (not in skip)',
    file: { 'gateway.jsonc.lkg': { exists: true } },
  },
  {
    name: 'status reports the session log as skipped (not orphan, not observed)',
    run: ['cage', 'status', '.'],
    expect: {
      exitCode: 0,
      parsed: { 'skippedByConfig': { atLeast: 1 } },
    },
  },
];
