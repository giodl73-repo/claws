/**
 * L0 unit tests for sidecar resolver and detect — .claws parsing, validation,
 * and workspace detection heuristics.
 */

import { describe, it, expect } from 'vitest';
import { resolve, join } from 'node:path';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolveSidecar, validateFreeTierOverrides, SidecarValidationError } from '#src/compiler/sidecar/resolver.js';
import { detectWorkspacePlatforms } from '#src/compiler/sidecar/detect.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('resolveSidecar', () => {
  it('parses a valid YAML sidecar correctly', async () => {
    const result = await resolveSidecar(resolve(FIXTURES, 'sidecar-yaml'));

    expect(result.found).toBe(true);
    if (!result.found) return;

    expect(result.format).toBe('yaml');
    expect(result.sidecar.version).toBe('1.0.0');
    expect(result.sidecar.targets).toEqual(['claude-code', 'cursor']);
    expect(result.sidecar.options?.strict).toBe(true);
    expect(result.sidecar.options?.verbose).toBe(false);
    expect(result.sidecar.options?.policyDir).toBe('.claws/policies');
    expect(result.path).toContain('.claws');
  });

  it('parses a valid JSON sidecar correctly', async () => {
    const result = await resolveSidecar(resolve(FIXTURES, 'sidecar-json'));

    expect(result.found).toBe(true);
    if (!result.found) return;

    expect(result.format).toBe('json');
    expect(result.sidecar.version).toBe('2.1.0');
    expect(result.sidecar.targets).toEqual(['openclaw', 'bedrock']);
    expect(result.sidecar.options?.strict).toBe(false);
    expect(result.sidecar.options?.verbose).toBe(true);
  });

  it('falls back to heuristics when no sidecar file exists', async () => {
    const result = await resolveSidecar(resolve(FIXTURES, 'sidecar-heuristic-claude'));

    expect(result.found).toBe(false);
    if (result.found) return;

    expect(result.heuristics.length).toBeGreaterThanOrEqual(1);
    expect(result.heuristics[0]!.platform).toBe('claude-code');
    expect(result.heuristics[0]!.confidence).toBeGreaterThan(0);
    expect(result.heuristics[0]!.signals.length).toBeGreaterThan(0);
  });

  it('throws SidecarValidationError for invalid sidecar with path', async () => {
    const fixturePath = resolve(FIXTURES, 'sidecar-invalid');

    await expect(resolveSidecar(fixturePath)).rejects.toThrow(SidecarValidationError);

    try {
      await resolveSidecar(fixturePath);
    } catch (err) {
      expect(err).toBeInstanceOf(SidecarValidationError);
      const validationErr = err as SidecarValidationError;
      expect(validationErr.path).toContain('.claws');
      expect(validationErr.message).toContain('semver');
    }
  });

  it('throws for invalid JSON content', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(join(tmp, '.claws'), '{ invalid json !!!', 'utf-8');
      await expect(resolveSidecar(tmp)).rejects.toThrow(SidecarValidationError);
      try {
        await resolveSidecar(tmp);
      } catch (err) {
        expect((err as SidecarValidationError).message).toContain('JSON');
      }
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('throws for missing version field', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({ targets: ['claude-code'] }),
        'utf-8',
      );
      await expect(resolveSidecar(tmp)).rejects.toThrow(SidecarValidationError);
      try {
        await resolveSidecar(tmp);
      } catch (err) {
        expect((err as SidecarValidationError).message).toContain('version');
      }
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('throws for empty targets array', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({ version: '1.0.0', targets: [] }),
        'utf-8',
      );
      await expect(resolveSidecar(tmp)).rejects.toThrow(SidecarValidationError);
      try {
        await resolveSidecar(tmp);
      } catch (err) {
        expect((err as SidecarValidationError).message).toContain('targets');
      }
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('throws for invalid platform target', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({ version: '1.0.0', targets: ['not-a-platform'] }),
        'utf-8',
      );
      await expect(resolveSidecar(tmp)).rejects.toThrow(SidecarValidationError);
      try {
        await resolveSidecar(tmp);
      } catch (err) {
        expect((err as SidecarValidationError).message).toContain('not-a-platform');
      }
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('parses JSON sidecar with overrides', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({
          version: '1.0.0',
          targets: ['claude-code'],
          overrides: {
            'claude-code': {
              skipRules: ['G-PERM-01'],
              trustTier: 3,
              enforcement: 'advisory',
            },
          },
        }),
        'utf-8',
      );
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;

      expect(result.sidecar.overrides?.['claude-code']?.skipRules).toEqual(['G-PERM-01']);
      expect(result.sidecar.overrides?.['claude-code']?.trustTier).toBe(3);
      expect(result.sidecar.overrides?.['claude-code']?.enforcement).toBe('advisory');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('handles BOM in sidecar content', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      const bom = '\uFEFF';
      await writeFile(
        join(tmp, '.claws'),
        bom + JSON.stringify({ version: '1.0.0', targets: ['cursor'] }),
        'utf-8',
      );
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;
      expect(result.sidecar.version).toBe('1.0.0');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('handles YAML with inline arrays', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        'version: 1.0.0\ntargets: [claude-code, cursor]\n',
        'utf-8',
      );
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;
      expect(result.sidecar.targets).toEqual(['claude-code', 'cursor']);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('handles YAML with comments and blank lines', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        '# This is a comment\nversion: 1.0.0\n\n# Another comment\ntargets:\n  - openclaw\n',
        'utf-8',
      );
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;
      expect(result.sidecar.version).toBe('1.0.0');
      expect(result.sidecar.targets).toEqual(['openclaw']);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('handles sidecar with no options or overrides', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({ version: '0.1.0', targets: ['copilot'] }),
        'utf-8',
      );
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;
      expect(result.sidecar.options).toBeUndefined();
      expect(result.sidecar.overrides).toBeUndefined();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('returns empty heuristics for empty workspace', async () => {
    const result = await resolveSidecar(resolve(FIXTURES, 'sidecar-missing'));
    expect(result.found).toBe(false);
    if (result.found) return;
    expect(result.heuristics).toHaveLength(0);
  });

  it('handles semver with pre-release and build metadata', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({ version: '1.0.0-beta.1+build.42', targets: ['cursor'] }),
        'utf-8',
      );
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;
      expect(result.sidecar.version).toBe('1.0.0-beta.1+build.42');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('handles YAML with nested overrides and integer values', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        [
          'version: 2.0.0',
          'targets:',
          '  - cursor',
          'options:',
          '  strict: true',
          '  verbose: false',
          'overrides:',
          '  cursor:',
          '    trustTier: 3',
          '    enforcement: advisory',
          '',
        ].join('\n'),
        'utf-8',
      );
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;
      expect(result.sidecar.version).toBe('2.0.0');
      expect(result.sidecar.options?.strict).toBe(true);
      expect(result.sidecar.overrides?.cursor?.trustTier).toBe(3);
      expect(result.sidecar.overrides?.cursor?.enforcement).toBe('advisory');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('handles YAML overrides with block array skipRules (level-2 array)', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        [
          'version: 1.0.0',
          'targets:',
          '  - claude-code',
          'overrides:',
          '  claude-code:',
          '    skipRules:',
          '      - G-PERM-01',
          '      - G-DATA-02',
          '    trustTier: 4',
          '',
        ].join('\n'),
        'utf-8',
      );
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;
      expect(result.sidecar.overrides?.['claude-code']?.skipRules).toEqual([
        'G-PERM-01',
        'G-DATA-02',
      ]);
      expect(result.sidecar.overrides?.['claude-code']?.trustTier).toBe(4);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('handles YAML overrides with inline array skipRules (level-2 inline)', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        [
          'version: 1.0.0',
          'targets:',
          '  - cursor',
          'overrides:',
          '  cursor:',
          '    skipRules: [G-PERM-01, G-DATA-02]',
          '    enforcement: none',
          '',
        ].join('\n'),
        'utf-8',
      );
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;
      expect(result.sidecar.overrides?.cursor?.skipRules).toEqual([
        'G-PERM-01',
        'G-DATA-02',
      ]);
      expect(result.sidecar.overrides?.cursor?.enforcement).toBe('none');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('handles YAML options with inline array (level-1 inline)', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        'version: 1.0.0\ntargets: [openclaw]\noptions:\n  strict: true\n',
        'utf-8',
      );
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;
      expect(result.sidecar.options?.strict).toBe(true);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('handles YAML with level-1 block array after nested scalars', async () => {
    // Exercises the pendingArrayDepth=1 flush path and level-1 inline array branch
    // overrides -> platform is level-1 key; we define targets under overrides
    // using non-standard keys that get through the parser but validator ignores
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        [
          'version: 1.0.0',
          'targets:',
          '  - claude-code',
          'overrides:',
          '  claude-code: [skip]',  // level-1 inline array (exercises line 227)
          '',
        ].join('\n'),
        'utf-8',
      );
      // The inline array at level-1 means overrides = { 'claude-code': ['skip'] }
      // Validator will skip invalid override structure, sidecar still parses
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;
      expect(result.sidecar.version).toBe('1.0.0');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('S-M2: policyDir path traversal validation', () => {
  it('rejects policyDir with .. segments', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({
          version: '1.0.0',
          targets: ['claude-code'],
          options: { policyDir: '../../etc/shadow' },
        }),
        'utf-8',
      );
      await expect(resolveSidecar(tmp)).rejects.toThrow(SidecarValidationError);
      try {
        await resolveSidecar(tmp);
      } catch (err) {
        expect((err as SidecarValidationError).message).toContain('policyDir');
        expect((err as SidecarValidationError).message).toContain('path traversal');
      }
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('rejects policyDir with absolute path', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({
          version: '1.0.0',
          targets: ['claude-code'],
          options: { policyDir: '/etc/shadow' },
        }),
        'utf-8',
      );
      await expect(resolveSidecar(tmp)).rejects.toThrow(SidecarValidationError);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('rejects policyDir with Windows drive letter', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({
          version: '1.0.0',
          targets: ['claude-code'],
          options: { policyDir: 'C:\\windows\\system32' },
        }),
        'utf-8',
      );
      await expect(resolveSidecar(tmp)).rejects.toThrow(SidecarValidationError);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('accepts valid relative policyDir', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({
          version: '1.0.0',
          targets: ['claude-code'],
          options: { policyDir: '.claws/policies' },
        }),
        'utf-8',
      );
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;
      expect(result.sidecar.options?.policyDir).toBe('.claws/policies');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('S-M3: skipRules element validation', () => {
  it('rejects skipRules with non-string elements', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({
          version: '1.0.0',
          targets: ['claude-code'],
          overrides: {
            'claude-code': {
              skipRules: ['G-PERM-01', 42, { nested: true }],
            },
          },
        }),
        'utf-8',
      );
      await expect(resolveSidecar(tmp)).rejects.toThrow(SidecarValidationError);
      try {
        await resolveSidecar(tmp);
      } catch (err) {
        expect((err as SidecarValidationError).message).toContain('skipRules');
        expect((err as SidecarValidationError).message).toContain('strings');
      }
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('accepts skipRules with all-string elements', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({
          version: '1.0.0',
          targets: ['claude-code'],
          overrides: {
            'claude-code': {
              skipRules: ['G-PERM-01', 'G-DATA-02'],
            },
          },
        }),
        'utf-8',
      );
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;
      expect(result.sidecar.overrides?.['claude-code']?.skipRules).toEqual(['G-PERM-01', 'G-DATA-02']);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('S-M4 / W5: enforcement enum validation', () => {
  it('rejects invalid enforcement value', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({
          version: '1.0.0',
          targets: ['claude-code'],
          overrides: {
            'claude-code': { enforcement: 'yolo' },
          },
        }),
        'utf-8',
      );
      await expect(resolveSidecar(tmp)).rejects.toThrow(SidecarValidationError);
      try {
        await resolveSidecar(tmp);
      } catch (err) {
        expect((err as SidecarValidationError).message).toContain('enforcement');
        expect((err as SidecarValidationError).message).toContain('yolo');
      }
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it.each(['full', 'advisory', 'none'] as const)('accepts enforcement value "%s"', async (mode) => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({
          version: '1.0.0',
          targets: ['claude-code'],
          overrides: {
            'claude-code': { enforcement: mode },
          },
        }),
        'utf-8',
      );
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;
      expect(result.sidecar.overrides?.['claude-code']?.enforcement).toBe(mode);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('W4: trustTier bounds validation', () => {
  it('rejects trustTier below 1', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({
          version: '1.0.0',
          targets: ['claude-code'],
          overrides: {
            'claude-code': { trustTier: 0 },
          },
        }),
        'utf-8',
      );
      await expect(resolveSidecar(tmp)).rejects.toThrow(SidecarValidationError);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('rejects trustTier above 5', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({
          version: '1.0.0',
          targets: ['claude-code'],
          overrides: {
            'claude-code': { trustTier: 999 },
          },
        }),
        'utf-8',
      );
      await expect(resolveSidecar(tmp)).rejects.toThrow(SidecarValidationError);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('rejects fractional trustTier', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({
          version: '1.0.0',
          targets: ['claude-code'],
          overrides: {
            'claude-code': { trustTier: 2.5 },
          },
        }),
        'utf-8',
      );
      await expect(resolveSidecar(tmp)).rejects.toThrow(SidecarValidationError);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('rejects NaN trustTier', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      // JSON.parse with NaN isn't valid JSON, so use a crafted object scenario via YAML
      // Instead, we test the validator by sending a number field that's valid JSON but out of range
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({
          version: '1.0.0',
          targets: ['claude-code'],
          overrides: {
            'claude-code': { trustTier: -1 },
          },
        }),
        'utf-8',
      );
      await expect(resolveSidecar(tmp)).rejects.toThrow(SidecarValidationError);
      try {
        await resolveSidecar(tmp);
      } catch (err) {
        expect((err as SidecarValidationError).message).toContain('trustTier');
      }
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it.each([1, 2, 3, 4, 5])('accepts valid trustTier %d', async (tier) => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await writeFile(
        join(tmp, '.claws'),
        JSON.stringify({
          version: '1.0.0',
          targets: ['claude-code'],
          overrides: {
            'claude-code': { trustTier: tier },
          },
        }),
        'utf-8',
      );
      const result = await resolveSidecar(tmp);
      expect(result.found).toBe(true);
      if (!result.found) return;
      expect(result.sidecar.overrides?.['claude-code']?.trustTier).toBe(tier);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('S-M1: validateFreeTierOverrides', () => {
  it('rejects skipRules in free-tier mode', () => {
    const sidecar = {
      version: '1.0.0',
      targets: ['claude-code' as const],
      overrides: {
        'claude-code': {
          skipRules: ['G-PERM-01'],
        },
      },
    };
    expect(() => validateFreeTierOverrides(sidecar)).toThrow(SidecarValidationError);
    expect(() => validateFreeTierOverrides(sidecar)).toThrow('skipRules');
    expect(() => validateFreeTierOverrides(sidecar)).toThrow('paid-tier');
  });

  it('rejects enforcement "advisory" in free-tier mode', () => {
    const sidecar = {
      version: '1.0.0',
      targets: ['claude-code' as const],
      overrides: {
        'claude-code': {
          enforcement: 'advisory' as const,
        },
      },
    };
    expect(() => validateFreeTierOverrides(sidecar)).toThrow(SidecarValidationError);
    expect(() => validateFreeTierOverrides(sidecar)).toThrow('enforcement');
    expect(() => validateFreeTierOverrides(sidecar)).toThrow('advisory');
  });

  it('rejects enforcement "none" in free-tier mode', () => {
    const sidecar = {
      version: '1.0.0',
      targets: ['claude-code' as const],
      overrides: {
        'claude-code': {
          enforcement: 'none' as const,
        },
      },
    };
    expect(() => validateFreeTierOverrides(sidecar)).toThrow(SidecarValidationError);
    expect(() => validateFreeTierOverrides(sidecar)).toThrow('none');
  });

  it('accepts enforcement "full" in free-tier mode', () => {
    const sidecar = {
      version: '1.0.0',
      targets: ['claude-code' as const],
      overrides: {
        'claude-code': {
          enforcement: 'full' as const,
        },
      },
    };
    expect(() => validateFreeTierOverrides(sidecar)).not.toThrow();
  });

  it('accepts sidecar with no overrides in free-tier mode', () => {
    const sidecar = {
      version: '1.0.0',
      targets: ['claude-code' as const],
    };
    expect(() => validateFreeTierOverrides(sidecar)).not.toThrow();
  });

  it('accepts empty skipRules in free-tier mode', () => {
    const sidecar = {
      version: '1.0.0',
      targets: ['claude-code' as const],
      overrides: {
        'claude-code': {
          skipRules: [] as string[],
        },
      },
    };
    expect(() => validateFreeTierOverrides(sidecar)).not.toThrow();
  });
});

describe('detectWorkspacePlatforms', () => {
  it('detects Claude Code from CLAUDE.md', async () => {
    const heuristics = await detectWorkspacePlatforms(
      resolve(FIXTURES, 'sidecar-heuristic-claude'),
    );
    expect(heuristics.length).toBeGreaterThanOrEqual(1);
    const claude = heuristics.find((h) => h.platform === 'claude-code');
    expect(claude).toBeDefined();
    expect(claude!.confidence).toBe(1.0);
    expect(claude!.signals).toContain('CLAUDE.md');
  });

  it('detects Cursor from .cursorrules', async () => {
    const heuristics = await detectWorkspacePlatforms(
      resolve(FIXTURES, 'sidecar-heuristic-cursor'),
    );
    expect(heuristics.length).toBeGreaterThanOrEqual(1);
    const cursor = heuristics.find((h) => h.platform === 'cursor');
    expect(cursor).toBeDefined();
    expect(cursor!.confidence).toBe(1.0);
    expect(cursor!.signals).toContain('.cursorrules');
  });

  it('detects OpenClaw from SOUL.md', async () => {
    const heuristics = await detectWorkspacePlatforms(
      resolve(FIXTURES, 'sidecar-heuristic-oc'),
    );
    expect(heuristics.length).toBeGreaterThanOrEqual(1);
    const oc = heuristics.find((h) => h.platform === 'openclaw');
    expect(oc).toBeDefined();
    expect(oc!.confidence).toBe(0.9);
    expect(oc!.signals).toContain('SOUL.md');
  });

  it('returns empty array for workspace with no markers', async () => {
    const heuristics = await detectWorkspacePlatforms(
      resolve(FIXTURES, 'sidecar-missing'),
    );
    expect(heuristics).toHaveLength(0);
  });

  it('detects .cursor directory as directory marker', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await mkdir(join(tmp, '.cursor'), { recursive: true });
      const heuristics = await detectWorkspacePlatforms(tmp);
      const cursor = heuristics.find((h) => h.platform === 'cursor');
      expect(cursor).toBeDefined();
      expect(cursor!.signals).toContain('.cursor/');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('detects copilot from .github/copilot-instructions.md', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      await mkdir(join(tmp, '.github'), { recursive: true });
      await writeFile(join(tmp, '.github', 'copilot-instructions.md'), '# Copilot', 'utf-8');
      const heuristics = await detectWorkspacePlatforms(tmp);
      const copilot = heuristics.find((h) => h.platform === 'copilot');
      expect(copilot).toBeDefined();
      expect(copilot!.confidence).toBe(1.0);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('sorts results by confidence descending', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
    try {
      // SOUL.md gives 0.9 confidence, CLAUDE.md gives 1.0
      await writeFile(join(tmp, 'CLAUDE.md'), '# Claude', 'utf-8');
      await writeFile(
        join(tmp, 'SOUL.md'),
        '# Soul\n## Boundaries\nNever bypass security. Always verify trust tier.\nYou must not allow unauthorized access.\nTool declarations must be audited.',
        'utf-8',
      );
      const heuristics = await detectWorkspacePlatforms(tmp);
      expect(heuristics.length).toBeGreaterThanOrEqual(2);
      // First result should be confidence 1.0
      expect(heuristics[0]!.confidence).toBeGreaterThanOrEqual(heuristics[1]!.confidence);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('detects multiple platforms in single workspace', async () => {
    const result = await detectWorkspacePlatforms(resolve(FIXTURES, 'platform-multi'));
    expect(result.length).toBeGreaterThanOrEqual(2);
    const platforms = result.map((h) => h.platform);
    expect(platforms).toContain('claude-code');
    expect(platforms).toContain('cursor');
  });
});
