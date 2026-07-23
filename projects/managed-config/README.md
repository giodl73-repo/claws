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

| Area                                    | File                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------ |
| Current session and resume state        | `SESSION.md`                                                             |
| Approved original deliverable           | `../layering-contracts/managed-configuration-deliverable.md`             |
| Lobster config writer audit             | `../layering-contracts/inventory/config-writers-2026-07-10.md`           |
| Host/operator fit assessment            | `../layering-contracts/inventory/host-operator-config-fit-2026-07-10.md` |
| Portfolio deletion ledger               | `../layering-contracts/lobster-deletion-ledger.md`                       |
| OpenClaw and external comparison matrix | `comparison-matrix.md`                                                   |
| OpenClaw/Lobster source audit           | `source-audit-2026-07-11.md`                                             |
| Cross-role architecture review          | `role-review-2026-07-11.md`                                              |
| Recursive model evaluation              | `recursive-model-evaluation.md`                                          |
| First fork-only evidence slice          | `slice-1-recursive-exact-authority.md`                                   |
| Presence-preserving validation slice    | `slice-2-layer-preparation.md`                                           |
| Layered runtime candidate slice         | `slice-3-runtime-candidate.md`                                           |
| Generic ordered layer sources           | `slice-4-layer-sources.md`                                               |
| Transactional activation adapter        | `slice-5-activation.md`                                                  |
| First Lobster writer deletion proof     | `lobster-allowed-origins-deletion-proof.md`                              |

## Active Work

| Repo                    | PR                                                             | Branch                                                          | Status              | Purpose                                                                                             |
| ----------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------- |
| `openclaw/rfcs`         | [Draft PR 34](https://github.com/openclaw/rfcs/pull/34)        | `user/giodl/rfc-managed-config-rfc-only` at `a189eb9`           | Reopened draft      | RFC 0019; no replacement PR.                                                                        |
| `bic/lobster`           | TBD                                                            | `user/giodl/layering-contract-audit`                            | Evidence            | Classify baked leaves and quantify removable writers/env keys.                                      |
| `giodl73-repo/openclaw` | [Fork PR 44](https://github.com/giodl73-repo/openclaw/pull/44) | `user/giodl/managed-config-local-files` at `0fb89d90963`        | Reviewed, fork-only | Concrete local sources and primary persistence.                                                     |
| `giodl73-repo/openclaw` | [Fork PR 60](https://github.com/giodl73-repo/openclaw/pull/60) | `user/giodl/managed-config-gateway-controller` at `db211f61727` | Reviewed, fork-only | Internal read-only Gateway controller and exact snapshot handoff.                                   |
| `giodl73-repo/openclaw` | [Fork PR 61](https://github.com/giodl73-repo/openclaw/pull/61) | `user/giodl/managed-config-gateway-bootstrap` at `0a263762463`  | Reviewed, fork-only | Opt-in ordered CLI layers at the pre-migration Gateway bootstrap boundary.                          |
| `giodl73-repo/openclaw` | Not filed                                                      | `user/giodl/managed-config-simple-v1` at `1deea3a0d8d`          | Reviewed, fork-only | Reauthored pure ordered composer with effective tool-policy bounds; current delivery-stack base.    |
| `giodl73-repo/openclaw` | Not filed                                                      | `user/giodl/managed-config-simple-gateway` at `37e8bfc649d`     | Reviewed, fork-only | Thin repeatable CLI loader, native validation/snapshot startup, and explicit read-only V1 boundary. |
| `giodl73-repo/openclaw` | Not filed                                                      | `user/giodl/managed-config-simple-docs` at `4051bebb958`        | Reviewed, fork-only | Opt-in contract, diagrams, lifecycle limits, and realistic Lobster three-layer example.             |

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

- `projects/hosted-integration/managed-configuration-alignment.md`
- `projects/layering-contracts/README.md`
- `projects/hosting-profiles/README.md`
- `projects/config-admin/README.md`
- `projects/policy/README.md`
