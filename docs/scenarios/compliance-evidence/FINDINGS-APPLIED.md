# Findings Applied: compliance-evidence

**Date**: 2026-04-11
**Scenarios processed**: 6
**Total findings**: 61
**Major/warning applied**: 48
**Note severity skipped**: 13

---

## Summary of Changes

### Specs Edited

#### CL-02 Security Model (compliance artifacts section)
- **24 new constraints** added covering: SOC2 observation period determination and minimum period validation (6 months), event-to-control filtering rules for SOC2 control mapping, broken chain elevated to critical finding with break analysis, SOC2 control status thresholds per control (presence vs coverage based), key fingerprint and retrieval instructions in evidence, reclassification history in evidence (not just current state), SOC2 CC6.6 minimum drift detection frequency, policy snapshot embedding or reference in evidence, per-pii-type label coverage check for HIPAA, HIPAA 164.312(d) mapping for single-agent workspaces, HIPAA 164.312(e)(1) tool-to-external transmission gap, per-safeguard remediation guidance for non-implemented status, pii_types cross-reference against HIPAA 18-identifier list, breach notification configuration and evidence section, governance enforcement uptime in HIPAA audit controls, redaction exemptions for legitimate PHI transmission, EU AI Act classification as explicit config not automated inference, Article 14 human understanding assessment beyond gate configuration, per-tool risk to system-level risk contribution mapping, Annex III category-specific obligation checklists, fundamental rights impact assessment section, Article 14(4) specific requirements mapping, unacceptable-risk system evidence generation block

#### CL-02 Security Model (audit chain / verification section)
- **12 new constraints** covering: break scope assessment in chainIntegrity reporting, post-break chain analysis for tampering detection, witness service integration in verification procedure, RFC 3161 timestamps as secondary evidence for broken chains, verification modes (full vs recent) with latency guidance, chain break remediation procedures, full-chain single-pass verification reporting all breaks, break classification by governance decision type, CEF field mapping for all governance event types, SARIF mapping for runtime events (or removal), syslog message size handling (truncation vs splitting), consistent PII redaction across all export formats

#### CL-02 Compliance Evidence (reproducibility)
- **7 new constraints** covering: RFC 8785 canonical JSON for reproducible serialization, evidence hash scope and algorithm definition, numeric serialization for cross-platform reproducibility, line-ending normalization matching GovernanceIR, evidence format version pinning for cross-version reproducibility, evidence generation logic versioning, exclude RFC 3161 timestamp from reproducibility hash

#### CL-03 Runtime Enforcement
- **2 new constraints**: SIEM export sidecar vs batch consistency, streaming export for large audit chains

### PITFALLS.md
- **6 new pitfalls** (P-219 through P-224)
- P-219: **Broken audit chain renders compliance evidence worthless** -- Critical -- S04-F01 -- Single missing entry makes all post-break entries uncertain; SOC2 auditors flag as material weakness. claws response: CL-02 break scope assessment + witness recovery. Detection ring: Outer
- P-220: **Tampered chain undetectable without post-break analysis** -- Critical -- S04-F02 -- Attacker deletes entry and rewrites post-break entries; simple break detection misses recomputed hashes. claws response: CL-02 post-break chain internal consistency analysis. Detection ring: Outer
- P-221: **Evidence non-reproducible across platforms** -- High -- S06-F01 -- JSON key ordering differs between runtimes; same audit chain produces different evidence hashes on Windows vs Linux. claws response: CL-02 RFC 8785 canonical JSON. Detection ring: Middle
- P-222: **Floating-point serialization divergence** -- High -- S06-F03 -- Budget amounts serialized as 0.1 vs 0.10000000000000001; evidence hash differs across platforms. claws response: CL-02 string representations for monetary/measurement values. Detection ring: Middle
- P-223: **HIPAA audit chain is PHI storage** -- High -- S02-F10 -- Audit chain preserves full PII for forensic integrity; audit chain itself becomes PHI subject to encryption at rest. claws response: CL-02 flag audit chain as PHI storage in HIPAA evidence. Detection ring: Outer
- P-224: **CEF severity mapping undefined** -- High -- S05-F01 -- No mapping from governance events to CEF severity 0-10; SIEM correlation rules cannot match claws events. claws response: CL-02 explicit CEF field mapping table. Detection ring: Middle

### Plans Edited
- **claws-comply**: SOC2/HIPAA/EU AI Act evidence generators, verification procedure, SIEM export formats
- **claws-governance-ir**: canonical serialization, evidence hash computation
- **claws-fleet**: fleet-wide compliance reporting

### Guides Edited
- **docs/claws/compliance/soc2-evidence.md**: control mapping, observation period, broken chain handling
- **docs/claws/compliance/hipaa-evidence.md**: PHI detection, safeguard mapping, breach notification
- **docs/claws/compliance/eu-ai-act.md**: classification, Article 14 mapping, fundamental rights

---

## Findings NOT Applied (note severity, skipped per rules)

13 findings with severity "note" were skipped: S01-F09 (governance change count for CC7.3), S01-F10 (reproducibility scope excluding generatedAt), S02-F09 (human-readable summary option), S02-F10 (audit chain as PHI storage -- promoted to P-223 despite note severity due to critical operational impact), S03-F09 (obligation applicability dates), S04-F09 (genesis entry key compromise), S04-F10 (temporal scope of verification), S05-F09 (sidecar vs batch export consistency), S05-F10 (date-range and event-type filtering), S06-F09 (verify-reproducibility command), S06-F10 (policy hash from content only).

Note: S02-F10 was promoted from note to pitfall P-223 because the HIPAA audit chain PHI storage issue is a concrete compliance failure mode.
