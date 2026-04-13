---
marp: true
theme: claws-dark
paginate: true
---

<!-- _class: title -->

# claws Compliance Evidence

**Hash-chained audit trails. Signed evidence packages. Framework-mapped controls. Generated, not assembled.**

For SOC2 auditors, HIPAA compliance officers, EU AI Act assessors, and enterprise security teams.

---

## The Problem: Manual Evidence Gathering

**Compliance evidence for AI agents is assembled by hand -- spreadsheets, screenshots, point-in-time snapshots.**

```
  TODAY'S EVIDENCE WORKFLOW
  ────────────────────────
  1. Auditor requests evidence                        2 weeks before audit
  2. Engineer opens spreadsheet                       manual
  3. Engineer screenshots tool configs                point-in-time only
  4. Engineer exports logs to CSV                     partial, unverified
  5. Engineer writes narrative per control             subjective
  6. Manager reviews and signs off                    attestation, not proof
  7. Auditor asks for 6 months of history             "we don't have that"

  PROBLEMS
  ────────
  - Evidence is point-in-time, not temporal           SOC2 Type II needs 6+ months
  - Logs can be edited after the fact                 no tamper detection
  - No chain of custody for evidence                  no signing
  - Assembly takes 2+ weeks per audit cycle           per framework
  - Different person assembles each time              inconsistent
  - No proof that governance operated continuously    gap = finding
```

---

## Hash-Chained Audit Trail

**Every governance decision is recorded. Each entry references the previous entry's hash. Tamper with one -- the chain breaks.**

```
  ┌──────────────────────────────────┐
  │ web-search    R1  ALLOW          │
  │ hash: a3f2    prev: 0000         │     A flat log can be edited.
  └───────────────┬──────────────────┘     A database record can be updated.
                  │                        A hash-chained log cannot be
  ┌───────────────▼──────────────────┐     silently modified.
  │ send-email    R5  ELICIT         │
  │ hash: b7d1    prev: a3f2         │     Modify any entry → hash changes
  └───────────────┬──────────────────┘     → next link breaks → detected.
                  │
  ┌───────────────▼──────────────────┐     Delete an entry → neighbors
  │ send-email    R5  DENIED         │     no longer link → detected.
  │ hash: c9e4    prev: b7d1         │
  │ timeout: true                    │     Insert an entry → all subsequent
  └──────────────────────────────────┘     hashes invalidated → detected.

  $ claws audit verify
    Chain integrity: VERIFIED (14,329 events, 0 breaks)
```

---

## What Gets Recorded

**Every governance decision. Nothing is optional. Denials and timeouts are recorded alongside approvals.**

| Event category | Examples | Always recorded? |
|---------------|----------|:----------------:|
| Tool classification | Tool scored R3, reclassified from R2 to R4 | Yes |
| Elicitation decisions | Approved, denied, timed out | Yes -- all outcomes |
| Policy changes | Rule added, modified, suppressed | Yes |
| Drift detection | Configuration drift from baseline detected | Yes |
| Kill switch | Activated, reason, duration, resumed | Yes |
| A2A events | Agent communication permitted or blocked | Yes |
| Integrity events | Policy IR hash verified, handler presence confirmed | Yes |
| Key lifecycle | Key generated, rotated, revoked, re-keyed | Yes |
| Compliance generation | Evidence package generated, verification run | Yes |

---

## SIEM Integration

**Four export formats. Streaming export for large chains. Consistent PII redaction across all formats.**

```
  EXPORT FORMATS
  ──────────────
  SARIF          Static analysis results interchange format
  CEF            Common Event Format (ArcSight, Splunk, QRadar)
  NDJSON         Newline-delimited JSON (Elasticsearch, Datadog)
  syslog         RFC 5424 (any SIEM with syslog ingestion)

  CEF SEVERITY MAPPING (normative, per Amendment A488)
  ────────────────────
  R5 deny events     →  CEF 9-10 (Critical)
  R4 deny events     →  CEF 7-8  (High)
  R3 events          →  CEF 5-6  (Medium)
  R2 events          →  CEF 3-4  (Low)
  R1 events          →  CEF 1-2  (Informational)

  $ claws audit export --format cef --since 2025-10-01
    Exported 14,329 events to governance-audit.cef
    PII redaction: applied (consistent across all formats)
    Oversized syslog messages: split with correlation IDs
```

