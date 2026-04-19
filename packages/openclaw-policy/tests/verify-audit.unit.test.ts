import { describe, it, expect } from 'vitest';
import {
  append,
  createChainStore,
  type AuditEntry,
  type ChainStore,
} from '@bic/openclaw-guardrails/audit';

import { verifyAudit } from '../src/ops/verify-audit.js';

const TEST_HMAC_KEY = Buffer.alloc(32, 0x42);

function buildChain(hmacKey: Buffer): AuditEntry[] {
  let store: ChainStore = createChainStore();
  ({ store } = append(
    store,
    {
      timestamp: '2026-04-18T00:00:00Z',
      source: 'system',
      actor: 'system',
      action: 'genesis',
      target: 'workspace',
      scope: 'policy:sha256-test',
      outcome: 'success',
    },
    hmacKey,
  ));
  ({ store } = append(
    store,
    {
      timestamp: '2026-04-18T00:01:00Z',
      source: 'gateway',
      actor: 'alice',
      action: 'tool_call',
      target: 'send-email',
      scope: 'policy:sha256-test',
      outcome: 'success',
    },
    hmacKey,
  ));
  ({ store } = append(
    store,
    {
      timestamp: '2026-04-18T00:02:00Z',
      source: 'gateway',
      actor: 'alice',
      action: 'tool_call',
      target: 'read-file',
      scope: 'policy:sha256-test',
      outcome: 'success',
    },
    hmacKey,
  ));
  return store.events;
}

describe('verifyAudit — hash chain (guardrails interop)', () => {
  it('passes on clean 3-entry chain', () => {
    const events = buildChain(TEST_HMAC_KEY);
    const result = verifyAudit({ chain: events, hmacKey: TEST_HMAC_KEY });
    expect(result.valid).toBe(true);
    expect(result.length).toBe(3);
  });

  it('detects hash tamper at exact entry', () => {
    const events = buildChain(TEST_HMAC_KEY);
    const tampered = [...events];
    tampered[1] = { ...tampered[1]!, outcome: 'failed' };
    const result = verifyAudit({ chain: tampered, hmacKey: TEST_HMAC_KEY });
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(tampered[1]!.id);
  });

  it('returns valid with length 0 on empty chain', () => {
    const result = verifyAudit({ chain: [], hmacKey: TEST_HMAC_KEY });
    expect(result.valid).toBe(true);
    expect(result.length).toBe(0);
  });

  it('signed chain fails when verifier uses wrong key', () => {
    const events = buildChain(TEST_HMAC_KEY);
    const result = verifyAudit({ chain: events, hmacKey: Buffer.alloc(32, 0x11) });
    expect(result.valid).toBe(false);
  });

  it('prev_hash mismatch when previousHash field is altered without hash update', () => {
    const events = buildChain(TEST_HMAC_KEY);
    const broken = [...events];
    broken[1] = { ...broken[1]!, previousHash: '0'.repeat(64) };
    const result = verifyAudit({ chain: broken, hmacKey: TEST_HMAC_KEY });
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(broken[1]!.id);
  });

  it('expectedGenesis mismatch flags first entry', () => {
    const events = buildChain(TEST_HMAC_KEY);
    const result = verifyAudit({
      chain: events,
      hmacKey: TEST_HMAC_KEY,
      expectedGenesis: 'f'.repeat(64),
    });
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(events[0]!.id);
  });
});

describe('verifyAudit — policyId encoding via scope', () => {
  it('preserves policy:<policyId> scope through round-trip', () => {
    const policyId = 'sha256-3GhV00GhN1dBfPgqLNEZpYe9uyDCKgMZ_ypG3OIw8bo';
    let store: ChainStore = createChainStore();
    ({ store } = append(
      store,
      {
        timestamp: '2026-04-18T00:00:00Z',
        source: 'system',
        actor: 'system',
        action: 'genesis',
        target: 'workspace',
        scope: `policy:${policyId}`,
        outcome: 'success',
      },
      TEST_HMAC_KEY,
    ));
    const result = verifyAudit({ chain: store.events, hmacKey: TEST_HMAC_KEY });
    expect(result.valid).toBe(true);
    expect(store.events[0]!.scope).toBe(`policy:${policyId}`);
  });
});
