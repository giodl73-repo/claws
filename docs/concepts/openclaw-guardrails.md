# @openclaw/guardrails

<!-- atom:openclaw-guardrails -->

## The short version

`@openclaw/guardrails` (published internally as `@bic/openclaw-guardrails`, upstream as `@openclaw/guardrails`) is the single package holding OpenClaw's governance primitives. Two peer contracts live at the top level -- `GuardrailProvider` for tool calls and `FileIngestProvider` for file ingest -- wrapping OC's `before_tool_call` and `before_workspace_file_ingest` hooks with the same four-variant decision vocabulary (`allow` / `deny` / `review` / `modify`). Six runtime primitives ride alongside as scoped subpaths: `/audit`, `/approvals`, `/budget`, `/identity`, `/siem`, `/secrets`. One install, one version, one coordination point. Consumers tree-shake what they use -- importing `/audit` never pulls `/siem`. The composition rule is one line: `deny > review > modify > allow`.

---

## Two decision moments, two contracts

Only two points in the agent lifecycle produce governance decisions: when the agent tries to **call a tool**, and when it tries to **read or write a workspace file**. `@openclaw/guardrails` ships one contract for each, and they are deliberate peers -- same vocabulary, same composition rules, same audit shape -- so that providers, supervisors, SIEM feeds, and compliance reports work uniformly across surfaces.

```ts
export interface GuardrailProvider {
  readonly name: string;
  preAuthorize(event: ToolCallEvent): Promise<AuthorizationDecision>;
  postAudit(event: ToolCallEvent, decision: AuthorizationDecision): Promise<void>;
  getCapabilities(): GuardrailCapabilities;
}

export interface FileIngestProvider {
  readonly name: string;
  beforeIngest(event: FileIngestEvent): Promise<IngestDecision>;
  afterIngest(event: FileIngestEvent, decision: IngestDecision): Promise<void>;
  getCapabilities(): FileIngestCapabilities;
}
```

The symmetry is the point. Integrators do not learn two governance models; they learn one and apply it at two hook points.

| Surface | OC hook wrapped | Peer contract | Decision type |
|---------|----------------|---------------|---------------|
| Tool execution | `before_tool_call` | `GuardrailProvider.preAuthorize` | `AuthorizationDecision` |
| File ingest | `before_workspace_file_ingest` | `FileIngestProvider.beforeIngest` | `IngestDecision` |
| Post-hoc audit | (both) | `postAudit` / `afterIngest` | fire-and-forget |
| Capability reflection | (both) | `getCapabilities()` | `GuardrailCapabilities` / `FileIngestCapabilities` |

Provider authors only construct events coming *into* these hooks (`ToolCallEvent`, `FileIngestEvent`) and decisions coming *out*. Everything else -- audit sinks, approval signers, identity bridges, snapshot metadata, logging -- arrives through `HostContext` at `init()` time, so providers never construct per-tenant infrastructure at module load.

---

## Decision vocabulary

Both contracts share a four-variant discriminated union. Each variant means something concrete on each surface:

| Variant | `GuardrailProvider` (tool call) | `FileIngestProvider` (file ingest) |
|---------|-------------------------------|----------------------------------|
| `allow` | Tool runs with the original arguments. May carry `riskLevel` and `requiresExternalApproval` for sticky enforcement. | File is ingested as provided. May carry `sensitivity` and `requiresExternalApproval`. |
| `deny` | Tool does not run. `reason` is surfaced to the agent and logged. | File is rejected. `reason` is surfaced and logged. Nothing is written to the workspace. |
| `review` | Tool is suspended; OC-core wraps the hook-result in `requireApproval`. `approvalHandle` is an HMAC-signed opaque string that the companion app must re-present. | Ingest is suspended; same approval envelope. Same handle binding rules. |
| `modify` | Arguments are rewritten. `modifiedArguments` replaces the original `ToolCallEvent.arguments`. | Content is rewritten, or the write is redirected: `modifiedContent` replaces the payload, `redirectPath` (optional) reroutes to `.openclaw/.stage/<path>` so the canonical workspace is untouched until promotion. |

