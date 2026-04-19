# `@openclaw/policy` — Package Spec

**Package**: `@openclaw/policy`
**Status**: Proposal (draft)
**Date**: 2026-04-17
**Companion to**: `openclaw-upstream-spec.md` (main spec, §3) · `openclaw-upstream-brief.md` (Peter-facing brief)

---

## Summary

`@openclaw/policy` is a single package that turns OC workspace files into enforcement artifacts and ships the operational helpers every host needs to work with those artifacts: YAML scenario tests, a local mock gateway, a compliance rubric evaluator, a report renderer, and audit-chain verification — all as top-level exports. Two scoped subpaths: `/runtime` (helpers consumed by the emitted plugin) and `/types` (IR type-only imports). Snapshot storage + serving lives in the **peer** package `@openclaw/snap` (see `snap.md`) — policy has zero runtime dep on snap.

`openclaw policy generate` reads the workspace (SOUL.md, TOOLS.md, AGENTS.md, …) and writes three files into `.openclaw/policy/` inside the workspace: `policy-ir.json` (declarative IR), `gateway-plugin.ts` (executable plugin implementing `GuardrailProvider` / `FileIngestProvider` against OC's hook surface), and `audit-manifest.json` (the event taxonomy the snapshot will emit at runtime). Embedders call `generate({ workspaceRoot })` from `@openclaw/policy`; types-only consumers import from `@openclaw/policy/types`. The operation is deterministic and re-runnable — same source → same files byte-for-byte — which is what lets content-addressed workspace snapshots (in `@openclaw/snap`) work.

Four operational helpers cover the jobs every host touches once it has a generated snapshot: behaviour tests expressed as YAML scenarios, a local mock gateway for the dev loop, compliance rubric evaluation, and audit-stream hash-chain verification. Report rendering (markdown / HTML / JSON / PDF) rides along. All are direct named exports of `@openclaw/policy`.

---

## Motivation

Governance intent lives in markdown — `SOUL.md` deny rules, `TOOLS.md` `args_from` provenance, `AGENTS.md` delegation boundaries. Without a generator, that intent stays aspirational: humans read it, agents ignore it, and the runtime has no way to check a tool call against a denied pattern.

`@openclaw/policy` turns intent into enforcement. It reads the nine bootstrap files, extracts declarations into a content-addressable IR, checks governance-fatal invariants (R5 must be fail-closed, RESTRICTED sources must propagate, `args_from` cycles are forbidden), and emits an OC plugin that enforces those invariants at `before_tool_call` and `before_workspace_file_ingest` time.

The gap this fills is specific. OC-core ships the hook surface (§6 of the main spec proposes the file-ingest additions as OC-1 / OC-2). `@openclaw/guardrails` defines the interfaces. But someone still has to *produce* the provider code for a specific workspace. That someone is the generator. No runtime policy lookups, no config drift — the policy is compiled in, and every decision carries the `snapshotId` of the exact workspace version it came from.

---

## Interface

```ts
export interface GenerateOptions {
  workspaceRoot: string;
  strict?: boolean;
}

export interface GenerateResult {
  workspaceRoot: string;
  writtenFiles: string[];                // ['.openclaw/policy/policy-ir.json', ...]
  diagnostics: Diagnostic[];
}

export function generate(opts: GenerateOptions): Promise<GenerateResult>;
```

Every run writes the full artifact set into `.openclaw/policy/`. Consumers that only want the IR read `.openclaw/policy/policy-ir.json` and ignore the plugin file; no target flag to toggle.

### PolicyIR — the intermediate representation

PolicyIR is the generation-side data structure that both the in-container provider code and the trusted-plane gateway consume. One IR, two consumers. Stable, content-addressable, versioned.

```ts
export interface PolicyIR {
  version: string;                       // semver of the IR schema itself
  policyId: string;                      // computePolicyId(this) — `sha256-<base64url>` prefix
                                         // (see computePolicyId below; both `policyId` and
                                         // `canonicalizerVersion` are stripped before hashing).
                                         // Distinct from Snapshot.snapshotId (workspace hash).
  canonicalizerVersion: string;          // diagnostic: `@openclaw/workspace/canonicalize` version
                                         // used at generate time. Snap verifies the version at
                                         // upload (shift-left) AND at promote. This field is
                                         // stripped by computePolicyId — otherwise every
                                         // canonicalizer patch-bump would silently rotate every
                                         // policyId across the fleet. See snap.md §Uploading.

  // Extracted intent from the 9 workspace files
  soul: {
    denyRules: DenyRule[];               // "never send emails without confirmation"
    modelAllowlist: string[];            // approved model IDs
    tone: string;                        // personality, for prompt assembly
  };

  user: {
    oboScope: string[];                  // on-behalf-of boundary
    authorityBounds: AuthorityBound[];
  };

  agents: {
    delegationMap: Record<string, string[]>;
    architectureBoundaries: Boundary[];
  };

  tools: Array<{
    name: string;
    riskLevel: RiskLevel;                // R0..R5
    capabilities: Capability[];          // COMMUNICATE, IRREVERSIBLE_EXTERNAL, etc.
    argsFrom?: Record<string, ProvenanceSource[]>;   // G-CHAIN declarations
  }>;

  skills: Array<{
    path: string;                        // skills/.../SKILL.md
    riskLevel: RiskLevel;
    sensitivity: Sensitivity;
    declaredCapabilities: Capability[];
  }>;

  governance: {
    rules: GovernanceRule[];             // compiled G-rule family evaluations
    sensitivityPropagation: Edge[];      // how labels flow through tool chains
    governanceSurface: string[];         // workspace file paths that are governance-edited (agent ingest denied)
  };

  identity: { name: string; emoji?: string };
}

export type ProvenanceSource =
  | 'user_prompt'
  | { tool_output: string; optional?: boolean }
  | { memory: Sensitivity }
  | 'agent_literal';
```

#### `computePolicyId` — normative

`policyId` is self-referential: it is the hash of the IR, but lives *on* the IR. To avoid the "hash contains its own output" paradox, `computePolicyId` strips two fields before canonicalizing:

```ts
// normative
function computePolicyId(ir: PolicyIR): string {
  // Strip BOTH self-referential fields before hashing:
  //  - policyId: the output; must not participate in its own input.
  //  - canonicalizerVersion: diagnostic handshake (see snap.md §Uploading).
  //    If it participated in the hash, every canonicalizer patch-bump would
  //    silently rotate every policyId across the fleet.
  const { policyId: _p, canonicalizerVersion: _v, ...rest } = ir;
  return canonicalHash(rest);   // `sha256-<base64url>` per workspace.md §canonicalHash
}
```

**Rules table (stripped fields for `computePolicyId` input):**

| Field | Stripped? | Reason |
|-------|-----------|--------|
| `policyId` | **yes** | self-referential; the output cannot be part of the input |
| `canonicalizerVersion` | **yes** | diagnostic field; inclusion would rotate IDs on every canonicalizer patch-bump |
| all others | no | participate in the hash |

**Consumers of `computePolicyId` — safety note.** Any code that reads a `PolicyIR` from disk or over the wire MUST call `computePolicyId(ir) === ir.policyId` before trusting the `policyId` field for any security decision (snap promote-time check, audit correlation, compliance rubric evidence). The strip-then-hash convention means a tampered `policyId` field at rest still canonicalizes (after strip) to the correct bytes; the mismatch surfaces only when the stored `policyId` is compared against the recomputed value. Callers that read `policyId` without re-verifying are trusting attacker-controlled bytes.

Known consumers MUST re-verify: snap's promote handler (`POST /v1/snapshots/:id/promote` — see `snap.md` §Promotion), snap's upload handler (when `X-Expected-Policy-Id` is supplied — see `snap.md` §Uploading), the compliance rubric evaluator (`evaluateCompliance` in this package, §Operational helpers), any third-party audit-verification tooling that correlates decisions to `policyId`.

### Generated gateway plugin (example — meet Waffles)

Meet **Waffles** — an agent who drafts standups, nudges teammates, and occasionally posts public announcements. Here's a slice of its workspace:

```markdown
# SOUL.md
## Boundaries
- Never post publicly without asking first — Tuesday taco night is not newsworthy.
- Never share anything tagged RESTRICTED beyond the team.
- If the model's unsure, ask. The human has coffee; they can handle it.

# TOOLS.md
## Tools
### post-to-channel        # R5, COMMUNICATE, IRREVERSIBLE_EXTERNAL
  args_from:
    message: [user_prompt, tool_output.draft-reply?]
    channel: [user_prompt]

### draft-reply            # R1, READ
### vibe-check             # R0 — returns "🌞 all clear" or "⚠️ standup at 10"
```

`openclaw policy generate` writes `.openclaw/policy/gateway-plugin.ts` (plus `policy-ir.json` and `audit-manifest.json`) into the workspace — a drop-in plugin:

```ts
// waffles.gateway-plugin.ts  (emitted — don't hand-edit)
import { asHookResult, issueHandle, propagatedSensitivity, matchDenyRules }
  from '@openclaw/policy/runtime';
import type { GuardrailProvider, FileIngestProvider, ProviderLifecycle, HostContext }
  from '@openclaw/guardrails';
import POLICY_IR from './policy-ir.json' with { type: 'json' };

const SNAPSHOT = 'sha256-3a7f…';  // `sha256-<base64url>` per workspace.md §canonicalHash

// Dependencies are injected via init(ctx) — no module-level singletons.
// See @openclaw/guardrails ProviderLifecycle (main spec §1.4a).
let ctx: HostContext;

// The provider is a PolicyIR interpreter. Lookups + invariants drive the
// generic path; custom rules compiled from SOUL.md drive the rest.
const guardrail: GuardrailProvider & ProviderLifecycle = {
  async init(hostCtx) { ctx = hostCtx; },

  getCapabilities: () => ({ name: 'waffles', snapshotId: SNAPSHOT }),

  async preAuthorize(e) {
    // 1. Look up the tool's declared metadata.
    const tool = POLICY_IR.tools[e.toolName];
    if (!tool) return { decision: 'deny', reason: 'unknown tool' };

    // 2. Enforce invariants derived from the metadata.
    //    (R5 fail-open is generation-rejected; we only see R5 tools with
    //    requireApproval semantics. RESTRICTED is sticky through args_from.)
    if (tool.riskLevel === 5) {
      const tainted = propagatedSensitivity(e.provenance, POLICY_IR) === 'RESTRICTED';
      if (tainted) {
        return { decision: 'review', approvalHandle: await issueHandle(ctx, e),
          reason: 'message drafted from RESTRICTED source' };
      }
    }

    // 3. Match custom rules compiled from SOUL.md
    //    ("Never post publicly without asking first.")
    const rule = matchDenyRules(e, POLICY_IR.soul.denyRules);
    if (rule) {
      return { decision: 'review', approvalHandle: await issueHandle(ctx, e),
        reason: rule.reason };
    }

    // 4. Declared tier + capability flags drive the default.
    const requiresApproval = tool.capabilities.includes('IRREVERSIBLE_EXTERNAL');
    return { decision: 'allow', riskLevel: tool.riskLevel,
             requiresExternalApproval: requiresApproval };
  },

  async postAudit(e, decision) {
    // AuditSink.append requires a complete AuditEntrySummary — see
    // guardrails.md §/audit. All fields below are REQUIRED by the
    // guardrails contract; `reason` is optional.
    await ctx.auditSink.append({
      timestamp: new Date().toISOString(),
      source: 'waffles',
      action: 'tool_call',
      target: `oc://TOOLS.md/Tools/${e.tool}`,
      scope: `policy:${SNAPSHOT}`,
      outcome: decision.decision === 'deny' ? 'failed' : 'success',
      reason: 'reason' in decision ? decision.reason : undefined,
    });
  },

  async onSnapshotPromoted(meta) {
    // Hot-reload PolicyIR when snap promotes a new current.
    // Implementation detail: reload from meta.policyIrPath.
  },
};

