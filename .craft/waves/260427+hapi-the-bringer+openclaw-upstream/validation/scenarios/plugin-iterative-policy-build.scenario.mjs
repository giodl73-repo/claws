/**
 * plugin-iterative-policy-build — operator builds policy.jsonc
 * incrementally as TOOLS.md grows. Verifies the policy substrate's
 * generate → check → drift detection → regenerate loop.
 *
 * Workflow:
 *   1. TOOLS.md with one tool. Generate policy.jsonc.
 *   2. Check policy.jsonc against TOOLS.md → in sync.
 *   3. Add a second tool to TOOLS.md without regenerating.
 *   4. Check policy.jsonc → DRIFT detected.
 *   5. Regenerate policy.jsonc.
 *   6. Check → in sync again.
 */
export const slug = 'plugin-iterative-policy-build';
export const description = 'TOOLS.md grows; policy generate/check loop catches drift';

const TOOLS_V1 = `# Tools

## Tools

### get-info # R1, READ
Reads workspace metadata.
`;
const TOOLS_V2 = `# Tools

## Tools

### get-info # R1, READ
Reads workspace metadata.

### post-message # R3, COMMUNICATE, sensitivity:internal
Sends a message to a configured channel.
`;

export const setup = {
  files: {
    'AGENTS.md': `# Agent\n## Boundaries\n- read-only by default\n`,
    'TOOLS.md': TOOLS_V1,
  },
};

export const steps = [
  {
    name: 'generate policy.jsonc from TOOLS.md (v1)',
    run: ['policy', 'generate', '.', '--out', 'policy.jsonc'],
    expect: { exitCode: 0, parsed: { 'tools': 1 } },
  },
  {
    name: 'policy check passes — generated state matches TOOLS.md',
    run: ['policy', 'check', '.'],
    expect: {
      exitCode: 0,
      parsed: { 'drift.drifted': false },
    },
  },
  {
    name: 'operator adds a second tool to TOOLS.md (forgets to regenerate)',
    edit: { 'TOOLS.md': { set: TOOLS_V2 } },
  },
  {
    name: 'policy check now reports DRIFT',
    run: ['policy', 'check', '.'],
    expect: {
      exitCode: 1, // drift exits non-zero
      parsed: { 'drift.drifted': true },
    },
  },
  {
    name: 'operator regenerates policy.jsonc',
    run: ['policy', 'generate', '.', '--out', 'policy.jsonc'],
    expect: { exitCode: 0, parsed: { 'tools': 2 } },
  },
  {
    name: 'policy check back in sync',
    run: ['policy', 'check', '.'],
    expect: { exitCode: 0, parsed: { 'drift.drifted': false } },
  },
];
