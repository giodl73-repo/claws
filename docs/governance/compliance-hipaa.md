# Compliance: HIPAA Security Rule

<!-- atom:compliance-hipaa (C71) -->

## The short version

`claws comply hipaa` generates a signed evidence package that maps claws governance rules to HIPAA Security Rule safeguards (45 CFR Part 164, Subpart C). The package addresses administrative, physical, and technical safeguards with specific focus on Protected Health Information (PHI) that flows through agent workspaces. PHI-touching tools are automatically identified through data sensitivity labels (RESTRICTED classification) and receive the highest governance tier.

---

## Why HIPAA matters for AI agents

An agent in a healthcare organization may access patient records, insurance claims, lab results, or clinical notes. Under the HIPAA Security Rule, any system that creates, receives, maintains, or transmits electronic PHI (ePHI) must implement administrative, physical, and technical safeguards. An ungoverned agent with access to ePHI is a HIPAA violation waiting to happen.

The three highest-risk scenarios:

| Scenario                                                                            | HIPAA risk                        | claws defense                                                                       |
| ----------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| Agent reads patient records and includes PHI in a summary sent to an external party | Unauthorized disclosure (164.502) | G-A2A-FLOW: RESTRICTED data cannot flow to agents with external communication scope |
| Agent sends email containing PHI without human review                               | Unauthorized use (164.502)        | G-ELICIT: R5 elicitation gate blocks external communication without approval        |
| Agent stores PHI in an unencrypted log                                              | Integrity failure (164.312(c)(1)) | G-SECRETS: all data at rest encrypted; audit chain signed                           |

---

## PHI data labeling

claws uses data sensitivity labels to identify and govern PHI. Every data flow through the workspace is labeled:

| Label        | Sensitivity | PHI treatment                                                                                                            |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| PUBLIC       | None        | Not PHI. No special handling.                                                                                            |
| INTERNAL     | Low         | Not PHI, but internal-only. Standard governance.                                                                         |
| CONFIDENTIAL | Medium      | May contain PHI. Elevated governance. Agent identity L1+ required.                                                       |
| RESTRICTED   | High        | Contains or may contain PHI. Full governance. Agent identity L2+ required. R5 elicitation gates for any external action. |

The RESTRICTED label triggers the following constraints:

| Constraint             | What it enforces                                                             |
| ---------------------- | ---------------------------------------------------------------------------- |
| Agent identity minimum | L2 (HMAC-signed fleet identity) or higher required to access RESTRICTED data |
| Data flow ceiling      | RESTRICTED data cannot flow to agents with lower classification scope        |
| High-water mark        | Once data is labeled RESTRICTED, no downstream operation can downgrade it    |
| Audit trail            | Every access to RESTRICTED data is recorded in the audit chain               |
| Fail mode              | All tools accessing RESTRICTED data fail closed on governance error          |

---

## Safeguard mapping

### Technical safeguards (45 CFR 164.312)

| HIPAA Section | Requirement                                                                                  | claws Rule                                     | Evidence                                                                     |
| ------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| 164.312(a)(1) | Access control -- unique user identification, emergency access, automatic logoff, encryption | G-CLASS + G-PERM (RESTRICTED label for PHI)    | Tool classification records showing PHI tools governed at R2+                |
| 164.312(b)    | Audit controls -- record and examine activity in systems containing ePHI                     | Audit chain + SIEM export                      | Hash-chained audit log with governance events for all PHI access             |
| 164.312(c)(1) | Integrity -- protect ePHI from improper alteration or destruction                            | Hash chain verification (`claws audit verify`) | Chain integrity report covering observation period                           |
| 164.312(d)    | Person or entity authentication -- verify identity before granting access                    | G-A2A-IDENTITY (L2+ for PHI access)            | Agent identity records showing authentication level for PHI-accessing agents |
| 164.312(e)(1) | Transmission security -- guard against unauthorized access during transmission               | G-A2A-FLOW (RESTRICTED data flow labels)       | Data flow records showing RESTRICTED ceiling on PHI transmission channels    |

### Administrative safeguards (45 CFR 164.308)

