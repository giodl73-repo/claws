/**
 * L0: Scaffold orchestrator unit tests for CI unit-project coverage.
 *
 * Tests scaffoldSkill, validateSkillName, and the error classes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  scaffoldSkill,
  validateSkillName,
  SkillAlreadyExistsError,
  RiskCapExceededError,
} from '../../src/scaffold/scaffold.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-scaffold-unit-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

async function writeConfig(dir: string, trustTier: number): Promise<void> {
  await writeFile(join(dir, 'claws.json'), JSON.stringify({ trustTier }), 'utf-8');
}

// ── validateSkillName ─────────────────────────────────────────────────

describe('validateSkillName', () => {
  it('accepts valid single-char name', () => {
    expect(validateSkillName('a')).toBeUndefined();
  });

  it('accepts valid multi-char name', () => {
    expect(validateSkillName('my-skill')).toBeUndefined();
  });

  it('rejects empty name', () => {
    expect(validateSkillName('')).toContain('empty');
  });

  it('rejects uppercase name', () => {
    expect(validateSkillName('MySkill')).toBeDefined();
  });

  it('rejects name starting with hyphen', () => {
    expect(validateSkillName('-bad')).toBeDefined();
  });

  it('rejects name ending with hyphen', () => {
    expect(validateSkillName('bad-')).toBeDefined();
  });
});

// ── SkillAlreadyExistsError ───────────────────────────────────────────

describe('SkillAlreadyExistsError', () => {
  it('has correct name and skillDir', () => {
    const err = new SkillAlreadyExistsError('/path/to/skills/foo');
    expect(err.name).toBe('SkillAlreadyExistsError');
    expect(err.skillDir).toBe('/path/to/skills/foo');
    expect(err.message).toContain('already exists');
  });
});

// ── RiskCapExceededError ──────────────────────────────────────────────

describe('RiskCapExceededError', () => {
  it('has correct fields and message', () => {
    const err = new RiskCapExceededError(5, 3, 2);
    expect(err.name).toBe('RiskCapExceededError');
    expect(err.requestedRisk).toBe(5);
    expect(err.maxRisk).toBe(3);
    expect(err.trustTier).toBe(2);
    expect(err.message).toContain('R5');
    expect(err.message).toContain('R3');
  });
});

// ── scaffoldSkill ─────────────────────────────────────────────────────

describe('scaffoldSkill', () => {
  it('scaffolds a declared-tier skill', async () => {
    await writeConfig(tempDir, 2);
    const result = await scaffoldSkill(tempDir, 'my-tool');
    expect(result.name).toBe('my-tool');
    expect(result.tier).toBe('declared');
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files).toContain('.gitignore');

    const s = await stat(result.skillDir);
    expect(s.isDirectory()).toBe(true);
  });

  it('throws on invalid skill name', async () => {
    await writeConfig(tempDir, 2);
    await expect(scaffoldSkill(tempDir, '')).rejects.toThrow('empty');
  });

  it('throws SkillAlreadyExistsError if skill dir exists', async () => {
    await writeConfig(tempDir, 2);
    await mkdir(join(tempDir, 'skills', 'existing'), { recursive: true });
    await expect(scaffoldSkill(tempDir, 'existing'))
      .rejects.toThrow(SkillAlreadyExistsError);
  });

  it('throws RiskCapExceededError for T1 + verified tier', async () => {
    await writeConfig(tempDir, 1);
    await expect(scaffoldSkill(tempDir, 'my-skill', { tier: 'verified' }))
      .rejects.toThrow(RiskCapExceededError);
  });

  it('detects OBO from skill name', async () => {
    await writeConfig(tempDir, 2);
    const result = await scaffoldSkill(tempDir, 'send-email');
    expect(result.oboDetected).toBe(true);
    expect(result.oboHints.length).toBeGreaterThan(0);
  });

  it('returns dependency check result', async () => {
    await writeConfig(tempDir, 2);
    const result = await scaffoldSkill(tempDir, 'my-tool');
    expect(result.dependency).toBeDefined();
    expect(result.dependency).toHaveProperty('installed');
  });
});
