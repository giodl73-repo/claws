---
slug: claws-comply-audit
preset: "claws"
plan: "3 headlines: claws comply soc2 generates signed evidence package, claws assess classifies EU AI Act Article 6, claws audit verify proves chain integrity"
area: claws
status: Implemented
phase: thoth
atoms: [atom:compliance-soc2, atom:compliance-hipaa, atom:compliance-eu-ai-act, atom:claws-assess, atom:audit-chain, atom:audit-verify, atom:siem-export, atom:key-management]
specs: [CL-02, CL-05, CL-06]
---

# claws-comply-audit — Compliance + Audit Chain

## Headlines

1. **H1: `claws comply soc2` generates a signed evidence package with SOC2 control mapping** — The compliance engine reads the audit chain (`.claws/audit/chain.jsonl`), evaluates 9 SOC2 controls (CC6.1 through CC8.1) against governance rule results from GovAnalysis, and produces a signed `SOC2Evidence` JSON package with per-control status, evidence counts, and remediation findings. The package is signed with Ed25519 (enterprise) or HMAC-SHA256 (developer) and counter-signed by an RFC 3161 Timestamp Authority. `claws comply hipaa` and `claws comply eu-ai-act` follow the same pipeline with framework-specific schemas.
   - Validation: `claws comply soc2` on a workspace with a 30-day audit history produces `.claws/compliance/soc2-<date>.json` with all 9 controls assessed
   - Validation: The signature field in the evidence package verifies against the audit signing key via `claws comply --verify`
   - Validation: `claws comply hipaa` produces a HIPAA evidence package with `safeguards[]` mapped to 164.312 subsections

2. **H2: `claws assess` classifies the agent system under EU AI Act Article 6 / Annex III** — The assessment engine analyzes the workspace's aggregate capabilities (not per-tool R1-R5, but system-level), domain markers (healthcare, credit scoring, law enforcement, biometric), and deployment context to produce an `EUAIActAssessment` with `article6Category` (minimal/limited/high/unacceptable), Article 13 transparency status, and Article 14 human oversight evaluation. This is a SEPARATE classification from per-tool risk — a system with all R2 tools can still be High-risk under Article 6.
   - Validation: A workspace with healthcare domain markers and OBO tools is classified `high` under Article 6
   - Validation: The assessment includes `article14HumanOversight.oboGatesConfigured` reflecting G-ELICIT rule results
   - Validation: A minimal read-only workspace is classified `minimal` under Article 6

3. **H3: `claws audit verify` proves chain integrity with hash verification and optional witness attestation** — The audit verify command reads the append-only hash chain from `.claws/audit/chain.jsonl`, recomputes HMAC/Ed25519 hashes for each entry, validates chain continuity (each entry's hash includes the previous entry's hash), and reports any breaks. Optional witness receipts from `.claws/audit/receipts/` provide independent Merkle proof of inclusion. `claws audit export` emits events in CEF, JSON, or syslog format for SIEM integration.
   - Validation: A 1,000-entry chain with no tampering passes `claws audit verify` with `chainIntegrity: 'verified'`
   - Validation: Modifying a single entry in the chain causes `claws audit verify` to report the exact break point
   - Validation: `claws audit export --format cef` produces valid CEF-formatted output parseable by Splunk/QRadar

## Summary

This plan implements the compliance artifact generation (`claws comply`), regulatory risk assessment (`claws assess`), and audit chain operations (`claws audit verify/export/history`). The compliance engine reuses the existing audit hash chain infrastructure from agent-sdk (`suite/audit/hash-chain.ts`, `verify.ts`, `export.ts`) and cryptographic signing from compiler-sdk (`integrity/`). Framework-specific schemas (SOC2, HIPAA, EU AI Act) are implemented as typed artifact builders in claws-sdk that map governance rules to regulatory controls. The audit chain extends agent-sdk's CGR chain pattern with Ed25519 asymmetric signing and RFC 3161 timestamp authority support for legal discovery compliance.

## Coverage Contract

### Specs
- [ ] CL-02 -- SOC2 Type II evidence schema, HIPAA Security Rule schema, EU AI Act assessment schema, audit chain signing (CB-02), key management (CB-03)
- [ ] CL-05 -- CI/CD Stage 2 CD gate: `claws comply <fw> --sign` for deployment gates
- [ ] CL-06 -- Compliance artifacts as part of the ecosystem value chain