The `modify` variant is asymmetric -- on tool calls it rewrites arguments; on file ingest it additionally supports redirect-to-stage for the snap staging lifecycle (see [@openclaw/snap](openclaw-snap.md) for the draft → current → superseded flow). Everything else is identical between the two surfaces.

```ts
export type AuthorizationDecision =
  | { decision: 'allow'; riskLevel?: RiskLevel; requiresExternalApproval?: boolean }
  | { decision: 'deny'; reason: string; riskLevel?: RiskLevel }
  | { decision: 'review'; reason: string; approvalHandle?: string; riskLevel?: RiskLevel }
  | { decision: 'modify'; modifiedArguments: unknown; reason?: string;
      riskLevel?: RiskLevel; requiresExternalApproval?: boolean };

export type IngestDecision =
  | { decision: 'allow'; sensitivity?: Sensitivity; requiresExternalApproval?: boolean }
  | { decision: 'deny'; reason: string }
  | { decision: 'review'; reason: string; approvalHandle?: string }
  | { decision: 'modify'; modifiedContent: string; redirectPath?: string; reason?: string };
```

`RiskLevel` is the `R0..R5` scale ([R0 unclassified, R1 read, R2 write, R3 communicate, R4 execute, R5 transact/irreversible-external]); `Sensitivity` is `PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED`. See [risk-tiers](risk-tiers.md) for how declared tiers compose with `args_from` provenance (G-CHAIN).

---

## Composition -- one rule

A single enforcement point may have many providers registered: one generated from policy, one enterprise secret-scanner, one SIEM-only observer. The registry composes their decisions with exactly one priority rule:

```
deny > review > modify > allow
```

Higher-priority variants mask lower ones. The composition engine lives in the default export as `composeDecisions` and `ProviderRegistryImpl` (`claws-sdk/packages/guardrails/src/registry.ts`).

### The 4×4 matrix

Read row (provider A) vs column (provider B). Cells show the composed winner; ordering is commutative.

|         | **A allow**          | **A modify**        | **A review**        | **A deny** |
|---------|---------------------|---------------------|---------------------|------------|
| **B allow**   | `allow` [^extern]   | `modify` [^r5carry] | `review` [^conj]    | `deny`     |
| **B modify**  | `modify` [^r5carry] | `modify` [^merge]   | `review` [^conj]    | `deny`     |
| **B review**  | `review` [^conj]    | `review` [^conj]    | `review` [^conj]    | `deny`     |
| **B deny**    | `deny`              | `deny`              | `deny`              | `deny`     |

[^extern]: `requiresExternalApproval` is OR-reduced across all providers. If any `allow` peer set it, the composed `allow` carries it. Any R5 `riskLevel` anywhere in the set forces it to `true` -- see R5 invariant below.

[^r5carry]: **R5 carry on `modify`.** A provider may return `modify` with `requiresExternalApproval: true`; when that `modify` wins over an `allow` peer that was R5, the flag must survive onto the composed `modify`. The `modify` variant therefore carries `requiresExternalApproval?: boolean` specifically so the R5 force-external-approval contract does not silently drop when `modify` beats `allow`. This is the load-bearing subtlety from guardrails.md §Interfaces.

[^merge]: **Two `modify` merge.** If two providers both return `modify` with different `modifiedArguments` (or `modifiedContent`), the later-registered provider's payload wins -- last-modify-wins, as implemented in `composeDecisions`. `riskLevel` takes the max; `requiresExternalApproval` ORs. If deterministic ordering matters to the host, it must register providers in the intended precedence order; the registry preserves insertion order.

[^conj]: **Two `review` are conjunctive.** If two providers both return `review`, **both** approval handles are forwarded to the supervisor and all must resolve to approve before the call proceeds. This is OC-core's merger behavior under OC-7 (`ApprovalDescriptor` lists are unioned, not collapsed). The composed `review` carries the first provider's handle on the wire, but OC-core renders every emitted descriptor to the companion app.

### R5 invariant

