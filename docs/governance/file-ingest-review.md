# File-Ingest Review

**What this guide is**: how `FileIngestProvider` gates workspace file reads + writes at the ingest moment, how `modify.redirectPath` stages sensitive writes without touching canonical, and how the stage → promote lifecycle composes with the same approvalHandle flow as tool calls.

## Why file ingest needs its own peer interface

Tool execution and file ingest are two distinct governance moments. A `GuardrailProvider` wrapping `before_tool_call` can't gate a file read — by the time the agent hands a tool-call to the gateway, any RESTRICTED file content already inlined into the prompt has crossed the boundary. The decision has to happen at the **read moment**, before file bytes enter agent context.

OC-1 adds `before_workspace_file_ingest` (parallel to `before_tool_call`). `FileIngestProvider` is the peer interface that wraps it. Same decision vocabulary (`allow` / `deny` / `review` / `modify`), same composition rules, same `approvalHandle` shape — only the hook surface differs.

```
  before_tool_call              before_workspace_file_ingest
  GuardrailProvider             FileIngestProvider
  preAuthorize(call, ctx)       beforeIngest(event, ctx)
  (the CALL moment)             (the READ moment)
                \               /
                 \             /
                  shared decision vocabulary
                  shared approvalHandle 8-field
                  shared audit cross-linking
```

## `FileIngestProvider.beforeIngest` signature

Per the CL-07 amendment:

```ts
interface FileIngestProvider {
  providerId: string;
  beforeIngest(event: FileIngestEvent, ctx: AuthorizationContext): Promise<AuthorizationDecision>;
  afterIngest?(
    event: FileIngestEvent,
    decision: AuthorizationDecision,
    ctx: AuthorizationContext,
  ): Promise<void>;
}

interface FileIngestEvent {
  path: string; // oc:// URI
  operation: "read" | "write";
  author: string; // OC-populated; provider treats read-only
  sessionId: string;
  previousHash?: string; // sha256 of prior content (per OC-3)
}
```

`previousHash` is populated by the content hash OC-3 adds to the workspace cache. A provider can compare the incoming `contentHash` (from the approvalHandle) with the previously-known hash to detect content substitution between decision and approval.

## Decision vocabulary

Same four verbs as tool execution:

| Verb     | File-ingest semantics                                                               |
| -------- | ----------------------------------------------------------------------------------- |
| `allow`  | File enters agent context as-is.                                                    |
| `deny`   | File blocked; `DecisionEntry` written with `reason`.                                |
| `review` | `approvalHandle` signed; companion receives request; call stalls.                   |
| `modify` | `redirectPath` routes a pending write to `.openclaw/.stage/`. **File-ingest only.** |

Tool calls' `modify` rewrites args. File ingest's `modify` redirects the write. Same verb, different payload.

## `redirectPath` safety invariant

`redirectPath` MUST canonicalize under `.openclaw/.stage/` relative to workspace root. Path-traversal attempts are rejected by the host:

```
  provider returns:
    { decision: 'modify', redirectPath: '../outside/escape.txt' }

  host canonicalizes:
    resolved = /workspace/.openclaw/../outside/escape.txt
             = /workspace/outside/escape.txt  ← outside stage dir

  host rejects:
    { decision: 'deny', invalidReason: 'redirect-path-escape' }
    → DecisionEntry written, no file written
```

Rejection modes:

- `../` traversal outside the workspace stage
- Absolute paths (`/etc/passwd`, `C:\Windows\System32\...`)
- Symlink targets that escape the stage dir
- UNC paths (`\\host\share\...`)
- Mixed-case Windows drive letters resolving outside

The host writes a `DecisionEntry` with `decision: 'deny'`, `invalidReason: 'redirect-path-escape'`. The provider's intent is audited; the file is not written.

## Stage → promote lifecycle