### Concept Guides
- [ ] docs/claws/compliance/soc2.md -- NEW: SOC2 evidence generation, control mapping, verification
- [ ] docs/claws/compliance/eu-ai-act.md -- NEW: Article 6 classification, system-level vs tool-level risk
- [ ] docs/claws/audit/chain.md -- NEW: hash chain structure, signing options, witness protocol

### Scenario Coverage
- [ ] comply/soc2-full-workspace -- SOC2 evidence for a workspace with 30-day audit history
- [ ] comply/hipaa-phi-workspace -- HIPAA evidence for a workspace handling PHI data
- [ ] comply/eu-ai-act-high-risk -- EU AI Act assessment for healthcare domain agent
- [ ] comply/eu-ai-act-minimal -- EU AI Act assessment for read-only agent
- [ ] assess/system-vs-tool-risk -- Article 6 classification independent of R1-R5 per-tool scoring
- [ ] audit/chain-integrity-pass -- verify on untampered chain
- [ ] audit/chain-integrity-break -- verify detects single-entry tampering
- [ ] audit/siem-export-cef -- CEF export format validation
- [ ] audit/siem-export-json -- JSON export format validation
- [ ] audit/witness-attestation -- Merkle proof verification from witness receipts
- [ ] comply/ed25519-signing -- evidence signed with asymmetric key
- [ ] comply/hmac-signing -- evidence signed with HMAC-SHA256 (developer mode)

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 22 | SOC2 control mapping (9), HIPAA safeguard mapping (5), EU AI Act classification (3), chain verify (3), export formatting (2) |
| L1 integration | 8 | Full comply pipeline per framework (3), audit verify on chain fixtures (2), export integration (3) |
| L2 e2e | 4 | `comply soc2` + `comply hipaa` + `assess` + `audit verify` on fixture workspaces |
| L3 acceptance | 0 | CLI acceptance deferred to claws-cli plan |

## Scope

- `claws-sdk/src/compliance/soc2.ts` (NEW) -- SOC2 Type II evidence builder: control assessment, evidence collection, finding generation
- `claws-sdk/src/compliance/hipaa.ts` (NEW) -- HIPAA Security Rule evidence builder: safeguard assessment, PHI detection
- `claws-sdk/src/compliance/eu-ai-act.ts` (NEW) -- EU AI Act assessment: Article 6 classification, Annex III categorization, Article 13/14 evaluation
- `claws-sdk/src/compliance/artifact-signer.ts` (NEW) -- Ed25519 + HMAC-SHA256 signing, RFC 3161 timestamp authority client, signature verification
- `claws-sdk/src/compliance/types.ts` (NEW) -- SOC2Evidence, HIPAAEvidence, EUAIActAssessment, AsymmetricSignature, ComplianceFinding types
- `claws-sdk/src/compliance/index.ts` (NEW) -- Barrel exports
- `claws-sdk/src/audit/chain.ts` (NEW) -- Audit chain read/append/verify. Wraps agent-sdk `suite/audit/hash-chain.ts` with claws-specific entry types
- `claws-sdk/src/audit/verify.ts` (NEW) -- Chain integrity verification with break-point detection. Reuses agent-sdk `suite/audit/verify.ts` core logic
- `claws-sdk/src/audit/export.ts` (NEW) -- CEF/JSON/syslog export formatters. Reuses agent-sdk `suite/audit/export.ts` format infrastructure
- `claws-sdk/src/audit/witness.ts` (NEW) -- Witness receipt handling: store, validate Merkle proof of inclusion
- `claws-sdk/src/audit/wal.ts` (NEW) -- Write-ahead log for crash recovery: persists approvalStartTime so approval timeout is not reset on crash
- `claws-sdk/src/audit/types.ts` (NEW) -- AuditEntry, ChainVerifyResult, WitnessReceipt, ExportFormat types
- `claws-sdk/src/audit/index.ts` (NEW) -- Barrel exports

## Deliverables

