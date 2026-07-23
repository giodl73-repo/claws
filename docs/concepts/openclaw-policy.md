# OpenClaw Policy

<!-- atom:openclaw-policy -->

The policy generator turns declarative workspace files into enforceable gateway code, a content-addressable IR, and an audit event taxonomy -- three artifacts produced deterministically from the same inputs. `@bic/openclaw-policy` is the internal scope shipped on GHE Packages; `@openclaw/policy` is the upstream-public shape the same source emits when `--scope @openclaw` is set. No business logic moves between them; only import lines in the emitted plugin change.

> **Reading order**: Follows [Guardrail Provider](guardrail-provider.md) -- policy produces the plugin that the gateway consumes. Next: [OpenClaw Snap](openclaw-snap.md).

---

## The short version

`openclaw policy generate` reads the nine OC workspace bootstrap files (SOUL.md, TOOLS.md, AGENTS.md, USER.md, IDENTITY.md, skills) and writes three artifacts into `.openclaw/policy/`: `policy-ir.json` (declarative IR), `gateway-plugin.ts` (executable plugin implementing `GuardrailProvider` + `FileIngestProvider`), and `audit-manifest.json` (the event taxonomy emitted at runtime). Generation is deterministic -- same inputs produce byte-identical output, which is what lets `@openclaw/snap` content-address workspace snapshots. Governance-fatal invariants (R5 never fail-open, `IRREVERSIBLE_EXTERNAL` clamps to R5, `args_from` cycles forbidden) are enforced at generation time, so the emitter refuses to produce artifacts that would break invariants at runtime.

---

## Three artifacts, byte-addressable

Every `openclaw policy generate` run writes the full artifact set into `.openclaw/policy/` inside the workspace. There is no target flag; consumers that only want the IR read `policy-ir.json` and ignore the plugin file.

| Artifact              | Purpose                                                                              | Consumer                                            |
| --------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `policy-ir.json`      | Canonical declarative IR -- tools, skills, deny rules, propagation edges             | Any reader: gateway, audit tooling, review UI, diff |
| `gateway-plugin.ts`   | Executable TypeScript plugin implementing `GuardrailProvider` + `FileIngestProvider` | OC Gateway hook registration                        |
| `audit-manifest.json` | Event taxonomy this snapshot will emit at runtime                                    | SIEM ingestors, audit sinks                         |

The generator **never mutates source originals**. It writes only to `.openclaw/policy/`. Byte-for-byte round-trip on source files is an invariant gated by CI.

### Deterministic, content-addressable

`generateInMemory` (the stable contract; `generate` wraps it once workspace-file discovery is wired) produces the same bytes given the same inputs. `policyId = computePolicyId(ir)` is the hash of the IR with `policyId` and `canonicalizerVersion` stripped before canonicalization -- without stripping, a canonicalizer patch bump would silently rotate every policyId across the fleet.

```ts
// from @bic/openclaw-policy
export function computePolicyId(ir: PolicyIR): string {
  return computeStrippedHash(ir, ["policyId", "canonicalizerVersion"]);
}
```

`policyId` is distinct from `Snapshot.snapshotId` (the workspace-directory hash owned by `@openclaw/snap`). Both are `sha256-<base64url>` per `workspace.md` §canonicalHash, and both are deterministic across Linux / Windows / macOS -- CI-enforced per-PR.

**Re-verification safety note.** Any code that reads a `PolicyIR` from disk or over the wire MUST call `computePolicyId(ir) === ir.policyId` before trusting the `policyId` field for any security decision. Snap's promote handler, snap's upload handler (when `X-Expected-Policy-Id` is supplied), and the compliance rubric evaluator all re-verify.

### Top-level emit helpers

The emitters are direct named exports so third-party tooling can compose alternative IR writers or plugin shapes:

```ts
import {
  emitPolicyIR,
  emitPluginCode,
  emitAuditManifest,
  type EmitPluginOptions,
} from "@bic/openclaw-policy";
```

Runtime helpers used by the emitted plugin live under the locked ABI subpath `@bic/openclaw-policy/runtime` (`asHookResult`, `issueHandle`, `propagatedSensitivity`, `matchDenyRules`). The emitted plugin imports from that subpath; the generator itself does not depend on the runtime at runtime.

