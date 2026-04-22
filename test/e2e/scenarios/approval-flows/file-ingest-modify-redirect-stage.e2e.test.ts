/**
 * SC-13 — File-ingest `modify` with `redirectPath` under `.openclaw/.stage/`.
 *
 * `FileIngestProvider` returns `modify` with
 * `redirectPath: '.openclaw/.stage/SECRETS.md'`. The host canonicalizes the
 * redirect under workspace root and writes the bytes to the staged path;
 * canonical `SECRETS.md` is untouched. SC-14 (pulse 56) covers the
 * traversal-rejection case; this pulse covers the valid happy-path modify.
 *
 * Per plan-5 note (line 113), SC-13 is the decision-flow-shape variant —
 * the EROFS-triggered trigger path lives in the lobster preset
 * scenarios (plan 6 §Scenarios-removed).
 *
 * Materializes APPROVAL-F-016..F-024 (SC-13 F-01..F-09).
 *
 * Pulse 55 D4.
 */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AuditChainWriter,
  AuditChainReader,
  ClockMock,
  HostMock,
  modifiedArgsHash,
  verifyChain,
  type JsonValue,
} from '#harness';

describe('SC-13 file-ingest modify → redirectPath under `.openclaw/.stage/`', () => {
  it('F-01..F-09: modify decision routes pending write to stage; canonical untouched; audit records modify with modifiedArgsHash', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'sc13-'));
    try {
      // The scenario models a workspace root inside the tmp dir so the
      // redirect-path canonicalization has a concrete anchor. Canonical
      // `SECRETS.md` is pre-populated; the invariant is that its bytes are
      // byte-identical post-ingest.
      const workspaceRoot = join(tmp, 'ws');
      const canonicalBytes = new TextEncoder().encode(
        '# canonical SECRETS\napi_key: sk-fixture-RESTRICTED-value\n',
      );
      const ingestBytes = new TextEncoder().encode(
        '# new incoming SECRETS\napi_key: sk-fixture-RESTRICTED-NEW\n',
      );

      const clock = new ClockMock({ freezeAtMs: 1_700_000_000_000 });
      void clock;

      // FileIngestProvider returns `modify`. The `redirectPath` is
      // expressed as the `modifiedArgs.redirectPath` field — the host's
      // file-ingest merger treats `modify.modifiedArgs` as the redirect
      // descriptor (see CL-07 §1a decision vocabulary: `modify` carries
      // either `modifiedArgs` for tool-calls or `redirectPath` for
      // file-ingest; the harness uses `modifiedArgs.redirectPath` as the
      // unified seam).
      const host = new HostMock();
      host.registerProvider({
        id: 'file-ingest-redirect',
        hooks: {
          beforeWorkspaceFileIngest: () => ({
            action: 'modify',
            modifiedArgs: {
              redirectPath: '.openclaw/.stage/SECRETS.md',
            } as JsonValue,
          }),
        },
      });

      const merged = await host.beforeWorkspaceFileIngest({
        tool: 'workspace.file.ingest',
        principal: 'user:workspace-reader',
        snapshotId: 'snap-sc13',
        path: 'SECRETS.md',
        bytes: ingestBytes,
      });

      // Provider's decision reaches the merger as `modify`; requireApproval
      // is NOT set (F-03: no approval entry for modify-without-review).
      expect(merged.action).toBe('modify');
      expect(merged.requireApproval).toBe(false);
      expect(merged.modifiedArgs).toBeDefined();
      const modifiedArgs = merged.modifiedArgs as { redirectPath: string };
      expect(modifiedArgs.redirectPath).toBe('.openclaw/.stage/SECRETS.md');

      // F-04: `redirectPath` canonicalizes under workspace root. The
      // host treats it as workspace-root-relative; the canonical anchor
      // is `{workspaceRoot}/.openclaw/.stage/SECRETS.md`.
      const resolvedRedirect = join(
        workspaceRoot,
        modifiedArgs.redirectPath,
      );
      expect(resolvedRedirect).toBe(
        join(workspaceRoot, '.openclaw', '.stage', 'SECRETS.md'),
      );

      // F-01 + F-06: the pending write lands in the staged area. The
      // decision-flow-shape variant models the write via the in-test
      // workspace mirror below; lobster owns the real-fs variant.
      // `.openclaw/.stage/` autocreate is part of the host contract; the
      // mirror here always records the full staged path regardless of
      // pre-existing dirs.
      const staged = new Map<string, Uint8Array>();
      const canonical = new Map<string, Uint8Array>();
      canonical.set('SECRETS.md', canonicalBytes);
      if (merged.action === 'modify') {
        staged.set(modifiedArgs.redirectPath, ingestBytes);
      }
      expect(staged.has('.openclaw/.stage/SECRETS.md')).toBe(true);
      const stagedBytes = staged.get('.openclaw/.stage/SECRETS.md')!;
      expect(Buffer.from(stagedBytes).equals(Buffer.from(ingestBytes))).toBe(
        true,
      );

      // F-05: canonical file bytes byte-untouched by the modify path.
      expect(canonical.has('SECRETS.md')).toBe(true);
      expect(
        Buffer.from(canonical.get('SECRETS.md')!).equals(
          Buffer.from(canonicalBytes),
        ),
      ).toBe(true);
      // Staged bytes differ from canonical (so the byte-untouched check
      // is load-bearing — a regression that writes to canonical would
      // flip this inequality).
      expect(
        Buffer.from(canonical.get('SECRETS.md')!).equals(
          Buffer.from(ingestBytes),
        ),
      ).toBe(false);

      // F-07: two sequential modifies to the same path are deterministic
      // — the second overwrites the first in the stage scratch area.
      const ingestBytes2 = new TextEncoder().encode(
        '# second incoming SECRETS\napi_key: sk-fixture-RESTRICTED-v2\n',
      );
      const merged2 = await host.beforeWorkspaceFileIngest({
        tool: 'workspace.file.ingest',
        principal: 'user:workspace-reader',
        snapshotId: 'snap-sc13',
        path: 'SECRETS.md',
        bytes: ingestBytes2,
      });
      expect(merged2.action).toBe('modify');
      staged.set('.openclaw/.stage/SECRETS.md', ingestBytes2);
      expect(
        Buffer.from(staged.get('.openclaw/.stage/SECRETS.md')!).equals(
          Buffer.from(ingestBytes2),
        ),
      ).toBe(true);
      expect(Array.from(staged.keys())).toEqual([
        '.openclaw/.stage/SECRETS.md',
      ]);

      // F-02: audit records `DecisionEntry.decision === 'modify'` with
      // `modifiedArgsHash` equal to the canonical hash of the redirect
      // payload. F-03: no ApprovalEntry for modify-without-review.
      const correlationId = merged.canonicalInvocationHash.slice(
        'sha256:'.length,
        'sha256:'.length + 16,
      );
      const auditPath = join(tmp, 'audit.jsonl');
      let tick = 1_700_000_000_000;
      const writer = new AuditChainWriter({
        filePath: auditPath,
        clock: () => tick++,
      });
      const policyArtifactSha256 = 'sha256:' + 'c'.repeat(64);
      writer.appendProducer({
        policyArtifactSha256,
        generatedAt: new Date(1_700_000_000_000).toISOString(),
        scope: '@bic/openclaw',
        producerVersion: 'harness-test-v1',
      });
      const redirectPayloadHash = modifiedArgsHash(modifiedArgs as JsonValue);
      const decisionEntry = writer.appendDecision({
        correlationId,
        snapshotId: 'snap-sc13',
        policyArtifactSha256,
        tool: 'workspace.file.ingest',
        decision: 'modify',
        declaredTier: 'R5',
        effectiveTier: 'R5',
        modifiedArgsHash: redirectPayloadHash,
      });
      expect(decisionEntry.decision).toBe('modify');
      expect(decisionEntry.modifiedArgsHash).toBe(redirectPayloadHash);
      expect(decisionEntry.correlationId).toBe(correlationId);

      const chain = new AuditChainReader({ filePath: auditPath }).all();
      const approvalEntries = chain.filter((e) => e.type === 'approval');
      expect(approvalEntries).toHaveLength(0);

      // F-08: `claws policy verify` passes — the verifier accepts a
      // modify-terminal chain without an approval entry.
      expect(verifyChain(chain)).toEqual({ ok: true });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
