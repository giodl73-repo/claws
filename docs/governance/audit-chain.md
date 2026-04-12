# Audit Chain

<!-- atom:audit-chain (C74) -->

## The short version

The audit chain is a hash-chained, cryptographically signed log of every governance decision claws makes. Each entry references the previous entry's hash, creating a tamper-evident sequence. If any entry is modified, deleted, or inserted, the chain breaks -- and `claws audit verify` detects it. The chain supports Ed25519 asymmetric signing (enterprise) or HMAC-SHA256 (default), external timestamp authorities (RFC 3161), and an optional witness protocol for legal discovery. Every approval, denial, timeout, policy change, kill switch activation, and drift detection is recorded.

---

## Why hash-chaining matters

A flat log file can be edited. A database record can be updated. A hash-chained log cannot be silently modified.

| Log type | Can entries be modified? | Can entries be deleted? | Can entries be inserted out of order? | Tampering detectable? |
|----------|------------------------|----------------------|-------------------------------------|---------------------|
| Flat file | Yes | Yes | Yes | No |
| Database table | Yes | Yes | Yes | Only with audit triggers |
| **Hash-chained log** | **Detected** | **Detected** | **Detected** | **Yes, always** |

Each entry contains the SHA-256 hash of the previous entry. Modifying any entry changes its hash, which breaks the link to the next entry. Deleting an entry breaks the link between its neighbors. Inserting an entry requires re-hashing all subsequent entries, which invalidates their signatures.

---

## What gets recorded

Every governance decision is an audit chain entry. Nothing is optional.

| Event category | Examples | Recorded regardless of outcome? |
|---------------|----------|-------------------------------|
| Tool classification | Tool scored R3, tool reclassified from R2 to R4 | Yes |
| Elicitation decisions | Approved, denied, timed out | Yes -- all three outcomes recorded |
| Policy changes | Rule added, rule modified, rule suppressed | Yes |
| Drift detection | Configuration drift from baseline detected | Yes |
| Kill switch | Activated, reason, duration, resumed | Yes |
| A2A events | Agent communication permitted, blocked, identity verified | Yes |
| Integrity events | Policy IR hash verified, handler presence confirmed | Yes |
| Compliance generation | Evidence package generated, verification run | Yes |
| Key lifecycle | Key generated, rotated, revoked, re-keyed | Yes |

---

## Signing options

| Algorithm | Use case | Key management | Auditor verification |
|-----------|---------|---------------|---------------------|
| HMAC-SHA256 | Default, single-team deployments | Shared secret in `.claws/keys/` or environment variable | Verifier needs the same secret (shared key) |
| **Ed25519** | Enterprise, multi-party verification | Private key held by organization; public key distributed to auditors | Verifier uses public key only (no shared secret) |

HMAC-SHA256 is sufficient for internal integrity verification: "has this chain been modified since we signed it?" Ed25519 is required when third parties (auditors, regulators, opposing counsel) must verify the chain without receiving the signing key.

For enterprises, Ed25519 is the recommended option. The private key signs entries. The public key is distributed to auditors. The auditor can verify every entry without access to the signing key and without trusting the organization's infrastructure.

---

## External timestamp authority

Self-asserted timestamps are insufficient for legal proceedings. An organization that claims "this event happened at 14:32 on March 7" has no independent proof.

claws supports RFC 3161 Timestamp Authority (TSA) integration:

| Step | What happens |
|------|-------------|
| 1 | Audit chain entry is created and signed |
| 2 | Entry hash is submitted to an external TSA |
| 3 | TSA returns a signed timestamp token proving the hash existed at that time |
| 4 | Timestamp token is stored alongside the entry in `.claws/audit/receipts/` |
| 5 | During verification, `claws audit verify` validates both the chain signature and the TSA token |

The TSA is an independent third party. Its timestamp proves the entry existed at the claimed time, regardless of the organization's internal clocks.

If the TSA is unreachable, claws falls back to a local timestamp. Local timestamps are marked as `source: local` in the entry, distinguishing them from TSA-attested timestamps. The auditor can see which entries have independent time verification and which rely on local clocks.

---

## Witness protocol

For regulated environments where legal discovery is expected, claws supports a witness service:

| Step | What happens |
|------|-------------|
| 1 | Governance decision recorded as audit chain entry |
| 2 | Entry hash sent to witness service (internal or third-party) |
| 3 | Witness appends hash to its independent Merkle tree |
| 4 | Witness returns a receipt (Merkle proof of inclusion) |
| 5 | Receipt stored in `.claws/audit/receipts/` |

