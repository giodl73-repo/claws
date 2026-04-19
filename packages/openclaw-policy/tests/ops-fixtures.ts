/**
 * Shared fixtures for ops-half tests.
 */

import type { PolicyIR } from '../src/types/index.js';

export const MINIMAL_IR: PolicyIR = {
  version: '1.0.0',
  policyId: 'sha256-fixture',
  canonicalizerVersion: 'canon-1',
  soul: {
    denyRules: [
      { id: 'deny-exfil', pattern: '^send-secret', reason: 'exfiltration', severity: 'block' },
    ],
    modelAllowlist: ['gpt-5', 'claude-5'],
    tone: 'professional',
  },
  user: {
    oboScope: ['calendar.read'],
    authorityBounds: [{ scope: '/workspace', grants: ['read', 'write'] }],
  },
  agents: {
    delegationMap: { main: ['sub-a'] },
    architectureBoundaries: [{ from: 'main', to: 'sub-a', kind: 'delegation' }],
  },
  tools: [
    { name: 'read-file', riskLevel: 1, capabilities: ['READ'] },
    {
      name: 'send-email',
      riskLevel: 5,
      capabilities: ['COMMUNICATE', 'IRREVERSIBLE_EXTERNAL'],
      argsFrom: { to: ['user_prompt'], body: [{ tool_output: 'draft' }] },
    },
    { name: 'delete-db', riskLevel: 5, capabilities: ['WRITE'] /* missing IRREVERSIBLE_EXTERNAL */ },
  ],
  skills: [
    { path: 'skills/a', riskLevel: 2, sensitivity: 'INTERNAL', declaredCapabilities: ['READ'] },
  ],
  governance: {
    rules: [{ id: 'R5-send-email', family: 'G-OUTPUT', predicate: 'requires-approval', level: 'error' }],
    sensitivityPropagation: [{ from: 'user_prompt', to: 'tool_output', sensitivity: 'INTERNAL' }],
    governanceSurface: ['AGENTS.md'],
  },
  identity: { name: 'fixture-agent' },
};

export const EMPTY_IR: PolicyIR = {
  version: '1.0.0',
  policyId: 'sha256-empty',
  canonicalizerVersion: 'canon-1',
  soul: { denyRules: [], modelAllowlist: [], tone: '' },
  user: { oboScope: [], authorityBounds: [] },
  agents: { delegationMap: {}, architectureBoundaries: [] },
  tools: [],
  skills: [],
  governance: { rules: [], sensitivityPropagation: [], governanceSurface: [] },
  identity: { name: 'empty' },
};
