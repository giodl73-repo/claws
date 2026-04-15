/**
 * L0: OC reference workspace fixture validation.
 *
 * 3 unit tests covering:
 * 1. All 9 OC files + 3 skills + lobster.yaml + openclaw.json + claws.json are present and parseable
 * 2. expected-violations.json is valid JSON with file-level metadata and per-violation howToFix
 * 3. claws.json has valid trust tier and fail-mode configuration
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

const WORKSPACE = resolve(__dirname, 'oc-reference-workspace');

describe('OC reference workspace fixture', () => {
  it('all OC source files, skills, and config are present and parseable', () => {
    // 9 OC files
    const ocFiles = [
      'SOUL.md', 'TOOLS.md', 'AGENTS.md', 'IDENTITY.md',
      'USER.md', 'MEMORY.md', 'HEARTBEAT.md',
    ];
    for (const file of ocFiles) {
      const path = resolve(WORKSPACE, file);
      expect(existsSync(path), `${file} should exist`).toBe(true);
      const content = readFileSync(path, 'utf-8');
      expect(content.length, `${file} should not be empty`).toBeGreaterThan(0);
      expect(content.startsWith('#'), `${file} should start with markdown heading`).toBe(true);
    }

    // 3 skills
    const skills = ['web-lookup', 'summarize', 'email-drafter'];
    for (const skill of skills) {
      const path = resolve(WORKSPACE, 'skills', skill, 'SKILL.md');
      expect(existsSync(path), `skills/${skill}/SKILL.md should exist`).toBe(true);
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain('governance:');
    }

    // lobster.yaml
    const lobsterPath = resolve(WORKSPACE, 'lobster.yaml');
    expect(existsSync(lobsterPath)).toBe(true);
    const lobster = parseYaml(readFileSync(lobsterPath, 'utf-8'));
    expect(lobster.steps).toHaveLength(3);

    // openclaw.json
    const openclawPath = resolve(WORKSPACE, 'openclaw.json');
    expect(existsSync(openclawPath)).toBe(true);
    const openclaw = JSON.parse(readFileSync(openclawPath, 'utf-8'));
    expect(openclaw.platform).toBe('openclaw');
    expect(openclaw.skills).toHaveLength(3);

    // claws.json
    const clawsPath = resolve(WORKSPACE, 'claws.json');
    expect(existsSync(clawsPath)).toBe(true);
    JSON.parse(readFileSync(clawsPath, 'utf-8'));
  });

  it('expected-violations.json has file-level metadata and per-violation howToFix', () => {
    const path = resolve(WORKSPACE, 'expected', 'expected-violations.json');
    expect(existsSync(path)).toBe(true);

    const data = JSON.parse(readFileSync(path, 'utf-8'));

    // File-level metadata
    expect(data).toHaveProperty('generatedAt');
    expect(data).toHaveProperty('clawsVersion');
    expect(data).toHaveProperty('policySetHash');
    expect(data).toHaveProperty('schemaVersion');

    // Violations array
    expect(Array.isArray(data.violations)).toBe(true);
    expect(data.violations.length).toBeGreaterThan(0);

    // Per-violation structure
    for (const v of data.violations) {
      expect(v).toHaveProperty('code');
      expect(v).toHaveProperty('file');
      expect(v).toHaveProperty('line');
      expect(v).toHaveProperty('message');
      expect(v).toHaveProperty('howToFix');
      expect(v).toHaveProperty('policyVersion');
      expect(v).toHaveProperty('ruleId');
      expect(v).toHaveProperty('severity');
      expect(typeof v.howToFix).toBe('string');
      expect(v.howToFix.length).toBeGreaterThan(10);
    }
  });

  it('claws.json has valid trust tier and fail-mode configuration', () => {
    const path = resolve(WORKSPACE, 'claws.json');
    const config = JSON.parse(readFileSync(path, 'utf-8'));

    // Trust tier must be 1-5
    expect(config.trustTier).toBeGreaterThanOrEqual(1);
    expect(config.trustTier).toBeLessThanOrEqual(5);

    // Suppressions must be an array
    expect(Array.isArray(config.suppressions)).toBe(true);

    // Fail modes must cover R1-R5
    expect(config.failMode).toHaveProperty('R1');
    expect(config.failMode).toHaveProperty('R2');
    expect(config.failMode).toHaveProperty('R3');
    expect(config.failMode).toHaveProperty('R4');
    expect(config.failMode).toHaveProperty('R5');

    // Each fail mode must be open, gated, or closed
    const validModes = ['open', 'gated', 'closed'];
    for (const [tier, mode] of Object.entries(config.failMode)) {
      expect(validModes, `${tier} fail mode should be valid`).toContain(mode);
    }
  });
});
