/**
 * L0 unit tests for maker publish pipeline.
 *
 * P29: pinch pass allows publish, pinch fail blocks publish,
 * tier determination DECLARED/TYPED/VERIFIED, atomic rollback
 * on remote failure, security warnings not suppressible by --quiet.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, readFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  makerPublish,
  pinchPreflight,
  evaluateTier,
  tierMeetsMinimum,
} from '../../src/maker/publish.js';
import { createMockRegistry } from '../fixtures/mock-registry/index.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-publish-unit-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

/**
 * Write a minimal valid skill to a temp directory.
 */
async function writeValidSkill(dir: string, opts?: { decorators?: boolean }): Promise<void> {
  await writeFile(join(dir, 'SKILL.md'), [
    '---',
    'name: test-publish-skill',
    'description: A test skill for publish tests',
    'tools:',
    '  - file-read',
    '---',
    '',
    '# Test Publish Skill',
    '',
    'A simple skill for testing the publish pipeline.',
  ].join('\n'), 'utf-8');

  const decoratorLines = opts?.decorators
    ? ['// @Risk(2)', '// @DataLabel(file-access)']
    : [];

  await writeFile(join(dir, 'handler.ts'), [
    '// Test handler',
    ...decoratorLines,
    'export async function handler() {',
    '  return { success: true };',
    '}',
  ].join('\n'), 'utf-8');
}

describe('pinch pass allows publish', () => {
  it('publishes successfully when pinch pre-flight passes', async () => {
    await writeValidSkill(tempDir);
    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
    });

    expect(result.success).toBe(true);
    expect(result.name).toBe('test-publish-skill');
    expect(result.version).toBe('1.0.0');
    expect(result.rolledBack).toBe(false);
    expect(result.publishId).toBeTruthy();
    expect(registry.calls).toHaveLength(1);
  });
});

describe('pinch fail blocks publish', () => {
  it('blocks publish when SKILL.md is missing', async () => {
    // Empty directory — no SKILL.md
    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Pinch pre-flight failed');
    expect(registry.calls).toHaveLength(0);
  });

  it('blocks publish when SKILL.md has no frontmatter', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), '# No Frontmatter\n', 'utf-8');
    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Pinch pre-flight failed');
    expect(registry.calls).toHaveLength(0);
  });

  it('blocks publish when SKILL.md has malformed frontmatter (missing closing ---)', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), '---\nname: broken\n# No closing delimiter\n', 'utf-8');
    const registry = createMockRegistry('success');

    const preflight = await pinchPreflight(tempDir);
    expect(preflight.passed).toBe(false);
    expect(preflight.reason).toContain('Malformed frontmatter');
    expect(preflight.warnings.some(w => w.code === 'PINCH-003')).toBe(true);
  });

  it('warns when SKILL.md frontmatter is missing name field', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), '---\ndescription: no name field\n---\n# Skill\n', 'utf-8');
    const registry = createMockRegistry('success');

    const preflight = await pinchPreflight(tempDir);
    expect(preflight.passed).toBe(true);
    expect(preflight.warnings.some(w => w.code === 'PINCH-004')).toBe(true);
  });
});