---

## Signing

**Signing is always automatic. Every audit chain entry and every evidence package is signed on creation.**

| Algorithm | Use case | Auditor verification |
|-----------|---------|---------------------|
| **HMAC-SHA256** | Default. Single-team deployments. | Verifier needs the shared secret |
| **Ed25519** | Enterprise. Multi-party verification. | Verifier uses public key only (no shared secret) |

```
  HMAC-SHA256 answers:
    "Has this chain been modified since we signed it?"

  Ed25519 answers:
    "Was this chain created by the claimed organization?"
    + third-party verification without sharing the signing key
    + required when auditors or regulators must independently verify

  KEY MANAGEMENT
  ──────────────
  Developer:    file-based (.claws/keys/, chmod 600)
  Team:         environment variable (CLAWS_SIGNING_KEY)
  Enterprise:   external KMS (AWS KMS, Azure Key Vault, HashiCorp)
```

When auto-sign is enabled (default), signing is built into every operation that produces evidence. When auto-sign is disabled, use `claws comply soc2 --sign` to sign explicitly.

---

<!-- _class: small -->

## SOC2 Type II: 9 Controls Mapped

**Temporal evidence over a 6-to-12 month observation period. Not a point-in-time snapshot.**

| SOC2 Control | Category | claws Governance Rule(s) | Evidence Source |
|:------------|:---------|:------------------------|:---------------|
| CC6.1 | Logical access | G-CLASS, G-PERM, G-A2A-TRUST | Tool classification + A2A trust groups |
| CC6.2 | Authentication | G-A2A-IDENTITY, G-ELICIT | Agent identity levels (L0-L3) + approval records |
| CC6.3 | Access authorization | G-CLASS (R1-R5), FE6 | Per-tool risk scoring + fence pass logs |
| CC6.6 | Access reviews | `claws drift`, `claws check --fleet` | Drift detection + fleet scan results over time |
| CC6.8 | Encryption | G-SECRETS, key management | Vault encryption + key rotation records |
| CC7.1 | Incident detection | G-OUTPUT, G-INPUT, audit chain | Output guards + input validation events |
| CC7.2 | Incident response | `claws kill`, audit export | Kill switch records + SIEM export history |
| CC7.3 | Change management | `claws snap`, `claws diff` | Snapshot history + policy diff records |
| CC8.1 | Monitoring | `claws watch`, `claws drift` | Continuous monitoring + drift detection history |

These are the 9 controls where claws generates evidence. claws does not claim coverage of the full SOC2 control set.

---

## SOC2 Type II: The Temporal Dimension

**Type I asks: "Are controls designed correctly?" Type II asks: "Did controls operate effectively over time?"**

```
  SOC2 TYPE II OBSERVATION PERIOD
  ────────────────────────────────
  Minimum: 6 months of continuous governance evidence
  Typical: 6-12 months
  claws enforces: evidence generation rejects periods shorter than 6 months

  WHAT THE AUDITOR RECEIVES
  ─────────────────────────
  Total governance events:          14,329 (volume of governance activity)
  Chain integrity:                  VERIFIED (0 breaks, 0 gaps)
  First event:                      2025-04-12T08:00:00Z
  Last event:                       2025-10-11T23:59:00Z
  Per-control event counts:         CC6.1: 4,201  CC6.2: 892  ...
  Reclassification history:         3 tools reclassified (with reasons)

  A chain with zero breaks spanning the full observation period
  is strong evidence. Gaps require explanation to the auditor.
```

