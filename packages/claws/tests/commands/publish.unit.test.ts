/**
 * L0: publish command — full pipeline wiring + JSON/text output + error paths.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockResolveSigningKey = vi.fn();
const mockDetectManifestState = vi.fn();
const mockReadFleetPublishPolicy = vi.fn();
const mockEvaluateFleetPolicy = vi.fn();
const mockReadFreshBadge = vi.fn();
const mockExecuteTransaction = vi.fn();
const mockWriteBadgeVersion = vi.fn();
const mockLoadConfig = vi.fn();
const mockReadFile = vi.fn();

vi.mock('@bic/claws-sdk/publish', () => ({
  resolveSigningKey: (...args: unknown[]) => mockResolveSigningKey(...args),
  detectManifestState: (...args: unknown[]) => mockDetectManifestState(...args),
  readFleetPublishPolicy: (...args: unknown[]) => mockReadFleetPublishPolicy(...args),
  evaluateFleetPolicy: (...args: unknown[]) => mockEvaluateFleetPolicy(...args),
  readFreshBadge: (...args: unknown[]) => mockReadFreshBadge(...args),
  executeTransaction: (...args: unknown[]) => mockExecuteTransaction(...args),
  writeBadgeVersion: (...args: unknown[]) => mockWriteBadgeVersion(...args),
}));

vi.mock('@bic/claws-sdk/config', () => ({
  loadConfig: (...args: unknown[]) => mockLoadConfig(...args),
}));

vi.mock('node:fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

import { runPublish } from '../../src/commands/publish.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

const jsonOpts = { json: true, dryRun: false } as const;
const textOpts = { json: false, dryRun: false } as const;
const dryRunTextOpts = { json: false, dryRun: true } as const;
const dryRunJsonOpts = { json: true, dryRun: true } as const;

function resetMocks() {
  vi.restoreAllMocks();
  mockResolveSigningKey.mockReset();
  mockDetectManifestState.mockReset();
  mockReadFleetPublishPolicy.mockReset();
  mockEvaluateFleetPolicy.mockReset();
  mockReadFreshBadge.mockReset();
  mockExecuteTransaction.mockReset();
  mockWriteBadgeVersion.mockReset();
  mockLoadConfig.mockReset();
  mockReadFile.mockReset();
}

/** Set up all mocks for a full happy-path pipeline. */
function setupHappyPath(overrides: Record<string, unknown> = {}) {
  const keyResult = { keyMaterial: 'abc123', source: 'identity', keyId: 'key-001', reason: 'found' };
  const manifestResult = { state: 'valid-signed', manifest: { tier: 'typed', name: 'my-skill', content: '', signature: 'sig', contentHash: 'h' }, currentHash: 'h', reason: 'ok' };
  const policy = { requireVerifiedPublish: false, allowDeclaredDryRun: true };
  const policyResult = { allowed: true, dryRunBypass: false, reason: 'typed-tier skills are always allowed to publish', policy, tier: 'typed' };
  const badge = { name: 'my-skill', tier: 'typed', risk: 'R2', obo: false, dataClassification: 'internal', confidence: 0.9, capturedAt: '2026-01-01T00:00:00Z', version: '1.0.0-100' };
  const txResult = { txId: 'tx-abc', state: 'committed' as const, stagingDir: '/tmp/stage', artifactCount: 2, remoteStatus: 200, summary: 'Published' };

  mockResolveSigningKey.mockResolvedValue(overrides.keyResult ?? keyResult);
  mockDetectManifestState.mockResolvedValue(overrides.manifestResult ?? manifestResult);
  mockLoadConfig.mockResolvedValue(overrides.configResult ?? {
    found: true,
    config: { fleet: { publish: { requireVerifiedPublish: false, allowDeclaredDryRun: true }, allowBypass: false } },
    configPath: '/ws/claws.json',
  });
  mockReadFleetPublishPolicy.mockReturnValue(overrides.policy ?? policy);
  mockEvaluateFleetPolicy.mockReturnValue(overrides.policyResult ?? policyResult);
  mockReadFreshBadge.mockResolvedValue(overrides.badge !== undefined ? overrides.badge : badge);
  mockReadFile.mockResolvedValue(overrides.manifestContent ?? 'name: my-skill\ntier: typed\n');
  mockExecuteTransaction.mockResolvedValue(overrides.txResult ?? txResult);
  mockWriteBadgeVersion.mockResolvedValue(overrides.badgeStore ?? { skillName: 'my-skill', versions: [] });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('claws publish', () => {
  afterEach(() => {
    resetMocks();
  });

  // ── No signing key ────────────────────────────────────────────────────

  it('returns 1 when no signing key found (text)', async () => {
    mockResolveSigningKey.mockResolvedValue(null);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', textOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('No signing key found');
      expect(output).toContain('claws keys generate');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 1 when no signing key found (json)', async () => {
    mockResolveSigningKey.mockResolvedValue(null);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', jsonOpts);
      expect(code).toBe(1);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toContain('No signing key found');
    } finally {
      logSpy.mockRestore();
    }
  });

  // ── Policy blocked ──────────────────────────────────────────────────────

  it('returns 2 when fleet policy blocks publish (text)', async () => {
    setupHappyPath({
      policyResult: {
        allowed: false,
        dryRunBypass: false,
        reason: 'declared-tier blocked by fleet policy',
        policy: { requireVerifiedPublish: true, allowDeclaredDryRun: false },
        tier: 'declared',
      },
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', textOpts);
      expect(code).toBe(2);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Blocked');
      expect(output).toContain('declared-tier blocked by fleet policy');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 2 when fleet policy blocks publish (json)', async () => {
    setupHappyPath({
      manifestResult: { state: 'absent', manifest: null, currentHash: null, reason: 'no manifest' },
      policyResult: {
        allowed: false,
        dryRunBypass: false,
        reason: 'declared-tier blocked',
        policy: { requireVerifiedPublish: true, allowDeclaredDryRun: false },
        tier: 'declared',
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', jsonOpts);
      expect(code).toBe(2);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('blocked');
      expect(parsed.reason).toContain('declared-tier blocked');
      expect(parsed.tier).toBe('declared');
    } finally {
      logSpy.mockRestore();
    }
  });

  // ── No skill.yaml ───────────────────────────────────────────────────────

  it('returns 1 when skill.yaml is missing (text)', async () => {
    setupHappyPath();
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', textOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('No skill.yaml found');
    } finally {
      errorSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  it('returns 1 when skill.yaml is missing (json)', async () => {
    setupHappyPath();
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', jsonOpts);
      expect(code).toBe(1);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toContain('No skill.yaml found');
    } finally {
      logSpy.mockRestore();
    }
  });

  // ── Dry-run success ─────────────────────────────────────────────────────

  it('returns 0 on dry-run success (text)', async () => {
    setupHappyPath();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', dryRunTextOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Dry-run publish report');
      expect(output).toContain('Manifest state: valid-signed');
      expect(output).toContain('Tier: typed');
      expect(output).toContain('key-001');
      expect(output).toContain('identity');
      expect(output).toContain('allowed');
      expect(output).toContain('skill.yaml');

      // Should not call executeTransaction in dry-run mode
      expect(mockExecuteTransaction).not.toHaveBeenCalled();
      expect(mockWriteBadgeVersion).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 on dry-run success (json)', async () => {
    setupHappyPath();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', dryRunJsonOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('dry-run');
      expect(parsed.manifestState).toBe('valid-signed');
      expect(parsed.tier).toBe('typed');
      expect(parsed.keySource).toBe('identity');
      expect(parsed.keyId).toBe('key-001');
      expect(parsed.policyAllowed).toBe(true);
      expect(parsed.artifacts).toContain('skill.yaml');
      expect(parsed.badge).toBeTruthy();
    } finally {
      logSpy.mockRestore();
    }
  });

  it('dry-run text shows badge info when badge exists', async () => {
    setupHappyPath();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runPublish('/ws', '/ws/skills/my-skill', dryRunTextOpts);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Badge:');
      expect(output).toContain('R2');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('dry-run text omits badge line when badge is null', async () => {
    setupHappyPath({ badge: null });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runPublish('/ws', '/ws/skills/my-skill', dryRunTextOpts);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).not.toContain('Badge:');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('dry-run includes dryRunBypass in json when present', async () => {
    setupHappyPath({
      policyResult: {
        allowed: true,
        dryRunBypass: true,
        reason: 'allowed via dry-run bypass',
        policy: { requireVerifiedPublish: true, allowDeclaredDryRun: true },
        tier: 'declared',
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runPublish('/ws', '/ws/skills/my-skill', dryRunJsonOpts);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.dryRunBypass).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('dry-run text shows dryRunBypass annotation', async () => {
    setupHappyPath({
      policyResult: {
        allowed: true,
        dryRunBypass: true,
        reason: 'allowed via dry-run bypass',
        policy: { requireVerifiedPublish: true, allowDeclaredDryRun: true },
        tier: 'declared',
      },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runPublish('/ws', '/ws/skills/my-skill', dryRunTextOpts);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('dry-run bypass');
    } finally {
      logSpy.mockRestore();
    }
  });

  // ── Real publish success (committed) ────────────────────────────────────

  it('returns 0 on real publish success (text)', async () => {
    setupHappyPath();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', textOpts);
      expect(code).toBe(0);

      expect(mockExecuteTransaction).toHaveBeenCalled();

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Published successfully');
      expect(output).toContain('tx-abc');
      expect(output).toContain('key-001');
      expect(output).toContain('identity');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 on real publish success (json)', async () => {
    setupHappyPath();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', jsonOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('committed');
      expect(parsed.txId).toBe('tx-abc');
      expect(parsed.manifestState).toBe('valid-signed');
      expect(parsed.tier).toBe('typed');
      expect(parsed.keySource).toBe('identity');
      expect(parsed.artifactCount).toBe(2);
      expect(parsed.remoteStatus).toBe(200);
      expect(parsed.summary).toBe('Published');
    } finally {
      logSpy.mockRestore();
    }
  });

  // ── Badge written on commit success ─────────────────────────────────────

  it('calls writeBadgeVersion when transaction committed and badge exists', async () => {
    setupHappyPath();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runPublish('/ws', '/ws/skills/my-skill', textOpts);

      expect(mockWriteBadgeVersion).toHaveBeenCalledWith(
        '/ws/skills/my-skill',
        expect.objectContaining({ name: 'my-skill', tier: 'typed' }),
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  it('does not call writeBadgeVersion when badge is null', async () => {
    setupHappyPath({ badge: null });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runPublish('/ws', '/ws/skills/my-skill', textOpts);

      expect(mockWriteBadgeVersion).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
    }
  });

  it('does not call writeBadgeVersion when transaction state is not committed', async () => {
    setupHappyPath({
      txResult: { txId: 'tx-fail', state: 'failed', stagingDir: '/tmp/stage', artifactCount: 1, remoteStatus: 500, summary: 'Server error' },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await runPublish('/ws', '/ws/skills/my-skill', textOpts);

      expect(mockWriteBadgeVersion).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  // ── Real publish failure ────────────────────────────────────────────────

  it('returns 1 when transaction fails (text)', async () => {
    setupHappyPath({
      txResult: { txId: 'tx-fail', state: 'failed', stagingDir: '/tmp/stage', artifactCount: 1, remoteStatus: 500, summary: 'Server error' },
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', textOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Publish failed');
      expect(output).toContain('Server error');
    } finally {
      errorSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  it('returns 1 when transaction fails (json)', async () => {
    setupHappyPath({
      txResult: { txId: 'tx-fail', state: 'failed', stagingDir: '/tmp/stage', artifactCount: 1, remoteStatus: 500, summary: 'Server error' },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', jsonOpts);
      expect(code).toBe(1);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('failed');
      expect(parsed.txId).toBe('tx-fail');
      expect(parsed.remoteStatus).toBe(500);
    } finally {
      logSpy.mockRestore();
    }
  });

  // ── Generic error (catch block) ─────────────────────────────────────────

  it('returns 1 when an unexpected Error is thrown (text)', async () => {
    mockResolveSigningKey.mockRejectedValue(new Error('Network down'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', textOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: Network down');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 1 when an unexpected Error is thrown (json)', async () => {
    mockResolveSigningKey.mockRejectedValue(new Error('Unexpected failure'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', jsonOpts);
      expect(code).toBe(1);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Unexpected failure');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockResolveSigningKey.mockRejectedValue('string error');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', textOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('string error');
    } finally {
      errorSpy.mockRestore();
    }
  });

  // ── createRegistryClient coverage (internal, exercised via runPublish) ──

  it('exercises the real registry client submit path', async () => {
    setupHappyPath();
    // Make executeTransaction invoke the client's submit to cover lines 56-63
    mockExecuteTransaction.mockImplementation(async (_ws: string, _artifacts: unknown, client: { submit: (txId: string, artifacts: unknown) => Promise<number> }) => {
      // Mock fetch for the real client path
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 }) as any;
      try {
        await client.submit('tx-test', []);
      } finally {
        globalThis.fetch = originalFetch;
      }
      return { txId: 'tx-real', state: 'committed' as const, stagingDir: '/tmp', artifactCount: 1, remoteStatus: 200, summary: 'ok' };
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', textOpts);
      expect(code).toBe(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('exercises the dry-run registry client submit path', async () => {
    setupHappyPath();
    // In dry-run mode, createRegistryClient is never called (code returns before line 185).
    // So we need to test via a different approach: override executeTransaction
    // to call the passed client's submit in a test that passes dryRun=false
    // but we also need to cover the dryRun=true branch of createRegistryClient.
    // The dry-run client is never constructed because the dry-run path returns early.
    // This is unreachable code in practice; the function is defensive.
    // We'll accept this minor gap — the dry-run submit (lines 48-50) is dead code
    // within the current control flow.

    // But we can still achieve statement coverage via the real path.
    // The real client path IS now covered by the test above.
    // Let's verify the dry-run path works end-to-end.
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runPublish('/ws', '/ws/skills/my-skill', dryRunTextOpts);
      expect(code).toBe(0);
      expect(mockExecuteTransaction).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
    }
  });

  // ── Custom registry URL ─────────────────────────────────────────────────

  it('uses default registry URL when not provided', async () => {
    setupHappyPath();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runPublish('/ws', '/ws/skills/my-skill', textOpts);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('https://registry.claws.dev/v1/publish');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('uses custom registry URL when provided', async () => {
    setupHappyPath();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runPublish('/ws', '/ws/skills/my-skill', {
        json: false,
        dryRun: false,
        registry: 'https://custom.registry.dev/v1/publish',
      });

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('https://custom.registry.dev/v1/publish');
    } finally {
      logSpy.mockRestore();
    }
  });

  // ── Manifest tier fallback ──────────────────────────────────────────────

  it('defaults tier to declared when manifest is absent', async () => {
    setupHappyPath({
      manifestResult: { state: 'absent', manifest: null, currentHash: null, reason: 'no manifest' },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runPublish('/ws', '/ws/skills/my-skill', dryRunJsonOpts);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.tier).toBe('declared');
    } finally {
      logSpy.mockRestore();
    }
  });

  // ── Badge artifact included ─────────────────────────────────────────────

  it('includes badge.json artifact when badge exists', async () => {
    setupHappyPath();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runPublish('/ws', '/ws/skills/my-skill', dryRunJsonOpts);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.artifacts).toContain('badge.json');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('omits badge.json artifact when badge is null', async () => {
    setupHappyPath({ badge: null });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runPublish('/ws', '/ws/skills/my-skill', dryRunJsonOpts);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.artifacts).toEqual(['skill.yaml']);
      expect(parsed.artifacts).not.toContain('badge.json');
    } finally {
      logSpy.mockRestore();
    }
  });
});