During legal discovery, the witness can attest to the completeness and ordering of the audit chain without access to the chain contents. This is a zero-knowledge witness: it proves entries existed in a specific order without revealing what the entries contain.

The witness protocol provides three properties that self-signed chains cannot:

| Property | Self-signed chain | Chain + witness |
|----------|------------------|-----------------|
| Tamper detection | Yes | Yes |
| Independent ordering proof | No | Yes (Merkle tree) |
| Completeness attestation | No | Yes (witness has all hashes) |

---

## Verification

| Command | What it checks |
|---------|---------------|
| `claws audit verify` | Full chain walk: every link validated, every signature checked |
| `claws audit verify --tsa` | Chain walk + TSA token validation for each entry |
| `claws audit verify --witness` | Chain walk + witness receipt validation |
| `claws comply --verify <package>` | Evidence package signature + chain integrity referenced in the package |

`claws audit verify` exits with code 0 for intact chains and code 3 for breaks. Break points are reported with timestamps and entry IDs so the specific location of tampering is identified.

---

## Legal discovery readiness

| Legal requirement | How the audit chain meets it |
|------------------|------------------------------|
| Authenticity | Ed25519 signatures prove the entry was created by the signing key holder |
| Integrity | Hash chain proves no entry has been modified, deleted, or inserted |
| Chronology | RFC 3161 TSA tokens provide independent proof of timing |
| Completeness | Witness protocol attests that no entries were omitted |
| Reproducibility | Evidence packages are deterministic given the same chain and policy version |
| Preservation | Retention periods are configurable per framework (e.g., 7 years for SOC2, 5 years for EU AI Act) |

Opposing counsel will challenge three things: "How do I know this log is complete?" (witness protocol), "How do I know the timestamps are real?" (external TSA), and "How do I know entries weren't modified?" (hash chain + signatures). The audit chain addresses all three.

---

## Key rotation and compromise

| Event | Audit chain impact |
|-------|-------------------|
| Scheduled key rotation | New key signs new entries. Old key remains valid for verification of historical entries. 30-day grace period where both keys are active. |
| Key compromise | `claws keys revoke` immediately revokes the key. Entries signed with the revoked key are flagged `SIGNING_KEY_REVOKED` (not deleted). `claws keys rekey` generates a new key and re-signs entries, preserving old signatures for forensic continuity. |

Revoked entries are not deleted because deletion would break the chain. The `SIGNING_KEY_REVOKED` flag tells the auditor that these entries were signed with a compromised key and should be treated with reduced confidence.

---

## What to tell the board

The audit trail is tamper-evident. If anyone modifies, deletes, or inserts a record, the next verification detects it. Timestamps are attested by an independent authority so they cannot be backdated. For legal proceedings, a witness service provides independent proof that the trail is complete and in order -- without revealing the contents of the records. The system meets the evidence integrity standards that SOC2 auditors, HIPAA assessors, and legal counsel require.

---

## Scenario-Driven Additions

### From compliance-evidence scenarios (48 findings applied)
- Break scope assessment: chainIntegrity reporting now classifies breaks by governance decision type (elicitation, classification, policy change) to help auditors assess impact
- Post-break chain analysis detects tampered entries by checking internal consistency of entries written after the break point
- Witness service integration as a formal verification step: RFC 3161 timestamps serve as secondary evidence for broken chain segments
- Verification modes: "full" walks entire chain (slower, complete); "recent" verifies last N days (faster, sufficient for operational checks)
- Chain break remediation procedures documented with per-break-type recovery guidance
- Full-chain single-pass verification reports all breaks in one run rather than stopping at the first
- CEF field mapping defined for all governance event types with explicit severity mapping (0-10 scale)
- Syslog message size handling: messages exceeding limits are split with correlation IDs, not silently truncated
- Consistent PII redaction applied across all export formats (CEF, JSON, syslog)
- Streaming export for large audit chains prevents memory exhaustion during SIEM ingestion

## Related concepts

- [OBO Boundary](obo-boundary.md) -- approval decisions recorded in the chain
- [Elicitation Gate](elicitation-gate.md) -- every approval, denial, and timeout is an entry
- [Compliance: SOC2](compliance-soc2.md) -- temporal evidence built from the chain
- [Compliance: HIPAA](compliance-hipaa.md) -- audit controls required by 164.312(b)
- [Fail Mode](fail-mode.md) -- governance errors recorded as chain entries
