# OpenClaw Upstream Contribution — Technical Spec

**Status**: Draft, paired with `openclaw-upstream-brief.md`
**Date**: 2026-04-18
**Intent**: Technical walkthrough of the four packages we'd contribute and the OC-core changes they assume. Per-package detail lives in the companion package specs — this spec walks through the shape, the cross-cutting concerns (async review flow, risk tiers, three-layer composition), the OC-core integration surface, and the security + testing + versioning posture.

**Naming principle**: where OC-core already has a concept, we use OC's name. We don't introduce parallel terminology. Our packages are conveniences layered on top of OC primitives — not replacements.

**Through-line**: governance is **observable · bounded · enforceable**. `@openclaw/guardrails` (§1) is where *decisions get made and observed*. `@openclaw/workspace` (§2) is the shared OC-file-format utilities. `@openclaw/policy` (§3) makes decisions *enforceable* — the generator turns declarative workspace intent into a runtime plugin. `@openclaw/snap` (§4) is *where workspaces live* — content-addressable captures, promoted + rolled back + served over HTTP.

---

## 0. Package map

```
@openclaw/guardrails (interfaces + runtime libraries)
  Top-level: GuardrailProvider + FileIngestProvider peer interfaces,
             shared composition (deny > review > modify > allow),
             ProviderLifecycle + HostContext (§1.4a), ShellExecProvider
             reference impl.
  Subpaths:
    /audit      — hash-chained integrity over OC's existing audit log
    /approvals  — extends OC's ExecApprovalRequest with governance metadata
    /budget     — token/cost controls + threshold alerts
    /identity   — OIDC/SAML agent identity
    /siem       — CEF / NDJSON / syslog export of OC audit
    /secrets    — pattern + entropy leak detection

@openclaw/workspace (shared OC-file-format utilities)
  Subpaths:
    /path         — oc:// URI scheme + workspace file classifier
    /ast          — PEG grammars + typed AST + emitters (lossless round-trip)
    /canonicalize — RFC 8785 JCS helper (one canonicalizer shared by
                    policy, snap, guardrails/audit)

@openclaw/policy (the generator)
  Top-level: generate (writes enforcement artifacts into .openclaw/policy/),
             check, watch, comply, test, sim, report, verify, diff,
             + operational helpers as direct exports.
  Subpaths:
    /runtime  — helpers imported BY the emitted plugin (asHookResult,
                issueHandle, propagatedSensitivity, matchDenyRules)
    /types    — IR type-only exports

@openclaw/snap (snapshot registry)
  Content-addressable snapshot registry + HTTP server. Zero runtime dep
  on @openclaw/policy.

Command-line surface contributed to the existing `openclaw` CLI as
two flat subcommand groups — `openclaw policy ...` (9 verbs) and
`openclaw snap ...` (11 verbs) — no sibling binaries. Policy-specific
checks fold into `openclaw doctor`; policy-artifact migration folds
into `openclaw upgrade`.
```

Full per-package detail in `guardrails.md`, `workspace.md`, `policy.md`, `snap.md`.

---

## 1. `@openclaw/guardrails` — where decisions get made