### Specs & Design
- [ ] CL-02 amendment -- compliance artifact schemas finalized, signing algorithm selection, key lifecycle

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/compliance/soc2.ts -- SOC2 evidence builder (9 control mappings from CL-02 table)
- [ ] claws-sdk/src/compliance/hipaa.ts -- HIPAA evidence builder (5 safeguard mappings)
- [ ] claws-sdk/src/compliance/eu-ai-act.ts -- EU AI Act assessment engine (Article 6 classifier + Article 13/14 evaluator)
- [ ] claws-sdk/src/compliance/artifact-signer.ts -- sign(), verify(), timestamp() using compiler-sdk integrity/
- [ ] claws-sdk/src/compliance/types.ts -- all compliance type definitions from CL-02
- [ ] claws-sdk/src/compliance/index.ts -- barrel exports
- [ ] claws-sdk/src/audit/chain.ts -- claws audit chain (wraps agent-sdk suite/audit/hash-chain.ts)
- [ ] claws-sdk/src/audit/verify.ts -- chain integrity verification (wraps agent-sdk suite/audit/verify.ts)
- [ ] claws-sdk/src/audit/export.ts -- CEF/JSON/syslog formatters (wraps agent-sdk suite/audit/export.ts)
- [ ] claws-sdk/src/audit/witness.ts -- witness receipt storage and Merkle proof validation
- [ ] claws-sdk/src/audit/types.ts -- audit type definitions
- [ ] claws-sdk/src/audit/index.ts -- barrel exports
- [ ] claws-sdk/tests/compliance/soc2.unit.test.ts -- per-control mapping, evidence collection, finding severity
- [ ] claws-sdk/tests/compliance/hipaa.unit.test.ts -- safeguard mapping, PHI detection
- [ ] claws-sdk/tests/compliance/eu-ai-act.unit.test.ts -- Article 6 classification, domain markers
- [ ] claws-sdk/tests/compliance/artifact-signer.unit.test.ts -- Ed25519 sign/verify, HMAC sign/verify, timestamp
- [ ] claws-sdk/tests/audit/chain.unit.test.ts -- append, read, hash computation
- [ ] claws-sdk/tests/audit/verify.unit.test.ts -- integrity pass, break detection, break-point location
- [ ] claws-sdk/tests/audit/export.unit.test.ts -- CEF format, JSON format, syslog format
- [ ] claws-sdk/tests/audit/witness.unit.test.ts -- receipt storage, Merkle proof validation
- [ ] claws-sdk/tests/compliance/comply-soc2.integration.test.ts -- full SOC2 pipeline on fixture workspace
- [ ] claws-sdk/tests/compliance/comply-hipaa.integration.test.ts -- full HIPAA pipeline
- [ ] claws-sdk/tests/compliance/assess.integration.test.ts -- EU AI Act assessment on fixture workspace
- [ ] claws-sdk/tests/audit/verify.integration.test.ts -- verify on 1000-entry chain fixture
- [ ] claws-sdk/tests/fixtures/soc2/ (UPDATE) -- add 30-day audit chain fixture
- [ ] claws-sdk/tests/fixtures/hipaa/ (NEW) -- HIPAA workspace with PHI data labels

### CLI Wiring
- None in this plan (compliance + audit are SDK only -- CLI `claws comply`/`claws audit` come in claws-cli plan)

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Praetor Integration

- **OntologyIR**: Compliance frameworks as governance ontologies via OntologyIR.
- **Audit Chain**: Praetor Plan 4 hash-chained audit log is the storage backend.
- **Package Output**: Compliance evidence packages through craft package pipeline.

## Out of Scope

