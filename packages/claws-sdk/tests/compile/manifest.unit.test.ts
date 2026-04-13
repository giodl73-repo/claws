/**
 * L0: manifest conversion unit tests.
 *
 * Covers:
 * 1. riskClassToLevel — all 5 risk classes map correctly
 * 2. riskLevelFromClassification — all 4 severity strings
 * 3. buildCapabilityManifest — tools, skills, agents mapped correctly
 */

import { describe, it, expect } from 'vitest';
import {
  riskClassToLevel,
  riskLevelFromClassification,
  buildCapabilityManifest,
} from '../../src/compile/manifest.js';
import type { ParsedManifest } from '../../src/compile/types.js';

describe('riskClassToLevel()', () => {
  it('maps R5 to critical', () => {
    expect(riskClassToLevel(5)).toBe('critical');
  });

  it('maps R6+ to critical', () => {
    expect(riskClassToLevel(6)).toBe('critical');
  });

  it('maps R4 to high', () => {
    expect(riskClassToLevel(4)).toBe('high');
  });

  it('maps R3 to medium', () => {
    expect(riskClassToLevel(3)).toBe('medium');
  });

  it('maps R2 to low', () => {
    expect(riskClassToLevel(2)).toBe('low');
  });

  it('maps R1 to low', () => {
    expect(riskClassToLevel(1)).toBe('low');
  });

  it('maps R0 to low', () => {
    expect(riskClassToLevel(0)).toBe('low');
  });
});

describe('riskLevelFromClassification()', () => {
  it('maps critical to 5', () => {
    expect(riskLevelFromClassification('critical')).toBe(5);
  });

  it('maps high to 4', () => {
    expect(riskLevelFromClassification('high')).toBe(4);
  });

  it('maps medium to 3', () => {
    expect(riskLevelFromClassification('medium')).toBe(3);
  });

  it('maps low to 2', () => {
    expect(riskLevelFromClassification('low')).toBe(2);
  });
});

describe('buildCapabilityManifest()', () => {
  it('converts tools with risk level and oboFlag', () => {
    const manifest: ParsedManifest = {
      tools: [
        { name: 'Bash', normalizedName: 'bash', riskClass: 5, oboFlag: true, capabilities: ['exec'], source: 'TOOLS.md', line: 3, denyConstraints: [] },
        { name: 'Read', normalizedName: 'read', riskClass: 1, oboFlag: false, capabilities: ['read'], source: 'TOOLS.md', line: 8, denyConstraints: [] },
      ],
      skills: [],
      agents: [],
      dataLabels: [],
      diagnostics: [],
    };

    const result = buildCapabilityManifest(manifest);

    expect(result.tools).toHaveLength(2);
    expect(result.tools[0]!.name).toBe('Bash');
    expect(result.tools[0]!.riskLevel).toBe('critical');
    expect(result.tools[0]!.oboFlag).toBe(true);
    expect(result.tools[0]!.classification).toBe('custom');
    expect(result.tools[1]!.name).toBe('Read');
    expect(result.tools[1]!.riskLevel).toBe('low');
    expect(result.tools[1]!.oboFlag).toBe(false);
  });

  it('converts skills with requiredTools and governanceLevel', () => {
    const manifest: ParsedManifest = {
      tools: [],
      skills: [
        { name: 'scan-code', description: 'Scan codebase', requiredTools: ['Read', 'Grep'], source: 'skills/', line: 5 },
      ],
      agents: [],
      dataLabels: [],
      diagnostics: [],
    };

    const result = buildCapabilityManifest(manifest);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]!.name).toBe('scan-code');
    expect(result.skills[0]!.description).toBe('Scan codebase');
    expect(result.skills[0]!.requiredTools).toEqual(['Read', 'Grep']);
    expect(result.skills[0]!.governanceLevel).toBe(1);
  });

  it('converts agents with delegation map entries', () => {
    const manifest: ParsedManifest = {
      tools: [],
      skills: [],
      agents: [
        { name: 'Orchestrator', tools: ['Read'], delegatesTo: ['Worker-A', 'Worker-B'], delegationDepth: 2, source: 'AGENTS.md', line: 3 },
      ],
      dataLabels: [],
      diagnostics: [],
    };

    const result = buildCapabilityManifest(manifest);

    expect(result.agents).toHaveLength(1);
    expect(result.agents[0]!.name).toBe('Orchestrator');
    expect(result.agents[0]!.delegations).toHaveLength(2);
    expect(result.agents[0]!.delegations[0]!.from).toBe('Orchestrator');
    expect(result.agents[0]!.delegations[0]!.to).toBe('Worker-A');
    expect(result.agents[0]!.delegations[1]!.to).toBe('Worker-B');
    expect(result.agents[0]!.maxAutonomousLevel).toBe(3);
  });

  it('returns empty workflows', () => {
    const manifest: ParsedManifest = {
      tools: [],
      skills: [],
      agents: [],
      dataLabels: [],
      diagnostics: [],
    };

    const result = buildCapabilityManifest(manifest);
    expect(result.workflows).toEqual([]);
  });
});