const fileIngest: FileIngestProvider & ProviderLifecycle = {
  async init(hostCtx) { ctx = hostCtx; },

  getCapabilities: () => ({ name: 'waffles', snapshotId: SNAPSHOT,
    handlesPaths: ['SOUL.md', 'AGENTS.md', 'TOOLS.md', 'USER.md', 'skills/**/SKILL.md'] }),

  async beforeIngest(e) {
    // Staging lifecycle lives in snap (main spec §4). This provider evaluates
    // policy; user-edit writes return modify + redirectPath, and snap tracks
    // the resulting draft snapshot.
    if (e.operation === 'write' && e.author === 'agent'
        && POLICY_IR.governance.governanceSurface.includes(e.path)) {
      return { decision: 'deny', reason: `${e.path} is governance — humans edit this one` };
    }
    const label = POLICY_IR.files[e.path]?.sensitivity;
    return { decision: 'allow', sensitivity: label };
  },

  async afterIngest(e, decision) {
    // Same AuditEntrySummary contract as postAudit — every field is required.
    await ctx.auditSink.append({
      timestamp: new Date().toISOString(),
      source: 'waffles',
      action: 'file_ingest',
      target: `oc://${e.path}`,
      scope: `policy:${SNAPSHOT}`,
      outcome: decision.decision === 'deny' ? 'failed' : 'success',
      reason: 'reason' in decision ? decision.reason : undefined,
    });
  },
};