- GovernanceIR types (that's claws-governance-ir plan)
- Governance rule engine (that's claws-rules plan -- GovAnalysis must exist before compliance assessment)
- Key generation, rotation, ceremony (those are PROTECT plan operations that use the same crypto primitives)
- Fleet-wide compliance (`claws comply --fleet`) -- fleet command orchestration is a separate plan
- CLI formatting and SARIF output for compliance (that's claws-cli-foundation plan)
- Witness service implementation (external service -- this plan only handles receipt storage/validation)
- Runtime audit event emission (that's CL-03 runtime enforcement)

## Notes

- Compliance engine REUSES agent-sdk `suite/audit/hash-chain.ts` for chain operations -- wraps with claws-specific entry types
- Compliance engine REUSES agent-sdk `suite/audit/verify.ts` for hash verification -- adds Ed25519 support via compiler-sdk integrity/
- Compliance engine REUSES agent-sdk `suite/audit/export.ts` for CEF/JSON/syslog formatting -- passes claws audit entry schema
- Artifact signing REUSES compiler-sdk `integrity/` for hash computation -- extends with Ed25519 keypair operations
- SOC2 control-to-rule mapping follows the table in CL-02 (9 controls: CC6.1 through CC8.1)
- EU AI Act assessment is system-level (Article 6), NOT per-tool (R1-R5) -- these are separate frameworks per CL-06
- RFC 3161 timestamp authority is an HTTP client calling an external TSA -- no bundled TSA server
- Depends on claws-governance-ir (GovernanceIR, GovAnalysis types) and claws-rules (rule evaluation produces GovAnalysis that compliance engine reads)
- **WAL persists `approvalStartTime` for crash recovery.** Approval timeout does NOT reset on crash — remaining time is computed from the WAL-persisted `approvalStartTime`. If the process crashes during an approval flow, the recovered flow uses `originalTimeout - (now - approvalStartTime)` as the remaining timeout, ensuring crash cannot be exploited to extend the approval window.

## Scenario-Driven Additions

### From compliance-evidence scenarios
- **48 findings** applied: SOC2 observation period determination and minimum period validation (6 months), event-to-control filtering rules, broken chain elevated to critical finding with break analysis, SOC2 control status thresholds, key fingerprint and retrieval instructions in evidence, reclassification history in evidence, SOC2 CC6.6 minimum drift detection frequency, policy snapshot embedding in evidence, per-pii-type label coverage for HIPAA, HIPAA 164.312(d) mapping, HIPAA 164.312(e)(1) tool-to-external transmission gap, per-safeguard remediation guidance, pii_types cross-reference against HIPAA 18-identifier list, breach notification configuration section, governance enforcement uptime in HIPAA audit controls, EU AI Act classification as explicit config (not automated inference), Article 14 human understanding assessment, per-tool risk to system-level risk contribution mapping, Annex III category-specific obligation checklists, fundamental rights impact assessment section, unacceptable-risk system evidence generation block, chain break scope assessment, post-break chain analysis for tampering, witness service integration, RFC 3161 timestamps as secondary evidence, verification modes (full vs recent), chain break remediation procedures, full-chain single-pass verification, break classification by governance decision type, CEF field mapping for governance events, syslog message size handling, consistent PII redaction across export formats, RFC 8785 canonical JSON for reproducible serialization, evidence hash scope and algorithm, numeric serialization for cross-platform reproducibility, line-ending normalization matching GovernanceIR, evidence format version pinning, evidence generation logic versioning, exclude RFC 3161 timestamp from reproducibility hash, SIEM export sidecar vs batch consistency, streaming export for large audit chains
- **16 new tests**:
  - [ ] SOC2 observation period validation (minimum 6 months)
  - [ ] SOC2 event-to-control filtering rules
  - [ ] Broken chain elevated to critical finding with break analysis
  - [ ] SOC2 control status thresholds (presence vs coverage based)
  - [ ] Per-pii-type label coverage check for HIPAA safeguards
  - [ ] HIPAA 164.312(e)(1) tool-to-external transmission gap detection
  - [ ] EU AI Act classification from explicit config (not inference)
  - [ ] Article 14 human understanding assessment beyond gate configuration
  - [ ] Fundamental rights impact assessment section generation
  - [ ] Chain break scope assessment in integrity reporting
  - [ ] Post-break chain analysis for tamper detection
  - [ ] CEF field mapping for all governance event types
  - [ ] Consistent PII redaction across CEF/JSON/syslog formats
  - [ ] RFC 8785 canonical JSON for reproducible evidence serialization
  - [ ] Cross-platform numeric serialization reproducibility
  - [ ] Streaming export for large audit chains (>10K entries)

### From fleet-operations scenarios
- **11 findings** applied: fleet-wide compliance reporting, compliance matrix (workspace x framework), ungoverned workspace exclusion, cross-framework deduplication, evidence signing, compliance history
- **5 new tests**:
  - [ ] Fleet-wide multi-framework compliance matrix generation
  - [ ] Ungoverned workspace exclusion from compliance metrics
  - [ ] Cross-framework rule evaluation deduplication
  - [ ] Evidence signing verification at fleet level
  - [ ] Compliance history storage for trend analysis