A chain with gaps is not necessarily disqualifying, but the auditor will require documented explanations for any windows where governance was inactive.

---

<!-- _class: small -->

## HIPAA: PHI Governance

**PHI = RESTRICTED label. The highest governance tier. Fail-closed. No exceptions.**

| HIPAA Safeguard | Requirement | claws Evidence |
|:---------------|:-----------|:--------------|
| **Technical** | | |
| 164.312(a)(1) | Access control | G-CLASS + G-PERM: PHI tools governed at R2+ |
| 164.312(b) | Audit controls | Hash-chained audit log with all PHI access events |
| 164.312(c)(1) | Integrity | Chain integrity verification (`claws audit verify`) |
| 164.312(d) | Authentication | G-A2A-IDENTITY: L2+ required for PHI-accessing agents |
| 164.312(e)(1) | Transmission security | G-A2A-FLOW: RESTRICTED ceiling on PHI channels |
| **Administrative** | | |
| 164.308(a)(1) | Risk management | `claws assess` classification output |
| 164.308(a)(3) | Workforce security | G-ELICIT approval records for PHI-touching tools |
| 164.308(a)(4) | Information access management | G-PERM + G-CLASS: role-based tool access, PHI scope restrictions |
| 164.308(a)(5) | Security awareness training | Audit chain: policy acknowledgment events + drift alerts |
| 164.308(a)(6) | Incident procedures | Kill switch records + SIEM export |
| **Physical** | | |
| 164.310(d)(1) | Device/media controls | Limited: `claws snap` state records, `claws keys revoke` |

Physical safeguards are primarily infrastructure-level. claws's contribution is limited to data lifecycle governance within the agent workspace.

---

## HIPAA: The RESTRICTED Label

**Once data is labeled RESTRICTED, it cannot be downgraded. Every access is audited.**

```
  DATA SENSITIVITY LABELS
  ───────────────────────
  PUBLIC         No special handling
  INTERNAL       Standard governance
  CONFIDENTIAL   Elevated governance. Agent identity L1+ required.
  RESTRICTED     Full governance. Agent identity L2+. R5 gates.
                 PHI is always RESTRICTED.

  RESTRICTED TRIGGERS
  ───────────────────
  Agent identity minimum:    L2 (HMAC-signed fleet identity) or higher
  Data flow ceiling:         Cannot flow to agents with lower scope
  High-water mark:           No downstream operation can downgrade
  Audit trail:               Every access recorded in the chain
  Fail mode:                 Fail-closed on ANY governance error

  HIPAA-SPECIFIC
  ──────────────
  Audit chain itself classified as PHI storage when tool parameters
  may contain patient data (Amendment A487: AES-256-GCM at rest).
  Breach notification readiness included in evidence package.
```

---

## EU AI Act: Article 6 System Classification

**`claws assess` classifies the AI system -- not individual tools. Article 6 categories are fundamentally different from per-tool R1-R5 scoring.**

```
  ARTICLE 6 RISK CATEGORIES
  ─────────────────────────
  Unacceptable    Prohibited (social scoring, real-time biometric in public)
  High-risk       Annex III use cases: full conformity assessment required
  Limited         Chatbots, synthetic content: transparency obligations
  Minimal         No mandatory requirements

  CRITICAL DISTINCTION
  ────────────────────
  R1-R5 classifies individual TOOLS    (send-email is R5)
  Article 6 classifies the SYSTEM      (the deployment as a whole)

  A "limited" system can still contain R5 tools with full elicitation gates.
  System-level classification does NOT reduce per-tool governance.

  $ claws assess
    System classification: Limited (Article 6)
    Annex III match: None
    Reasoning: System performs customer service (chatbot interaction).
    Transparency obligations: Required (Article 13)
    Human oversight: Configured (Article 14)
```

`claws assess` includes a reasoning chain explaining the classification, so it can be explained to regulators.

---

## EU AI Act: Obligations and Deadlines

