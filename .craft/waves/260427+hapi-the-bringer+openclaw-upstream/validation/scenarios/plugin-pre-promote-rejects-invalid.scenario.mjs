/**
 * plugin-pre-promote-rejects-invalid — operator tries to label-pin a
 * cohort BEFORE fixing pinch findings. promoteAll's all-or-nothing
 * semantic should refuse to label if any tracker is invalid (not "OK
 * but unlabeled" — actually atomic).
 *
 * Sequence:
 *   1. AGENTS.md valid + gateway.jsonc with broken syntax
 *   2. promote --label v1 → fails: gateway.jsonc invalid, no label pinned
 *   3. fix gateway.jsonc
 *   4. promote --label v1 → succeeds, all trackers pinned together
 */
export const slug = 'plugin-pre-promote-rejects-invalid';
export const description = 'promote --label is atomic — all-or-nothing across the cohort';

export const setup = {
  files: {
    'AGENTS.md': `# Agent\n## Boundaries\n- none\n`,
    'gateway.jsonc': `{ "this is not": valid json [`,
  },
};

export const steps = [
  {
    name: 'promote --label v1 fails on broken gateway.jsonc',
    run: ['cage', 'promote', '--label', 'v1', '.'],
    // exit 1 because at least one tracker invalid; label NOT pinned
    expect: { exitCode: 1 },
  },
  {
    name: 'no label was pinned (atomicity)',
    run: ['cage', 'labels', '.'],
    expect: { exitCode: 0, parsed: { 'labelCount': 0 } },
  },
  {
    name: 'operator fixes gateway.jsonc',
    edit: {
      'gateway.jsonc': {
        set: `{ "version": "0.1.0", "plugins": { "entries": {} } }\n`,
      },
    },
  },
  {
    name: 'promote --label v1 now succeeds',
    run: ['cage', 'promote', '--label', 'v1', '.'],
    expect: { exitCode: 0, ok: true, parsed: { label: 'v1' } },
  },
  {
    name: 'cage labels reflects the pin',
    run: ['cage', 'labels', '.'],
    expect: { exitCode: 0, parsed: { 'labelCount': 1 } },
  },
];
