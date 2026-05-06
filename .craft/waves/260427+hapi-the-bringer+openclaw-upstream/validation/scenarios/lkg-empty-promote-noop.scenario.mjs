/**
 * lkg-empty-promote-noop — second promote with identical content is a
 * no-op for the LKG state (no new bytes to write).
 *
 * Verify: status shows outcome 'valid' (not 'promoted') after the second
 * promote, AND a label can still be added even when bytes haven't changed.
 */
export const slug = 'lkg-empty-promote-noop';
export const description = 'idempotent promote — second call with same bytes is valid not promoted';

export const setup = {
  files: {
    'AGENTS.md': `# Agent\n## Boundaries\n- none\n`,
    'gateway.jsonc': `{ "version": "0.1.0" }\n`,
  },
};

export const steps = [
  {
    name: 'first promote (no label)',
    run: ['cage', 'promote', '.'],
    expect: { exitCode: 0, parsed: { 'promoted': { atLeast: 1 } } },
  },
  {
    name: 'second promote with no changes — still ok',
    run: ['cage', 'promote', '.'],
    expect: { exitCode: 0, ok: true },
  },
  {
    name: 'status outcomes are valid (not re-promoted)',
    run: ['cage', 'status', '.'],
    expect: {
      exitCode: 0,
      parsed: {
        'byOutcome.valid': { atLeast: 2 },
        'byOutcome.promoted': 0,
      },
    },
  },
  {
    name: 'add a label without byte changes — should still pin atomically',
    run: ['cage', 'promote', '--label', 'pre-upgrade', '.'],
    expect: { exitCode: 0, ok: true, parsed: { label: 'pre-upgrade' } },
  },
  {
    name: 'rollback to that label restores nothing visibly (bytes unchanged)',
    run: ['cage', 'rollback', '--label', 'pre-upgrade', '.'],
    expect: { exitCode: 0, ok: true },
  },
];