When `stage on` is set for a workspace, governance-file writes land in `.openclaw/.stage/<path>` instead of the canonical location. The supervisor reviews the staged content, signs an approvalHandle, and `snap promote` commits. On rollback, the canonical tree stays untouched.

```
  Agent ──write SECRETS.md──▶ Gateway
                                  │
                                  │─before_workspace_file_ingest─▶ FileIngestProvider
                                  │                                 beforeIngest
                                  │                                 ↓
                                  │                                 modify +
                                  │                                 redirectPath:
                                  │                                 '.openclaw/.stage/SECRETS.md'
                                  │◀──redirect──────────────────────
                                  │
                                  ▼
                       .openclaw/.stage/SECRETS.md     ← staged, pending
                       (canonical SECRETS.md unchanged)
                                  │
                       supervisor reviews + approves
                                  │
                       snap promote snap-abc123
                                  │
                                  ▼
                       draft → current
                       .openclaw/.stage/ drained into canonical
                       provider.onSnapshotPromoted fires
                       plugin re-loads policy from new snapshot
```

Default staging posture is **off** per `@openclaw/snap` — writes land canonical directly, matching OC-today behavior. Opt-in via `claws snap stage on`. The lobster preset turns stage on by default; openclaw and aether presets don't.

## RESTRICTED file handling — end to end

The canonical RESTRICTED-file-ingest flow:

```
  1. Agent's workspace load reaches a RESTRICTED-classified file
     (SOUL.md says SECRETS.md matches pattern 'SECRETS.*')
  2. OC fires before_workspace_file_ingest
  3. FileIngestProvider.beforeIngest runs
     → sees previousHash, knows this is RESTRICTED-classified
     → returns { decision: 'review', approvalHandle, requiresExternalApproval: true }
  4. OC-7 merger latches requireApproval sticky
  5. Companion receives ApprovalRequest with signed handle
  6. Operator approves or denies
  7. On approve: file enters agent context; DecisionEntry + ApprovalEntry both written,
     joined by correlationId
  8. On deny: file blocked; DecisionEntry written with decision 'deny'; no ApprovalEntry
     for the companion's deny — the outcome rides on the ApprovalEntry.outcome field
```

Audit cross-link shape:

```ts
// DecisionEntry for the ingest attempt
{
  type: 'decision',
  correlationId: 'uuid-abc',
  policyArtifactSha256: 'sha-policy-xyz',
  invocation: {
    kind: 'file_ingest',
    filePath: 'oc://SECRETS.md',
    previousHash: 'sha-prev-foo',
  },
  decision: 'review',
  effectiveSensitivity: 'RESTRICTED',
  requiresExternalApproval: true,
}

// ApprovalEntry for the companion's response
{
  type: 'approval',
  correlationId: 'uuid-abc',   // matches above
  handleId: 'h-001',
  approverPrincipal: 'supervisor@tenant',
  outcome: 'approve',
}
```

`claws policy verify` validates: `DecisionEntry` has a `ProducerEntry` by `policyArtifactSha256`, and any `DecisionEntry` with `decision: 'review'` has a matching `ApprovalEntry` by `correlationId`.

## Cross-references

- [governance--approval-flow.md](./approval-flow.md) — symmetric tool-call path, decision vocabulary, OC-7 merger, 8-field handle
- [testing--e2e-harness.md](../testing/e2e-harness.md) — harness's `ingestFile()` and `FileIngestProvider` wiring
- `docs/specs/CL-07-deep-integration.md` — canonical peer-interface definition
- `docs/specs/CL-11-upstream-governance.md` — `DecisionEntry.invocation.kind: 'file_ingest'` shape, `invalidReason: 'redirect-path-escape'`
- Plan 6 `host-presets/lobster.md` — stage + promote end-to-end example with EROFS-triggered redirect
- Proposal `openclaw-upstream-spec.md` §1 (peer interfaces), §1.8 (three-layer composition with staging), §6 (OC-1 hook)