Any provider that reports `riskLevel: 5` forces `requiresExternalApproval: true` on the composed winner, regardless of which variant wins. The registry enforces this -- individual providers do not need to set the flag themselves. This is what makes R5 ("irreversible-external": `send-email`, `post-publicly`, `wire-funds`) **fail-closed, non-waivable**: a provider cannot silently downgrade an R5 tool to a plain `allow`, because composition re-lifts the flag.

The carry onto `modify` (footnote ^r5carry^) is why R5 is watertight. Without it, a `modify` provider that rewrites arguments but does not itself understand risk tiers could win composition against an R5-labelled `allow` peer and erase the force-external-approval signal. The explicit `requiresExternalApproval?: boolean` on the `modify` variant closes that gap.

### Envelope stickiness (OC-7)

Composition produces one decision per provider chain. But OC may run **multiple plugins**, and each plugin contributes its own hook-result to OC-core's merger. OC-7 (defined in the upstream spec §1.5 and §5) is the envelope-level invariant that `requireApproval` is **non-downgradable across plugins**: once any plugin asserts it, it stays asserted for the decision lifetime. The companion app receives every `ApprovalDescriptor` any plugin emitted (conjunctive -- all must be approved).

This is why a provider that returns `allow` with `requiresExternalApproval: true` is functionally equivalent to OC-core receiving a `review` from another plugin: the approval envelope latches, and the agent stalls until the companion app resolves every descriptor. The guardrails composition rule (`deny > review > modify > allow`) governs behavior **inside a single plugin**; OC-7 governs behavior **across plugins**. The two rules are designed to meet cleanly: inside-plugin composition OR-reduces the flag, and OC-core's merger latches it across plugins.

### Empty registry behavior

`ProviderRegistryImpl.preAuthorize` with zero registered providers returns `{ decision: 'allow' }` and emits a console warning. This is the **fail-open default at the `@openclaw/guardrails` layer**; the generated plugin from `@openclaw/policy` layers fail-closed denial on top. The distinction matters: the guardrails primitive is a library, and a library that denied every call when misconfigured would break hosts that legitimately run without policy. Operators who want deny-by-default register exactly one provider that denies when no rules match.

---

## Runtime primitives -- six subpaths

Each subpath is a standalone runtime module. They do not depend on each other at runtime -- `/audit` can be imported without pulling `/siem`, and vice versa. Providers that need cross-subpath coordination receive injected handles (`auditSink`, `identityBridge`, `approvalHandleSigner`) via `HostContext` rather than importing subpaths directly.

### `/audit` -- hash-chained audit log

Tamper-evident write-ahead log. Every governance decision (allow, deny, review, modify, post-audit) is appended as an `AuditEntry` whose hash chains over the previous entry. `verifyChain` walks the chain end-to-end and reports any break point. Canonicalization is `@openclaw/workspace/canonicalize` (RFC 8785 JCS) -- byte-identical across Linux, Windows, and macOS.

Key exports (`@bic/openclaw-guardrails/audit`):

```ts
export function append(store: ChainStore, input: AppendInput): Promise<ChainEntry>;
export function query(store: ChainStore, q: AuditQuery): AsyncIterable<ChainEntry>;
export function verifyChain(store: ChainStore, range?: { from: string; to: string }): Promise<VerifyResult>;
export function createChainStore(path: string): ChainStore;
export function createWALStore(path: string): WALStore;           // crash-recovery
export function jsonlExport(iter: AsyncIterable<AuditEntry>): AsyncIterable<string>;
export function cefExport(iter: AsyncIterable<AuditEntry>): AsyncIterable<string>;
export function syslogExport(iter: AsyncIterable<AuditEntry>): AsyncIterable<string>;
export const GENESIS_HASH: string;
```

Used by: every provider's `postAudit` / `afterIngest`. The host injects a pre-keyed `AuditSink` (the `/audit` implementation keyed by tenant) via `HostContext.auditSink` -- providers do not open files or hold keys themselves. For the full tamper-evidence model, see [audit-chain](audit-chain.md).

### `/approvals` -- human-in-the-loop schema

