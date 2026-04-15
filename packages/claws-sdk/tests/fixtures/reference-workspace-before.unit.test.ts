/**
 * L0: Before-claws fixture validation.
 *
 * 2 unit tests covering:
 * 1. before-claws/ SOUL.md and TOOLS.md are present and parseable
 * 2. before-claws/expected-violations.json is empty array with valid metadata
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const BEFORE = resolve(__dirname, 'oc-reference-workspace', 'before-claws');

describe('before-claws fixture', () => {
  it('SOUL.md and TOOLS.md are present and parseable', () => {
    const soulPath = resolve(BEFORE, 'SOUL.md');
    expect(existsSync(soulPath)).toBe(true);
    const soul = readFileSync(soulPath, 'utf-8');
    expect(soul.length).toBeGreaterThan(0);
    expect(soul.startsWith('#')).toBe(true);
    // No deny constraints in before-claws SOUL
    expect(soul).not.toContain('Deny Constraints');
    expect(soul).not.toContain('Never');

    const toolsPath = resolve(BEFORE, 'TOOLS.md');
    expect(existsSync(toolsPath)).toBe(true);
    const tools = readFileSync(toolsPath, 'utf-8');
    expect(tools.length).toBeGreaterThan(0);
    // No risk annotations in before-claws TOOLS
    expect(tools).not.toContain('Risk:');
    expect(tools).not.toContain('Governance:');
    // But tools are still listed
    expect(tools).toContain('web-search');
    expect(tools).toContain('deploy-trigger');
  });

  it('expected-violations.json is empty array with valid metadata', () => {
    const path = resolve(BEFORE, 'expected-violations.json');
    expect(existsSync(path)).toBe(true);

    const data = JSON.parse(readFileSync(path, 'utf-8'));

    // File-level metadata must be present
    expect(data).toHaveProperty('generatedAt');
    expect(data).toHaveProperty('clawsVersion');
    expect(data).toHaveProperty('policySetHash');
    expect(data).toHaveProperty('schemaVersion');

    // Violations must be an empty array
    expect(Array.isArray(data.violations)).toBe(true);
    expect(data.violations).toHaveLength(0);
  });
});
