/**
 * L0: registry-client — publish, query, and validation for ClawHub.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validatePackageForPublish,
  publishToRegistry,
  queryRegistry,
  type RegistryPackage,
  type RegistryCredentials,
  type RegistryQuery,
} from '../../src/publish/registry-client.js';

/* ── Helpers ─────────────────────────────────────────────────────────── */

function validPkg(overrides?: Partial<RegistryPackage>): RegistryPackage {
  return {
    name: '@openclaw/audit-chain',
    version: '1.0.0',
    description: 'Audit chain for compliance',
    artifacts: [{ name: 'main.ts', content: 'export {}' }],
    contentHash: 'sha256-abc123',
    ...overrides,
  };
}

function httpsCreds(overrides?: Partial<RegistryCredentials>): RegistryCredentials {
  return {
    token: 'test-token-xyz',
    endpoint: 'https://registry.clawhub.io',
    ...overrides,
  };
}

function localhostCreds(): RegistryCredentials {
  return {
    token: 'dev-token',
    endpoint: 'http://localhost:4873',
  };
}

/* ── validatePackageForPublish ───────────────────────────────────────── */

describe('validatePackageForPublish', () => {
  it('passes a fully valid package', () => {
    const result = validatePackageForPublish(validPkg());
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('passes a valid unscoped package name', () => {
    const result = validatePackageForPublish(validPkg({ name: 'my-package' }));
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  // ── Name validation ──

  it('errors on empty name', () => {
    const result = validatePackageForPublish(validPkg({ name: '' }));
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ severity: 'error', field: 'name' }),
    );
  });

  it('errors on whitespace-only name', () => {
    const result = validatePackageForPublish(validPkg({ name: '   ' }));
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ severity: 'error', field: 'name' }),
    );
  });

  it('warns on non-conventional name', () => {
    const result = validatePackageForPublish(validPkg({ name: 'bad name with spaces' }));
    expect(result.valid).toBe(true); // warning, not error
    expect(result.issues).toContainEqual(
      expect.objectContaining({ severity: 'warning', field: 'name' }),
    );
  });

  // ── Version validation ──

  it('errors on empty version', () => {
    const result = validatePackageForPublish(validPkg({ version: '' }));
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ severity: 'error', field: 'version' }),
    );
  });

  it('errors on whitespace-only version', () => {
    const result = validatePackageForPublish(validPkg({ version: '   ' }));
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ severity: 'error', field: 'version' }),
    );
  });

  it('errors on non-semver version', () => {
    const result = validatePackageForPublish(validPkg({ version: 'latest' }));
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        field: 'version',
        message: expect.stringContaining('semver'),
      }),
    );
  });

  it('accepts valid semver with pre-release suffix', () => {
    const result = validatePackageForPublish(validPkg({ version: '2.0.0-beta.1' }));
    expect(result.valid).toBe(true);
  });

  // ── Artifacts validation ──

  it('errors when artifacts array is empty', () => {
    const result = validatePackageForPublish(validPkg({ artifacts: [] }));
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ severity: 'error', field: 'artifacts' }),
    );
  });

  it('errors when an artifact has empty content', () => {
    const result = validatePackageForPublish(
      validPkg({ artifacts: [{ name: 'empty.ts', content: '' }] }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        field: 'artifacts.empty.ts',
      }),
    );
  });

  it('allows multiple valid artifacts', () => {
    const result = validatePackageForPublish(
      validPkg({
        artifacts: [
          { name: 'a.ts', content: 'export const a = 1;' },
          { name: 'b.ts', content: 'export const b = 2;' },
        ],
      }),
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  // ── Content hash validation ──

  it('errors on empty contentHash', () => {
    const result = validatePackageForPublish(validPkg({ contentHash: '' }));
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ severity: 'error', field: 'contentHash' }),
    );
  });

  it('errors on whitespace-only contentHash', () => {
    const result = validatePackageForPublish(validPkg({ contentHash: '   ' }));
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ severity: 'error', field: 'contentHash' }),
    );
  });

  // ── Multiple issues at once ──

  it('collects multiple errors simultaneously', () => {
    const result = validatePackageForPublish(
      validPkg({
        name: '',
        version: '',
        artifacts: [],
        contentHash: '',
      }),
    );
    expect(result.valid).toBe(false);
    // name + version + artifacts + contentHash = 4 errors
    expect(result.issues.length).toBeGreaterThanOrEqual(4);
  });
});

/* ── publishToRegistry ──────────────────────────────────────────────── */

