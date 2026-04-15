# R1 Compliance Review — CP-2: Init + Three Rings

**Role**: claws:compliance (auditor archetype, Cluster C)
**Lens**: Evidence completeness > Operational speed
**Reviewer**: compliance role panel
**Date**: 2026-04-13
**Scope**: Pulses 10-18 — init/, watch/, doctor/, amend/, CLI commands

---

## Lens Checklist Application

| Lens Question | Verdict | Details |
|---|---|---|
| Can `claws comply soc2` generate a complete SOC2 evidence package? | N/A | Not in CP-2 scope (CP-3+), but SOC2 template lays groundwork |
| Is the audit chain HMAC-signed and tamper-evident? | **PARTIAL** | Signer exists in compliance/artifact-signer.ts but bypass.ts writes UNSIGNED JSON lines |
| Can `claws audit verify` prove chain integrity? | **PARTIAL** | verifyAuditEntry exists but bypass events skip it entirely |
| Does compliance report include what/when/policy-version/result? | **PARTIAL** | bypass.ts records type+timestamp+env but omits actor, policyVersion, ruleId |
| Can artifact be handed to Big 4 auditor? | **NO** | Bypass audit entries lack required fields; amendment records lack signing |
| Does EU AI Act risk classification match Article 6 categories? | **YES** | Template correctly maps unacceptable/high-risk/limited-risk/minimal-risk per Article 6 |

---

## Findings

### M-01: Bypass audit events are NOT HMAC-signed [M]

**File**: `claws-sdk/src/init/bypass.ts:93-105`
**What**: `recordBypassEvent()` writes a bare JSON object `{type, timestamp, env}` to `bypass.jsonl`. It does NOT use the `ArtifactSigner` from `compliance/artifact-signer.ts` and does NOT produce `AuditChainEntry` records.
**Impact**: A BYPASS_ACTIVATED event is the single most security-sensitive audit record in the system. An operator disabling all enforcement must produce a tamper-evident, HMAC-signed audit trail. Without signing, a malicious actor could delete or edit bypass.jsonl entries with zero detection. This is a SOC2 CC6.1 violation and would fail any Big 4 audit.
**Fix**: `recordBypassEvent()` must emit a proper `AuditChainEntry` via `signAuditEntry()`, including seq, actor, target, action, outcome, ruleId, severity, and policyVersion fields. Store in the signed audit chain, not a separate unsigned jsonl file.

### M-02: Bypass audit record missing mandatory compliance fields [M]

**File**: `claws-sdk/src/init/bypass.ts:97-101`
**What**: The bypass event object contains only `{type, timestamp, env}`. It is missing:
- `actor` — WHO activated the bypass (process user, CI pipeline, etc.)
- `policyVersion` — which policy version was active when bypass was engaged
- `ruleId` — no rule identifier for audit trail correlation
- `outcome` — no explicit allow/deny outcome
- `target` — no workspace identification
**Impact**: HIPAA audit_mandatory policy (template) requires `require_signed: true` for policy_change events. A bypass IS a policy change. The system's own HIPAA template mandates fields that the bypass implementation doesn't produce. This is an internal consistency failure — the templates promise more than the implementation delivers.
**Fix**: Extend bypass event to include all `AuditChainEntry` fields, or at minimum actor, policyVersion, target, outcome, and ruleId.

### M-03: Uninstall does not record an audit event before archiving [M]

**File**: `claws-sdk/src/init/uninstall.ts:76-122`
**What**: `uninstallWorkspace()` archives the audit chain (step 3) and removes .claws/ (step 4), but never records an UNINSTALL event to the audit chain BEFORE archiving it. The last event in the archived chain will be whatever happened before uninstall — the uninstall itself is invisible.
**Impact**: An auditor reviewing the backup's audit chain sees no record that the workspace was uninstalled. They cannot distinguish between "workspace was uninstalled cleanly" and "someone deleted .claws/ manually." This breaks the audit chain's completeness guarantee.
**Fix**: Before step 3 (archive), append a signed `UNINSTALL_INITIATED` event to the audit chain. This way the archived chain includes the uninstall decision as its final entry.

### M-04: Amendment apply does not record audit events [M]