// Register with OC's existing plugin hook surface.
export const registration: PluginHookRegistration[] = [
  { pluginId: 'waffles', hookName: 'before_tool_call',             handler: (e) => asHookResult(guardrail.preAuthorize(e)) },
  { pluginId: 'waffles', hookName: 'after_tool_call',              handler: (e, r) => guardrail.postAudit(e, r) },
  { pluginId: 'waffles', hookName: 'before_workspace_file_ingest', handler: (e) => asHookResult(fileIngest.beforeIngest(e)) },
  { pluginId: 'waffles', hookName: 'after_workspace_file_ingest',  handler: (e, d) => fileIngest.afterIngest(e, d) },
];
```

Three notes on the shape:

- **The plugin is a PolicyIR interpreter.** Steps 1–2 and 4 above are mechanical lookup + invariant enforcement — nothing is tool-specific. Only step 3 (custom deny rules) runs tool-adjacent logic, and even that is driven by data compiled from SOUL.md, not bespoke branches.
- **Policy is generated into the workspace, not looked up at runtime.** Every decision carries `snapshotId` so `openclaw policy comply` can re-evaluate the exact policy in force at time T.
- **With first-class OC (see main spec §6.1)**, steps 1, 2, and 4 move into the gateway natively — the plugin collapses to step 3 (custom rules) and `postAudit`. Same outcome, dramatically less emitted code.

---

## Semantics / Behavior

### Three artifacts, one workspace

1. **PolicyIR** — declarative, content-addressable, versioned. The canonical representation. Any consumer (our plugin, a custom enforcer, a review UI) reads PolicyIR to understand the workspace's governance.
2. **Gateway plugin guards** — executable TypeScript implementing both provider interfaces. Self-registers via `PluginHookRegistration` on gateway startup. Emits audit events in the format declared in `auditManifest`. Carries the `snapshotId` in every decision so audit consumers can correlate back to source.
3. **Audit manifest** — the event taxonomy this snapshot will emit at runtime, mapped to OC's exec-approval event categories (OC-5). Lets audit consumers pre-declare sinks.

### Generation-time invariants

These fire during the Analyze phase and produce `Diagnostic`s (see `policy-commands.md` for the full `openclaw policy check` rule table). The governance-fatal ones are non-waivable:

- **R5 fail-open is banned.** A tool declared R5 with `fail-open: true` is a generation-time error regardless of downstream configuration.
- **IRREVERSIBLE_EXTERNAL capability clamps to R5 minimum.** A tool declaring `IRREVERSIBLE_EXTERNAL` without an explicit R5 is clamped up; if it's declared R4-or-below explicitly, that's an error.
- **`args_from` cycles are errors.** OC-POLICY-E230.
- **R3+ consuming non-`user_prompt` without declared provenance is an error.** OC-POLICY-E231.

### Lossless round-trip

The generator **never mutates source originals** (it writes *only* to `.openclaw/policy/`). Byte-for-byte round-trip on source files is an invariant — the round-trip test in main spec §8 (Testing + CI) gates CI. Depends on OC-4 (preserve originals in `stripFrontMatter`) for correctness on templated files.

### Deterministic, content-addressable

Same input → same PolicyIR, byte-identical. `policyId = computePolicyId(PolicyIR)` (format `sha256-<base64url>`; both `policyId` and `canonicalizerVersion` stripped before hashing — see above) addresses the IR's content; `Snapshot.snapshotId` (from `@openclaw/snap`) is the separate hash over the full workspace directory (same format). Both are deterministic across hosts — no wall-clock, no random, no dependency order flakiness.

---

## Operational helpers — top-level exports

The generator isn't the whole story. Every host needs to test policy behaviour, simulate locally, evaluate compliance, and verify audit integrity. These four helpers are direct named exports of `@openclaw/policy` — no artificial subpath — so a single `npm install @openclaw/policy` gets everything. All outputs carry `snapshotId` so re-runs reconstruct exactly the policy in force at time T.

### Behaviour tests via YAML scenarios

Tests are plain YAML files — a fixture workspace plus declared events plus expected decisions. The runner compiles the workspace, replays the events against the emitted plugin, and asserts:

```yaml
# tests/r5-send-email-requires-approval.yaml
snapshot: sha256-3a7f…
given:
  tool_call:
    name: send-email
    args:
      to: "{{user_prompt.recipient}}"
      body: "{{tool_output.draft.body}}"
