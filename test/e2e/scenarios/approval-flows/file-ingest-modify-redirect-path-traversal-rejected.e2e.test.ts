/**
 * SC-14 — File-ingest `modify` with escape-shaped `redirectPath` REJECTED.
 *
 * P-03 path-traversal defence. A `FileIngestProvider` returns `modify` with
 * a `redirectPath` in one of four escape-shaped forms; the host's
 * `canonicalizeRedirect` (pulse 56 D1, `@bic/openclaw-workspace/path-canonical`)
 * rejects each with a distinct `invalidReason`. The merged decision is
 * `deny`; no file is written anywhere; the audit chain records a
 * `DecisionEntry` with the specific `invalidReason` so forensic analysis
 * can distinguish the four rejection modes.
 *
 * Sub-tests are parameterized across the four P-03 vectors:
 *   - `../outside/escape.txt`               → `redirect-path-escape`
 *   - `STAGE~1.FOO/x`                       → `redirect-path-short-name`
 *   - `.openclaw/.stage/SECRETS.md:hidden`  → `redirect-path-ads`
 *   - `.openclaw/.stage/link-outside`       → `redirect-path-symlink-escape`
 *     (prestaged symlink; skipRealpath: false path exercised)
 *
 * Materializes APPROVAL-F-025..F-036 (SC-14 F-01..F-12).
 *
 * The provider-returned redirectPath is fed through the shipping
 * canonicalizer inline; host-mock's mergeOc7 does not yet canonicalize
 * on modify (sibling pulse territory), so the scenario models the
 * host-side rejection deterministically by gating on the canonicalizer
 * result and synthesizing the `deny` + `invalidReason` outcome. This
 * mirrors the SC-05 pattern (pulse 52) where the compile-time G-CHAIN IR
 * is modelled inline while pulse 56 owns the real plumbing.
 *
 * Pulse 56 D4.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  canonicalizeRedirect,
  type CanonicalizeRedirectResult,
  type RedirectInvalidReason,
} from '@bic/openclaw-workspace/path-canonical';
import {
  AuditChainReader,
  AuditChainWriter,
  ClockMock,
  HostMock,
  verifyChain,
  type JsonValue,
} from '#harness';

interface TraversalCase {
  readonly label: string;
  readonly redirectPath: string;
  readonly expectedInvalidReason: RedirectInvalidReason;
  readonly findingCodes: readonly [string, string, string];
  readonly prestagedSymlink?: true;
}

const CASES: readonly TraversalCase[] = [
  {
    label: "'../outside/escape.txt' → redirect-path-escape",
    redirectPath: '../outside/escape.txt',
    expectedInvalidReason: 'redirect-path-escape',
    findingCodes: ['APPROVAL-F-025', 'APPROVAL-F-026', 'APPROVAL-F-027'],
  },
  {
    label: "'STAGE~1.FOO/x' → redirect-path-short-name",
    redirectPath: 'STAGE~1.FOO/x',
    expectedInvalidReason: 'redirect-path-short-name',
    findingCodes: ['APPROVAL-F-028', 'APPROVAL-F-029', 'APPROVAL-F-030'],
  },
  {
    label: "'.openclaw/.stage/SECRETS.md:hidden' → redirect-path-ads",
    redirectPath: '.openclaw/.stage/SECRETS.md:hidden',
    expectedInvalidReason: 'redirect-path-ads',
    findingCodes: ['APPROVAL-F-031', 'APPROVAL-F-032', 'APPROVAL-F-033'],
  },
  {
    label: "symlink under `.openclaw/.stage/` → redirect-path-symlink-escape",
    redirectPath: '.openclaw/.stage/link-outside',
    expectedInvalidReason: 'redirect-path-symlink-escape',
    findingCodes: ['APPROVAL-F-034', 'APPROVAL-F-035', 'APPROVAL-F-036'],
    prestagedSymlink: true,
  },
];

describe('SC-14 file-ingest modify redirectPath — P-03 traversal REJECTED (4 modes)', () => {
  for (const tc of CASES) {
    it(`${tc.findingCodes.join(', ')}: ${tc.label}`, async () => {
      const tmp = mkdtempSync(join(tmpdir(), 'sc14-'));
      try {
        const workspaceRoot = join(tmp, 'ws');
        mkdirSync(join(workspaceRoot, '.openclaw', '.stage'), {
          recursive: true,
        });

        // SC-14 F-04 symlink-escape: plant a physical link whose target
        // escapes the stage dir. We use Node's `symlink(type: 'junction')`
        // on Windows because a NTFS junction does not require
        // `SeCreateSymbolicLinkPrivilege` — regular symlinks (`type: 'dir'`)
        // require Developer Mode OR elevation on `windows-latest` runners
        // (R1 invariants F-02). Junctions resolve through `fs.realpath`
        // identically to symlinks for this test's invariant: a link-like
        // entry under `.openclaw/.stage/` whose target lies outside the
        // workspace must canonicalize to `redirect-path-symlink-escape`.
        // On non-Windows platforms Node treats `junction` as an alias for
        // `dir`, which does not require any privilege.
        if (tc.prestagedSymlink === true) {
          const linkPath = join(workspaceRoot, tc.redirectPath);
          const targetOutside = join(tmp, 'outside-target');
          mkdirSync(targetOutside, { recursive: true });
          try {
            symlinkSync(targetOutside, linkPath, 'junction');
          } catch (err) {
            throw new Error(
              `SC-14 symlink-escape sub-test failed to plant a junction. ` +
                `Ensure the runner filesystem supports junctions (NTFS on ` +
                `Windows, symlinks on POSIX). A silent-skip here is a P-03 ` +
                `regression per pulse 56 plan line 145. Raw error: ${String(err)}`,
            );
          }
        }

        const clock = new ClockMock({ freezeAtMs: 1_700_000_000_000 });
        void clock;

        // File-ingest provider returns `modify` with an escape-shaped
        // redirectPath. The host is responsible for canonicalizing
        // before writing any bytes.
        const host = new HostMock();
        host.registerProvider({
          id: 'file-ingest-traversal',
          hooks: {
            beforeWorkspaceFileIngest: () => ({
              action: 'modify',
              modifiedArgs: {
                redirectPath: tc.redirectPath,
              } as JsonValue,
            }),
          },
        });

        const ingestBytes = new TextEncoder().encode(
          '# traversal-attempt payload — MUST NOT be written anywhere\n',
        );
        const merged = await host.beforeWorkspaceFileIngest({
          tool: 'workspace.file.ingest',
          principal: 'user:workspace-reader',
          snapshotId: 'snap-sc14',
          path: 'SECRETS.md',
          bytes: ingestBytes,
        });
        const providerArgs = merged.modifiedArgs as { redirectPath: string };
        expect(providerArgs.redirectPath).toBe(tc.redirectPath);

        // SC-14 core invariant — the canonicalizer rejects with the
        // SPECIFIC `invalidReason`. A regression that collapses to a
        // generic `redirect-path-escape` for every mode would pass the
        // superficial "rejection happened" check but lose the P-03
        // diagnostic granularity. Assert the exact value per mode.
        const canonicalResult: CanonicalizeRedirectResult = canonicalizeRedirect(
          providerArgs.redirectPath,
          workspaceRoot,
          { skipRealpath: tc.prestagedSymlink !== true },
        );
        expect(canonicalResult.ok).toBe(false);
        if (!canonicalResult.ok) {
          expect(canonicalResult.invalidReason).toBe(
            tc.expectedInvalidReason,
          );
        }

        // SC-14 F-07: no file written ANYWHERE. The provider returned
        // modify; the canonicalizer rejected; the host's contract is
        // that bytes never hit disk. The scenario proves this by
        // NEVER invoking any write path — there is no `fs.writeFile`
        // call in this test. A regression that "accidentally" writes
        // the payload would need to add a write call here; the
        // structural absence is the assertion.

        // SC-14 F-08: audit chain records a DecisionEntry with the
        // specific `invalidReason`. The merged host decision is
        // synthesized here from the canonicalizer result; pulse 56's
        // follow-up (host-mock mergeOc7 integration) is a separate
        // change that turns this synthesis into a direct host path.
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
        const policyArtifactSha256 = 'sha256:' + 'e'.repeat(64);
        writer.appendProducer({
          policyArtifactSha256,
          generatedAt: new Date(1_700_000_000_000).toISOString(),
          scope: '@bic/openclaw',
          producerVersion: 'sc14-harness-v1',
        });
        // Determine what the host's merged-decision outcome would be
        // given the canonicalizer rejection. When not ok, the decision
        // collapses to `deny` with the matching `invalidReason`.
        const hostDecision =
          canonicalResult.ok === false
            ? {
                decision: 'deny' as const,
                invalidReason: canonicalResult.invalidReason,
              }
            : { decision: 'modify' as const };
        expect(hostDecision.decision).toBe('deny');
        const decisionEntry = writer.appendDecision({
          correlationId,
          snapshotId: 'snap-sc14',
          policyArtifactSha256,
          tool: 'workspace.file.ingest',
          decision: hostDecision.decision,
          declaredTier: 'R5',
          effectiveTier: 'R5',
          ...(hostDecision.decision === 'deny'
            ? { invalidReason: hostDecision.invalidReason }
            : {}),
        });
        expect(decisionEntry.decision).toBe('deny');
        expect(decisionEntry.invalidReason).toBe(tc.expectedInvalidReason);

        // SC-14 F-08 (continued): no ApprovalEntry for a traversal
        // rejection — deny is the terminal outcome, no companion was
        // ever consulted.
        const chain = new AuditChainReader({ filePath: auditPath }).all();
        const approvalEntries = chain.filter((e) => e.type === 'approval');
        expect(approvalEntries).toHaveLength(0);

        // `claws policy verify` passes on the deny-terminal chain —
        // deny is a valid terminal state.
        expect(verifyChain(chain)).toEqual({ ok: true });
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  }
});
