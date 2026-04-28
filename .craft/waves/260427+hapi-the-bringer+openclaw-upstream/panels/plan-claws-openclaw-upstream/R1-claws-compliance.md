# Plan Review · claws-openclaw-upstream · R1
**Reviewer**: claws:compliance
**Date**: 2026-04-27
**Verdict**: APPROVE-WITH-WARNINGS

## Summary
The plan establishes hash-chained audit integrity and approval-handle replay-resistance mechanisms that satisfy tamper-evidence requirements. However, three critical compliance gaps remain unspecified: (1) ComplianceReport signature key rotation and lifecycle, (2) mandatory field mappings in the audit-stream adapter (timestamp granularity, actor identity correlation), and (3) discovery/e-discovery query patterns. These block SOC 2 Type II and HIPAA pre-audit readiness unless addressed in follow-up specifications.

## Findings

### HC-BLOCK (2)

1. **ComplianceReport signature scheme lifecycle unspecified** — The plan references signed ComplianceReports (plan H3, comply.ts line 61: `signingKey: 'fixture-signing-key'`). The signature struct declares `algo: 'hmac-sha256'` and `key_id` but no key rotation, versioning, or revocation story is documented. Consequence: auditors cannot validate historical reports—if a key is compromised, all prior reports become unverifiable. Suggested fix: Define key rotation policy with timestamped key IDs in a separate trust-set spec (reference: UG-upstream § Trust-set lifecycle).

2. **Audit-stream adapter envelope field mapping incomplete** — Plan H6 flags the audit-stream wire-shape adapter as residual risk (line 189). The guardrails/siem/formats.ts implements CEF/NDJSON/syslog serialization, but the spec does not define: (a) timestamp granularity (RFC 3339 vs epoch vs other), (b) actor identity field name collision risk (CEF `suser` vs OpenClaw actor model), (c) correlation field semantics (how does `cs3` (eventId) link to policy decisions?). Consequence: SIEM parsers may truncate or mismap critical audit fields, breaking evidence chain for SOC 2 CC7.2 (audit log coverage). Suggested fix: Publish adapter-audits.md (H6 deliverable) with explicit field-by-field mapping before PR-3 opens.

### HC-WARN (3)

1. **Approval-handle TTL tracking incomplete for unused-handle discovery** — The approval handle binding includes `ttlSeconds` and `verifyHandle` enforces expiry (handle.ts lines 92–114). However, there is no audit event emitted when a handle is issued or when it expires unused. Consequence: regulators asking "what approval handles were issued on 2026-09-15 and which ones never executed?" cannot answer from audit alone. Suggested fix: Emit approval_issued and approval_expired events to the audit chain; track unused handles in the audit manifest (see HIPAA §164.312(b) audit controls for access approval).

2. **Snapshot-based evidence chain lacks temporal query semantics** — The plan claims H4 snapshot content-addressing produces defensible evidence (line 50: `snapshotId = sha256(canonical(workspaceFiles))`). However, the snap/types.ts and snap/canonical.ts define `computeSnapshotId` as a hash only; there is no "policy-in-force-at-time-T" query interface. The compliance report includes `evaluatedWindow` (optional time range) but no guarantee that snapshot + policy-ir + audit can be synchronized to prove "policy X was active at 2026-09-15T14:32Z". Consequence: e-discovery subpoenas asking "what policy governed this decision on this date?" are unanswerable without manual reconstruction. Suggested fix: Define `snap resolvePolicy --at <timestamp>` endpoint and acceptance test upstream/snap-policy-historical-query; document in adapt-audits.md how evaluatedWindow correlates to snapshot state.

3. **SIEM export truncation/duplication not guarded** — The audit/export.ts delegates formatters (toCef, toNdjson, toSyslog) which strip or rename fields (e.g., `reason` → `msg` in syslog). If the SIEM duplicates lines or truncates long-field values, the audit-stream loses correlation information. Consequence: evidence for HIPAA §164.312(d) information access management cannot be reconstructed. Suggested fix: Add export validation test (L1 integration) that round-trips events through each format and re-parses them to verify no data loss; document lossy format tradeoffs in SIEM integration guide.

### HC-NOTE (2)

1. **SOC 2 / HIPAA compliance rubric definitions are present but scoped narrowly** — The plan mentions `comply --rubric soc2|hipaa` (plan H3, line 43) and the code includes compliance/rubrics/{soc2,hipaa}.yaml. However, the compliance role lens (compliance.md line 37) lists "SOC2 Type II controls, HIPAA Security Rule" as in-scope expertise, yet the plan does not map specific controls (e.g., CC6.1 Logical access, CC7.2 Audit logging). Suggested action: During implementation testing (L2 e2e), verify that each rubric requirement traces to at least one audit predicate; document in compliance/README.md the coverage gaps per framework.

2. **External-export integrity relies on caller-side validation** — The audit/export.ts functions are pure transformers; they assume the input AuditEntry array is already integrity-verified. If a caller exports stale or re-ordered events, the SIEM receives them without evidence of tampering. Suggested action: Publish expected-format contracts in the adapter-audits.md (H6) and add a --verify flag to snap export to re-verify the chain before formatting.

## Strengths
- **Hash-chained HMAC-SHA256 audit integrity is cryptographically sound**: chain.ts and verify.ts implement canonical-JSON canonicalization (RFC 8785 JCS) ensuring cross-platform byte-identical hashing and timing-safe comparison to resist side-channel attacks. This satisfies tamper-evidence table stakes for SOC 2 and HIPAA.
- **Approval-handle replay-resistance is well-specified**: handle.ts implements nonce + sequenceNumber + timing-safe verification with fail-closed TTL semantics, satisfying non-repudiation for approval audit trails.
- **Compliance report structure is auditor-friendly**: renderReport renders Markdown/SARIF/JSON/HTML with requirement IDs, evidence references, and gaps clearly demarcated—CISO teams can hand this to Big 4 auditors immediately.

