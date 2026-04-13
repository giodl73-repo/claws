/**
 * TSC type-check integration test — validates that decorated skills
 * pass tsc --noEmit against OC skill types.
 *
 * This test constructs a decorated skill in-memory and verifies
 * that the type structure is sound by inspecting the metadata
 * types at runtime (the actual tsc check runs via the test_scope command).
 */

import { describe, it, expect } from 'vitest';
import { skill } from '../../src/factory/skill.js';
import { classify } from '../../src/decorators/classify.js';
import { obo } from '../../src/decorators/obo.js';
import { getGovernanceMetadata, GOVERNANCE_METADATA_KEY } from '../../src/types.js';
import type { SkillHandler, SkillGovernanceMetadata, RiskLevelCode, OboBoundary } from '../../src/types.js';

describe('TSC type-check — decorated skill types', () => {
  it('skill with @classify(R3) + @obo(email) produces correct typed metadata', () => {
    const handler = skill('typed-skill', (input: string) => input.toUpperCase());
    classify('R3', handler);
    obo('email', handler);

    // Type-level assertions: these verify the compiler sees the right types
    const meta: SkillGovernanceMetadata | undefined = getGovernanceMetadata(handler);
    expect(meta).toBeDefined();

    // Risk level is typed as RiskLevelCode
    const riskLevel: RiskLevelCode | undefined = meta!.riskLevel;
    expect(riskLevel).toBe('R3');

    // OBO is typed as OboBoundary
    const oboBoundary: OboBoundary | undefined = meta!.obo;
    expect(oboBoundary).toBe('email');

    // Numeric level maps correctly
    expect(meta!.riskLevelNumeric).toBe(3);
  });

  it('SkillHandler type carries skillName and governance metadata key', () => {
    const handler: SkillHandler<string, string> = skill('name-check', (s: string) => s);

    // Type-level: skillName is a readonly string property
    const name: string = handler.skillName;
    expect(name).toBe('name-check');

    // Type-level: governance metadata key exists on the handler
    const meta: SkillGovernanceMetadata = handler[GOVERNANCE_METADATA_KEY];
    expect(meta).toBeDefined();
  });
});