| HIPAA Section | Requirement                                                      | claws Evidence                                             |
| ------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| 164.308(a)(1) | Security management process -- risk analysis and risk management | `claws assess` risk classification output                  |
| 164.308(a)(3) | Workforce security -- authorization and supervision              | G-ELICIT approval records for PHI-touching tools           |
| 164.308(a)(4) | Information access management                                    | G-CLASS + G-PERM tool classification and permission matrix |
| 164.308(a)(5) | Security awareness and training                                  | Policy version history showing governance rule updates     |
| 164.308(a)(6) | Security incident procedures                                     | Kill switch records + SIEM export history                  |

### Physical safeguards (45 CFR 164.310)

| HIPAA Section | Requirement                                   | claws Evidence                                                                 |
| ------------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| 164.310(d)(1) | Device and media controls -- disposal, re-use | `claws snap` workspace state records; `claws keys revoke` for compromised keys |

Physical safeguards are primarily infrastructure-level controls (facility access, workstation security). claws's contribution is limited to data lifecycle governance within the agent workspace.

---

## The evidence package

`claws comply hipaa` produces a structured evidence package:

| Section                   | Contents                                                                    |
| ------------------------- | --------------------------------------------------------------------------- |
| **Safeguard assessments** | Per-safeguard status: implemented, partial, not implemented, not applicable |
| **PHI data inventory**    | Tools and data flows labeled RESTRICTED, with access records                |
| **Agent identity report** | Identity level (L0-L3) for each agent accessing PHI                         |
| **Audit chain summary**   | Event counts, chain integrity, PHI-specific access events                   |
| **Findings**              | Gaps with severity, remediation guidance, and compliance deadlines          |
| **Signature**             | Ed25519 or HMAC signature over the package                                  |

---

## The minimum viable HIPAA posture

For a healthcare organization deploying AI agents, the minimum claws configuration for HIPAA alignment:

| Requirement                                               | Configuration                                                           |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Label all patient data tools as RESTRICTED                | `claws.json` data labels for EMR, claims, lab tools                     |
| Require L2+ identity for PHI-accessing agents             | Agent identity policy in trust groups                                   |
| Enable R5 elicitation gates on all external communication | Default for R5 tools; verify no pre-approval overrides for PHI contexts |
| Export governance events to SIEM                          | `claws audit export --format cef` to organization's SIEM                |
| Verify audit chain integrity weekly                       | `claws audit verify` scheduled or on-demand                             |

---

## What to tell the auditor

Every agent that accesses patient data is identified through data sensitivity labels. PHI is classified RESTRICTED, which triggers the highest governance tier: agent identity verification, access logging, fail-closed error handling, and human approval for any external action. The audit trail is hash-chained and signed, providing tamper-evident evidence that these controls operated continuously. The evidence package maps every technical safeguard in 164.312 to a specific claws governance rule with verifiable records.

---

## Scenario-Driven Additions

### From compliance-evidence scenarios (48 findings applied)

- Per-PII-type label coverage check: evidence validates that each of the 18 HIPAA identifier types has a corresponding data label if present in the workspace
- 164.312(d) mapping for single-agent workspaces: person-or-entity authentication evidence addresses the case where only one agent exists (identity level still required)
- 164.312(e)(1) transmission security gap analysis: evidence identifies tools that send data externally without encryption or access controls
- Per-safeguard remediation guidance for non-implemented status: each gap includes specific steps to achieve compliance
- pii_types cross-reference against the HIPAA 18-identifier list ensures complete coverage
- Breach notification configuration and evidence section: workspace must declare notification channels and evidence generation includes notification readiness status
- Governance enforcement uptime tracked in HIPAA audit controls to demonstrate continuous operation
- Redaction exemptions for legitimate PHI transmission (e.g., authorized disclosure to a covered entity) documented in evidence
- Audit chain itself flagged as PHI storage when it preserves full PII for forensic integrity (P-223)

## Related concepts

- [Audit Chain](audit-chain.md) -- the tamper-evident log required by 164.312(b)
- [Tool Classification](tool-classification.md) -- how PHI tools receive R2+ classification
- [Elicitation Gate](elicitation-gate.md) -- human approval for PHI-related external actions
- [Compliance: SOC2](compliance-soc2.md) -- overlapping control evidence
- [Compliance: EU AI Act](compliance-eu-ai-act.md) -- system-level risk classification