Two decision moments matter: when the agent calls a tool, and when it reads or writes a workspace file. `@openclaw/guardrails` ships two peer interfaces — **`GuardrailProvider`** (tool execution, wraps OC's existing `before_tool_call`) and **`FileIngestProvider`** (file ingest, wraps the proposed `before_workspace_file_ingest`). Same decision vocabulary, same composition rules, so providers, audit, and review work uniformly across surfaces.

**Decision vocabulary** (shared by both providers):

```
allow   — proceed as-is
deny    — reject with reason
review  — route to supervisor with signed approvalHandle
modify  — rewrite arguments / redirect writes (FileIngest only)
```

**Runtime primitives** ride alongside the interfaces as subpaths, one install per package, consumer tree-shakes what it needs: `/audit` (hash-chained tamper-evident log), `/approvals` (HITL schema — handles, TTL, categories), `/budget` (token/cost controls), `/identity` (OIDC/SAML), `/siem` (CEF/NDJSON/syslog export), `/secrets` (leak detection). Full interface detail in `guardrails.md`.

### 1.4 Composition — inside a single plugin

`deny > review > modify > allow`. With R5 (irreversible-external) or RESTRICTED data, providers force `requireApproval` — OC-7 (§6) makes that envelope-sticky across the plugin chain. Across-plugin merger semantics live with OC-core (see §1.5 for the end-to-end picture).

### 1.4a Provider lifecycle — `ProviderLifecycle` + `HostContext`

Providers that need injected dependencies (audit sink, HMAC signer, identity bridge, current snapshot) MAY implement `ProviderLifecycle`. Hosts call lifecycle methods at well-defined points; providers that don't need them stay stateless.

```ts
export interface HostContext {
  auditSink: AuditSink;                          // per-tenant, already keyed
  identityBridge: IdentityBridge;
  approvalHandleSigner: (binding: HandleBinding) => Promise<string>;
  snapshot: { id: string; policyIrPath: string } | null;
  stageMode: 'on' | 'off';
  logger: Logger;
}

export interface ProviderLifecycle {
  init?(ctx: HostContext): Promise<void>;
  shutdown?(): Promise<void>;
  onSnapshotPromoted?(meta: SnapshotMeta): Promise<void>;
  onStageModeChanged?(next: 'on' | 'off'): Promise<void>;
}
```

Host obligations: `init(ctx)` fires exactly once per provider registration, before any `preAuthorize` / `beforeIngest` call. All injected dependencies arrive via `ctx`; providers MUST NOT construct these at module-load time. `onSnapshotPromoted` fires after `snap promote` commits (hot-reload signal for generated plugins). `onStageModeChanged` fires when a workspace toggles `stage on/off`.

### 1.5 Async review — how a sensitive decision reaches the supervisor

Most decisions resolve in the plugin. Some don't — a RESTRICTED file ingest, a credential-bearing tool call, an R5 irreversible-external action. For those, a provider returns `review`. That maps to OC's existing `requireApproval` hook-result field; our `approvalHandle` rides along as metadata. OC's existing approval flow carries the wait — no new loop.

The `requireApproval` descriptor shape extends OC's existing object form with governance metadata (signed handle, content hash, category, risk/sensitivity labels). Full type in `guardrails.md` `/approvals`.

**Merger across plugins (OC-7).** OC runs N plugins; each contributes a hook-result. OC-core's merger with OC-7: **`requireApproval` is non-downgradable** — once any plugin sets it, it stays set for the decision lifetime, and the companion app receives every `ApprovalDescriptor` the plugins emitted (conjunctive — all must be approved).

End-to-end (Waffles plugin trying to post a RESTRICTED message to `#general`):

```
  Agent             OC-core          Policy plugin                Supervisor        Companion app
    │                  │                  │        (Gateway, trusted plane)  (companion app)
    │                  │                  │                  │                  │
    │──post-to-channel▶│                  │                  │                  │
    │                  │─before_tool_call▶│                  │                  │
    │                  │                  │ preAuthorize:    │                  │
    │                  │                  │  RESTRICTED src  │                  │
    │                  │                  │  + public ch.    │                  │
    │                  │                  │  → { review,     │                  │
    │                  │                  │     handle }     │                  │
    │                  │                  │──ApprovalRequest▶│                  │
    │                  │                  │   oc://          │                  │
    │                  │                  │   handle, hash   │                  │
    │                  │◀─requireApproval─│                  │                  │
    │◀─(stall)─────────│                  │                  │──render─────────▶│
    │                  │                  │                  │                  │ user
    │                  │                  │                  │                  │ reviews
    │                  │                  │                  │                  │ approves
    │                  │                  │                  │◀────response─────│
    │                  │                  │◀─ApprovalResponse│                  │
    │                  │                  │   matches handle │                  │
    │                  │◀──resume / abort─│                  │                  │
    │◀──result─────────│                  │                  │                  │
    │                  │                  │──postAudit──────────────▶ guardrails/audit
    │                  │                  │   oc:// + snapshotId + correlation
```

**File ingest is the same shape.** Swap `before_tool_call` for `before_workspace_file_ingest`, `preAuthorize` for `beforeIngest`. Rest is identical.

**Threading**: `approvalHandle` binds `{providerId, contentHash, sequenceNumber, approverPrincipal, keyId, ttl, nonce}`. Response must present the same handle; `contentHash` must still match (no replay, no swap); `sequenceNumber` closes replay-across-handles; `keyId` supports rotation. The `oc://` URI and `snapshotId` travel on every message so the companion app, the audit chain, and any later `openclaw policy comply` run see the same identity for the same decision.

### 1.6 Risk tiers and data sensitivity

Two orthogonal axes. **Risk tier** classifies what a tool *does*. **Sensitivity** classifies what data *is*. Every governance decision considers both.

**Risk tiers (R0–R5)** — tool effect:

| Tier | Name | Examples | Default enforcement |
|------|------|----------|---------------------|
| **R0** | None / pure | `vibe-check`, `get-time` | fail-open; audit optional |
| **R1** | Read | `read-inbox`, `list-skills` | fail-open; audit standard |
| **R2** | Write / local | `save-draft`, `update-task` | fail-open; audit standard |
| **R3** | Communicate / internal | `ping-teammate`, `post-standup` | configurable; audit required |
| **R4** | Execute / elevated | `run-shell`, `install-dep` | configurable; audit required; review recommended |
| **R5** | Transact / irreversible-external | `post-publicly`, `send-email`, `wire-funds` | **fail-closed, non-waivable**; external approval required |

**Data sensitivity (PUBLIC–RESTRICTED)** — what flows through:

| Label | Meaning | Default handling |
|-------|---------|------------------|
| **PUBLIC** | Shareable externally without constraint | no restriction |
| **INTERNAL** | Usable inside the organization | block external (R5) egress unless explicitly approved |
| **CONFIDENTIAL** | Named team / scope only | in-scope identity required; no cross-tenant egress |
| **RESTRICTED** | Regulated / high-risk | **requiresExternalApproval: true, sticky, non-downgradable** |

**Axis interaction**:
- **Sensitivity propagates through tool chains** (G-CHAIN): a PUBLIC tool output derived from a RESTRICTED source inherits RESTRICTED.
- **RESTRICTED × any tier** forces `requiresExternalApproval` regardless of declared tier.
- **Effective tier = max(declared, provenance sources)**. A nominally R1 tool consuming `tool_output.read_restricted` becomes R5.
- **R5 never fail-open.** The generator rejects any R5 tool declared with fail-open.
- **`IRREVERSIBLE_EXTERNAL` capability clamps to R5 minimum** regardless of declared tier.

### 1.8 Three-layer composition — what a deployment runs

```
  ┌─── LAYER 1 · DECIDE ───────────────────────────────────────────┐
  │   Should this tool-call / file-write happen as-is?             │
  │   GuardrailProvider + FileIngestProvider                       │
  │   FileIngestProvider.modify + redirectPath redirects pending   │
  │   writes to .openclaw/.stage/<path> without touching canonical.│
  └────────────────────────────────────────────────────────────────┘

  ┌─── LAYER 2 · TRACK ────────────────────────────────────────────┐
  │   What workspace state is in force, what's pending, what was?  │
  │   @openclaw/snap owns the draft → current → superseded         │
  │   lifecycle for every workspace mutation.                      │
  └────────────────────────────────────────────────────────────────┘

  ┌─── LAYER 3 · ENFORCE + REVIEW ─────────────────────────────────┐
  │   The generated plugin enforces declared policy at runtime;    │
  │   the supervisor companion app reviews drafts and signs        │
  │   approvalHandle for snap promote.                             │
  └────────────────────────────────────────────────────────────────┘
```

Each layer is separable. A host can run Layer 1 + 2 only (no policy). A host can run 1 + 3 on a single tenant without a snapshot registry (local `.openclaw/policy/` compiled into the running plugin). Full enterprise posture is all three.

---

## 2. `@openclaw/workspace` — shared OC-file-format utilities

One package covering the utilities every other piece depends on:

- **`/path`** — the `oc://` URI scheme + workspace file classifier. A single URI (`oc://TOOLS.md/Tools/send-email/args_from`) addresses the same thing in editor diagnostics, audit entries, approval requests, HTTP endpoints — no parallel naming schemes.
- **`/ast`** — PEG grammars + typed AST + emitters (lossless round-trip) for SOUL.md / TOOLS.md / AGENTS.md / IDENTITY.md / USER.md / SKILL.md. `WorkspaceFileKind` enum owned here; `/path` imports type-only.
- **`/canonicalize`** — RFC 8785 JCS helper. The single canonicalizer consumed by `@openclaw/policy` (PolicyIR → policyId), `@openclaw/snap` (workspace files → snapshotId), and `@openclaw/guardrails/audit` (AuditEntry before hashing). Byte-identical across Linux / Windows / macOS — CI-enforced per-PR.

Full detail in `workspace.md`.

---

## 3. `@openclaw/policy` — the generator

`@openclaw/policy` reads OC workspace source files and **writes three artifacts into `.openclaw/policy/`** inside the workspace:

1. **`policy-ir.json`** — declarative IR (content-addressable, versioned).
2. **`gateway-plugin.ts`** — executable TypeScript that registers with OC's plugin hook surface to enforce the generated policy at runtime (implements `GuardrailProvider` + `FileIngestProvider`).
3. **`audit-manifest.json`** — the event taxonomy this policy will emit at runtime, mapped to OC's exec-approval event categories.

SOUL.md deny rules, TOOLS.md provenance declarations, and AGENTS.md boundaries become *enforceable*, not *aspirational*. Deterministic: same inputs → byte-identical output.

**Governance invariants are enforced at generation time.** The generator refuses to produce artifacts that would break invariants (R5 never fail-open; RESTRICTED sensitivity sticky through `args_from`). If the workspace declares a tool that violates an invariant, `openclaw policy generate` fails with a diagnostic rather than emit a plugin that would.

**CLI**: `openclaw policy` subcommand group, nine verbs:

```
openclaw policy check                          # parse + validate; diagnostics only
openclaw policy generate                       # write .openclaw/policy/{policy-ir.json, gateway-plugin.ts, audit-manifest.json}
openclaw policy watch                          # regenerate on save
openclaw policy comply [--rubric soc2|hipaa]   # run rubrics against the generated IR + audit chain
openclaw policy test [--scenarios path/]       # behaviour tests from YAML scenarios
openclaw policy sim                            # local mock gateway
openclaw policy report [--format md|html|pdf]  # render compliance / audit reports
openclaw policy verify                         # audit-chain verification
openclaw policy diff <a> <b>                   # semantic diff of two generated IRs
```

`openclaw policy` handlers live in the same package as the library; same code runs from the internal `claws policy` binary with the binary name parameterized for help text. Full signatures + Waffles example + PolicyIR + operational helpers in `policy.md` and `policy-commands.md`.

---

## 4. `@openclaw/snap` — content-addressable snapshot registry

A **snapshot** is a content-addressable capture of an OC workspace — every file in the workspace directory, including any `.openclaw/policy/` artifacts `generate` wrote. `snapshotId = sha256(canonical(workspaceFiles))`. Same files → same id, across hosts.

`@openclaw/snap` stores snapshots, serves them over HTTP, promotes them to "current," rolls back. **It knows nothing about what's *inside* a workspace** — files are files. Any host can run snap without the generator (for review-flow staging, backup, auditing); hosts that generate locally and don't need a registry can skip snap. Zero runtime dep on `@openclaw/policy`.

**HTTP surface** (composed by `openclaw snap serve`):

```
POST   /v1/snapshots                  upload a pre-made snapshot; returns { id, status: 'draft' }
GET    /v1/snapshots                  list (paginated)
GET    /v1/snapshots/:id              fetch a snapshot by id
POST   /v1/snapshots/:id/promote      make current (audited); precondition validated
POST   /v1/snapshots/:id/rollback     revert to this snapshot (audited)
GET    /v1/policy/current             current snapshot's policy-ir.json (convenience)
GET    /v1/resolve?uri=oc://...       resolve an oc:// URI against the current snapshot
GET    /v1/healthz                    liveness
```

**No compile endpoint.** Generation is `@openclaw/policy`'s job — run locally, upload pre-generated snapshots to snap.

**CLI**: `openclaw snap` subcommand group, eleven verbs covering stage toggle (`stage on/off`), working tree (`status`, `diff --staged`, `discard --stage`), registry (`upload`, `list`, `diff <a> <b>`, `checkout`, `promote`, `rollback`, `discard <id>`), and daemon (`serve`). Git-parallel where the concept maps. **Default staging posture: off** — writes land on canonical directly, matching OC-today behavior. The review-gate lifecycle (`.stage/` parking, validate-before-promote) is opt-in per workspace.

Full library + HTTP + staging lifecycle detail in `snap.md` and `snap-commands.md`.

---

## 5. Security properties

Contributed packages implement these properties. Most hold at the provider layer; OC-7 moves `requireApproval` stickiness into the hook-result envelope (OC-core-enforced, independent of which plugin is in the chain).

1. **`requireApproval` sticky at the envelope** (OC-7): when any provider asserts `requireApproval`, OC-core's hook merger treats it as non-downgradable for the decision lifetime. Works independently of §6.1 first-class adoption. OC-7 latches the flag, not the sensitivity label — full "RESTRICTED never laundered" stickiness requires §6.1 OC-9.
2. **Empty local registry fail-closed**: our plugin denies if no providers are registered. OC-core's default behavior without our plugin is unchanged.
3. **Hash-chained integrity**: `@openclaw/guardrails/audit` adds tamper evidence on top of OC's existing audit.
4. **Signed approval handles**: `approvalHandle` binds `{providerId, contentHash, sequenceNumber, approverPrincipal, keyId, ttl, nonce}`. No replay; no handle swap; rotation supported via `keyId`.
5. **Author field is OC-populated**: providers treat `author` as read-only input; OC-core is the source of truth.
6. **Content-addressable snapshots**: `snapshot_id = H(tenant ‖ workspace ‖ content)`.
7. **Lossless round-trip**: policy generator never mutates originals. Depends on OC-4 (preserve originals in `stripFrontMatter`) for correctness on templated files.
8. **Zero `@microsoft/*` imports** across all contributed packages. Intra-scope `@openclaw/*` coupling is explicit — each package declares its `@openclaw/*` peers in `peerDependencies`. CI-enforced.

### 5.9 Scope statement — what's in-contribution vs out-of-scope

| Concern | In contribution? | Where it lives |
|---------|------------------|----------------|
| R5 / RESTRICTED non-downgradability | **Yes** (OC-7) | Hook-result envelope in OC-core |
| Sticky-label propagation through `args_from` | **Yes** | Generator-enforced + provider-enforced |
| Hash-chained audit integrity | **Yes** | `@openclaw/guardrails/audit` over OC's existing audit stream |
| Approval-handle replay resistance | **Yes** | `approvalHandle` binding (property 4) |
| Signed compliance reports | **Yes** | `@openclaw/policy` rubric evaluation output |
| **Signed PolicyIR** | **Out of scope (v1)** | Content-addressable via `snapshotId`, but not cryptographically signed. |
| **Provider identity / publisher signing** | **Out of scope (v1)** | Providers register by name; no signing / verified-publisher model in v1. |
| **Kill switch / runtime provider revocation** | **Out of scope** | Supervisor companion app concern; not a spec-surface primitive. |
| **Compromised-container defense** | **Partial** | Positively defended: tamper-evident audit, substitution detection on read, replay resistance across plugin boundary, R5/RESTRICTED envelope stickiness. Not defended: hostile container with full write access inside the container boundary. |
| **Per-tenant isolation at registry level** | **Out of scope** | Host / deployment concern, not a provider concern. |

---

## 6. OC-core integration — what we'd propose

Additive, OC-conventional PRs. Each leaves OC-core backward-compatible. Numbering, timing, and whether any of these happen at all are yours to shape.

| # | Change | OC-core files | What we add | Why |
|---|--------|---------------|-------------|-----|
| OC-1 | **New hook**: `before_workspace_file_ingest` | `src/agents/workspace.ts`, `bootstrap-files.ts` | Parallel to existing `before_tool_call`. Event includes `{path, operation, author, sessionId, previousHash}`. Returns existing hook-result shape. | Enables any plugin to gate workspace file reads before prompt injection. |
| OC-2 | **New hook**: `after_workspace_file_ingest` | same | Fires after decision is applied. Same shape as `after_tool_call`. Used for audit. | Mirrors the before/after pattern OC already uses for tools. |
| OC-3 | **Content hash in workspace cache** | `src/agents/workspace.ts` | Extend existing inode/dev/size/mtime identity with `sha256(content)`. Computed lazily on cache miss. | Enables `previousHash` in hook events and stable identity for snapshots. |
| OC-4 | **Preserve originals in `stripFrontMatter`** | `workspace.ts:91` | When stripping, retain original bytes under a sibling key (e.g. `raw`). Non-breaking. | Governance needs byte-for-byte originals for hashing and round-trip. |
| OC-5 | **Extend exec-approval audit event taxonomy** | `src/plugin-sdk/approval-*.ts` | Add event categories: `file_ingest`, `policy_generate`, `snapshot_promote`, `snapshot_rollback`, `provider_quarantine`. | Single audit trail for all governance events — no parallel log. |
| OC-6 | **Optional: bootstrap deferral hook** | `bootstrap-files.ts` | Allow registered plugins to defer bootstrap file load until they've evaluated. If no plugin defers, behavior unchanged. | Lets governance evaluate first-load, not just subsequent reads. |
| OC-7 | **`requireApproval` envelope stickiness** | `src/plugins/hook-types.ts`, composition | Make `requireApproval` non-downgradable once set by any provider in the chain. Widens the field type from `boolean` to `boolean \| ApprovalDescriptor \| ApprovalDescriptor[]` (minor-version-bump migration). | Removes the "approval-gate invariants only hold if our plugin is in the chain" problem. |

### 6.1 First-class alternative — native OC risk + sensitivity metadata

The baseline contribution above treats risk/sensitivity as provider-defined classification that happens inside the generated plugin. An alternative: OC-core adopts risk + sensitivity as first-class metadata on tool declarations. The three additional PRs:

| # | Change | Effect |
|---|--------|--------|
| OC-8 | **Add `riskLevel` + `sensitivity` to tool metadata** | Tool declarations in TOOLS.md carry R0–R5 + PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED as first-class fields. Default for undeclared tools: R5, not inferred safety. |
| OC-9 | **RESTRICTED sticky in the hook-result envelope** | Sensitivity label rides on the hook-result alongside `requireApproval`; merger treats RESTRICTED as non-downgradable label (not just flag). Closes the "RESTRICTED never laundered" hole OC-7 alone can't solve. |
| OC-10 | **Native staging + promotion at the gateway** | `stage on` mode makes OC-core natively redirect governance-file writes to `.openclaw/.stage/`, `snap promote` becomes a gateway primitive. Obviates `FileIngestProvider.modify + redirectPath` for the standard path. |

Tradeoffs:

| | OC-7 only | OC-7 + OC-8..10 (first-class) |
|---|---|---|
| OC-core change surface | Additive hooks + one field widening | Adds semantic surface |
| Backward compatibility | Clean migration (codemod) | R5 fail-open declarations become rejected |
| Benefit to other OC hosts | Hook surface | **Safe defaults for free** — any host gets R5 enforcement, RESTRICTED stickiness, staging |
| Plugin complexity | Full enforcement | Custom rules only |
| OC maintainer ask | Smaller | Larger (design alignment on risk taxonomy) |
| Taxonomy lock-in | None — R0-R5 stays convention inside `@openclaw/policy` | Commits OC to the R0-R5 tier definition (or whatever alternative emerges) |

**Both paths are offered.** The core proposal (§6) is what we'd ship if OC prefers a thin extension. The first-class path (§6.1) is what we'd ship if OC wants governance as a native concept.

---

## 7. Versioning + compatibility

- **Semver** across all packages.
- **OC-core hook contract** (OC-1 through OC-6) ships in a minor bump of openclaw-core. All six are strictly additive.
- **OC-7** is a minor-bump with a clean migration, not pure-additive: widens the hook-result `requireApproval` field from `boolean` to `boolean | ApprovalDescriptor | ApprovalDescriptor[]`. Small codemod + migration note alongside the OC-7 PR.
- **OC-8..OC-10** (§6.1 first-class path) are a major bump if OC adopts them — they introduce first-class metadata shapes and change default semantics (R5 fail-open declarations become rejected).
- **LTS alignment**: contributions target OC LTS branches; we'd backport where useful.

---

## 8. Testing + CI

Each contributed package ships with:

- **L0 unit tests** for interface contracts and pure functions.
- **L1 integration tests** that exercise subpath pairs (e.g. `guardrails/audit` + `guardrails/approvals`, `policy` + `workspace/canonicalize`).
- **L2 E2E** tests wired through a mock OC gateway for provider scenarios.
- **Zero-dep check**: `npm ls --prod` returns zero for spec/interface packages.

Round-trip invariant test for policy generator:

```ts
test('generate is lossless', async () => {
  const original = await fs.readFile('SOUL.md', 'utf8');
  const output = await generator.generate({ workspaceRoot: '.' });
  const reconstructed = await reconstructWorkspace(output.snapshotId);
  expect(reconstructed['SOUL.md']).toBe(original);      // byte-identical
});
```

Per-package test details in `guardrails.md`, `workspace.md`, `policy.md`, `snap.md`.

---

## 9. Open items

Tracked separately; not contribution blockers:

- Naming: `@openclaw/*` vs alternative scope — Peter's call.
- Spec PR process for governance interfaces — how OpenClaw reviews spec-level contributions.
- Repo placement: standalone repo under `openclaw/` org, or `packages/` entry in the openclaw monorepo.
- LTS branch targeting + backport posture.
- `@openclaw/snap` absorption timing — substantive infra, could run in MS org for 6-12 months before upstream absorption.
- Whether `@openclaw/workspace/ast` grammars should live in `openclaw-core` directly rather than as an external package.
