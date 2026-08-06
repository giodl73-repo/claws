# Identity, Authority, and Trust

## Architectural Goal

Make every consequential action attributable to a distinct identity, bounded
authority, and current trust generation.

## Responsibilities

- Represent human, service, agent, plugin, provider, host, and device identity.
- Bind credentials without exposing secret material.
- Evaluate policy and bounded approval.
- Establish pairing, delegation, impersonation, and revocation relationships.
- Project authority consumed by an actual runtime invocation.

## Explicit Non-Ownership

- Identity does not imply authority.
- Capability advertisement does not imply permission.
- Authentication does not imply approval.
- This lane does not own tool, provider, channel, or node effect semantics.

## Conceptual Pieces

| Piece | Purpose | Owner expectation |
| ----- | ------- | ----------------- |
| Principal identity | Stable actor attribution | Issuer and renewal remain explicit |
| Credential binding | Resolve secret reference for a bounded consumer | Secret owner controls refresh and rotation |
| Policy decision | Permit, deny, or constrain an operation | Policy owner retains semantics |
| Approval | Human or delegated authorization for bounded intent | Correlates to consumed invocation |
| Trust relationship | Pairing, delegation, host, or plugin trust | Generation and revocation are explicit |
| Authority evidence | Disclosure-safe decision and use record | Does not retain raw credentials or parameters |

## Core Contracts

- Authority binds principal, operation, scope, constraints, generation, and
  expiry.
- Runtime consumers reject superseded credential, policy, pairing, or approval
  generations.
- Delegation carries narrower or equal authority and independent lineage.
- Revocation affects future binding and exposes unsettled in-flight work.

## Quality Attributes

- Least privilege, explicit renewal, redaction, and non-repudiation where
  required.
- Offline/local identity remains possible.
- Federation is additive rather than mandatory.
- Decisions remain explainable without exposing secrets.

## Candidate Fit

| Need | Existing or adjacent candidate | Initial disposition | What must be proven |
| ---- | ------------------------------ | ------------------- | ------------------- |
| Credential profiles | Current credential/auth-profile owners | Adapt | Generation and invocation binding |
| Policy decisions | Policy project and tool policies | Adapt | Common decision evidence without common semantics |
| Approval | Existing approval flows | Adapt | Approval survives into effect evidence |
| Device trust | Pairing generation | Reuse/adapt | Revocation and invocation correlation |
| Enterprise federation | External identity and secret providers | Assess | Local removability and bounded mappings |

## Cross-Lane Dependencies

- Serves every mutation and effect lane.
- Depends on protocol integrity and owner-native identities.
- Must not become a universal identity record for all owner objects.
