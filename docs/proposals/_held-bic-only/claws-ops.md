# `@openclaw/claws-ops` — Package Spec

**Package**: `@openclaw/claws-ops`
**Status**: Proposal (draft)
**Date**: 2026-04-17
**Companion to**: `openclaw-upstream-spec.md` (main spec, §3.4 / §3.4.1) · `openclaw-upstream-brief.md` (Peter-facing brief)

---

## Summary

`@openclaw/claws-ops` is the operations bundle — scenario runner, compliance rubric evaluator, report generator, and audit verification, all in one package. Four programmatic entry points (`runScenarios`, `runCompliance`, `generateReport`, `verifyAudit`) plus CLI shortcuts (`claws ops test` / `claws ops comply` / `claws ops audit verify`). Ships built-in rubrics for SOC 2, HIPAA, EU AI Act, and NIST AI RMF; accepts custom rubrics via YAML.

---

## Motivation

Compiling a workspace is one thing. *Proving* it does what it claims is another. Auditors, compliance teams, and incident responders all ask versions of the same three questions:

1. **Does this policy still pass our tests?** — a scenario runner that replays known-good and known-bad cases through the compiled policy.
2. **Does this policy meet framework X?** — a rubric evaluator that checks PolicyIR and audit streams against SOC 2, HIPAA, EU AI Act, NIST AI RMF, or custom YAML rubrics.
3. **Is our audit trail intact?** — a verification pass over the hash-chained audit log to prove no tampering.

These four concerns — scenarios, compliance, reports, audit verification — share data (PolicyIR, audit stream, snapshot history) and share output shape (signed, evidence-citing reports). Bundling them into one package means one dependency for any consumer doing governance operations work, and one place to evolve the reporting format.

---

## Interface

```ts
import { runScenarios, runCompliance, generateReport, verifyAudit } from '@openclaw/claws-ops';

await runScenarios({ workspaceRoot: '/workspace', scenariosDir: 'scenarios/' });
await runCompliance({ snapshotId: '...', rubric: 'soc2' });
await generateReport({ kind: 'compliance', rubric: 'soc2', snapshotId: '...' });
await verifyAudit({ source: ocAuditStream });    // uses OC audit via @openclaw/audit-chain
```

CLI shortcuts:

```bash
claws ops test
claws ops comply --rubric soc2
claws ops audit verify
```

### `ComplianceReport` shape

```ts
export interface ComplianceReport {
  snapshotId: string;
  rubric: { id: string; version: string; framework: string };
  generatedAt: string;
  evaluatedWindow?: { from: string; to: string };  // for dynamic checks
  results: Array<{
    requirementId: string;
    title: string;
    status: 'pass' | 'fail' | 'partial' | 'not_applicable';
    evidence: Array<{ type: 'oc_uri' | 'audit_correlation' | 'sample'; ref: string; note?: string }>;
    gaps?: string[];                  // human-readable gap description for fail/partial
  }>;
  summary: { total: number; pass: number; fail: number; partial: number; na: number };
  signature: { algo: 'hmac-sha256'; key_id: string; value: string };
}
```

---

## Semantics / Behavior

### How compliance checking works

`claws comply` evaluates a compiled snapshot against a **rubric** — a named set of compliance requirements expressed as machine-checkable predicates. Output: a signed report with per-requirement pass/fail/partial status and evidence citations.

**Rubric structure** (YAML):

```yaml
rubric:
  id: soc2
  version: 2025
  framework: SOC 2 Type II
  requirements:
    - id: CC6.1-r5-gate
      title: "Irreversible-external actions require external approval"
      framework_ref: "Common Criteria CC6.1 (logical access)"
      check:
        kind: static
        predicate: |
          every tool in policyIR.tools where tool.riskLevel == 5
            must have capability IRREVERSIBLE_EXTERNAL
            and requireApproval == true
      evidence_shape: "oc:// URIs for each R5 tool declaration"

    - id: CC7.2-audit-coverage
      title: "All R3+ actions produce audit records"
      framework_ref: "Common Criteria CC7.2 (monitoring)"
      check:
        kind: dynamic
        window: P30D
        predicate: |
          every decision in auditStream where decision.riskLevel >= 3
            must have audit_entry with matching correlationId
      evidence_shape: "sampled audit entries + coverage ratio"

    - id: A1.2-retention
      title: "Audit retention meets policy"
      check:
        kind: structural
        predicate: "auditManifest.retention >= P1Y"
```

### Three check kinds

| Kind | Source | Example |
|------|--------|---------|
| **static** | PolicyIR alone | "every R5 tool has IRREVERSIBLE_EXTERNAL capability" |
| **structural** | PolicyIR + audit manifest | "audit retention ≥ 1 year", "SOUL.md has non-empty Boundaries" |
| **dynamic** | Live audit stream over a window | "all R5 decisions in last 30 days had external approval", "zero R5 fail-open events" |

### Execution flow