### Generation pipeline -- parse, extract, analyze, emit

Generation is four phases. `openclaw policy check` runs the first three; `openclaw policy generate` runs all four. The split matters because `check` is editor-on-save fast and never touches disk.

| Phase       | Input                                                                               | Output                                                                                     | Failure mode                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Parse**   | Workspace source files (SOUL.md, TOOLS.md, AGENTS.md, USER.md, IDENTITY.md, skills) | Typed AST via `@bic/openclaw-workspace/ast` PEG grammars                                   | `error` diagnostics -- malformed markdown or YAML frontmatter                                                |
| **Extract** | AST                                                                                 | `PolicyIR` draft (tools, skills, deny rules, delegation map, oboScope, governance surface) | `error` diagnostics -- unknown provenance sources, unresolved delegation targets                             |
| **Analyze** | IR draft                                                                            | Validated IR + governance-fatal check results                                              | Non-waivable `error` diagnostics on R5 fail-open, `args_from` cycles, IRREVERSIBLE_EXTERNAL clamp violations |
| **Emit**    | Validated IR                                                                        | `policy-ir.json`, `gateway-plugin.ts`, `audit-manifest.json`                               | Refusal on forbidden-import scan failure; deterministic otherwise                                            |

The authoritative entry points:

```ts
// compile/index.ts — Parse + Extract + Analyze
export {
  analyze,
  parseWorkspaceFile,
  extractTools,
  extractDenyRules,
  buildGovernanceAst,
} from "@bic/openclaw-policy";
```

`finalizeIR` turns an extract-phase draft into a complete `PolicyIR` with `policyId` and `canonicalizerVersion` filled in. `generateInMemory` wraps `finalizeIR` + all three emitters and returns an `InMemoryArtifacts` record that callers can route to disk, a snapshot uploader, or an in-process mock gateway.

### PolicyIR -- the intermediate representation

PolicyIR is the shared data structure between the generator and everything downstream. One IR, many consumers. The shape lives in `@bic/openclaw-policy/types`:

```ts
export interface PolicyIR {
  version: string; // semver of the IR schema
  policyId: string; // computePolicyId(this)
  canonicalizerVersion: string; // diagnostic; stripped before hashing

  soul: {
    denyRules: DenyRule[]; // SOUL.md boundary rules
    modelAllowlist: string[]; // approved model IDs
    tone: string; // personality, for prompt assembly
  };

  user: {
    oboScope: string[]; // on-behalf-of boundary
    authorityBounds: AuthorityBound[];
  };

  agents: {
    delegationMap: Record<string, string[]>;
    architectureBoundaries: Boundary[];
  };

  tools: ToolSpec[]; // riskLevel, capabilities, argsFrom
  skills: SkillSpec[]; // sensitivity + declaredCapabilities

  governance: {
    rules: GovernanceRule[]; // compiled G-rule evaluations
    sensitivityPropagation: Edge[]; // G-CHAIN edges
    governanceSurface: string[]; // files the agent cannot mutate
  };

  identity: { name: string; emoji?: string };
}
```

Two version lines matter for compatibility: the npm-package version of `@bic/openclaw-policy` and `PolicyIR.version`. Additive fields on PolicyIR are minor bumps; removing fields, renaming categories, or changing canonicalization are major bumps. A gateway plugin compiled against IR v1.x will not load against a runtime expecting v2.x -- snap's `GET /v1/policy/current` returns this IR, so a `PolicyIR` major bump is a **coordinated release** with snap even though snap has no runtime dep on policy.

---

## Risk tiers (R0-R5)

Risk tier classifies what a tool _does_. Sensitivity classifies what data _is_. Every governance decision considers both.