HMAC-signed approval handles with content-bound replay protection. A provider that returns `review` receives a signed handle; when the companion app responds, the `contentHash` must still match (no swap), the `sequenceNumber` must not replay, and the `keyId` identifies which rotated signing key was used.

Key exports (`@bic/openclaw-guardrails/approvals`):

```ts
export function signHandle(binding: HandleBinding, key: Buffer): Promise<string>;
export function parseHandle(handle: string): ParsedHandle;
export function verifyHandle(handle: string, key: Buffer, expectedBinding: HandleBinding): Promise<VerifyResult>;
export function isApprovalRequest(ev: unknown): ev is ApprovalRequestEvent;
export function isApprovalResponse(ev: unknown): ev is ApprovalResponseEvent;
export function validateTimeoutPolicy(p: ApprovalTimeoutPolicy): void;
```

`HandleBinding` fields: `{providerId, contentHash, sequenceNumber, approverPrincipal, keyId, ttlSeconds, nonce}`. The nonce is **consume-once** -- once the companion app replies, the nonce is burned; a replay with the same handle is rejected. `ApprovalTimeoutPolicy` fail-closes to `deny` on TTL expiry unless the policy opts into `escalate` with `escalationTargets`.

Used by: providers that return `review`. The `approvalHandleSigner` is injected via `HostContext.approvalHandleSigner` so individual providers never hold signing keys -- the trusted plane (OpenClaw Gateway) does. See [elicitation-gate](elicitation-gate.md) and [obo-boundary](obo-boundary.md) for how the handle rides OC's existing `requireApproval` envelope.

### `/budget` -- token + cost meter

Per-window spend tracking with threshold alerts and an `onExhausted` policy. Every tool call and file ingest can be pre-checked against a budget window (`hour` | `day` | `month`); the meter records actual cost post-execution.

Key exports (`@bic/openclaw-guardrails/budget`):

```ts
export function createBudgetMeter(policy: BudgetPolicy): BudgetMeter;
export class InMemoryBudgetMeter implements BudgetMeter { /* ... */ }
export interface BudgetMeter {
  check(event: ToolCallEvent | FileIngestEvent): Promise<BudgetDecision>;
  record(event: ToolCallEvent | FileIngestEvent, actual: CostRecord): Promise<void>;
  window(): { start: string; end: string; spent: CostRecord; limit: CostRecord };
}
export type BudgetDecision =
  | { status: 'ok'; remaining: CostRecord }
  | { status: 'threshold'; remaining: CostRecord; alert: ThresholdAlert }
  | { status: 'exceeded'; over: CostRecord };
```

Thresholds are percentages of the limit (e.g., alert at 0.8, throttle at 0.95, deny at 1.0); `onExhausted` picks `deny` (fail-closed), `throttle` (slow but allow), or `alert-only` (audit but allow).

Used by: a BudgetGuardrailProvider implementation that calls `meter.check(event)` inside `preAuthorize`, returns `deny` on `exceeded`, and returns `allow` with a `postAudit` that records actual cost. The meter is typically constructed per-tenant at `init()` time using a `BudgetPolicy` from workspace configuration.

### `/identity` -- OIDC/SAML bridge + RBAC

Token validation, on-behalf-of (OBO) exchange, revocation cache, and a role-based access control store. The `IdentityBridge` handle on `HostContext.identityBridge` is what providers use to resolve the principal for an incoming event.

Key exports (`@bic/openclaw-guardrails/identity`):

```ts
export function createIdentityBridge(cfg: IdentityBridgeConfig): IdentityBridge;
export function validateOidc(token: string, cfg: ValidationConfig): Promise<ValidationResult>;
export function validateSaml(assertion: string, cfg: ValidationConfig): Promise<ValidationResult>;
export function exchangeOboToken(userToken: string, agentId: string, cfg: IdentityBridgeConfig): Promise<string>;
export function resolveIdentity(token: string, bridge: IdentityBridge): Promise<AgentIdentity>;
export function createRevocationCache(): RevocationCache;
export function isRevoked(principal: string, cache: RevocationCache): boolean;
export function revokePrincipal(principal: string, cache: RevocationCache): void;

// RBAC
export function createRoleStore(): RoleStore;
export function addRole(store: RoleStore, role: Role): void;
export function mapGroup(store: RoleStore, group: string, roles: string[]): void;
export function resolveRoles(store: RoleStore, identity: AgentIdentity): Role[];
export function authorize(store: RoleStore, identity: AgentIdentity, permission: Permission): AccessDecision;
export function checkAccess(store: RoleStore, identity: AgentIdentity, permission: Permission): boolean;
```

