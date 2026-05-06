/**
 * plugin-bare-then-mature — the "scrappy plugin matures" narrative.
 *
 * A 3rd-party plugin author starts with the smallest possible AGENTS.md
 * (just `# Agent`). pinch flags real coverage gaps, the author addresses
 * each by adding sections to the file. By the end, the lint is clean
 * and the plugin's substrate health story is "operator-driven, not
 * scaffold-driven."
 *
 * This is the canonical "operator follows the rules to grow their
 * plugin" flow — what a new openclaw user looks like in practice.
 */
export const slug = 'plugin-bare-then-mature';
export const description = 'bare AGENTS.md → diagnose → operator iterates → clean run';

export const setup = {
  files: {
    'AGENTS.md': `# Agent\n`,
  },
};

export const steps = [
  {
    name: 'bare AGENTS.md → pinch flags missing-boundaries',
    run: ['pinch', 'run', '.'],
    expect: {
      exitCode: 0, // info severity → exit 0
      parsed: { 'diagnostics[0].ruleId': 'starter-v0/agents/missing-boundaries' },
    },
  },
  {
    name: 'operator adds Boundaries section',
    edit: {
      'AGENTS.md': {
        set: `# Agent

## Boundaries

- read-only access to the workspace
- defer R5 tools to operator approval
`,
      },
    },
  },
  {
    name: 'pinch run clean (no findings)',
    run: ['pinch', 'run', '.'],
    expect: { exitCode: 0, parsed: { 'diagnostics.length': 0, 'rulesRun': { atLeast: 20 } } },
  },
  {
    name: 'operator adds a Tools section heading but no items yet (premature)',
    edit: {
      'AGENTS.md': {
        append: `\n## Tools\n\n(coming soon)\n`,
      },
    },
  },
  {
    name: 'pinch flags empty-tools-section',
    run: ['pinch', 'run', '.'],
    expect: {
      exitCode: 0,
      parsed: { 'diagnostics[0].ruleId': 'starter-v0/agents/empty-tools-section' },
    },
  },
  {
    name: 'operator removes the premature section (delegation pattern)',
    edit: {
      'AGENTS.md': {
        set: `# Agent

## Boundaries

- read-only access to the workspace
- defer R5 tools to operator approval
`,
      },
    },
  },
  {
    name: 'TOOLS.md added separately — canonical declaration lives there',
    edit: {
      'TOOLS.md': {
        set: `# Tools

## Tools

### get-info # R1, READ
Reads workspace metadata.
`,
      },
    },
  },
  {
    name: 'pinch clean — TOOLS.md is independently linted',
    run: ['pinch', 'run', '.'],
    expect: { exitCode: 0, parsed: { 'diagnostics.length': 0 } },
  },
];
