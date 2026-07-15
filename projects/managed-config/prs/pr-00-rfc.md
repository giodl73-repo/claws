# PR 0: RFC 0019

## Objective

Establish the generic managed-configuration contract before production wiring.

## Repository and branch

- Repository: `openclaw/rfcs`
- Branch: `user/giodl/rfc-managed-config-rfc-only`
- Upstream draft: `openclaw/rfcs#34`

## Deliverable

- One file: `rfcs/0019-managed-configuration.md`.
- Ordered recursive layers with no built-in roles.
- Exact authored-value authority.
- Effective validation after composition.
- Source identity, access, provenance, findings, and atomic activation.
- Architecture diagrams and the complete Lobster allowed-origins example.
- Small-PR implementation and host-deletion sequence.

## Review questions

- Is authored-value identity the right exact-authority boundary?
- Is an explicit external source list preferable to an ordinary config key?
- Are source access and authority sufficiently independent?
- Is exact-only V1 enough to support the Lobster deletion target?

## Exit criteria

- Maintainers agree the model belongs in core rather than a plugin or host.
- No fixed host/operator/tenant roles remain in the contract.
- PRs 1-5 have explicit delivery boundaries, including bounded authority.

## Non-goals

- No production code.
- No final CLI spelling.
- No first-release bounded comparator commitment.
