# RFC Scope: Session Continuity and Export

- ID: EC-017
- Lane: Knowledge, context, and continuity
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Session continuity

## Scope

- Define session key, transcript generation, branch, lifecycle revision,
  export source identity, omissions, destination, integrity, and expiry.
- Consume provider conversation/thread identity from EC-015.
- Own export source-generation identity, omission manifest, and produced
  artifact integrity.
- Give each export artifact/copy stable export identity, artifact contract
  version, destination owner reference, and terminal production settlement
  distinct from later delivery settlement.

## Explicit Exclusions

- Export as deletion or backup.
- Provider-native transcript ownership.
- Destination delivery transport, owned by EC-016 when an export is delivered.
- Cross-owner obligation and retained-exception semantics, owned by EC-030.

## Required Outcomes

- Export identifies the exact source generation.
- Export production is replay-safe by export identity and source generation.
- Backend-delegated omissions are explicit.
- Reset, fork, archive, and export remain distinct operations.
- Omission, expiry, and retained-exception vocabulary is consumed from EC-030.

## Dependencies

- EC-001, EC-015, and EC-030.

## Proof and Deletion Gate

- Export one branched session with an explicit omission.
- Delete ambiguous "session file" assumptions.
- Disprove the separate contract if the session owner already exposes
  generation-bound branching, reset/archive distinctions, and replay-safe
  export-copy identity without file-based inference.