OIDC and SAML share one `ValidationResult` shape. Revocation is checked per-request via introspection endpoint or the local CRL cache. OBO tokens carry `{issuedAt, expiresAt}` so the downstream service can see the delegation window.

Used by: any provider that needs to resolve the acting principal or perform permission checks before deciding. See [obo-boundary](obo-boundary.md) and [identity-provenance](identity-provenance.md).

### `/siem` -- event formatters

Per-entry serializers for ArcSight CEF, NDJSON (Splunk / Elastic), and RFC 5424 syslog (Sentinel). The canonical serializers for the whole guardrails family live here; `/audit`'s batch exporters (`cefExport`, `jsonlExport`, `syslogExport`) delegate to these primitives rather than emit a second CEF dialect.

Key exports (`@bic/openclaw-guardrails/siem`):

```ts
export function toCef(entry: AuditEntry): string;
export function toNdjson(entry: AuditEntry): string;
export function toSyslog(entry: AuditEntry, opts?: SyslogOpts): string;
export function emit(entry: AuditEntry, format: EmitFormat): string;
export function emitBatch(entries: AuditEntry[], format: EmitFormat): string[];
export type EmitFormat = 'cef' | 'ndjson' | 'syslog';
```

CEF field mapping covers all governance event categories (tool classification, elicitation, policy change, kill switch, drift, A2A, integrity) with explicit CEF severity (0–10). Syslog messages exceeding RFC 5424 limits are split with correlation IDs -- never silently truncated. `oc://` URIs pass through unmodified so SIEM rules can key on canonical workspace paths.

Used by: a sidecar tail process that streams `.claws/audit/*.jsonl` into the enterprise SIEM. Also used by `/audit`'s bulk exporters (same bytes, different call site).

### `/secrets` -- credential leak detection

Pattern matching + Shannon entropy over the content field of a `FileIngestEvent`. Default ruleset covers AWS/GCP/Azure keys, GitHub/GitLab tokens, RSA/ED25519/PGP private keys, JWTs, and common DB connection strings.

Key exports (`@bic/openclaw-guardrails/secrets`):

```ts
export function createSecretScanner(opts?: ScanOptions): SecretScanner;
export class DefaultSecretScanner implements SecretScanner { /* ... */ }
export interface SecretScanner {
  scan(content: string, opts?: ScanOptions): ScanResult;
  registerPattern(pattern: SecretPattern): void;
}
export function matchPatterns(content: string, patterns: SecretPattern[]): PatternMatch[];
export function shannonEntropy(s: string): number;
export function findHighEntropyTokens(content: string, minEntropy: number): EntropyTokenMatch[];
export function maskSecret(finding: SecretFinding): string;
export const DEFAULT_PATTERNS: SecretPattern[];
```

`ScanResult` returns `{findings, entropy}`; each `SecretFinding` has `{ruleId, span, preview, confidence}`. Previews are pre-masked -- raw matched text is never held in memory past scan completion. Custom pattern registration (`registerPattern`) is an admin-trust-boundary operation; the generated plugin from `@openclaw/policy` may embed workspace-declared patterns, but runtime registration is host-only.

Used by: a FileIngestProvider that calls `scanner.scan(event.contentPreview)` inside `beforeIngest` and returns `deny` (high-confidence finding in a PUBLIC ingest) or `modify` (redact + redirect to `.openclaw/.stage/`) or `review` (medium-confidence, escalate). See [compliance-artifact](compliance-artifact.md) for how scan findings attach to evidence packages.

---

## Subpath tree-shake

Each subpath is its own entry point. A consumer that only wants hash-chain audit writes this:

```ts
import { append, verifyChain, createChainStore } from '@bic/openclaw-guardrails/audit';
```