**High-risk Annex III deadline: August 2, 2026. Evidence requirements are already in effect for limited-risk systems.**

| Article | Obligation | Minimal | Limited | High-risk | claws Evidence |
|:--------|:----------|:--------|:--------|:----------|:--------------|
| Art. 9 | Risk management | -- | Applicable | **Required** | `claws assess` output |
| Art. 10 | Data governance | -- | -- | **Required** | Data label inventory + flow records |
| Art. 11 | Technical documentation | -- | -- | **Required** | `claws comply eu-ai-act` (AIBOM) |
| Art. 12 | Record-keeping | -- | -- | **Required** | Audit chain export |
| Art. 13 | Transparency | -- | **Required** | **Required** | System description + capability disclosure |
| Art. 14 | Human oversight | -- | Applicable | **Required** | Elicitation gate config + approval records |
| Art. 15 | Accuracy and robustness | -- | -- | **Required** | Tool classification + fail-mode records |
| Art. 17 | Quality management | -- | -- | **Required** | Policy version history + drift detection |

EU AI Act classification must be explicit configuration, not automated inference. The system does not self-classify its own risk level.

---

## `claws comply` Workflow

**Evidence generation: on demand, reproducible, signed.**

```
  WORKFLOW
  ────────
  1. claws comply <framework>           Generate evidence package
     └── Walks the audit chain for the observation period
     └── Maps governance events to framework controls
     └── Assesses per-control status (satisfied / partial / not satisfied)
     └── Signs the package (HMAC-SHA256 or Ed25519, automatic)
     └── Attests generation time via RFC 3161 TSA (if configured)

  2. claws audit verify                 Validate chain + package integrity
     └── Signature intact?
     └── Timestamp valid?
     └── Referenced audit chain integrity confirmed?

  REPRODUCIBILITY
  ───────────────
  Given the same audit chain + same policy version → same output.
  Policy version embedded in package → can reproduce against historical state.
  All serialization uses RFC 8785 canonical JSON for cross-platform consistency.

  $ claws comply soc2 --sign
    Observation period: 2025-04-12 to 2025-10-11 (183 days)
    Controls assessed: 9 (7 satisfied, 2 partially satisfied)
    Findings: 2 medium, 0 critical/high
    Signature: Ed25519 (key: org-audit-key)
    Package: .claws/evidence/soc2-2025-10-11.json
```

---

## Fleet Compliance

**`claws comply --fleet` generates signed evidence packages across all governed workspaces.**

```
  $ claws comply soc2 --fleet
    Scanning 47 workspaces...
    ┌─────────────────────────────────────────────────────────┐
    │  FLEET COMPLIANCE SUMMARY                               │
    │  ───────────────────────                                │
    │  Workspaces scanned:    47                              │
    │  Packages generated:    47 (all signed)                 │
    │  Aggregate pass rate:                                   │
    │    CC6.1  47/47    CC6.6  45/47    CC7.3  47/47        │
    │    CC6.2  47/47    CC6.8  47/47    CC8.1  46/47        │
    │    CC6.3  47/47    CC7.1  47/47                        │
    │    CC7.2  47/47                                         │
    │  Cross-workspace findings: 2 (drift from baseline)      │
    │  Fleet drift summary: 3 workspaces drifted              │
    └─────────────────────────────────────────────────────────┘

  REPLACES
  ────────
  Manual per-workspace evidence assembly:  ~2 weeks
  Fleet evidence generation:               <30 seconds
```

Fleet packages include per-workspace assessments, aggregate compliance posture, cross-workspace findings, and drift summary.

---

## Legal Discovery Readiness

**Four requirements for evidence admissibility. The audit chain addresses all four -- with caveats.**

