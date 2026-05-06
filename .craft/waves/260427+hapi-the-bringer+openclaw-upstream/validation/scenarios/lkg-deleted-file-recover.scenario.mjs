/**
 * lkg-deleted-file-recover — confirm two pieces of substrate behavior:
 *
 * (a) `cage status` FLAGS deleted files as ORPHANS. The manifest walker
 *     only sees what's on disk, but cage now diffs the LKG state map
 *     against the walk and reports orphans with their last promoted
 *     fingerprint. Exit code 1 (ok=false) when orphans exist.
 *
 * (b) `cage rollback --label <name>` DOES restore a deleted file from the
 *     pinned label. This is the operator-explicit recovery path.
 *
 * F-019 (open: behavior question) → fixed in substrate/lkg-cage 405198aadc.
 */
export const slug = 'lkg-deleted-file-recover';
export const description = 'status flags deleted file as orphan; rollback restores it';

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
    name: 'status flags deleted gateway.jsonc as orphan (exit 1, ok false)',
    run: ['cage', 'status', '.'],
    expect: {
      exitCode: 1,
      ok: false,
      parsed: {
        'orphanCount': 1,
        'orphans[0].relPath': 'gateway.jsonc',
        'byOutcome.orphan': 1,
        'byOutcome.recovered': 0,
      },
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