expect:
  decision: review              # R5 must route through async review
  requireApproval: true
  audit:
    event: tool_call_reviewed
    policyId: { must_contain: "R5-send-email" }
```

### Local mock gateway

A local mock gateway (`openclaw policy sim`) stands up an OC-compatible endpoint on a port, loads the generated plugin, and replays decisions against in-memory state. Agents point their gateway URL at it for the full dev loop without deploying anything. Same plugin code that runs in production. Distinct from `serve` — `sim` speaks agent-facing endpoints (tool-call, file-ingest); `serve` speaks management endpoints (snapshot upload + registry).

### Compliance rubric evaluation

`evaluateCompliance` runs a generated snapshot against a **rubric** — a named set of machine-checkable requirements. Rubrics are YAML; four built-ins ship (SOC 2, HIPAA, EU AI Act, NIST AI RMF) and custom rubrics load from a path. Output is a signed `ComplianceReport`:

```ts
export interface ComplianceReport {
  snapshotId: string;
  rubric: { id: string; version: string; framework: string };
  generatedAt: string;
  evaluatedWindow?: { from: string; to: string };        // for dynamic checks
  results: Array<{
    requirementId: string;
    title: string;
    status: 'pass' | 'fail' | 'partial' | 'not_applicable';
    evidence: Array<{ type: 'oc_uri' | 'audit_correlation' | 'sample'; ref: string }>;
    gaps?: string[];
  }>;
  summary: { total: number; pass: number; fail: number; partial: number; na: number };
  signature: { algo: 'hmac-sha256'; key_id: string; value: string };
}
```

Three check kinds:

| Kind | Source | Example predicate |
|------|--------|------------------|
| static | PolicyIR alone | "every R5 tool has IRREVERSIBLE_EXTERNAL" |
| structural | PolicyIR + audit manifest | "audit retention ≥ 1 year" |
| dynamic | Live audit stream | "all R5 decisions in last 30 days had external approval" |

### Audit verify and report rendering

`verifyAudit` walks the hash chain produced by `@openclaw/guardrails/audit` over OC's native audit stream and returns the first tamper point if any. `renderReport` turns compliance, audit, or snapshot-diff output into markdown / HTML / JSON / PDF for downstream consumers.

---

---

## Relationship to `@openclaw/snap`

`@openclaw/policy` compiles; it doesn't store. A generated workspace lives on disk at `workspaceRoot` — including the newly-written `.openclaw/policy/` artifacts. To register that workspace as a promotable snapshot, upload it to an `@openclaw/snap` instance (see `snap.md`). Policy has zero runtime dep on snap, and snap has zero runtime dep on policy; the layering is:

```
  workspace source files  →  @openclaw/policy  →  workspace + .openclaw/policy/  →  @openclaw/snap
         (edit)                  (generate)                  (store + serve)              (promote)
