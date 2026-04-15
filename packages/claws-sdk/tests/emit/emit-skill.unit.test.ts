/**
 * L0: SKILL.md emitter — governance advisory prompt generation,
 * pinch compression, size management, provenance invisibility.
 *
 * 4 unit tests:
 * 1. emit-skill produces valid SKILL.md with governance instructions
 * 2. pinch compression preserves safety-critical keywords
 * 3. SKILL.md switches to reference mode above 20 tools
 * 4. SKILL.md contains no provenance markers (no claws references in output)
 */

import { describe, it, expect } from 'vitest';
import { emitSkill, type EmitSkillResult } from '../../src/emit/emit-skill.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

describe('emitSkill', () => {
  it('produces valid SKILL.md with governance instructions', () => {
    const ir = minimalGovernanceIR();
    const result = emitSkill(ir);

    // Must be non-empty markdown
    expect(result.content.length).toBeGreaterThan(0);

    // Must contain imperative governance instructions
    expect(result.content).toContain('MUST');

    // Must reference R5 tools with deny instructions
    expect(result.content).toContain('delete_database');

    // Must contain advisory preamble
    expect(result.content).toContain('Governance');

    // Must list tool instructions (deny, require approval, audit)
    expect(result.content).toMatch(/DENY|BLOCK|NEVER/i);

    // Warnings array should exist
    expect(result.warnings).toBeDefined();
    expect(Array.isArray(result.warnings)).toBe(true);

    // Mode should be inline for small tool sets
    expect(result.mode).toBe('inline');
  });

  it('pinch compression preserves safety-critical keywords', () => {
    const ir = minimalGovernanceIR();
    const result = emitSkill(ir);

    // Safety-critical keywords must NEVER be compressed away
    // R5, DENY, OBO are the keywords that must survive compression
    const content = result.content;

    // R5 tools must be explicitly mentioned
    if (ir.intents.some((i) => i.level === 5)) {
      expect(content).toMatch(/R5/);
    }

    // DENY/BLOCK must appear for deny intents
    if (ir.intents.some((i) => i.kind === 'deny')) {
      expect(content).toMatch(/DENY|BLOCK|NEVER/i);
    }

    // OBO must appear for elicit intents with OBO-flagged tools
    if (ir.capabilities.tools.some((t) => t.oboFlag)) {
      expect(content).toMatch(/OBO|behalf/i);
    }

    // Compressed content should be shorter than uncompressed
    const uncompressed = emitSkill(ir, { compress: false });
    expect(result.content.length).toBeLessThanOrEqual(uncompressed.content.length);
  });

  it('SKILL.md switches to reference mode above 20 tools', () => {
    const ir = minimalGovernanceIR();

    // Create an IR with 25 tools to exceed the inline threshold
    const manyTools = Array.from({ length: 25 }, (_, i) => ({
      name: `tool_${i}`,
      description: `Tool number ${i}`,
      riskLevel: i % 5 === 0 ? ('critical' as const) : ('low' as const),
      oboFlag: false,
      classification: 'custom' as const,
    }));

    const largeIR: GovernanceIR = {
      ...ir,
      capabilities: {
        ...ir.capabilities,
        tools: manyTools,
      },
    };

    const result = emitSkill(largeIR);

    // Should switch to reference mode
    expect(result.mode).toBe('reference');

    // Reference mode should mention consulting the full policy
    expect(result.content).toMatch(/policy|reference|full list/i);

    // Should still mention critical tools even in reference mode
    expect(result.content).toContain('tool_0'); // R5 tool
  });

  it('OBO tool without matching elicit intent gets its own approval line', () => {
    const ir = minimalGovernanceIR();

    // Add an OBO-flagged tool with no matching elicit intent
    const irWithOrphanObo: GovernanceIR = {
      ...ir,
      capabilities: {
        ...ir.capabilities,
        tools: [
          ...ir.capabilities.tools,
          {
            name: 'purchase_order',
            description: 'Create a purchase order on behalf of user',
            riskLevel: 'high',
            oboFlag: true,
            classification: 'finance',
          },
        ],
      },
    };

    const result = emitSkill(irWithOrphanObo);

    // purchase_order is OBO but has no elicit intent → should get its own line
    expect(result.content).toContain('purchase_order');
    expect(result.content).toMatch(/purchase_order.*OBO/);
  });

  it('SKILL.md contains no provenance markers (no claws references in output)', () => {
    const ir = minimalGovernanceIR();
    const result = emitSkill(ir);

    const content = result.content;

    // Must not contain any claws references
    expect(content).not.toMatch(/claws/i);

    // Must not contain @craftworks references
    expect(content).not.toMatch(/@craftworks/i);

    // Must not contain compiler version provenance
    expect(content).not.toContain('compiler');

    // Must not contain compiledAt timestamps
    expect(content).not.toContain(ir.compiler.compiledAt);

    // Must not reference internal module names
    expect(content).not.toMatch(/emit-skill|governance-ir/i);
  });
});
