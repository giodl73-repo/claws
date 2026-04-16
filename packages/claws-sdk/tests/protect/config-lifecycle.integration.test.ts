/**
 * L1: Config create -> validate -> merge -> override lifecycle.
 *
 * THOTH-INTEGRATION-COVERAGE: config 38% -> 90%.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from '../../src/config/loader.js';

describe('config create -> validate -> merge -> override lifecycle', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('full config lifecycle: defaults, load, validate, override', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-config-lifecycle-'));

    // 1. Load without claws.json — should return defaults
    const defaults = await loadConfig(tempDir);
    expect(defaults.found).toBe(false);
    expect(defaults.config.trustTier).toBe(2);
    expect(defaults.config.format).toBe('terminal');
    expect(defaults.config.policySet).toBe('default');
    expect(defaults.config.auditLevel).toBe('full');
    expect(defaults.config.failMode.R1).toBe('open');
    expect(defaults.config.failMode.R5).toBe('closed');
    expect(defaults.config.fleet.allowBypass).toBe(false);

    // 2. Create minimal claws.json — only trustTier overridden
    await writeFile(join(tempDir, 'claws.json'), JSON.stringify({
      trustTier: 3,
    }), 'utf-8');

    const minimal = await loadConfig(tempDir);
    expect(minimal.found).toBe(true);
    expect(minimal.config.trustTier).toBe(3);
    // Other fields should still have defaults
    expect(minimal.config.format).toBe('terminal');
    expect(minimal.config.policySet).toBe('default');

    // 3. Create full override claws.json
    await writeFile(join(tempDir, 'claws.json'), JSON.stringify({
      trustTier: 4,
      suppressions: ['g-data-01', 'g-perm-02'],
      format: 'json',
      policySet: 'strict',
      auditLevel: 'summary',
      failMode: {
        R1: 'gated',
        R2: 'gated',
        R3: 'closed',
        R4: 'closed',
        R5: 'closed',
      },
      fleet: {
        allowBypass: true,
        publish: {
          requireVerifiedPublish: true,
          allowDeclaredDryRun: false,
        },
      },
    }), 'utf-8');

    const overridden = await loadConfig(tempDir);
    expect(overridden.found).toBe(true);
    expect(overridden.config.trustTier).toBe(4);
    expect(overridden.config.suppressions).toEqual(['g-data-01', 'g-perm-02']);
    expect(overridden.config.format).toBe('json');
    expect(overridden.config.policySet).toBe('strict');
    expect(overridden.config.auditLevel).toBe('summary');
    expect(overridden.config.failMode.R1).toBe('gated');
    expect(overridden.config.failMode.R5).toBe('closed');
    expect(overridden.config.fleet.allowBypass).toBe(true);
    expect(overridden.config.fleet.publish.requireVerifiedPublish).toBe(true);

    // 4. Invalid JSON — should throw structured error
    await writeFile(join(tempDir, 'claws.json'), '{ INVALID }', 'utf-8');
    await expect(loadConfig(tempDir)).rejects.toThrow();

    // 5. Invalid schema (trustTier out of range)
    await writeFile(join(tempDir, 'claws.json'), JSON.stringify({
      trustTier: 99,
    }), 'utf-8');
    await expect(loadConfig(tempDir)).rejects.toThrow();
  });
});
