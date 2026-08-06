# Managed Configuration Project

Use this area to turn the Managed Configuration RFC into an OpenClaw contract
that replaces Lobster's baked configuration, ordered writers, environment
rewrites, and stale generated-value cleanup.

## Objective

Prove that OpenClaw can compose one host-managed document and one operator
document through the existing schema, enforce field authority and bounded
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
| Current RFC PR body                     | `rfc-pr-34-body.md`                                                      |
| Current OpenClaw implementation PR body | `openclaw-pr-107026-body.md`                                             |

## Active Work

| Repo                    | PR                                                             | Branch                                                          | Status              | Purpose                                                                                                    |
| ----------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `openclaw/rfcs`         | [Draft PR 34](https://github.com/openclaw/rfcs/pull/34)        | `user/giodl/rfc-managed-config-rfc-only` at `5b33475`           | Maintainer review   | RFC 0019 plus normative V1 sidecar; clean, mergeable, and explicit about owners, authority, and lifetimes. |
| `openclaw/openclaw`     | [PR 107026](https://github.com/openclaw/openclaw/pull/107026)  | `user/giodl/managed-config-upstream` at `409fab999c4`           | Rebase required     | Ordered immutable config layers; prior exact-head gates passed, but current main conflicts.                |
| `giodl/lobster`         | [Draft PR 12](https://microsoft.ghe.com/giodl/lobster/pull/12) | `user/giodl/managed-config-lobster-simple` at `0d37e2a34b`      | Fork-only validated | Opt-in six-file adapter; canonical formatting and all four focused managed-config tests pass.              |
| `bic/lobster`           | TBD                                                            | `user/giodl/layering-contract-audit`                            | Evidence            | Classify baked leaves and quantify removable writers/env keys.                                             |
| `giodl73-repo/openclaw` | [Fork PR 44](https://github.com/giodl73-repo/openclaw/pull/44) | `user/giodl/managed-config-local-files` at `0fb89d90963`        | Reviewed, fork-only | Concrete local sources and primary persistence.                                                            |
| `giodl73-repo/openclaw` | [Fork PR 60](https://github.com/giodl73-repo/openclaw/pull/60) | `user/giodl/managed-config-gateway-controller` at `db211f61727` | Reviewed, fork-only | Internal read-only Gateway controller and exact snapshot handoff.                                          |
| `giodl73-repo/openclaw` | [Fork PR 61](https://github.com/giodl73-repo/openclaw/pull/61) | `user/giodl/managed-config-gateway-bootstrap` at `0a263762463`  | Reviewed, fork-only | Opt-in ordered CLI layers at the pre-migration Gateway bootstrap boundary.                                 |
| `giodl73-repo/openclaw` | Not filed                                                      | `user/giodl/managed-config-simple-v1` at `1deea3a0d8d`          | Reviewed, fork-only | Reauthored pure ordered composer with effective tool-policy bounds; current delivery-stack base.           |
| `giodl73-repo/openclaw` | Not filed                                                      | `user/giodl/managed-config-simple-gateway` at `37e8bfc649d`     | Reviewed, fork-only | Thin repeatable CLI loader, native validation/snapshot startup, and explicit read-only V1 boundary.        |
| `giodl73-repo/openclaw` | Not filed                                                      | `user/giodl/managed-config-simple-docs` at `4051bebb958`        | Reviewed, fork-only | Opt-in contract, diagrams, lifecycle limits, and realistic Lobster three-layer example.                    |

## Delivery Gates

1. Obtain maintainer agreement that OpenClaw owns field semantics, composition,
   authority admission, and the accepted runtime snapshot.
2. Rebase PR 107026 onto current main and rerun the normative V1 conformance
   map, focused tests, type/lint, and foreground lifecycle proof.
3. Prove the Lobster adapter with complete, securely materialized global,
   tenant, and operator sources against a released conformant OpenClaw build.
4. Compare the composed effective config with representative current Lobster
   deployments and prove conflict and immutable-lifecycle behavior.
5. Delete the baked overlay writer and stale-value cleanup behind a bounded
   rollout and rollback gate.

## Boundaries

OpenClaw field owners retain schema meaning, defaults, validation, runtime
behavior, and bounded comparators. OpenClaw config bootstrap derives field
authority and the Gateway config lifecycle owns the accepted snapshot. Lobster
owns desired values, source materialization and order, tenant/operator storage,
rollout, and admin UX. Layer ids are labels, not principals. The optional Policy
plugin may consume findings but is not an enforcement dependency.

## Related Areas

- `projects/hosted-integration/managed-configuration-alignment.md`
- `projects/layering-contracts/README.md`
- `projects/hosting-profiles/README.md`
- `projects/config-admin/README.md`
- `projects/policy/README.md`
