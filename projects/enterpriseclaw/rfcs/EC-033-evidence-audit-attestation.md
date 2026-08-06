# RFC Scope: Evidence, Audit, and Attestation

- ID: EC-033
- Lane: Operations, assurance, and fleet
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Audit, evidence, and attestation owners

## Scope

- Distinguish observations, findings, operational telemetry, durable audit,
  integrity verification, policy evidence, and attestations.
- Define the shared durable-audit and attestation base consumed by other
  contracts instead of parallel ledgers.

## Explicit Exclusions

- Telemetry as automatic audit evidence.
- Policy copying owner settings into a second truth.

## Required Outcomes

- Attestations bind stable evidence and producer identity, subject,
  policy/requirement references, owner/workspace generations,
  operation/authority references, requested/accepted/effective/observed/issued
  chronology, integrity, and verifier identity.
- Fleet attestations also bind deployment-unit/host identity when applicable;
  EC-033 records that identity but does not require a fleet projection to
  define or own it.
- Redaction and retention are explicit.
- Evidence remains verifiable after producing runtime exits.
- Owners without attestation support remain diagnosable; absence of evidence
  is explicit and never inferred as pass.
- Audit/attestation persistence is non-blocking to runtime hot paths.
- Operational settlement and assurance completeness are separate dimensions.
  A healthy owner is not rewritten as failed because evidence persistence is
  unavailable, but the result remains `assurance_incomplete` and cannot produce
  a required attestation or compliance pass.
- Evidence that authorizes targeted repair binds an immutable prior parent,
  child-settlement revisions, and eligible-unit snapshot or digest. Mutating a
  repair request cannot mutate the evidence that made units eligible.

## Dependencies

- EC-004.

## Dependency Direction

EC-001 projections consume EC-033 evidence references. EC-033 does not depend
on an administrative projection to define durable evidence.

## Proof and Deletion Gate

- Verify one tamper-evident cross-owner attestation.
- Delete manual evidence assembly and central private-state scanning.
- Disprove the separate shared base if existing owner-native evidence already
  provides compatible identity, chronology, integrity, redaction, retention,
  and attestation verification without parallel ledgers.
