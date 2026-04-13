/**
 * L1: Rule registry cold-start within 200ms ANALYZE budget.
 *
 * 1 integration test:
 * 1. Rule registry cold-start (create + register + evaluate) within 200ms
 */

import { describe, it, expect } from 'vitest';
import { createRegistry } from '../../src/governance/rule-registry.js';
import {
  createGClassRules,
} from '../../src/governance/rules/g-class.js';
import { createGPermRules } from '../../src/governance/rules/g-perm.js';
import type { CapabilityManifest, ToolCapability } from '../../src/ir/capability-manifest.js';

describe('Rule registry cold-start', () => {
  it('creates, registers, and evaluates within 200ms', () => {
    const tools: ToolCapability[] = [];
    for (let i = 0; i < 50; i++) {
      tools.push({
        name: `tool-${i}`,
        description: `Tool number ${i}`,
        riskLevel: 'low',
        oboFlag: i % 10 === 0,
        classification: 'custom',
      });
    }

    const manifest: CapabilityManifest = {
      tools,
      skills: [],
      agents: [],
      workflows: [],
    };

    const start = performance.now();

    const registry = createRegistry();
    for (const rule of createGClassRules()) {
      registry.register(rule);
    }
    for (const rule of createGPermRules()) {
      registry.register(rule);
    }
    const results = registry.evaluate(manifest);
    const elapsed = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(200);
  });
});
