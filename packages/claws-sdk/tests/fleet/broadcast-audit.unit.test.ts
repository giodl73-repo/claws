/**
 * L0 unit tests for broadcast audit trail — covers both branches
 * of the actor parameter (provided vs. omitted).
 *
 * @module claws-sdk/tests/fleet/broadcast-audit.unit
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { recordBroadcastAuditEvent } from '#src/fleet/broadcast-audit.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'broadcast-audit-unit-'));
  // Set up minimal workspace with claws.json for readPolicyVersion
  writeFileSync(join(tempDir, 'claws.json'), JSON.stringify({ version: '1.2.3' }));
  mkdirSync(join(tempDir, '.claws', 'audit'), { recursive: true });
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('recordBroadcastAuditEvent', () => {
  it('records audit event with explicit actor', async () => {
    const entry = await recordBroadcastAuditEvent(
      tempDir,
      'soc2-baseline.yaml',
      'Q2 compliance push',
      'ci-pipeline',
    );

    expect(entry.eventType).toBe('BROADCAST_APPLIED');
    expect(entry.action).toBe('broadcast:soc2-baseline.yaml');
    expect(entry.outcome).toBe('allow');
    expect(entry.ruleId).toBe('FLEET-BROADCAST');
    expect(entry.severity).toBe(3);
    expect(entry.actor).toBe('ci-pipeline');
    expect(entry.policyVersion).toBe('1.2.3');
  });

  it('records audit event without explicit actor (uses OS user)', async () => {
    const entry = await recordBroadcastAuditEvent(
      tempDir,
      'hipaa-policy.yaml',
      'Monthly sync',
    );

    expect(entry.eventType).toBe('BROADCAST_APPLIED');
    expect(entry.action).toBe('broadcast:hipaa-policy.yaml');
    // actor should be resolved from OS (not undefined)
    expect(entry.actor).toBeTruthy();
    expect(typeof entry.actor).toBe('string');
  });
});