**File**: `claws-sdk/src/amend/apply.ts:64-139`
**What**: `applyAmendment()` writes to `.claws/staging/amendments.json` and `claws.json` but never emits an audit event. The `amendments.json` file is not signed, not tamper-evident, and not part of the formal audit chain.
**Impact**: Governance amendments are high-impact operations — adding skills, removing tools, updating policy. These changes are invisible to `claws audit verify` because they bypass the signed audit chain entirely. A SOC2 CC8.1 (change management) auditor would find no evidence trail for configuration changes.
**Fix**: `applyAmendment()` must emit a signed `AMENDMENT_APPLIED` event to the audit chain with the amendment type, target, value, and outcome. The `amendments.json` file can remain as a staging record, but the authoritative audit trail must be the signed chain.

### W-01: Policy template schema mismatch — doctor validates wrong fields [W]

**File**: `claws-sdk/src/doctor/checks/policy-syntax.ts:19`
**What**: `REQUIRED_FIELDS` validates `['name', 'version', 'rules']`, but the actual policy templates generated by soc2.ts, hipaa.ts, and eu-ai-act.ts use `['policy', 'framework', 'level', 'rules']`. None of the generated templates have a `name` or `version` field — they use `policy` and `framework` instead.
**Impact**: Running `claws doctor` on a workspace initialized with `--template soc2` will report false-positive errors for every policy file. The doctor check and the template generator disagree on the schema. This means compliance teams will see misleading diagnostics.
**Fix**: Either (a) align REQUIRED_FIELDS with the actual template schema (`policy`, `framework`, `level`, `rules`), or (b) update templates to include `name` and `version` fields. Option (a) is less disruptive.

### W-02: Fleet bypass prohibition not audited [W]

**File**: `claws-sdk/src/init/bypass.ts:68-74`
**What**: When `fleetPolicy.allowBypass === false` and an operator tries to bypass anyway, the function returns `{bypassed: false, reason: 'fleet-prohibited', auditRecorded: false}`. No audit event is recorded for the DENIED bypass attempt.
**Impact**: Attempted bypass that was blocked by fleet policy is a security-relevant event. SOC2 and HIPAA frameworks require logging of both successful AND denied access attempts. Denied bypass attempts are arguably MORE important to log than successful ones — they indicate someone tried to circumvent governance.
**Fix**: Record a `BYPASS_DENIED` event (signed) when fleet policy prohibits bypass. This completes the audit trail for all bypass-related decisions.

### W-03: Migration runner does not record audit event [W]

**File**: `claws-sdk/src/doctor/migrate/runner.ts:116-229`
**What**: `runMigrations()` modifies the governance config (claws.json schema upgrade) but does not emit any audit event. Schema migrations change the governance posture — field renames, new defaults (failMode, fleet) — and should be audited.
**Impact**: An auditor reviewing the audit chain sees no record of when or why the config schema changed. The backup file provides some evidence, but backup files are not part of the tamper-evident chain and could be deleted.
**Fix**: Emit a signed `CONFIG_MIGRATION` event after successful migration, recording fromVersion, toVersion, and the list of applied migrations.

### W-04: SOC2 template cites CC6.x controls without mapping to Trust Services Criteria [W]

**File**: `claws-sdk/src/init/templates/soc2.ts:59,61,63,74,76,78,119,121,123`
**What**: The SOC2 template references control numbers (CC6.1, CC6.3, CC6.7, CC8.1) in the `reason` fields, which is good. However, these are cited informally in YAML comments. There is no machine-readable mapping from policy rule to TSC control number, and no way for `claws comply soc2` to generate an evidence matrix that maps findings to specific controls.
**Impact**: A Big 4 auditor needs a mapping from each finding to the specific TSC criterion it evidences. The current template produces human-readable but not machine-auditable control references.
**Fix**: Add a `tsc_control` or `control_ref` field to each rule in the SOC2 template so the compliance report generator can produce structured control-to-evidence mappings.

### W-05: EU AI Act template missing Article 9 (Risk Management) [W]