describe('tier determination DECLARED/TYPED/VERIFIED', () => {
  it('evaluates DECLARED when no handler exists', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), [
      '---',
      'name: prompt-only',
      'description: A prompt-only skill',
      '---',
      '',
      '# Prompt Only',
    ].join('\n'), 'utf-8');

    const result = await evaluateTier(tempDir, true);
    expect(result.tier).toBe('DECLARED');
    expect(result.hasHandler).toBe(false);
  });

  it('evaluates TYPED when handler exists without decorators', async () => {
    await writeValidSkill(tempDir, { decorators: false });

    const result = await evaluateTier(tempDir, true);
    expect(result.tier).toBe('TYPED');
    expect(result.hasHandler).toBe(true);
    expect(result.hasDecorators).toBe(false);
  });

  it('evaluates VERIFIED when handler has decorators and pinch passes', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), [
      '---',
      'name: verified-skill',
      'description: Verified skill with decorators',
      '---',
      '',
      '# Verified Skill',
    ].join('\n'), 'utf-8');

    await writeFile(join(tempDir, 'handler.ts'), [
      '@Risk(3)',
      '@Obo()',
      'export async function handler() {}',
    ].join('\n'), 'utf-8');

    const result = await evaluateTier(tempDir, true);
    expect(result.tier).toBe('VERIFIED');
    expect(result.hasHandler).toBe(true);
    expect(result.hasDecorators).toBe(true);
    expect(result.pinchPassed).toBe(true);
  });

  it('evaluates TYPED when handler has decorators but pinch fails', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), [
      '---',
      'name: typed-skill',
      'description: Typed skill',
      '---',
      '',
      '# Typed',
    ].join('\n'), 'utf-8');

    await writeFile(join(tempDir, 'handler.ts'), [
      '@Risk(3)',
      'export async function handler() {}',
    ].join('\n'), 'utf-8');

    const result = await evaluateTier(tempDir, false);
    expect(result.tier).toBe('TYPED');
    expect(result.hasDecorators).toBe(true);
    expect(result.pinchPassed).toBe(false);
  });

  it('tierMeetsMinimum correctly compares tiers', () => {
    expect(tierMeetsMinimum('VERIFIED', 'DECLARED')).toBe(true);
    expect(tierMeetsMinimum('TYPED', 'TYPED')).toBe(true);
    expect(tierMeetsMinimum('DECLARED', 'TYPED')).toBe(false);
    expect(tierMeetsMinimum('DECLARED', 'VERIFIED')).toBe(false);
    expect(tierMeetsMinimum('VERIFIED', 'VERIFIED')).toBe(true);
  });
});

describe('fleet policy gates', () => {
  it('blocks publish when tier does not meet fleet minimum (FLEET-001)', async () => {
    // Skill with no handler => DECLARED tier
    await writeFile(join(tempDir, 'SKILL.md'), [
      '---',
      'name: fleet-gate-test',
      'description: Fleet policy test skill',
      '---',
      '',
      '# Fleet Gate Test',
    ].join('\n'), 'utf-8');

    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
      fleetPolicy: {
        minimumTier: 'VERIFIED',
        requireSigning: false,
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Fleet policy requires minimum tier VERIFIED');
    expect(result.securityWarnings.some(w => w.code === 'FLEET-001')).toBe(true);
    expect(result.rolledBack).toBe(false);
    expect(registry.calls).toHaveLength(0);
  });

  it('blocks publish when fleet requires signing but no key provided (FLEET-002)', async () => {
    await writeValidSkill(tempDir);

    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
      fleetPolicy: {
        minimumTier: 'DECLARED',
        requireSigning: true,
      },
      // No signingKey provided
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Fleet policy requires manifest signing');
    expect(result.securityWarnings.some(w => w.code === 'FLEET-002')).toBe(true);
    expect(result.rolledBack).toBe(false);
    expect(registry.calls).toHaveLength(0);
  });

  it('allows publish when fleet policy is satisfied', async () => {
    await writeValidSkill(tempDir);

    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
      fleetPolicy: {
        minimumTier: 'DECLARED',
        requireSigning: false,
      },
    });

    expect(result.success).toBe(true);
  });
});