| Requirement | How the audit chain meets it | Caveat |
|:-----------|:----------------------------|:-------|
| **Authenticity** | Ed25519 signatures prove the entry was created by the signing key holder | HMAC requires shared-secret distribution |
| **Integrity** | Hash chain proves no entry has been modified, deleted, or inserted | Self-signed chains are challenged in adversarial proceedings |
| **Chronology** | RFC 3161 TSA tokens provide independent proof of timing | **Requires external TSA configuration.** Without TSA, timestamps are self-asserted and insufficient for legal proceedings. |
| **Completeness** | Witness protocol attests that no entries were omitted | **Requires witness service deployment.** Without a witness, there is no independent proof of completeness. A self-signed chain alone cannot prove entries were not omitted. |

Opposing counsel will challenge: "Is the log complete?" (witness protocol), "Are timestamps real?" (external TSA), "Were entries modified?" (hash chain + signatures). Without TSA and witness service, only integrity is independently verifiable.

---

## Credential Escrow

**Signing keys stored in AES-256-GCM encrypted vault. Key material never leaves the vault in plaintext.**

```
  CREDENTIAL ESCROW (.claws/secrets/vault.enc)
  ────────────────────────────────────────────
  Encryption:          AES-256-GCM
  Key storage:         Platform key store (OS-level)
  Signing operations:  Performed within the vault boundary
  Fleet isolation:     Per-workspace key isolation

  KEY LIFECYCLE
  ─────────────
  Generate  →  claws keys init --type ed25519
  Rotate    →  claws keys rotate <key-id>
               (atomic: in-flight approvals valid until expiry,
                new approvals use rotated key, configurable overlap)
  Revoke    →  claws keys revoke <key-id>
               (entries signed with revoked key flagged
                SIGNING_KEY_REVOKED, not deleted)
  Re-key    →  claws keys rekey <key-id>
               (re-sign entries with new key,
                old signatures preserved for forensic continuity)

  COMPILE-TIME RESOLUTION
  ───────────────────────
  ${secrets.API_KEY} in workspace files → resolved at compile time
  Never present in runtime output or agent context.
```

---

## SOUL.md Section Locks

**Role-gated. Hash-verified. Tamper = compile error.**

```
  SOUL.md:
  ────────
  ## Core Identity <!-- @lock governance-admin -->

  This agent MUST NOT impersonate users.
  This agent MUST request approval before external actions.
  This agent MUST log all decisions to the audit chain.

  <!-- @endlock -->

  HOW IT WORKS
  ────────────
  1. Locked sections carry a role identifier (e.g., governance-admin)
  2. SHA-256 hash of section content stored in SOUL.md frontmatter
  3. FE6 fence pass verifies locks during PARSE phase
  4. Modifications by unauthorized roles → CLAWS-E401 (compile error)
  5. Hash verification detects both unauthorized AND accidental edits
  6. Cross-platform: line endings normalized (CRLF/LF) before hashing

  PROPERTIES
  ──────────
  Lock metadata in SOUL.md frontmatter (not external files)
  Lossless round-trip: original file never modified by claws
  Enforced before any IR construction
  Cannot be bypassed -- compile error blocks all output
```

---

<!-- _class: title -->

# Evidence, Not Promises

---

## What claws Does and Does Not Claim

**claws generates compliance evidence. It does not grant certifications, attestations, or approvals.**

```
  WHAT CLAWS GENERATES                    WHAT CLAWS DOES NOT DO
  ════════════════════                    ══════════════════════
  Signed evidence packages                Grant SOC2 certification
  Temporal audit trail (6-12 months)      Replace auditor judgment
  Framework-to-control mapping            Guarantee legal admissibility
  Tamper-evident chain verification       Substitute for legal counsel
  Reproducible evidence generation        Self-classify system risk
  Fleet-wide compliance posture           Eliminate manual review

  THE EVIDENCE CHAIN
  ──────────────────
  Governance decisions → hash-chained log → signed evidence package
                                           → auditor reviews package
                                           → auditor makes determination

  claws provides the evidence.
  The auditor provides the judgment.
  Legal counsel provides the admissibility opinion.

  Every statement in this deck is verifiable
  through the audit chain and the commands that query it.
```