| Tier   | Name                             | Examples                                    | Default enforcement                                       |
| ------ | -------------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| **R0** | None / pure                      | `vibe-check`, `get-time`                    | fail-open; audit optional                                 |
| **R1** | Read                             | `read-inbox`, `list-skills`                 | fail-open; audit standard                                 |
| **R2** | Write / local                    | `save-draft`, `update-task`                 | fail-open; audit standard                                 |
| **R3** | Communicate / internal           | `ping-teammate`, `post-standup`             | configurable; audit required                              |
| **R4** | Execute / elevated               | `run-shell`, `install-dep`                  | configurable; audit required; review recommended          |
| **R5** | Transact / irreversible-external | `post-publicly`, `send-email`, `wire-funds` | **fail-closed, non-waivable**; external approval required |

Tier metadata is a field on `ToolSpec`:

```ts
export interface ToolSpec {
  name: string;
  riskLevel: RiskLevel; // 0 | 1 | 2 | 3 | 4 | 5
  capabilities: Capability[];
  argsFrom?: Record<string, ProvenanceSource[]>;
}
```

### R5 invariants (non-waivable)

The generator enforces three R5 invariants at generation time. None are configurable downstream; a workspace that declares a tool violating one of them fails `openclaw policy generate` with a diagnostic rather than emit a plugin that would.

- **R5 fail-open is banned.** A tool declared R5 with `fail-open: true` is a generation-time error (rule `R5-FAIL-CLOSED`). The emitted plugin cannot be configured to downgrade an R5 decision to allow-without-approval.
- **`IRREVERSIBLE_EXTERNAL` capability clamps to R5 minimum.** A tool declaring `IRREVERSIBLE_EXTERNAL` without an explicit R5 is clamped up; declaring R4-or-below with `IRREVERSIBLE_EXTERNAL` is an error.
- **Effective tier = max(declared, provenance sources).** A nominally R1 tool consuming `tool_output.read_restricted` becomes R5 at runtime. This is not a generation-time reject -- it is runtime behaviour the emitted plugin enforces via `propagatedSensitivity` -- but the generator does check that the propagation edges are reachable.

Additional generation-time rules (all produce `Diagnostic` errors):

- `OC-POLICY-E230` -- `args_from` transitive chains cycle
- `OC-POLICY-E231` -- R3+ tool consumes non-`user_prompt` without declared provenance
- `OC-POLICY-E233` -- `IRREVERSIBLE_EXTERNAL` capability declared without `args_from`

### Generated plugin anatomy -- `preAuthorize`

The emitted `gateway-plugin.ts` is a PolicyIR interpreter. Its `preAuthorize` method is four mechanical steps plus one data-driven match:

1. **Tool lookup.** Unknown tool names return `{ decision: 'deny', reason: 'unknown tool' }` immediately. Only tools declared in the IR are allowed through the gateway.
2. **R5 taint check.** If `tool.riskLevel === 5` and `propagatedSensitivity(e.provenance, POLICY_IR) === 'RESTRICTED'`, the plugin returns `review` with a signed approval handle. The generator does not emit any code path that allows an R5 tool on RESTRICTED data without approval.
3. **SOUL deny-rule match.** `matchDenyRules(e, POLICY_IR.soul.denyRules)` consults the compiled rule set from SOUL.md. A hit produces `{ decision: 'review', reason: rule.reason, approvalHandle }`. SOUL deny rules always surface as `review`, not `deny` -- the supervisor gets the option to override.
4. **Default path.** Declared tier + capability flags drive the response: `{ decision: 'allow', riskLevel: tool.riskLevel, requiresExternalApproval: tool.capabilities.includes('IRREVERSIBLE_EXTERNAL') }`.

`postAudit` is a single call to `ctx.auditSink.append` with a complete `AuditEntrySummary` -- every field (`timestamp`, `source`, `action`, `target`, `scope`, `outcome`) is required by the guardrails contract. `reason` is optional. The audit target uses an `oc://` URI (`formatOcPath` from `@bic/openclaw-workspace/path`) so every decision carries a stable, tooling-friendly identifier that audit consumers, compliance reports, and review UIs all agree on.

The `FileIngestProvider` half handles `before_workspace_file_ingest` and `after_workspace_file_ingest`. Shape is identical; the governance-specific check is that **agent writes to `governance surface` paths are denied** -- `PolicyIR.governance.governanceSurface` lists the workspace files that humans edit (SOUL.md, TOOLS.md, AGENTS.md, USER.md, IDENTITY.md) and the plugin blocks agent mutation. User-edit writes return `modify + redirectPath` to redirect pending writes into `.openclaw/.stage/<path>` without touching canonical -- snap owns the staging lifecycle.