…and the bundler pulls **only** `/audit`'s module graph. `/siem`, `/identity`, `/secrets`, `/budget`, `/approvals` never enter the bundle.

This is verified by the CP-9 P43 scenario (`scenario-guardrails-subpaths.md`), which builds a fixture package with a rollup config that imports only `@bic/openclaw-guardrails/audit`, asserts the generated bundle contains no symbols from the other five subpaths, and measures per-subpath bundle size. Target sizes (gzipped, on the stable 0.1 interface):

| Subpath | Bundle size (gzip) | Notes |
|---------|-------------------|-------|
| `/audit` | 18 kB | largest — hash-chain + WAL + three export formats |
| `/approvals` | 14 kB | HMAC handle signer + verifier + timeout policy |
| `/budget` | 9 kB | meter + threshold engine + CostRecord |
| `/identity` | ~11 kB | OIDC + SAML + RBAC (varies by JWT library) |
| `/siem` | ~8 kB | three format serializers, shared with `/audit` exporters |
| `/secrets` | ~12 kB | default patterns + entropy + masking |

Two load-bearing requirements make the tree-shake work:

1. **`sideEffects: false`** in `package.json`. Without it, bundlers assume the package has arbitrary side effects at module load and refuse to drop unused re-exports. The CP-9 gate greps for this field on every PR touching the package manifest.
2. **No top-level `import` from subpath index files into the default export.** The default export declares `export type` for cross-subpath shapes (`AuditSink`, `AuditEntrySummary`, `HandleBinding`) as **type-only re-exports** so the runtime module graph stays empty. Runtime implementations live in `/audit`'s `chain.ts`, `/approvals`'s `handle.ts`, etc.

The scenario's F3 finding is explicit: `sideEffects: false` is not a nice-to-have -- it is the hinge that makes the whole subpath model worth shipping.

---

## Why subpaths, not separate packages

A reasonable alternative would be six packages: `@openclaw/guardrails-audit`, `@openclaw/guardrails-approvals`, and so on. We rejected that for one reason: **version lockstep**.

| Concern | Six packages | One package, six subpaths |
|---------|--------------|--------------------------|
| Install footprint | 6 lockfile entries, 6 `node_modules` trees | 1 lockfile entry, 1 `node_modules` tree |
| Bundle footprint | Same (tree-shake works either way if exports are clean) | Same |
| Version skew | `audit@0.2` + `approvals@0.1` is legal and breaks at runtime when `HandleBinding` diverges | Impossible — single `version` field |
| Cross-subpath types | Published as their own package or duplicated | Type-only re-exports from default (`AuditSink`, `HandleBinding`) |
| `composeDecisions` ownership | Has to live in a 7th "core" package | Lives in default, no extra install |
| Upgrade flow | `npm update @openclaw/guardrails-*` with 6 separate changelogs | `npm update @openclaw/guardrails` with one changelog |
| SRE blast radius | One skewed version becomes a production incident | Impossible by construction |

The runtime primitives share cross-cutting invariants: `/approvals` produces a handle that `/audit` hashes; `/audit`'s `AuditEntry` is the input `/siem` serializes; `/identity` resolves the principal that ends up in the `HandleBinding` from `/approvals`. If those shapes drift, the whole model breaks. Keeping them in one `version` field is how we enforce "all six move together or none move."

Separate packages were the 2024 pattern for this ecosystem. We learned. Subpaths are the 2026 pattern.

---

## Provider lifecycle -- `ProviderLifecycle` + `HostContext`

Providers that need injected dependencies MAY implement `ProviderLifecycle`. Providers without dependencies stay stateless and skip the interface entirely.

```ts
export interface HostContext {
  auditSink: AuditSink;                                           // per-tenant, pre-keyed
  identityBridge: IdentityBridge;                                 // resolves principals
  approvalHandleSigner: (b: HandleBinding) => Promise<string>;    // trusted-plane call-out
  snapshot: SnapshotMeta | null;                                  // current snap, if any
  stageMode: 'on' | 'off';                                        // workspace staging toggle
  logger: Logger;                                                 // structured logger
}

export interface ProviderLifecycle {
  init?(ctx: HostContext): Promise<void>;                         // once, before any call
  shutdown?(): Promise<void>;                                     // graceful stop
  onSnapshotPromoted?(meta: SnapshotMeta): Promise<void>;         // hot-reload on snap promote
  onStageModeChanged?(next: 'on' | 'off'): Promise<void>;         // staging toggle
}
```

