> **⚠️ SUPERSEDED 2026-04-29 — DO NOT FILE.**
>
> This draft proposes a new `@openclaw/guardrails` upstream package with `GuardrailProvider` + `FileIngestProvider` peer interfaces and six runtime subpaths. **The v2 proposal package retired this approach** because upstream openclaw already ships the equivalent slot at `src/plugins/host-hooks.ts:65-72` (`PluginTrustedToolPolicyRegistration`) and the runner at `src/plugins/trusted-tool-policy.ts:8-54` (`runTrustedToolPolicies`). A new upstream package would duplicate the existing shape and force a migration.
>
> **Replacement plan**: 0 LoC upstream. ~50 LoC downstream-only adapter at `packages/claws-guardrails/src/openclaw-adapter.ts` exporting `toTrustedToolPolicy(provider: GuardrailProvider): PluginTrustedToolPolicyRegistration`. Decision-vocabulary translation (`allow|deny|review|modify` → `block|allow|params|requireApproval`) lives there. See:
>
> - `.craft/out/proposals/realigned-story.md` § "5. claws-guardrails (no upstream PR)"
> - `.craft/out/proposals/guardrails-adapter.md` (full design)
> - `.craft/plans/hapi-amendment-to-contract-first.md` (amendment plan)
>
> Useful contributions from this draft (`sourcePluginId` adversarial-defense, hash-chained audit format, RFC 8785 JCS canonicalization) are absorbed by the v2 design docs and the downstream `claws-guardrails` package; nothing of value is lost.
>
> ---
>
> **Original draft below (for reference / cherry-pick).**

## Why this PR

Three interfaces every enterprise host re-implements today: pre-tool-call governance, file-ingest governance, hash-chained tamper-evident audit. This PR adds `@openclaw/guardrails` — a single package shipping the two peer interfaces (`GuardrailProvider`, `FileIngestProvider`) plus six runtime subpaths covering the primitives every adopter needs.

The interfaces and runtime primitives are the same shapes Microsoft has been running internally for the last quarter; we're contributing them upstream so every OpenClaw host gets them, with or without us in the picture.

## Why governance must live in core (not extension)

Plugin-tenancy and adversarial-plugin defense require gateway-level enforcement, not extension-level. An extension-shipped guardrails package leaves the audit attribution invariant unenforceable: any plugin can claim it issued any other plugin's audit entry, and the gateway has no authoritative truth to override the claim with. Audit chain-of-custody breaks the moment a plugin can spoof another plugin's identity. Core-level guardrails fix this by overriding plugin-supplied `sourcePluginId` at the registry's `postAudit()` boundary using the authenticated caller's identity.

The hash-chained audit (`/audit` subpath) layers on top of OpenClaw's existing audit stream — it doesn't replace anything. Builder-side plugins gain tamper-evidence; existing audit consumers gain integrity verification; the wire shape is preserved.

## Before / after

**Before** — plugin emits an audit entry:
```ts
auditSink.append({
  event: 'tool_call',
  sourcePluginId: 'plugin-A',  // any plugin can claim this
  // ...
});
```

Plugin-X can claim `sourcePluginId: 'plugin-Y'` in its audit emission — chain of custody breaks.

**After this PR**:
```ts
// In ProviderRegistryImpl.postAudit() — runs at gateway, not at plugin
postAudit(entry: AuditEntrySummary, ctx: { authenticatedPluginId: string }) {
  const verified: AuditEntrySummary = {
    ...entry,
    sourcePluginId: ctx.authenticatedPluginId,  // override; plugin-supplied is hint, not truth
  };
  return appendToHashChain(verified);
}
```

Plugin-supplied `sourcePluginId` is a hint, not ground truth. The gateway always has authoritative identity.

## What ships

### Two peer interfaces

```ts
export interface GuardrailProvider {
  preAuthorize(call: ToolCallEvent): Promise<Decision>;
  postAudit(call: ToolCallEvent, result: ToolCallResult): Promise<void>;
  getCapabilities(): ProviderCapabilities;
}

export interface FileIngestProvider {
  beforeIngest(event: FileIngestEvent): Promise<Decision>;
  afterIngest(event: FileIngestEvent, decision: Decision): Promise<void>;
  getCapabilities(): ProviderCapabilities;
}
```

Same decision vocabulary (`allow | deny | review | modify`), same composition rules (`deny > review > modify > allow`), so providers, audit, and review work uniformly across surfaces.

### Six runtime subpaths

| Subpath | What |
|---|---|
| `/audit` | Hash-chained integrity layer over OC's existing audit stream. Tamper-evident. RFC 8785 JCS canonicalization (byte-identical across platforms). |
| `/approvals` | HITL schema. Extends OC's `requireApproval` with governance metadata (signed handles, content hash, sequence number, key id, TTL, nonce). |
| `/budget` | Token / cost controls with 80/95/100% threshold alerts. Tenant-scoped. |
| `/identity` | OIDC / SAML agent identity bridge. OBO token issuance. |
| `/siem` | CEF / NDJSON / syslog / SARIF formatters. Pipe OC audit to external SIEM. |
| `/secrets` | Pattern + entropy leak detection. `registerPattern()` for custom rules. |

Each subpath is independently tree-shakable. Consumers tree-shake what they don't use.

### Mandatory `sourcePluginId` on audit entries

```diff
  export interface AuditEntrySummary {
    event: AuditEventKind;
    timestamp: string;
+   /** REQUIRED: plugin id of the entry's authoritative source.
+    * Plugin-supplied is a hint; ProviderRegistryImpl.postAudit() overrides
+    * with the authenticated caller's id for adversarial-plugin defense. */
+   sourcePluginId: string;
    actor?: { principal: string; identitySource: string };
    // ... rest unchanged ...
  }
```