### Provider lifecycle

The emitted plugin implements both `ProviderLifecycle` and `GuardrailProvider` / `FileIngestProvider`. Dependencies arrive via `init(ctx: HostContext)` -- no module-level singletons, no filesystem access at import time. `onSnapshotPromoted(meta)` is the hot-reload signal when snap promotes a new current workspace; the plugin swaps `POLICY_IR` from `meta.policyIrPath` without a process restart.

### Worked example -- Waffles

Consider a minimal workspace for an agent named Waffles who drafts standups and occasionally posts to a public channel. The relevant declarations:

```markdown
# SOUL.md

## Boundaries

- Never post publicly without asking first.
- Never share anything tagged RESTRICTED beyond the team.

# TOOLS.md

### post-to-channel # R5, COMMUNICATE, IRREVERSIBLE_EXTERNAL

args_from:
message: [user_prompt, tool_output.draft-reply?]
channel: [user_prompt]

### draft-reply # R1, READ

### vibe-check # R0
```

`openclaw policy generate` writes the three artifacts. The emitted `gateway-plugin.ts` imports the policyIR, builds a guardrail provider, and wires it to the OC hook surface:

```ts
// waffles.gateway-plugin.ts  (emitted — don't hand-edit)
import { issueHandle, propagatedSensitivity, matchDenyRules } from "@bic/openclaw-policy/runtime";
import type {
  GuardrailProvider,
  FileIngestProvider,
  ProviderLifecycle,
  HostContext,
  AuthorizationDecision,
  IngestDecision,
} from "@bic/openclaw-guardrails";
import { formatOcPath } from "@bic/openclaw-workspace/path";
import POLICY_IR from "./policy-ir.json" with { type: "json" };

const SNAPSHOT = "sha256-3a7f…";
const PROVIDER_NAME = "waffles";

let ctx: HostContext;

const guardrail: GuardrailProvider & ProviderLifecycle = {
  name: PROVIDER_NAME,
  async init(hostCtx) {
    ctx = hostCtx;
  },
  getCapabilities: () => ({
    description: "…",
    version: POLICY_IR.version,
    riskClassification: true,
    auditTrail: true,
    externalApproval: true,
    argumentModification: false,
  }),
  async preAuthorize(e) {
    const tool = POLICY_IR.tools.find((t) => t.name === e.tool);
    if (!tool) return { decision: "deny", reason: "unknown tool" };
    if (tool.riskLevel === 5) {
      const tainted = propagatedSensitivity(e.provenance, POLICY_IR) === "RESTRICTED";
      if (tainted)
        return {
          decision: "review",
          reason: "RESTRICTED source",
          approvalHandle: await issueHandle(ctx, e),
        };
    }
    const rule = matchDenyRules(e, POLICY_IR.soul.denyRules);
    if (rule)
      return { decision: "review", reason: rule.reason, approvalHandle: await issueHandle(ctx, e) };
    return {
      decision: "allow",
      riskLevel: tool.riskLevel,
      requiresExternalApproval: tool.capabilities.includes("IRREVERSIBLE_EXTERNAL"),
    };
  },
  /* postAudit, onSnapshotPromoted … */
};
```

Three things are worth noting about this shape:

