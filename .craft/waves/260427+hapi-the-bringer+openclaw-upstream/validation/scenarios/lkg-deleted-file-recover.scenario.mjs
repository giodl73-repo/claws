/**
 * lkg-deleted-file-recover — confirm two pieces of substrate behavior:
 *
 * (a) `cage status` does NOT recover deleted files. The manifest walker
 *     only sees what's on disk; deleted paths simply drop out of the
 *     observation set. This is by design — status is read-only.
 *
 * (b) `cage rollback --label <name>` DOES restore a deleted file from the
 *     pinned label. This is the operator-explicit recovery path.
 *
 * Logged as a finding (F-019) — operators may expect status to detect
 * the missing file and either flag it or recover it. Currently it does
 * neither; the file just vanishes silently from the report.
 */
export const slug = 'lkg-deleted-file-recover';
export const description = 'status ignores deleted files; rollback restores them';

const BASELINE = `{
  "version": "0.1.0",
  "plugins": { "entries": { "p": { "endpoint": "https://example.com" } } }
}
`;

export const setup = {
  files: {
    'AGENTS.md': `# Agent\n## Boundaries\n- none\n`,
    'gateway.jsonc': BASELINE,
  },
};

export const steps = [
  {
    name: 'promote captures baseline with label v1',
    run: ['cage', 'promote', '--label', 'v1', '.'],
    expect: { exitCode: 0, ok: true },
  },
  {
    name: 'delete gateway.jsonc',
    edit: { 'gateway.jsonc': { delete: true } },
  },
  {
    name: 'status does NOT recover (file missing from manifest walk)',
    run: ['cage', 'status', '.'],
    expect: {
      exitCode: 0,
      parsed: { 'byOutcome.recovered': 0 },
    },
  },
  {
    name: 'rollback restores deleted file from label v1',
    run: ['cage', 'rollback', '--label', 'v1', '.'],
    expect: { exitCode: 0, ok: true },
  },
  {
    name: 'gateway.jsonc back on disk with baseline content',
    file: { 'gateway.jsonc': { exists: true, contains: '"version": "0.1.0"' } },
  },
];