Host obligations (guardrails.md §1.4a):

- **`init(ctx)` fires exactly once** per provider registration, before any `preAuthorize` / `beforeIngest`. Providers MUST NOT construct audit sinks, HMAC signers, or identity bridges at module-load time -- they must use what `ctx` hands them.
- **`onSnapshotPromoted` fires after `snap promote`** commits, so a provider generated from PolicyIR can reload the compiled ruleset without restarting the process. See [@openclaw/snap](openclaw-snap.md).
- **`onStageModeChanged`** fires when a workspace toggles `stage on` / `off`; providers honor the current mode from this signal (e.g., a FileIngestProvider routes writes to `.openclaw/.stage/` only when `stageMode === 'on'`).

The `Logger` on `HostContext` is the **only** seam for host-visible logs. Providers MUST NOT emit to stdout / stderr -- that would bypass tenant log isolation. Audit entries go through `auditSink`; operational logs go through `logger`; nothing else is legal.

---

## Dependencies

- `@bic/openclaw-workspace/canonicalize` -- peer dep. Used by `/audit` (hash input) and `/approvals` (handle binding canonicalization). One canonicalizer across the whole family; byte-identical across platforms.
- `@bic/openclaw-workspace/path` -- peer dep. Used by `/siem` (CEF / NDJSON / syslog emit `oc://` URIs) and audit entries referencing workspace content.

Zero `@microsoft/*` imports. CI-enforced per-PR. The package is designed to leave `@bic/` for `@openclaw/` at upstream publication time without any source changes.

---

## Versioning

Semver across the whole package. What each change type buys:

| Change | Bump |
|--------|------|
| Add a new optional field to a subpath type | Minor |
| Add a new subpath | Minor |
| Add a new export to an existing subpath | Minor |
| Rename a top-level interface (`GuardrailProvider`, `FileIngestProvider`) | Major |
| Remove a subpath | Major |
| Change the handle-binding algorithm (HMAC → Ed25519, field order) | Major |
| Change `composeDecisions` priority ordering | Major |
| Change the R5 carry invariant | Major |

A 1.x → 2.x bump requires coordinated upgrade across every adopter because the governance contract itself changes shape. The 0.x track explicitly permits breaking changes between minors -- we use it to finalize the interface before committing to semver.

---

## See also

- [guardrail-provider](guardrail-provider.md) -- the OC spec for the provider interface (preceded `@openclaw/guardrails` absorption)
- [audit-chain](audit-chain.md) -- tamper-evidence model used by `/audit`
- [elicitation-gate](elicitation-gate.md) -- how `/approvals` handles ride OC's existing `requireApproval` envelope
- [obo-boundary](obo-boundary.md) -- how `/identity` OBO tokens cross the agent/user trust boundary
- [risk-tiers](risk-tiers.md) -- R0–R5 + `args_from` provenance composition (the source of R5 force-external-approval)
- [defense-in-depth](defense-in-depth.md) -- where `@openclaw/guardrails` sits in the five-layer model (L2 + L3)
- [@openclaw/snap](openclaw-snap.md) -- snapshot lifecycle that `redirectPath` feeds via `.openclaw/.stage/`
- [@openclaw/workspace](openclaw-workspace.md) -- `oc://` URIs, canonicalize, AST shared by all four packages
- [@openclaw/policy](openclaw-policy.md) -- the generator that emits `GuardrailProvider` + `FileIngestProvider` implementations from workspace declarations
- [openclaw-upstream-spec §1](../proposals/openclaw-upstream/openclaw-upstream-spec.md) -- the authoritative spec
- [guardrails.md](../proposals/openclaw-upstream/guardrails.md) -- the package-level spec companion
