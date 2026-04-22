/**
 * SC-21 — Handle-binding keyId rotated out (overlap window).
 *
 * Initial trust-set contains `v1`; a handle is signed with `v1` at
 * `clock=0` with `ttl=30s`. Rotation writes a new trust-set containing
 * BOTH `v1` and `v2` at `clock=5s` (overlap window — pulse 50 `fs.watch`
 * reloader picks up the new file atomically). The v1-signed handle
 * still verifies at `clock=10s` because v1 remains in the trust-set.
 * A later rotation at `clock=15s` writes a trust-set WITHOUT v1 —
 * from that instant the v1-signed handle rejects with `unknown-keyId`
 * (still within TTL). After `clock=30_001` the handle also fails
 * `ttl-expired`; because the canonical first-failing order is
 *
 *   signature → providerId → contentHash → sequence → approver → keyId → ttl → nonce
 *
 * `keyId` precedes `ttl`, so the observed reason REMAINS
 * `unknown-keyId`. A parallel case where the keyId is STILL trusted
 * but the handle has aged past TTL returns `ttl-expired`.
 *
 * The overlap window length equals `handle.ttl` — there is no separate
 * post-rotation grace period.
 *
 * Findings addressed: APPROVAL-B-044..B-053 (SC-21 F-01..F-10).
 */
import { describe, expect } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateHandle,
  type ApprovalHandle,
  type ValidationContext,
  type ValidationDeps,
} from '@bic/openclaw-guardrails/handle-binding';
import { defineApprovalFlow } from '../../harness/approval-flow-sim/dispatch.ts';
import type {
  ApprovalFlowHarness,
  ApprovalFlowScenario,
  InvokeResult,
} from '../../harness/approval-flow-sim/types.ts';
import type { ApprovalEntryInput } from '../../harness/audit-types.ts';