**File**: `claws-sdk/src/init/templates/eu-ai-act.ts`
**What**: The compliance role definition explicitly calls out Article 9 as relevant: "EU AI Act (Articles 6, 9, 13, 14)". The template covers Articles 6 (risk classification), 13 (transparency), and 14 (human oversight) but does NOT include Article 9 (Risk Management System). Article 9 requires high-risk AI systems to maintain a documented risk management system.
**Impact**: A workspace initialized with `--template eu-ai-act` will not enforce the Article 9 obligation, creating a gap in regulatory coverage. The risk_classification_mandatory.yaml references `risk_management_system` in required_documentation but has no corresponding policy to enforce it.
**Fix**: Add a `risk_management.yaml` policy file for Article 9 enforcement.

### N-01: Bypass event uses non-canonical event structure [N]

**File**: `claws-sdk/src/init/bypass.ts:97-101`
**What**: The bypass event `{type: 'BYPASS_ACTIVATED', timestamp, env}` uses a different structure than the canonical `AuditEvent` type from `ir/audit-event.ts` which uses `{eventType, timestamp, actor, target, action, outcome, ruleId, severity, policyVersion, hmacSignature, keyId, algorithm}`.
**Impact**: Inconsistent event shapes make it harder to build a unified audit viewer or SIEM export. The compliance infrastructure already defines a canonical shape — bypass events should use it.

### N-02: Template configOverrides not applied to claws.json during init [N]

**File**: `claws-sdk/src/init/orchestrator.ts:86-113`
**What**: The init orchestrator calls `buildInitConfig()` (step 3) and then `applyTemplate()` (step 6), but the template's `configOverrides` (e.g., `trustTier: 3`, `complianceFramework: 'soc2'`) are never merged back into the written claws.json. The config is written with default T2 before the template is applied.
**Impact**: A workspace initialized with `--template soc2` will have `trustTier: 2` in claws.json even though the SOC2 template specifies `trustTier: 3`. The template writes policy files but doesn't upgrade the trust tier to match the framework's requirements.
**Fix**: After `applyTemplate()`, merge `template.configOverrides` into the config and re-write claws.json.

### N-03: Content hash normalization ensures cross-platform fidelity [N]

**File**: `claws-sdk/src/watch/content-hash.ts:22-26`
**What**: `hashContent()` correctly normalizes content (BOM strip + CRLF to LF) before hashing. This is a positive compliance property — the same logical governance file produces the same hash regardless of OS line endings, making cross-platform audit verification reliable.
**Impact**: Positive finding. This design decision supports audit chain integrity across mixed Windows/macOS/Linux environments.

### N-04: Doctor checks run sequentially — no parallel execution [N]

**File**: `claws-sdk/src/doctor/orchestrator.ts:106-109`
**What**: Doctor checks run in a serial `for...of` loop. For compliance evidence generation speed, parallel execution would be preferable (the checks are independent — each reads different files).
**Impact**: Minor. Sequential execution is correct but slower. For fleet-wide `claws doctor --fleet` runs, this could add up.

---

## Summary

| Severity | Count | Key themes |
|---|---|---|
| **Major** | 4 | Unsigned audit events (bypass, uninstall, amendment); missing audit fields |
| **Warning** | 5 | Template/doctor schema mismatch; denied bypass not logged; EU AI Act Art. 9 gap |
| **Note** | 4 | Non-canonical event shapes; config override ordering; positive content-hash finding |

### Compliance Verdict

**CP-2 is NOT ready for compliance certification.** The four Major findings represent fundamental gaps in the audit chain:

1. **Bypass events are unsigned** — the most security-sensitive operation has the weakest audit protection.
2. **Uninstall leaves no trace** — the act of removing governance is invisible to the audit chain.
3. **Amendments are unaudited** — governance changes bypass the signed chain entirely.
4. **Template/doctor schema disagreement** — the system's own compliance templates fail its own validation.

These are not theoretical concerns. Each one would be flagged by a SOC2 Type II or HIPAA assessment. The infrastructure for proper signing exists (`compliance/artifact-signer.ts`) but CP-2's new modules do not use it.

### Recommendation

Fix M-01 through M-04 before advancing past CP-2. W-01 (template/doctor schema mismatch) should also be fixed as it creates false diagnostic noise that undermines trust in the doctor tool.
