import type { PolicyIR, ToolSpec } from '../../src/types/index.js';
import { finalizeIR } from '../../src/generator.js';

export function waffles(overrides: Partial<PolicyIR> = {}): PolicyIR {
  const tools: ToolSpec[] = [
    {
      name: 'post-to-channel',
      riskLevel: 5,
      capabilities: ['COMMUNICATE', 'IRREVERSIBLE_EXTERNAL'],
      argsFrom: {
        message: ['user_prompt', { tool_output: 'draft-reply', optional: true }],
        channel: ['user_prompt'],
      },
    },
    { name: 'draft-reply', riskLevel: 1, capabilities: ['READ'] },
    { name: 'vibe-check', riskLevel: 0, capabilities: [] },
  ];
  const draft = {
    soul: {
      denyRules: [
        {
          id: 'SOUL-1',
          pattern: '*public*',
          reason: 'Never post publicly without asking first',
          severity: 'review' as const,
        },
      ],
      modelAllowlist: ['claude-opus-4-7'],
      tone: 'friendly',
    },
    user: { oboScope: ['team:waffles'], authorityBounds: [] },
    agents: { delegationMap: {}, architectureBoundaries: [] },
    tools,
    skills: [],
    governance: {
      rules: [],
      sensitivityPropagation: [],
      governanceSurface: ['SOUL.md', 'USER.md'],
    },
    identity: { name: 'waffles' },
    ...overrides,
  };
  return finalizeIR(draft);
}