```

A host that compiles locally and never uses a registry runs `openclaw policy generate` in CI and ships the workspace directly. A host with a registry uploads the generated workspace to snap and promotes from there.

### Cross-package release coordination

`@openclaw/policy` and `@openclaw/snap` version independently at the npm-package level — neither has a runtime dep on the other, so a `@openclaw/snap@2.0.0` that only changes its HTTP header format doesn't force a policy bump, and vice versa. **But the wire-level coupling is real on one axis**: snap's `GET /v1/policy/current` returns the current snapshot's `policy-ir.json` — a policy-generated artifact. A `PolicyIR` major version bump changes that response body's shape even though snap's own version is unchanged. A naive release-eng reading "policy and snap version independently" will ship `@openclaw/policy@2.0.0` without thinking about snap's `/v1/` consumers.

**Coordination rule**: a `PolicyIR.version` major bump is a **coordinated release** — snap publishes the same day with docs updates flagging the PolicyIR major shift (the HTTP `/v1/` prefix stays stable; only the body shape consumers of `/v1/policy/current` need to track). The release playbook documents this matrix: `PolicyIR.version × @openclaw/policy semver × @openclaw/snap semver × snap /v1/ schema`. Minor PolicyIR additions don't trigger the coordination; only major breaks.

---

## Versioning

Semver. Two version lines to keep track of: the npm package version and `PolicyIR.version`. Additive fields on PolicyIR are minor bumps; removing fields, renaming categories, or changing the `snapshotId` canonicalization are major bumps. `PolicyIR.version` gates runtime compatibility — a gateway plugin compiled against IR v1.x won't load against a runtime expecting v2.x. LTS alignment: if an LTS ships a given IR major, the generator LTS holds that major stable for the LTS lifetime.

---

## Testing

- **L0 unit** — Parse / Extract / Analyze phase tests against fixture workspaces; PolicyIR canonicalization is deterministic; `snapshotId` is stable across process restarts; governance-fatal diagnostics fire on malformed inputs; emitter produces syntactically valid TypeScript.
- **L1 integration** — paired with `@openclaw/guardrails`: generated plugin registers cleanly and passes a mock `before_tool_call` event through to a `review` decision; paired with `@openclaw/guardrails/audit`: emitted `postAudit` calls append in the expected shape; paired with `@openclaw/workspace/ast`: round-trip parse → emit produces byte-identical markdown.
- **L2 E2E** — Waffles fixture workspace: `generate` → register plugin against a mock OC gateway → dispatch the `post-to-channel` tool call → verify the full async review cycle; determinism test — run `generate` twice and assert `.openclaw/policy/` files are byte-identical.

---

## Dependencies

Zero `@microsoft/*` imports (main spec §5 property 8). Depends on sibling `@openclaw/*` packages at type-level only: `@openclaw/guardrails` (provider interfaces), `@openclaw/workspace/path` (chunk extraction in Extract phase, `oc://` URI formatting for emitted code), `@openclaw/workspace/ast` (PEG grammars + typed AST in Parse and Extract phases — peer dependency; `@openclaw/workspace/ast` is the canonical source for OC workspace file structure), `@openclaw/guardrails/approvals` (handle binding used by the emitted runtime). Runtime emits `import '@openclaw/guardrails/audit'` into generated plugin code — the generated plugin, not the generator itself, takes that runtime dep. The generator also ships a `@openclaw/policy/runtime` subpath with `asHookResult` / `issueHandle` helpers that the emitted plugin imports.

**Policy-level emitters are top-level exports** — `emitPolicyIR`, `emitPluginCode`, `emitAuditManifest` are named exports of `@openclaw/policy`. Third-party tooling that wants to produce alternative IR formats, alternative gateway plugins (different runtime targets), or custom audit-manifest shapes can import these directly and compose. Workspace-level emitting (SOUL/TOOLS/AGENTS → markdown) lives in `@openclaw/workspace/ast`; policy emitting lives here.

---

## Open items

- Whether an in-memory `generate` overload (returning files as a map rather than writing to disk) should ship for hosts that never want to touch the filesystem — e.g., a sandboxed generation service. Trade-off: adds a second API surface vs. forcing a temp directory.
- How to version the emitted `gateway-plugin.ts` stylistically vs. the generator version — a minor generator bump that changes generated-code formatting will produce diff noise even when PolicyIR is unchanged. Open whether to pin emit style per PolicyIR major.
- PolicyIR extension points for organizations that want additional declarative fields (e.g., internal-only classification tiers). Main spec is silent on this; current working assumption is a reserved `extensions?: Record<string, unknown>` slot.
- Whether `generate` should support a `--dry-run` mode that returns the *would-be-written* file list + diagnostics without touching disk — useful for CI preview jobs and editor lint integrations that want to show "what would this generate without actually writing?"

---