- **The plugin is a PolicyIR interpreter.** Steps 1, 2, and 4 above are mechanical lookup + invariant enforcement -- nothing is Waffles-specific. Only step 3 (SOUL deny rules) runs tool-adjacent logic, and even that is driven by data compiled from SOUL.md.
- **Policy is generated into the workspace, not looked up at runtime.** Every decision carries `snapshotId` so `openclaw policy comply` can re-evaluate the exact policy in force at time T.
- **With first-class OC integration** (the main spec's §6.1 proposal), steps 1, 2, and 4 move into the gateway natively -- the plugin collapses to step 3 plus `postAudit`. Same outcome, dramatically less emitted code.

---

## Sensitivity levels

Data sensitivity is orthogonal to risk tier. Every workspace file, tool output, and memory read carries a label.

| Label            | Meaning                                 | Typical sources                                                               | Default handling                                               |
| ---------------- | --------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **PUBLIC**       | Shareable externally without constraint | Marketing copy, open-source READMEs, public web scrapes                       | No restriction                                                 |
| **INTERNAL**     | Usable inside the organization          | Employee directory, internal wiki, Teams chat                                 | Block external (R5) egress unless explicitly approved          |
| **CONFIDENTIAL** | Named team / scope only                 | Unreleased product plans, financial drafts, customer lists                    | In-scope identity required; no cross-tenant egress             |
| **RESTRICTED**   | Regulated / high-risk                   | Health records, payroll, export-controlled IP, RESTRICTED-tagged SOUL sources | **`requiresExternalApproval: true`, sticky, non-downgradable** |

The type is declared in `@bic/openclaw-policy/types`:

```ts
export type Sensitivity = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
```

### G-CHAIN -- sensitivity propagation

G-CHAIN is the rule that tool output inherits the sensitivity of its sources. A PUBLIC tool output derived from a RESTRICTED source inherits RESTRICTED. The emitter compiles the propagation graph into `PolicyIR.governance.sensitivityPropagation`:

```ts
export interface Edge {
  from: string;
  to: string;
  sensitivity: Sensitivity;
}
```

At runtime the emitted plugin calls `propagatedSensitivity(e.provenance, POLICY_IR)` to compute the effective label for the current decision. Three rules govern propagation:

- **Sticky** -- RESTRICTED never downgrades on the way through a tool chain.
- **Max-wins** -- when a tool consumes multiple sources, the effective sensitivity is the maximum label across sources (PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED).
- **Declared provenance required for R3+** -- tools at R3 or above that consume non-`user_prompt` sources must declare them in `args_from`. Undeclared reads are an `OC-POLICY-E231` error at generation time.

`ProvenanceSource` is the declared shape:

```ts
export type ProvenanceSource =
  | "user_prompt"
  | { tool_output: string; optional?: boolean }
  | { memory: Sensitivity }
  | "agent_literal";
```

---

## Risk x sensitivity decision matrix

The cross-product produces the effective decision. The emitted plugin's `preAuthorize` path walks it on every tool call.

|        | PUBLIC                   | INTERNAL                 | CONFIDENTIAL             | RESTRICTED                                     |
| ------ | ------------------------ | ------------------------ | ------------------------ | ---------------------------------------------- |
| **R0** | allow                    | allow                    | allow                    | allow (audit only)                             |
| **R1** | allow                    | allow                    | allow                    | allow (audit high-cardinality)                 |
| **R2** | allow                    | allow                    | allow (in-scope check)   | review                                         |
| **R3** | allow                    | allow                    | review                   | review (external approval)                     |
| **R4** | allow                    | review                   | review                   | review (external approval)                     |
| **R5** | review (approval forced) | review (approval forced) | review (approval forced) | review (approval forced, **non-downgradable**) |

Three decision shapes cover the grid:

- **allow** -- tool executes; `postAudit` records the decision after.
- **review** -- the plugin returns `{ decision: 'review', approvalHandle }`; OC-core stalls the agent and the companion app prompts the supervisor. Approval handle binds `{providerId, contentHash, sequenceNumber, approverPrincipal, keyId, ttl, nonce}` so responses cannot be replayed or swapped.
- **deny** -- unconditional block. Reserved for SOUL deny-rule matches and generation-time invariant violations that somehow escape into runtime data.

RESTRICTED x any tier collapses to `requireApproval: true`. That field is **envelope-sticky across the plugin chain** (OC-7): once any plugin sets it, no downstream plugin can downgrade it, and the companion app receives every `ApprovalDescriptor` emitted -- approvals are conjunctive.

---

## `--scope` flip -- `@bic/openclaw` -> `@openclaw`

The same generator emits two namespace variants. `claws policy generate --scope <prefix>` controls the emitted `gateway-plugin.ts` import names. Two accepted values:

| Scope           | Default? | Import shape                                                                               | Intended use                                      |
| --------------- | -------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `@bic/openclaw` | yes      | `@bic/openclaw-policy/runtime`, `@bic/openclaw-guardrails`, `@bic/openclaw-workspace/path` | Internal deploys on GHE Packages (`bic-internal`) |
| `@openclaw`     | no       | `@openclaw/policy/runtime`, `@openclaw/guardrails`, `@openclaw/workspace/path`             | Upstream-public builds (OC core contribution)     |

The parser is strict -- anything other than these two values throws:

```ts
// @bic/openclaw-policy/emit/scope.ts
export const SCOPE_CHOICES: readonly ScopePrefix[] = ["@bic/openclaw", "@openclaw"] as const;

export function parseScopeArg(args: readonly string[]): ScopePrefix;
```

### Byte-parity invariant

`policy-ir.json` and `audit-manifest.json` are **byte-identical across scopes**. The only file the scope flip changes is `gateway-plugin.ts`, and only its import lines differ. This is an explicit test gate: CP-12 pulse P57's scope-prefix test suite (`claws-sdk/packages/policy/tests/scope-prefix.unit.test.ts`) asserts the parity on every build.

```ts
// tests/scope-prefix.unit.test.ts — excerpt
it('policy-ir.json is byte-identical across @bic/openclaw and @openclaw scopes', () => {
  const bic = generateInMemory({ ..., scopePrefix: '@bic/openclaw' });
  const oc  = generateInMemory({ ..., scopePrefix: '@openclaw'     });
  expect(bic.policyIr).toBe(oc.policyIr);
});
```

Byte-parity matters for two reasons. First, a content-addressed snapshot registry (snap) must produce the same `snapshotId` regardless of which scope the workspace was generated under -- otherwise every scope switch would rotate every snapshot hash in the fleet. Second, audit correlation across scope boundaries (an internal deploy audits against a workspace later republished to the upstream-public scope) has to line up on the IR and the event taxonomy; only the plugin source is allowed to diverge.

The emitter also runs a **forbidden-import scan** on every rendered plugin (`verifyNoForbiddenImports`): any accidental `@craftworks/*` or `@claws/*` reference in the generated output throws before the file is written. The scope flip cannot accidentally leak Craftworks-internal package names into an upstream-public build.

---

## Operational helpers

The generator is the first of five top-level jobs. The other four are direct named exports of `@bic/openclaw-policy` -- a single install gets behaviour tests, a mock gateway, compliance evaluation, and audit verification, all consuming the same `PolicyIR` and `audit-manifest.json`.

| Helper               | Purpose                                                                                                                | CLI entry point          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `runScenarios`       | Run YAML behaviour scenarios against the emitted plugin; fixture workspace + declared events + expected decisions      | `openclaw policy test`   |
| `startMockGateway`   | Stand up an OC-compatible endpoint on a port; load the generated plugin; replay decisions against in-memory state      | `openclaw policy sim`    |
| `evaluateCompliance` | Run a `Rubric` (soc2, hipaa, eu-ai-act, nist-ai-rmf, or custom) against a snapshot; return a signed `ComplianceReport` | `openclaw policy comply` |
| `verifyAudit`        | Walk the hash chain produced by `@bic/openclaw-guardrails/audit`; report first tamper point if any                     | `openclaw policy verify` |
| `renderReport`       | Turn compliance / audit / snapshot-diff output into markdown / HTML / JSON / PDF                                       | `openclaw policy report` |

All outputs carry `snapshotId` so re-runs reconstruct exactly the policy in force at time T. The mock gateway is distinct from `snap serve` -- sim speaks agent-facing endpoints (tool-call, file-ingest); `snap serve` speaks management endpoints (snapshot upload + registry).

### Compliance rubrics -- three check kinds

`evaluateCompliance` evaluates three classes of requirement. The `Rubric` format is YAML, loaded via `loadRubric(idOrPath)`; four built-ins ship (`soc2`, `hipaa`, `eu-ai-act`, `nist-ai-rmf`) and custom rubrics load from a path.

| Kind         | Source of truth              | Example predicate                                        |
| ------------ | ---------------------------- | -------------------------------------------------------- |
| `static`     | PolicyIR alone               | "every R5 tool declares IRREVERSIBLE_EXTERNAL"           |
| `structural` | PolicyIR + audit manifest    | "audit retention >= 1 year"                              |
| `dynamic`    | Live audit stream (windowed) | "all R5 decisions in last 30 days had external approval" |

`ComplianceReport` output is signed (`hmac-sha256` by default; Ed25519 for enterprise, shared with the audit chain). Each requirement carries `evidence` -- `oc_uri` (direct IR references), `audit_correlation` (chain entries that substantiate the finding), or `sample` (quoted evidence from the stream). `renderReport` turns the JSON into an auditor-friendly surface.

---

## CLI verbs

Nine verbs on the `openclaw policy` subcommand group. Handlers add zero business logic -- they parse argv, call library functions, and render to the terminal. Snapshot management (list / promote / rollback / serve) is the peer `openclaw snap` group, not part of policy.

| Verb       | Purpose                                                                                                                         | Exit code on error                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `check`    | Parse + validate source files; diagnostics only (fast, editor-friendly)                                                         | 1 on any error                         |
| `generate` | Write `policy-ir.json` + `gateway-plugin.ts` + `audit-manifest.json` into `.openclaw/policy/`                                   | 1 on governance-fatal/structural error |
| `watch`    | Continuous `check` on file change; tight dev loop                                                                               | -- (interactive)                       |
| `comply`   | Run a rubric (soc2 / hipaa / eu-ai-act / nist-ai-rmf / custom) against the current workspace; produce signed `ComplianceReport` | 1 if any requirement fails             |
| `test`     | Run YAML scenarios against the current workspace; behaviour-level assertions on the emitted plugin                              | 1 if any scenario fails                |
| `sim`      | Local mock OC gateway (agent-facing); loads the generated plugin, replays decisions against in-memory state                     | -- (server)                            |
| `report`   | Render compliance / audit / snapshot-diff output to markdown / HTML / JSON / PDF                                                | 1 on render error                      |
| `verify`   | Hash-chain integrity check on the audit stream (delegates to `@bic/openclaw-guardrails/audit`)                                  | 3 on chain break                       |
| `diff`     | Semantic PolicyIR diff between two snapshots (structural, not text); powers `openclaw snap diff`                                | --                                     |

Exit codes are consistent across the group: `0` success, `1` any fatal error, `2` internal generator bug, `3` CLI usage error. CI can pattern-match on them.

Full command reference, rule tables, and diagnostic IDs in [`policy-commands.md`](../proposals/openclaw-upstream/policy-commands.md).

---

## See also

- [Guardrail Provider](guardrail-provider.md) -- the interface the emitted `gateway-plugin.ts` implements
- [OpenClaw Snap](openclaw-snap.md) -- content-addressable snapshot registry; consumes the generated workspace
- [OpenClaw Workspace](openclaw-workspace.md) -- PEG grammars, AST, canonicalizer; the layer underneath the generator
- [Audit Chain](audit-chain.md) -- hash-chained log that `policy verify` walks
- [OBO Boundary](obo-boundary.md) -- on-behalf-of scope declared in USER.md; feeds into `PolicyIR.user.oboScope`
- [Elicitation Gate](elicitation-gate.md) -- how `review` decisions reach the supervisor
- [Compliance: SOC2](compliance-soc2.md) -- rubric consumed by `policy comply --rubric soc2`
- [Compliance: HIPAA](compliance-hipaa.md) -- rubric consumed by `policy comply --rubric hipaa`
- [Compliance: EU AI Act](compliance-eu-ai-act.md) -- rubric consumed by `policy comply --rubric eu-ai-act`
- `docs/claws/proposals/openclaw-upstream/policy.md` -- authoritative package spec
- `docs/claws/proposals/openclaw-upstream/policy-commands.md` -- full CLI reference
- `docs/claws/proposals/openclaw-upstream/openclaw-upstream-spec.md` -- umbrella spec (§3 policy, §1.6 risk/sensitivity, §1.7 invariants)