describe('OBO scope and signing coverage', () => {
  it('publishes with signed manifest when signing key provided', async () => {
    await writeValidSkill(tempDir);
    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
      signingKey: 'a'.repeat(64),
    });

    expect(result.success).toBe(true);
    // Signed manifest should not trigger SIGN-001 warning
    expect(result.securityWarnings.some(w => w.code === 'SIGN-001')).toBe(false);
  });

  it('publishes with OBO scope when handler has OBO decorators', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), [
      '---',
      'name: obo-scope-test',
      'description: OBO scope test',
      'tools:',
      '  - send-email',
      '---',
      '',
      '# OBO Scope Test',
    ].join('\n'), 'utf-8');

    // Handler with OBO patterns that trigger OBO detection
    await writeFile(join(tempDir, 'handler.ts'), [
      '// Sends email on behalf of user',
      'export async function handler() {',
      '  // Perform action on behalf of user',
      '  await sendEmail({ on_behalf_of: true });',
      '}',
    ].join('\n'), 'utf-8');

    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
    });

    expect(result.success).toBe(true);
    expect(result.badge).toBeDefined();
    expect(result.badge.version).toBe('1.0.0');
  });

  it('uses policyConfig for hashing when provided', async () => {
    await writeValidSkill(tempDir);
    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
      policyConfig: '{"version":"2.0","rules":["G-CLASS-01"]}',
    });

    expect(result.success).toBe(true);
    expect(result.manifest).toBeDefined();
  });
});

describe('edge case branch coverage', () => {
  it('falls back to directory name when frontmatter has no name field', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), [
      '---',
      'description: no name field in frontmatter',
      '---',
      '',
      '# Unnamed Skill',
    ].join('\n'), 'utf-8');

    const registry = createMockRegistry('success');
    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
    });

    expect(result.success).toBe(true);
    // Falls back to directory name from path
    expect(result.name).toBeTruthy();
    expect(result.name).not.toBe('');
  });

  it('handles non-Error thrown by registry (String branch)', async () => {
    await writeValidSkill(tempDir);

    const registry: import('../../src/maker/publish.js').RegistryClient = {
      async publish() {
        throw 'string-error-not-Error-instance';
      },
    };

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
    });

    expect(result.success).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(result.error).toContain('string-error-not-Error-instance');
  });

  it('handles registry rejection without error message (unknown error branch)', async () => {
    await writeValidSkill(tempDir);

    const registry: import('../../src/maker/publish.js').RegistryClient = {
      async publish() {
        return { success: false };
      },
    };

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
    });

    expect(result.success).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(result.error).toContain('unknown error');
  });
});

describe('atomic rollback on remote failure', () => {
  it('rolls back manifest on registry network error', async () => {
    await writeValidSkill(tempDir);
    const registry = createMockRegistry('error');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
    });

    expect(result.success).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(result.error).toContain('Registry error');

    // Manifest file should be cleaned up
    let manifestExists = true;
    try {
      await access(join(tempDir, '.claws-manifest.json'));
    } catch {
      manifestExists = false;
    }
    expect(manifestExists).toBe(false);
  });

  it('rolls back manifest on registry rejection', async () => {
    await writeValidSkill(tempDir);
    const registry = createMockRegistry('reject');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
    });

    expect(result.success).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(result.error).toContain('Registry rejected');

    // Manifest file should be cleaned up
    let manifestExists = true;
    try {
      await access(join(tempDir, '.claws-manifest.json'));
    } catch {
      manifestExists = false;
    }
    expect(manifestExists).toBe(false);
  });
});

describe('security warnings not suppressible by --quiet', () => {
  it('security warnings always present regardless of quiet mode', async () => {
    // Skill without handler — triggers PINCH-005 warning
    await writeFile(join(tempDir, 'SKILL.md'), [
      '---',
      'name: quiet-test',
      'description: Test quiet flag',
      '---',
      '',
      '# Quiet Test',
    ].join('\n'), 'utf-8');

    const registry = createMockRegistry('success');

    const result = await makerPublish({
      skillDir: tempDir,
      version: '1.0.0',
      sdkVersion: '0.5.0',
      registry,
      quiet: true,
    });

    // Security warnings are always present
    expect(result.securityWarnings.length).toBeGreaterThan(0);

    // Unsigned warning should be present (no signing key)
    const unsignedWarning = result.securityWarnings.find(w => w.code === 'SIGN-001');
    expect(unsignedWarning).toBeDefined();
    expect(unsignedWarning!.message).toContain('unsigned');

    // PINCH-005 warning about missing handler
    const handlerWarning = result.securityWarnings.find(w => w.code === 'PINCH-005');
    expect(handlerWarning).toBeDefined();
  });
});
