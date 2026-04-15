/**
 * L0 unit tests for bypass mode.
 *
 * 2 tests:
 *  1. CLAWS_BYPASS=1 activates bypass and records audit event
 *  2. fleet.allowBypass=false prevents bypass even when env is set
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { checkBypass, CLAWS_BYPASS_ENV } from '@bic/claws-sdk/init';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-bypass-unit-'));
  // Create .claws/audit so bypass can write audit events
  await mkdir(join(tempDir, '.claws', 'audit'), { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('bypass', () => {
  it('activates bypass and records BYPASS_ACTIVATED when CLAWS_BYPASS=1', async () => {
    const env = { [CLAWS_BYPASS_ENV]: '1' };
    const result = await checkBypass(tempDir, undefined, env);

    expect(result.bypassed).toBe(true);
    expect(result.reason).toBe('env-bypass');
    expect(result.auditRecorded).toBe(true);

    // Verify signed audit event was written to chain.jsonl
    const auditContent = await readFile(
      join(tempDir, '.claws', 'audit', 'chain.jsonl'),
      'utf-8',
    );
    const event = JSON.parse(auditContent.trim());
    expect(event.eventType).toBe('BYPASS_ACTIVATED');
    expect(event.actor).toBeTruthy();
    expect(event.hmacSignature).toMatch(/^[0-9a-f]{64}$/);
    expect(event.timestamp).toBeDefined();
  });

  it('prevents bypass when fleet.allowBypass=false', async () => {
    const env = { [CLAWS_BYPASS_ENV]: '1' };
    const fleetPolicy = { allowBypass: false };
    const result = await checkBypass(tempDir, fleetPolicy, env);

    expect(result.bypassed).toBe(false);
    expect(result.reason).toBe('fleet-prohibited');
    expect(result.auditRecorded).toBe(false);
  });

  it('returns not-requested when CLAWS_BYPASS is not set', async () => {
    const env = {};
    const result = await checkBypass(tempDir, undefined, env);

    expect(result.bypassed).toBe(false);
    expect(result.reason).toBe('not-requested');
    expect(result.auditRecorded).toBe(false);
  });

  it('returns not-requested when CLAWS_BYPASS is set to something other than 1', async () => {
    const env = { [CLAWS_BYPASS_ENV]: 'true' };
    const result = await checkBypass(tempDir, undefined, env);

    expect(result.bypassed).toBe(false);
    expect(result.reason).toBe('not-requested');
    expect(result.auditRecorded).toBe(false);
  });

  it('activates bypass when fleet.allowBypass=true', async () => {
    const env = { [CLAWS_BYPASS_ENV]: '1' };
    const fleetPolicy = { allowBypass: true };
    const result = await checkBypass(tempDir, fleetPolicy, env);

    expect(result.bypassed).toBe(true);
    expect(result.reason).toBe('env-bypass');
    expect(result.auditRecorded).toBe(true);
  });
});
