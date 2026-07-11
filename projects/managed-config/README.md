# Managed Configuration Project

Use this area to turn the Managed Configuration RFC into an OpenClaw contract
that replaces Lobster's baked configuration, ordered writers, environment
rewrites, and stale generated-value cleanup.

## Objective

Prove that OpenClaw can compose one host-managed document and one operator
document through the existing schema, enforce field ownership and bounded
strictness, publish one transactional effective configuration, and let Lobster
delete its parallel config machinery.

## Active Notes

| Area | File |
| --- | --- |
| Current session and resume state | `SESSION.md` |
| Approved original deliverable | `../layering-contracts/managed-configuration-deliverable.md` |
| Lobster config writer audit | `../layering-contracts/inventory/config-writers-2026-07-10.md` |
| Host/operator fit assessment | `../layering-contracts/inventory/host-operator-config-fit-2026-07-10.md` |
| Portfolio deletion ledger | `../layering-contracts/lobster-deletion-ledger.md` |

## Active Work

| Repo | PR | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| `giodl73-repo/rfcs` | [Fork PR 1](https://github.com/giodl73-repo/rfcs/pull/1) | `user/giodl/rfc-managed-configuration` at `3068754` | Draft, fork-only | Architecture review before upstream submission. |
| `bic/lobster` | TBD | `user/giodl/layering-contract-audit` | Evidence | Classify baked leaves and quantify removable writers/env keys. |
| `openclaw/openclaw` | TBD | New isolated worktree | Discovery | Audit config loading, schema metadata, effective snapshots, validation, and mutation APIs. |

## Delivery Gates

1. Classify every Lobster-generated leaf as host-owned, operator-owned,
   bounded, plugin-owned, or obsolete.
2. Build representative managed and operator documents from real Lobster
   deployments.
3. Prove semantic equivalence with today's effective config without post-seed
   writers.
4. Prove conflict findings, transactional reload, stale-write rejection,
   provenance, redaction, and stable identity.
5. Establish durable Lobster ownership for operator configuration.
6. Stage the Lobster deletion PR and minimum OpenClaw release gate.

## Boundaries

OpenClaw owns schema, composition, authority, validation, and effective config.
Lobster owns managed values, tenant/operator input storage, rollout, and admin
UX. The optional Policy plugin may reuse comparators but is not an enforcement
dependency.

## Related Areas

- `projects/layering-contracts/README.md`
- `projects/hosting-profiles/README.md`
- `projects/config-admin/README.md`
- `projects/policy/README.md`