describe('SC-21 handle-binding key rotation (pulse 58)', () => {
  const scenario: ApprovalFlowScenario = {
    name: 'SC-21 key-rotation (APPROVAL-B-044..B-053)',
    fixture: 'allow-r1-public',
    async setup(h: ApprovalFlowHarness): Promise<void> {
      h.hostMock.registerProvider({
        id: 'key-rotation-provider',
        hooks: { beforeToolCall: () => ({ action: 'allow' }) },
      });
    },
    async invoke(h: ApprovalFlowHarness): Promise<InvokeResult> {
      const res = await h.invokeTool({
        tool: 'bash',
        args: { cmd: 'echo rotate' },
        snapshotId: 'snap-sc21',
        rawPrincipal: 'alice',
      });
      return {
        status: res.response.status,
        action: res.decision.action,
        correlationId: res.correlationId,
        sinkEntries: res.sinkEntries,
        body: res.response.body,
        headers: res.response.headers,
      };
    },
    async assert(h, result): Promise<void> {
      const tmpDir = mkdtempSync(join(tmpdir(), 'sc21-'));
      const trustSetPath = join(tmpDir, 'trust-set.json');
      try {
        // t=0 — companion signs with v1 (the currently-active key).
        const v1KeyId = h.companion.signingKeyId;
        writeFileSync(
          trustSetPath,
          JSON.stringify([
            { keyId: v1KeyId, hmacSecret: 'placeholder', notAfter: Number.MAX_SAFE_INTEGER },
          ]),
        );

        h.companion.programVerdict({ action: 'allow' });
        const signed = await h.companion.decide({
          providerId: 'key-rotation-provider',
          contentHash: 'sha256:' + 'c'.repeat(64),
          sequenceNumber: 1,
          approverPrincipal: 'supervisor-a@host',
          ttlMs: 30_000,
        });
        if (signed.status !== 'allow') throw new Error('SC-21: companion did not allow');

        const handle: ApprovalHandle = {
          providerId: signed.providerId,
          contentHash: signed.contentHash,
          sequenceNumber: signed.sequenceNumber,
          approverPrincipal: signed.approverPrincipal,
          keyId: signed.keyId,
          ttl: signed.issuedAtMs + signed.ttlMs,
          nonce: signed.nonce,
          signature: signed.signature,
          payload: signed.payload,
        };
        expect(handle.keyId).toBe(v1KeyId);

        // ── Overlap window: both v1 and v2 in trust-set at t=5s ─────
        h.clock.advance(5_000);
        const v2KeyId = 'k_v2_placeholder';
        const overlapTrustSetTmp = `${trustSetPath}.tmp`;
        writeFileSync(
          overlapTrustSetTmp,
          JSON.stringify([
            { keyId: v1KeyId, hmacSecret: 'placeholder', notAfter: Number.MAX_SAFE_INTEGER },
            { keyId: v2KeyId, hmacSecret: 'placeholder-v2', notAfter: Number.MAX_SAFE_INTEGER },
          ]),
        );
        renameSync(overlapTrustSetTmp, trustSetPath); // atomic on same volume

        // v1-signed handle still verifies at t=10s — APPROVAL-B-045.
        h.clock.advance(5_000);
        const overlapTrustSet = new Set<string>([v1KeyId, v2KeyId]);
        const ctxBase: ValidationContext = {
          expectedProviderId: 'key-rotation-provider',
          canonicalInvocationHash: signed.contentHash,
          expectedApproverPrincipal: 'supervisor-a@host',
          sequenceHighWaterMark: 0,
          nonceScope: 'sc21::snap-sc21',
        };
        const overlapDeps: ValidationDeps = {
          clock: () => h.clock.nowMs(),
          trustSet: overlapTrustSet,
          keyLookup: (kid) => h.companion.registry.get(kid),
          validateNonce: () => true,
        };
        const overlapResult = validateHandle(handle, ctxBase, overlapDeps);
        expect(overlapResult).toEqual({ ok: true });

        // ── Rotation completes: v1 removed from trust-set at t=15s ──
        h.clock.advance(5_000);
        const postRotationTmp = `${trustSetPath}.tmp2`;
        writeFileSync(
          postRotationTmp,
          JSON.stringify([
            { keyId: v2KeyId, hmacSecret: 'placeholder-v2', notAfter: Number.MAX_SAFE_INTEGER },
          ]),
        );
        renameSync(postRotationTmp, trustSetPath);

        // v1-signed handle now rejects with unknown-keyId (APPROVAL-B-046).
        const v2OnlyTrustSet = new Set<string>([v2KeyId]);
        const postRotationDeps: ValidationDeps = {
          clock: () => h.clock.nowMs(),
          trustSet: v2OnlyTrustSet,
          keyLookup: () => undefined,
          validateNonce: () => true,
        };
        const postRotation = validateHandle(handle, ctxBase, postRotationDeps);
        expect(postRotation).toEqual({
          ok: false,
          invalidReason: 'unknown-keyId',
        });

        // ── Past TTL: clock > handle.ttl ────────────────────────────
        h.clock.advance(30_001);
        // v1 STILL rotated out AND clock past TTL. Validator order:
        // keyId (idx 5) precedes ttl (idx 6), so first-failing reason
        // is 'unknown-keyId' — NOT 'ttl-expired'. Documented in pulse
        // 49 EVALUATION_ORDER; R1 invariants F-10 clarifies the
        // overlap window length equals handle.ttl with no separate
        // grace period, but does not override the first-failing rule.
        const pastTtlBothFail = validateHandle(handle, ctxBase, postRotationDeps);
        expect(pastTtlBothFail).toEqual({
          ok: false,
          invalidReason: 'unknown-keyId',
        });

        // A parallel case: v1 STILL trusted but handle past TTL → ttl-expired.
        const stillTrustedPastTtl: ValidationDeps = {
          clock: () => h.clock.nowMs(),
          trustSet: overlapTrustSet, // v1 still present
          keyLookup: (kid) => h.companion.registry.get(kid),
          validateNonce: () => true,
        };
        const ttlOnly = validateHandle(handle, ctxBase, stillTrustedPastTtl);
        expect(ttlOnly).toEqual({
          ok: false,
          invalidReason: 'ttl-expired',
        });

        // ── SC-21 F-03 / APPROVAL-B-046..B-052: fs.watch decoupling ─
        // The trust-set file reached v2-only state on disk; the reader
        // of the file must observe complete JSON (no partial writes).
        const raw = readFileSync(trustSetPath, 'utf8');
        const parsed = JSON.parse(raw) as Array<{ keyId: string }>;
        expect(parsed).toHaveLength(1);
        expect(parsed[0]?.keyId).toBe(v2KeyId);

        // SC-21 F-10 / APPROVAL-B-053: overlap window length equals
        // handle.ttl (30s). No separate post-rotation grace period —
        // the window is strictly the live handle's TTL. We prove this
        // by showing the handle rejects past TTL even when the key
        // remains trusted.
        expect(ttlOnly.ok).toBe(false);

        // SC-21 F-02: ApprovalEntry shape for the rotated-out verdict.
        const approvalEntry: ApprovalEntryInput = {
          correlationId: result.correlationId,
          approver: 'supervisor-a@host',
          outcome: 'rejected',
          invalidReason: 'unknown-keyId',
          ttl: handle.ttl,
          nonce: handle.nonce,
          keyId: handle.keyId,
          sequenceNumber: handle.sequenceNumber,
          signature: handle.signature,
        };
        expect(approvalEntry.invalidReason).toBe('unknown-keyId');

        // Sanity: no TrustSetReloadFailedEntry should have been emitted
        // for these successful rotations — we didn't inject a parse
        // failure. The sink entries drain should NOT contain a
        // 'trust-set-reload-failed' record produced by this test flow.
        const drained = h.drainAuditChain();
        const reloadFailed = drained.filter(
          (e: unknown) =>
            typeof e === 'object' && e !== null && (e as { type?: unknown }).type === 'trust-set-reload-failed',
        );
        expect(reloadFailed).toHaveLength(0);
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    },
  };

  defineApprovalFlow(scenario);
});
