/**
 * L1: G-CLASS + G-PERM integration — SOC2 fixture manifest, performance.
 *
 * 2 integration tests:
 * 1. Full G-CLASS + G-PERM analysis on SOC2 fixture manifest
 * 2. 50+ tools classified within 200ms budget
 */

import { describe, it, expect } from 'vitest';
import {
  classifyManifest,
  type ClassificationResult,
} from '../../../src/governance/rules/g-class.js';
import type { CapabilityManifest, ToolCapability } from '../../../src/ir/capability-manifest.js';

function makeTool(name: string, desc: string, classification: string, obo = false): ToolCapability {
  return {
    name,
    description: desc,
    riskLevel: 'low',
    oboFlag: obo,
    classification: classification as ToolCapability['classification'],
  };
}

/**
 * SOC2 fixture: a realistic enterprise manifest with diverse tools.
 */
function soc2Fixture(): {
  manifest: CapabilityManifest;
  capabilityMap: Record<string, string[]>;
} {
  const tools: ToolCapability[] = [
    makeTool('Read', 'Read a file from the local filesystem', 'filesystem'),
    makeTool('Write', 'Write a file to the local filesystem', 'filesystem'),
    makeTool('Bash', 'Execute shell commands', 'execution'),
    makeTool('calculator', 'Perform arithmetic', 'data'),
    makeTool('web-search', 'Search the web for information', 'network'),
    makeTool('email-sender', 'Send email on behalf of the user', 'communication', true),
    makeTool('slack-post', 'Post message to Slack as user', 'communication', true),
    makeTool('db-query', 'Run SQL queries against production database', 'data'),
    makeTool('deploy', 'Deploy to production environment', 'execution'),
    makeTool('git-push', 'Push to remote repository', 'network'),
    makeTool('approval-gate', 'Request human approval', 'custom'),
    makeTool('secret-reader', 'Read secrets from vault', 'data'),
  ];

  const capabilityMap: Record<string, string[]> = {
    'Read': ['READ'],
    'Write': ['WRITE'],
    'Bash': ['EXECUTE'],
    'calculator': ['READ'],
    'web-search': ['READ', 'COMMUNICATE'],
    'email-sender': ['COMMUNICATE', 'TRANSACT'],
    'slack-post': ['COMMUNICATE', 'TRANSACT'],
    'db-query': ['READ', 'WRITE'],
    'deploy': ['EXECUTE', 'WRITE'],
    'git-push': ['WRITE', 'COMMUNICATE'],
    'approval-gate': ['READ'],
    'secret-reader': ['READ'],
  };

  return {
    manifest: { tools, skills: [], agents: [], workflows: [] },
    capabilityMap,
  };
}

describe('G-CLASS + G-PERM SOC2 integration', () => {
  it('full analysis on SOC2 fixture manifest', () => {
    const { manifest, capabilityMap } = soc2Fixture();
    const results = classifyManifest(manifest, capabilityMap);

    expect(results).toHaveLength(12);

    // R5 tools: OBO actions
    const r5Tools = results.filter((r) => r.riskLevel === 5);
    expect(r5Tools.length).toBeGreaterThanOrEqual(2);
    expect(r5Tools.every((r) => r.oboDetected)).toBe(true);

    // R1 tools: read-only
    const r1Tools = results.filter((r) => r.riskLevel === 1);
    expect(r1Tools.length).toBeGreaterThanOrEqual(1);

    // Every result has a toolName
    expect(results.every((r) => r.toolName.length > 0)).toBe(true);
  });

  it('50+ tools classified within 200ms budget', () => {
    // Generate 60 tools
    const tools: ToolCapability[] = [];
    const capabilityMap: Record<string, string[]> = {};

    for (let i = 0; i < 60; i++) {
      const name = `tool-${String(i).padStart(3, '0')}`;
      const isObo = i % 15 === 0;
      tools.push(makeTool(name, `Description for ${name}`, 'custom', isObo));
      capabilityMap[name] = i % 5 === 0
        ? ['TRANSACT']
        : i % 3 === 0
          ? ['EXECUTE']
          : i % 2 === 0
            ? ['WRITE']
            : ['READ'];
    }

    const manifest: CapabilityManifest = {
      tools,
      skills: [],
      agents: [],
      workflows: [],
    };

    const start = performance.now();
    const results = classifyManifest(manifest, capabilityMap);
    const elapsed = performance.now() - start;

    expect(results).toHaveLength(60);
    expect(elapsed).toBeLessThan(200);
  });
});