1. Load snapshot (PolicyIR + audit manifest).
2. Load rubric (built-in or `--rubric path/to/custom.yaml`).
3. For each requirement, evaluate the predicate against the relevant source.
4. Collect evidence — each pass/fail cites `oc://` URIs for static/structural, audit-chain `correlationId`s for dynamic.
5. Produce a `ComplianceReport` — per-requirement status + evidence + overall roll-up.
6. Sign the report (HMAC over the full report including `snapshotId` + rubric version + evidence hashes).

### Scenario runner (`runScenarios`)

Replays fixture cases through the compiled policy to catch regressions. A scenario declares an input event (tool call or file ingest) and the expected decision (`allow` / `deny` / `review` / `modify`). The runner compiles the workspace, dispatches each scenario through the emitted provider, and compares the result. Output is a pass/fail matrix; failures include the actual decision, the expected decision, and the diff.

### Audit verification (`verifyAudit`)

Walks the hash-chained audit stream (via `@openclaw/audit-chain`'s `verify` method), confirming every `prevHash` matches and no entry is missing. Returns a `VerifyResult` with the first break point (if any) and the range verified. This is a read-only pass over OC's existing audit pipeline — no parallel log.

### Report generation (`generateReport`)

Renders a `ComplianceReport` (or a scenario report, or an audit-verification report) in one of three formats: JSON (machine-readable, canonical), Markdown (human-readable, for PR comments and dashboards), and PDF (auditor-facing, via a templated rendering). The signature travels with all three formats.

### Built-in rubrics

Ship in the package. No network fetch at runtime.

| Rubric | Framework | Scope |
|--------|-----------|-------|
| `soc2` | SOC 2 Type II | CC1–CC9 common criteria, audit controls, access management |
| `hipaa` | HIPAA Security + Privacy Rule | ePHI access, audit logging, minimum-necessary access |
| `eu-ai-act` | EU AI Act Article 6 | High-risk AI classification, record-keeping, human oversight |
| `nist-ai-rmf` | NIST AI Risk Management Framework | Govern / Map / Measure / Manage functions |

### Custom rubrics

Any YAML file matching the schema can be passed as `--rubric path/to/my-rubric.yaml`. Organizations use this for internal policy (e.g., "every agent must declare OBO scope in USER.md"). Same evaluation engine, same report shape, same signature.

### Re-running against prior snapshots

`claws comply --snapshot <id> --rubric soc2` produces a report for any historical snapshot. Used for "what was compliance status on day X" auditor questions. The static and structural checks evaluate cleanly against historical PolicyIRs; dynamic checks require an audit window that overlaps the snapshot's in-force period.

### Report signing

HMAC-SHA-256 over the canonicalized report body (including `snapshotId`, rubric id + version, and the hash of each evidence citation). The signing key comes from the host — the package does not manage key storage. A recipient verifies the signature before trusting the report's conclusions.

---

## Versioning

Semver. Two version lines: the package version and each rubric's `version` field (e.g., `soc2.version: 2025`). Adding a requirement to a built-in rubric is a rubric-version bump, not a package-version bump — consumers pin both. Adding a new rubric, a new check kind, or a new evidence type is a minor package bump; changing the `ComplianceReport` schema or the signing algorithm is major. LTS alignment: an LTS holds report schema and signing algorithm stable; rubric content can track framework updates within an LTS.

---

## Testing

- **L0 unit** — rubric YAML parsing covers every documented field; predicate evaluator handles all three check kinds against fixture PolicyIRs; report signing is deterministic given a fixed key; each built-in rubric parses cleanly.
- **L1 integration** — paired with `@openclaw/claws`: compile a fixture workspace, run `runCompliance` against each built-in rubric, verify expected pass/fail matrix; paired with `@openclaw/audit-chain`: `verifyAudit` on a hash-chained stream with a known tamper returns the expected break point.
- **L2 E2E** — full scenario + compliance + audit verification cycle: compile a Waffles-style fixture, replay scenarios, run `soc2` compliance, verify audit stream, generate Markdown + JSON reports, verify signatures round-trip.

---

## Dependencies

Zero `@microsoft/*` / `@craftworks/*` imports. Runtime deps on `@openclaw/claws` (for PolicyIR and snapshot loading) and `@openclaw/audit-chain` (for audit stream verification). Type-level dep on `@openclaw/workspace-path` (for `oc://` URI evidence citations) and `@openclaw/approval-events` (for approval-correlation evidence in dynamic checks). YAML parser is implementation-defined; main spec does not mandate one.

---

## Open items

- Rubric versioning story across framework updates — SOC 2 2025 vs. SOC 2 2026. Current working assumption is named versions (`soc2@2025`, `soc2@2026`) shipped side-by-side so reports pin to a specific version. Not detailed in the main spec.
- Whether dynamic-check windows should default or always require `--window`. Main spec shows `P30D` in the example but doesn't prescribe a default.
- Scenario file format — the main spec references `scenariosDir: 'scenarios/'` but doesn't fix the scenario file schema. Current working shape is YAML files per scenario with `input` / `expected` sections.
- Signature key rotation — the report carries `key_id` but the main spec doesn't specify rotation semantics. Likely a host concern, but report verifiers need to know how to resolve `key_id` to a key.
- PDF rendering pipeline — nice to have for auditor deliverables; not in the main spec. Reasonable to defer to an optional companion package.

---
