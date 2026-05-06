/**
 * lkg-rollback-no-such-label — rollback to a label that was never promoted.
 *
 * Operator typos a label name (or rolls back too eagerly). Expect a
 * clean LKG_LABEL_NOT_FOUND, not a generic ERR_INTERNAL.
 */
export const slug = 'lkg-rollback-no-such-label';
export const description = 'rollback --label <unknown> emits LKG_LABEL_NOT_FOUND';

export const setup = {
  files: {
    'AGENTS.md': `# Agent\n## Boundaries\n- none\n`,
    'gateway.jsonc': `{ "version": "0.1.0" }\n`,
  },
};

export const steps = [
  {
    name: 'fresh workspace, no promote yet',
    run: ['cage', 'rollback', '--label', 'v1', '.'],
    expect: { exitCode: 1, errCode: 'LKG_LABEL_NOT_FOUND' },
  },
  {
    name: 'promote --label v1',
    run: ['cage', 'promote', '--label', 'v1', '.'],
    expect: { exitCode: 0, ok: true },
  },
  {
    name: 'rollback --label v99 (typo) still fails LKG_LABEL_NOT_FOUND',
    run: ['cage', 'rollback', '--label', 'v99', '.'],
    expect: { exitCode: 1, errCode: 'LKG_LABEL_NOT_FOUND' },
  },
];
