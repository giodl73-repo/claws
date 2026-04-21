/**
 * L1 integration: library↔library contract proof (pulse 47.1 D5).
 *
 * Pulse body asks for a generate→verifyAudit round-trip. The library shapes
 * diverge from the pulse body assumption: `generate()` is a filesystem
 * scaffold that returns empty `writtenFiles` (P52 owns the fs pipeline), and
 * `emitAuditManifest` produces an event-taxonomy JSON (not a hash chain).
 * `verifyAudit` operates on an in-memory `AuditEntry[]` built by
 * guardrails' `append()`.
 *
 * This test proves the two contract halves the pulse intended:
 *   1. generator emits a structurally-valid audit-manifest JSON;
 *   2. a chain produced through guardrails' append pipeline is accepted by
 *      `verifyAudit` — the handler's downstream consumer.
 *
 * Together they show: generator output shape is what the verifier stack
 * speaks. When P52 wires the fs pipeline, this test gains the live
 * generate() round-trip the pulse originally described.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  append,
  createChainStore,
  type AuditEntry,
  type ChainStore,
} from '@bic/openclaw-guardrails/audit';

import { generateInMemory, generate } from '../src/generator.js';
import { deriveFixtureHmacKey } from '../src/emit/emit-audit-chain.js';
import { verifyAudit } from '../src/ops/verify-audit.js';
import { waffles } from './helpers/fixture.js';

const TEST_HMAC_KEY = Buffer.alloc(32, 0x17);

function draftFrom(ir: ReturnType<typeof waffles>) {
  const { policyId: _id, canonicalizerVersion: _cv, ...draft } = ir;
  return draft;
}

describe('generate + verify round-trip (library contract)', () => {
  it('generateInMemory emits a canonical audit-manifest JSON with event taxonomy', () => {
    const out = generateInMemory({
      workspaceRoot: '/tmp/fixture',
      draft: draftFrom(waffles()),
    });
    const manifest = JSON.parse(out.auditManifest) as {
      version: string;
      snapshotId: string;
      events: Array<{ event: string; trigger: string; severity: string }>;
    };
    expect(manifest.version).toBe('0.1.0');
    expect(manifest.snapshotId).toMatch(/^sha256-/);
    expect(manifest.events.map((e) => e.event)).toContain('tool_call');
    expect(manifest.events.map((e) => e.event)).toContain('tool_call_denied');
  });

  it('verifyAudit accepts a chain built via guardrails append — the shape the handler consumes', () => {
    let store: ChainStore = createChainStore();
    ({ store } = append(
      store,
      {
        timestamp: '2026-04-18T00:00:00Z',
        source: 'system',
        actor: 'system',
        action: 'genesis',
        target: 'workspace',
        scope: 'policy:sha256-roundtrip',
        outcome: 'success',
      },
      TEST_HMAC_KEY,
    ));
    ({ store } = append(
      store,
      {
        timestamp: '2026-04-18T00:01:00Z',
        source: 'gateway',
        actor: 'alice',
        action: 'tool_call',
        target: 'post-to-channel',
        scope: 'policy:sha256-roundtrip',
        outcome: 'success',
      },
      TEST_HMAC_KEY,
    ));

    const result = verifyAudit({ chain: store.events, hmacKey: TEST_HMAC_KEY });
    expect(result.valid).toBe(true);
    expect(result.length).toBe(2);
    expect(result.genesis).toBe(store.events[0]!.hash);
    expect(result.latest).toBe(store.events[1]!.hash);
  });

  it('generate() fs pipeline emits three artifacts whose audit-manifest round-trips through verifyAudit', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-roundtrip-'));
    try {
      const res = await generate({ workspaceRoot: ws });
      expect(res.writtenFiles).toHaveLength(3);
      const manifestPath = join(ws, '.openclaw', 'policy', 'audit-manifest.json');
      const raw = readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(raw) as {
        policyId: string;
        chain: AuditEntry[];
      };
      expect(Array.isArray(manifest.chain)).toBe(true);
      expect(manifest.chain.length).toBe(3);
      const key = deriveFixtureHmacKey(manifest.policyId);
      const result = verifyAudit({ chain: manifest.chain, hmacKey: key });
      expect(result.valid).toBe(true);
      expect(result.length).toBe(3);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });
});