Lenient mode (`--lenient`) accepts entries timestamped before this PR's adoption date without `sourcePluginId` — runtime-only flag, not a type union. Strict mode (default) rejects them.

A runtime-safe accessor is provided for code that iterates mixed audit streams:

```ts
export function getSourcePluginId(entry: AuditEntrySummary | LegacyAuditEntry): string | undefined {
  return 'sourcePluginId' in entry ? entry.sourcePluginId : undefined;
}
```

### Approval lifecycle audit events

Per spec amendment §5, every approval handle now emits THREE audit events over its lifetime:

- `approval_issued` at handle issue time
- `approval_resolved` at supervisor approval / denial / modify
- `approval_expired` at TTL expiry without resolution

E-discovery query "which handles timed out unused on date X?" becomes answerable from the audit chain alone — no separate registry needed.

### URI vocabulary consumed

Audit entries emit `oc://...` URIs as actor / source / location fields where the URI vocabulary applies (per PR-1 + PR-2):

```ts
{
  event: 'tool_call_reviewed',
  location: { kind: 'uri', uri: 'oc://TOOLS.md/Tools/post-to-channel' },
  actor: { principal: 'oc://config/channels/slack/bot-account', ... },
  ...
}
```

Same vocabulary editor LSPs and `snap resolve` will consume in PR-6. One vocabulary, every surface.

## Adapter audit cited

This PR opens with `docs/upstream/guides/adapter-audits.md § 3` (audit-stream wire-shape audit) attached. The audit documents the field-by-field mapping from our `AuditEntrySummary` to CEF / NDJSON / syslog / SARIF formatters, including:
- Timestamp granularity: RFC 3339 with milliseconds (uniform across formats)
- CEF `suser` mapping rule for actor identity
- `cs3` correlation field convention for `eventId`
- Round-trip integrity proven for every format
- Lossy-format tradeoffs documented (CEF / syslog truncate long fields)

Without this audit, the audit-stream contract is undefined and SIEM evidence chain breaks. The audit lands BEFORE this PR opens.

## Test plan

- [x] **F-57** Hash-chain append + verify on N=1, 10, 1000 events
- [x] **F-58** Tamper-detection at exact tampered index
- [x] **F-59** Replay rejected: same bytes, different `contentHash`, past TTL
- [x] **F-60** Handle-swap rejected: modified `contentHash` rejected
- [x] **F-61** Rotated `keyId` accepted in grace window, rejected outside
- [x] **W6** `sourcePluginId` rejected when missing in strict mode (1 test)
- [x] **W6** `sourcePluginId` overridden at `postAudit()` boundary (adversarial defense test)
- [x] **§5** Approval lifecycle: issued → resolved emits both events
- [x] **§5** Approval lifecycle: issued → TTL expires → expired event emitted
- [x] **F-38** Audit-stream round-trip through CEF / NDJSON / syslog / SARIF; re-parse identical to original (cited from adapter-audits.md § 3)
- [x] **F-42** `--verify` flag re-verifies chain before formatting

## Bot pre-empt checklist

- [x] PR description leads with core-not-extension justification (above)
- [x] No keywords trigger `r:third-party-extension` / `r:skill`
- [x] `docs/.generated/plugin-sdk-api-baseline.sha256` refreshed
- [x] `docs/sdk-overview.md` table updated with `@openclaw/guardrails` row
- [x] No Swift protocol model changes (no gateway protocol surface added)
- [x] **`sourcePluginId` is host-overridden at `postAudit()` boundary** (NEVER trusted from plugin-supplied claim — adversarial-plugin defense, see above)
- [x] All host-boundary entries validated with Zod schema
- [x] No generic `try/catch` in hot path; failure modes distinguished (chain-integrity vs IO vs validation)
- [x] No duplicate helpers; intra-package shared utilities live in `src/shared/`
- [x] Zero `@microsoft/*` imports verified by CI gate (the dedicated workflow runs on every PR)
- [x] CHANGELOG entry appended at END of target section

## Metrics

- **1 new package**: `@openclaw/guardrails` (2 interfaces + 6 subpaths + 1 runtime helper)
- **1 mandatory field added**: `sourcePluginId` on `AuditEntrySummary`
- **3 new audit event kinds**: `approval_issued`, `approval_resolved`, `approval_expired`
- **15 new tests**: 8 L0 unit (subpath coverage), 5 L1 integration (audit + approval + adapter), 2 L2 e2e

## Migration / risk

**For audit-log consumers**: pre-v0.2 entries lack `sourcePluginId`. Lenient mode (default for re-verification of historical chains) accepts them. Strict mode (default for new chains) rejects them. The runtime-safe accessor `getSourcePluginId()` is provided for code that iterates mixed streams.

**For plugin authors**: providers that rely on plugin-supplied `sourcePluginId` for self-attribution stop working — by design. The gateway always overrides at `postAudit()` boundary. Plugins that need to identify themselves in their own audit entries should use `ctx.authenticatedPluginId` from the `HostContext` (the gateway-owned ground truth).

**For SIEM operators**: CEF / NDJSON / syslog / SARIF wire shapes documented in `adapter-audits.md § 3`. No surprises.

---

🤖 This PR was prepared with [Claude Code](https://claude.com/claude-code) as part of the `claws-openclaw-upstream` contribution wave (Hapi the Bringer · cp-3). Companion: PR-2 `fix(workspace): preserve original bytes in stripFrontMatter for round-trip`.