describe('publishToRegistry', () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  // ── Endpoint security ──

  it('rejects non-HTTPS non-localhost endpoint', async () => {
    await expect(
      publishToRegistry(validPkg(), { token: 'tok', endpoint: 'http://evil.example.com' }),
    ).rejects.toThrow(/HTTPS/);
  });

  it('rejects invalid endpoint URL', async () => {
    await expect(
      publishToRegistry(validPkg(), { token: 'tok', endpoint: 'not-a-url' }),
    ).rejects.toThrow(/Invalid registry endpoint/);
  });

  it('allows http://localhost endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
    });
    const result = await publishToRegistry(validPkg(), localhostCreds());
    expect(result.success).toBe(true);
  });

  it('allows http://127.0.0.1 endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
    });
    const result = await publishToRegistry(
      validPkg(),
      { token: 'tok', endpoint: 'http://127.0.0.1:4873' },
    );
    expect(result.success).toBe(true);
  });

  // ── Validation gate ──

  it('returns validation errors without calling fetch', async () => {
    const spy = vi.fn();
    globalThis.fetch = spy;
    const result = await publishToRegistry(
      validPkg({ name: '', version: '' }),
      httpsCreds(),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/validation failed/i);
    expect(spy).not.toHaveBeenCalled();
  });

  // ── Success path ──

  it('publishes successfully on 2xx response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
    });
    const pkg = validPkg();
    const result = await publishToRegistry(pkg, httpsCreds());
    expect(result).toEqual({
      success: true,
      published: '@openclaw/audit-chain@1.0.0',
      statusCode: 201,
    });
  });

  it('sends correct request to registry', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = spy;
    const pkg = validPkg({ signingKeyId: 'key-42' });
    await publishToRegistry(pkg, httpsCreds());

    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe('https://registry.clawhub.io/v1/packages');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['Authorization']).toBe('Bearer test-token-xyz');
    const body = JSON.parse(init.body);
    expect(body.name).toBe('@openclaw/audit-chain');
    expect(body.signingKeyId).toBe('key-42');
  });

  // ── Error responses ──

  it('returns error on non-ok HTTP response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: vi.fn().mockResolvedValue('version already exists'),
    });
    const result = await publishToRegistry(validPkg(), httpsCreds());
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(409);
    expect(result.error).toContain('409');
    expect(result.error).toContain('version already exists');
  });

  it('handles response.text() failure gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockRejectedValue(new Error('stream error')),
    });
    const result = await publishToRegistry(validPkg(), httpsCreds());
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.error).toContain('500');
  });

  // ── Network errors ──

  it('handles fetch rejection with Error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await publishToRegistry(validPkg(), httpsCreds());
    expect(result.success).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('handles fetch rejection with non-Error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue('network down');
    const result = await publishToRegistry(validPkg(), httpsCreds());
    expect(result.success).toBe(false);
    expect(result.error).toContain('network down');
  });
});

/* ── queryRegistry ──────────────────────────────────────────────────── */

describe('queryRegistry', () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  const defaultQuery: RegistryQuery = { term: 'audit' };

  // ── Endpoint security ──

  it('rejects non-HTTPS non-localhost endpoint', async () => {
    await expect(
      queryRegistry(defaultQuery, { token: 'tok', endpoint: 'http://external.example.com' }),
    ).rejects.toThrow(/HTTPS/);
  });

  it('rejects invalid endpoint URL', async () => {
    await expect(
      queryRegistry(defaultQuery, { token: 'tok', endpoint: '???invalid' }),
    ).rejects.toThrow(/Invalid registry endpoint/);
  });

  // ── Success path ──

  it('returns results on successful query', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        results: [
          { name: '@openclaw/audit-chain', version: '1.2.0', description: 'Audit', downloads: 500 },
        ],
        totalCount: 1,
      }),
    });
    const result = await queryRegistry(defaultQuery, httpsCreds());
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].name).toBe('@openclaw/audit-chain');
    expect(result.totalCount).toBe(1);
  });

  it('builds correct URL with default limit and offset', async () => {
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: [], totalCount: 0 }),
    });
    globalThis.fetch = spy;
    await queryRegistry({ term: 'compliance' }, httpsCreds());

    const [url, init] = spy.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/v1/packages/search');
    expect(parsed.searchParams.get('q')).toBe('compliance');
    expect(parsed.searchParams.get('limit')).toBe('20');
    expect(parsed.searchParams.get('offset')).toBe('0');
    expect(init.method).toBe('GET');
    expect(init.headers['Authorization']).toBe('Bearer test-token-xyz');
  });

  it('uses custom limit and offset', async () => {
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: [], totalCount: 0 }),
    });
    globalThis.fetch = spy;
    await queryRegistry({ term: 'x', limit: 5, offset: 10 }, httpsCreds());

    const [url] = spy.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.searchParams.get('limit')).toBe('5');
    expect(parsed.searchParams.get('offset')).toBe('10');
  });

  it('defaults missing results/totalCount from response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });
    const result = await queryRegistry(defaultQuery, httpsCreds());
    expect(result.success).toBe(true);
    expect(result.results).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  // ── Error responses ──

  it('returns error on non-ok HTTP response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    const result = await queryRegistry(defaultQuery, httpsCreds());
    expect(result.success).toBe(false);
    expect(result.error).toContain('401');
    expect(result.results).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  // ── Network errors ──

  it('handles fetch rejection with Error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ENOTFOUND'));
    const result = await queryRegistry(defaultQuery, httpsCreds());
    expect(result.success).toBe(false);
    expect(result.error).toContain('ENOTFOUND');
    expect(result.results).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('handles fetch rejection with non-Error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(42);
    const result = await queryRegistry(defaultQuery, httpsCreds());
    expect(result.success).toBe(false);
    expect(result.error).toContain('42');
  });

  it('works with http://localhost endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: [], totalCount: 0 }),
    });
    const result = await queryRegistry(defaultQuery, localhostCreds());
    expect(result.success).toBe(true);
  });
});
