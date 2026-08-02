# RFC Scope: Artifact Trust and Provenance

- ID: EC-028
- Lane: Extensibility, artifacts, and release
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Artifact/install owners

## Scope

- Define immutable artifact identity, integrity, provenance, admission,
  compatibility, revocation, installation result, and trust evidence.
- Evaluate trust requirements declared by EC-027.
- Define portable cross-source revocation identity and a signed revocation
  statement containing authority, artifact digest, scope, reason, and time.

## Explicit Exclusions

- One marketplace as universal trust owner.
- Artifact trust as runtime authorization.

## Required Outcomes

- Mirrors and promotion preserve identity.
- Missing, unknown, unverifiable, invalid, or revoked required trust fails
  admission before activation.
- Revocation and retained installations are visible.
- Revoked artifact identity is refused consistently across supported source
  families.
- Existing install records migrate to immutable identity/provenance without
  long-lived name-based dual authority.
- Artifacts without EnterpriseClaw-specific trust metadata remain installable
  under baseline OpenClaw/local rules unless a governed profile explicitly
  requires trust evidence.
- Admission evidence records artifact, requirements, authority, time, result,
  and retained installation state.

## Dependencies

- EC-004 and EC-027.

## Proof and Deletion Gate

- Admit one trusted artifact; reject invalid, unknown/unverifiable, and revoked
  artifacts.
- Delete install paths that rely only on mutable package names.
- Disprove the separate contract if existing install/admission owners already
  provide immutable artifact identity, provenance, revocation, and
  cross-source trust refusal without name-based authority or a new trust
  abstraction.
