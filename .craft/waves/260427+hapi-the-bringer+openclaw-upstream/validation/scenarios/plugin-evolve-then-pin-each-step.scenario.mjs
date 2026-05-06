/**
 * plugin-evolve-then-pin-each-step — operator pins LKG snapshots at
 * each milestone of plugin evolution. Demonstrates the use case of
 * `cage labels` as an audit trail of "this is what worked at this
 * version."
 *
 * Sequence:
 *   1. v0.1: bare AGENTS.md + one tool. Pin label "v0.1".
 *   2. v0.2: add boundaries. Pin "v0.2".
 *   3. v0.3: add a second tool. Pin "v0.3".
 *   4. cage labels reports 3 labels.
 *   5. rollback to v0.1 → bytes restored to original AGENTS.md + 1-tool TOOLS.md.
 */
export const slug = 'plugin-evolve-then-pin-each-step';
export const description = 'pin LKG at each plugin milestone; labels list grows; rollback restores any prior state';

const TOOLS_V01 = `# Tools\n## Tools\n### tool-a # R1, READ\nFirst tool.\n`;
const TOOLS_V03 = `# Tools\n## Tools\n### tool-a # R1, READ\nFirst tool.\n\n### tool-b # R2, COMMUNICATE\nSecond tool.\n`;
const AGENTS_V01 = `# Agent\n`;
const AGENTS_V02 = `# Agent\n\n## Boundaries\n- read-only by default\n`;

export const setup = {
  files: {
    'AGENTS.md': AGENTS_V01,
    'TOOLS.md': TOOLS_V01,
  },
};

export const steps = [
  {
    name: 'pin v0.1 (bare scaffold)',
    run: ['cage', 'promote', '--label', 'v0.1', '.'],
    expect: { exitCode: 0, parsed: { label: 'v0.1' } },
  },
  {
    name: 'evolve to v0.2 — add Boundaries',
    edit: { 'AGENTS.md': { set: AGENTS_V02 } },
  },
  {
    name: 'pin v0.2',
    run: ['cage', 'promote', '--label', 'v0.2', '.'],
    expect: { exitCode: 0, parsed: { label: 'v0.2' } },
  },
  {
    name: 'evolve to v0.3 — add second tool',
    edit: { 'TOOLS.md': { set: TOOLS_V03 } },
  },
  {
    name: 'pin v0.3',
    run: ['cage', 'promote', '--label', 'v0.3', '.'],
    expect: { exitCode: 0, parsed: { label: 'v0.3' } },
  },
  {
    name: 'cage labels reports all three',
    run: ['cage', 'labels', '.'],
    expect: { exitCode: 0, parsed: { 'labelCount': 3 } },
  },
  {
    name: 'rollback to v0.1',
    run: ['cage', 'rollback', '--label', 'v0.1', '.'],
    expect: { exitCode: 0, ok: true },
  },
  {
    name: 'AGENTS.md back to bare scaffold',
    file: { 'AGENTS.md': { equals: AGENTS_V01, notContains: 'Boundaries' } },
  },
  {
    name: 'TOOLS.md back to single tool',
    file: { 'TOOLS.md': { contains: 'tool-a', notContains: 'tool-b' } },
  },
];
