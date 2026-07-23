# Compliance: SOC2 Type II

<!-- atom:compliance-soc2 (C70) -->

## The short version

`claws comply soc2` generates a signed evidence package that maps claws governance rules to SOC2 Type II controls. The package includes temporal evidence -- not a point-in-time snapshot, but a record of governance behavior over a 6-to-12 month observation period. An auditor receives: the evidence package (signed JSON), the audit chain export, and the policy snapshot at the time of generation. The package is reproducible: given the same audit chain and policy version, the command produces the same output.

---

## What SOC2 Type II requires that SOC2 Type I does not

SOC2 Type I asks: "Are the controls designed correctly?" SOC2 Type II asks: "Did the controls operate effectively over a period of time?"

This distinction matters for AI governance. A governance system that works on the day of the audit is Type I evidence. A governance system that demonstrably worked every day for the past 6 months is Type II evidence. claws's hash-chained audit log provides that temporal dimension.

| Evidence type          | What it proves                          | claws source                                          |
| ---------------------- | --------------------------------------- | ----------------------------------------------------- |
| Point-in-time          | Controls exist today                    | `claws comply soc2` (current state)                   |
| Temporal (6-12 months) | Controls operated continuously          | Audit chain history + chain integrity verification    |
| Trend                  | Controls improved or degraded over time | Audit chain summary: event counts, break points, gaps |

---

## Control mapping

| SOC2 Control | Category             | claws Governance Rule(s)             | Evidence Source                                                     |
| ------------ | -------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| CC6.1        | Logical access       | G-CLASS, G-PERM, G-A2A-TRUST         | Tool classification records + A2A trust group definitions           |
| CC6.2        | Authentication       | G-A2A-IDENTITY, G-ELICIT             | Agent identity levels (L0-L3) + signed approval token records       |
| CC6.3        | Access authorization | G-CLASS (R1-R5), FE6                 | Per-tool risk scoring results + fence pass validation logs          |
| CC6.6        | Access reviews       | `claws drift`, `claws check --fleet` | Drift detection reports + fleet scan results over time              |
| CC6.8        | Encryption           | G-SECRETS, key management            | Vault encryption status + key rotation records                      |
| CC7.1        | Incident detection   | G-OUTPUT, G-INPUT, audit chain       | Output guard triggers + input validation events + governance events |
| CC7.2        | Incident response    | `claws kill`, audit export           | Kill switch activation records + SIEM export history                |
| CC7.3        | Change management    | `claws snap`, `claws diff`           | Governance snapshot history + policy diff records                   |
| CC8.1        | Monitoring           | `claws watch`, `claws drift`         | Continuous monitoring data + drift detection history                |

---

## The evidence package

`claws comply soc2` produces a structured evidence package with these sections:

| Section                 | Contents                                                                          |
| ----------------------- | --------------------------------------------------------------------------------- |
| **Header**              | Framework version, generation timestamp, claws version, workspace identifier      |
| **Observation period**  | Start date, end date (6-12 months). Auditors require a minimum period.            |
| **Workspace context**   | Platform (OpenClaw, Cursor, etc.), trust tier, policy version hash                |
| **Control assessments** | Per-control status: satisfied, partially satisfied, not satisfied, not applicable |
| **Audit chain summary** | Total events, first/last event timestamps, chain integrity status, break points   |
| **Findings**            | Severity-rated issues with remediation guidance and deadlines                     |
| **Signature**           | Ed25519 or HMAC signature over the entire package                                 |

---

## Temporal evidence over 6-12 months

The audit chain is the backbone of temporal evidence. Every governance decision -- tool classification, approval granted, approval denied, approval timed out, policy change, drift detected, kill switch activated -- is recorded as a hash-chained entry.

For SOC2 Type II, the evidence package summarizes this chain:

| Metric                        | What it tells the auditor                                      |
| ----------------------------- | -------------------------------------------------------------- |
| Total governance events       | Volume of governance activity during the period                |
| Chain integrity               | Whether the chain is intact (no gaps, no tampering)            |
| Break points                  | Timestamps where the chain has gaps (must be explained)        |
| First and last event          | Proves governance was active throughout the observation period |
| Control-specific event counts | How many times each control was exercised                      |

A chain with zero break points and events spanning the full observation period is strong evidence. A chain with gaps requires explanation -- the auditor will want to know why governance was inactive during those windows.

---

## Verification

| Command                           | What it verifies                                                        |
| --------------------------------- | ----------------------------------------------------------------------- |
| `claws comply soc2`               | Generates the evidence package                                          |
| `claws comply --verify <package>` | Validates: signature intact, timestamp valid, chain integrity confirmed |
| `claws audit verify`              | Walks the full audit chain and checks every link                        |

Verification is reproducible. Given the same audit chain and the same policy version, `claws comply soc2` generates the same output. The policy version is embedded in the package so evidence can be reproduced against historical policy state.

---

## Fleet-wide evidence

`claws comply soc2 --fleet` generates a fleet-wide compliance package covering all governed workspaces. This replaces the manual process of assembling evidence from individual workspaces -- typically a 2-week effort reduced to under 30 seconds.

The fleet package includes:

| Element                      | Description                                  |
| ---------------------------- | -------------------------------------------- |
| Per-workspace assessments    | Individual control status for each workspace |
| Aggregate compliance posture | Fleet-wide pass rates per control            |
| Cross-workspace findings     | Issues that span multiple workspaces         |
| Fleet drift summary          | Workspaces that have drifted from baseline   |

---

## What to tell the auditor

The evidence package is generated on demand, not assembled manually. It is signed so tampering is detectable. It covers the full observation period because the underlying audit chain records every governance decision continuously. The package is reproducible: you can regenerate it against any historical policy version. Chain integrity can be verified independently using `claws audit verify`.

---

## Scenario-Driven Additions

### From compliance-evidence scenarios (48 findings applied)

- SOC2 observation period determination with minimum 6-month validation; evidence generation rejects periods shorter than minimum
- Event-to-control filtering rules: each audit chain event maps to specific SOC2 controls, enabling per-control event counts
- Broken chain elevated to critical finding with break scope analysis: auditors see which controls were affected during the break window
- Per-control status thresholds: presence-based controls (CC6.8 encryption) vs coverage-based controls (CC6.6 access reviews with minimum drift detection frequency)
- Key fingerprint and retrieval instructions embedded in evidence for auditor verification
- Reclassification history included (not just current classification) for CC6.3 audit trail
- Policy snapshot embedding or reference in evidence so auditors can see rules that were in effect during the observation period
- RFC 8785 canonical JSON for reproducible evidence serialization across platforms

## Related concepts

- [Audit Chain](audit-chain.md) -- the hash-chained log that provides temporal evidence
- [Tool Classification](tool-classification.md) -- the R1-R5 scoring behind CC6.1 and CC6.3
- [Elicitation Gate](elicitation-gate.md) -- the approval mechanism behind CC6.2
- [Compliance: HIPAA](compliance-hipaa.md) -- safeguard mapping for healthcare environments
- [Compliance: EU AI Act](compliance-eu-ai-act.md) -- Article 6 risk classification
