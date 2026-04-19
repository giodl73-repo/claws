/**
 * L0: config loader — load and validate claws.json with defaults.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from '../../src/config/loader.js';

describe('loadConfig()', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('loads valid claws.json with all fields', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-config-'));
    const config = {
      trustTier: 3,
      suppressions: ['G-PERM-01'],
      platform: 'claude-code',
      format: 'json',
      policySet: 'strict',
      auditLevel: 'summary',
      failMode: {
        R1: 'open',
        R2: 'gated',
        R3: 'gated',
        R4: 'closed',
        R5: 'closed',
      },
      fleet: { allowBypass: true },
    };
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify(config));

    const result = await loadConfig(tmpRoot);

    expect(result.found).toBe(true);
    expect(result.config.trustTier).toBe(3);
    expect(result.config.suppressions).toEqual(['G-PERM-01']);
    expect(result.config.platform).toBe('claude-code');
    expect(result.config.format).toBe('json');
    expect(result.config.policySet).toBe('strict');
    expect(result.config.auditLevel).toBe('summary');
    expect(result.config.failMode.R2).toBe('gated');
    expect(result.config.failMode.R4).toBe('closed');
    expect(result.config.fleet.allowBypass).toBe(true);
    // fleet.publish gets defaults when not specified in config
    expect(result.config.fleet.publish.requireVerifiedPublish).toBe(false);
    expect(result.config.fleet.publish.allowDeclaredDryRun).toBe(true);
  });

  it('supplies defaults for missing optional fields', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-config-'));
    // Minimal claws.json — only an empty object
    await writeFile(join(tmpRoot, 'claws.json'), '{}');

    const result = await loadConfig(tmpRoot);

    expect(result.found).toBe(true);
    expect(result.config.trustTier).toBe(2);
    expect(result.config.suppressions).toEqual([]);
    expect(result.config.platform).toBeUndefined();
    expect(result.config.format).toBe('terminal');
    expect(result.config.policySet).toBe('default');
    expect(result.config.auditLevel).toBe('full');
    expect(result.config.failMode.R1).toBe('open');
    expect(result.config.failMode.R2).toBe('open');
    expect(result.config.failMode.R3).toBe('gated');
    expect(result.config.failMode.R4).toBe('gated');
    expect(result.config.failMode.R5).toBe('closed');
    expect(result.config.fleet.allowBypass).toBe(false);
    expect(result.config.fleet.publish.requireVerifiedPublish).toBe(false);
    expect(result.config.fleet.publish.allowDeclaredDryRun).toBe(true);
  });

  it('loads fleet publish policy from claws.json', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-config-'));
    const config = {
      fleet: {
        allowBypass: false,
        publish: {
          requireVerifiedPublish: true,
          allowDeclaredDryRun: false,
        },
      },
    };
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify(config));

    const result = await loadConfig(tmpRoot);

    expect(result.found).toBe(true);
    expect(result.config.fleet.publish.requireVerifiedPublish).toBe(true);
    expect(result.config.fleet.publish.allowDeclaredDryRun).toBe(false);
  });

  it('returns defaults with found=false when claws.json is missing', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-config-'));
    // No claws.json file — directory exists but file doesn't

    const result = await loadConfig(tmpRoot);

    expect(result.found).toBe(false);
    expect(result.configPath).toContain('claws.json');
    // Defaults should still be applied
    expect(result.config.trustTier).toBe(2);
    expect(result.config.suppressions).toEqual([]);
    expect(result.config.format).toBe('terminal');
    expect(result.config.policySet).toBe('default');
    expect(result.config.failMode.R1).toBe('open');
    expect(result.config.failMode.R5).toBe('closed');
    expect(result.config.fleet.allowBypass).toBe(false);
  });

  it('throws OC-POLICY-E001 for invalid JSON', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-config-'));
    await writeFile(join(tmpRoot, 'claws.json'), '{ not valid json!!!');

    await expect(loadConfig(tmpRoot)).rejects.toThrow();

    try {
      await loadConfig(tmpRoot);
    } catch (e) {
      const detail = JSON.parse((e as Error).message);
      expect(detail.code).toBe('OC-POLICY-E001');
      expect(detail.what).toContain('Invalid JSON');
      expect(detail.how).toContain('Fix the JSON syntax');
      expect(detail.where.file).toContain('claws.json');
      expect(detail.where.line).toBe(1);
      expect(detail.where.column).toBe(1);
    }
  });

  it('throws OC-POLICY-E001 for schema validation failure', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-config-'));
    // trustTier must be 1-5 integer; 99 is out of range
    await writeFile(join(tmpRoot, 'claws.json'), JSON.stringify({
      trustTier: 99,
    }));

    await expect(loadConfig(tmpRoot)).rejects.toThrow();

    try {
      await loadConfig(tmpRoot);
    } catch (e) {
      const detail = JSON.parse((e as Error).message);
      expect(detail.code).toBe('OC-POLICY-E001');
      expect(detail.what).toContain('schema validation failed');
      expect(detail.how).toContain('Fix the fields');
    }
  });

  it('handles non-Error thrown by JSON.parse in the error message', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-config-'));
    // Write file with content that looks like valid JSON but we'll intercept parsing
    await writeFile(join(tmpRoot, 'claws.json'), '{"trustTier": 2}');

    // Mock JSON.parse to throw a non-Error value (string), exercising
    // the String(err) fallback branch in the catch handler
    const originalParse = JSON.parse;
    vi.spyOn(JSON, 'parse').mockImplementationOnce(() => {
      throw 'raw string error';
    });

    try {
      await expect(loadConfig(tmpRoot)).rejects.toThrow();
      try {
        // Restore before the second call to actually parse the error detail
        JSON.parse = originalParse;
      } catch { /* ignore */ }
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('includes non-Error value in OC-POLICY-E001 what field', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-config-'));
    await writeFile(join(tmpRoot, 'claws.json'), '{"trustTier": 2}');

    vi.spyOn(JSON, 'parse').mockImplementationOnce(() => {
      throw 42;
    });

    try {
      await loadConfig(tmpRoot);
    } catch (e) {
      // The error message is JSON-stringified ConfigValidationError
      // We need to restore JSON.parse first to parse it
      vi.restoreAllMocks();
      const detail = JSON.parse((e as Error).message);
      expect(detail.code).toBe('OC-POLICY-E001');
      expect(detail.what).toContain('42');
    }
  });

  it('uses configPathOverride when provided', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-config-'));
    const customPath = join(tmpRoot, 'custom-config.json');
    await writeFile(customPath, JSON.stringify({ trustTier: 4 }));

    const result = await loadConfig('/some/workspace', customPath);

    expect(result.found).toBe(true);
    expect(result.configPath).toBe(customPath);
    expect(result.config.trustTier).toBe(4);
  });

  it('returns found=false when configPathOverride points to missing file', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-config-'));
    const missingPath = join(tmpRoot, 'nonexistent.json');

    const result = await loadConfig('/some/workspace', missingPath);

    expect(result.found).toBe(false);
    expect(result.configPath).toBe(missingPath);
    expect(result.config.trustTier).toBe(2); // default
  });
});
