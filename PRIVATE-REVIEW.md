# Standalone Claws Private Review

This repository privately proves the harness-neutral command shape:

```text
npx <selected-package> <claw> --agent openclaw
```

It has no remote, public package identity, publishing configuration, or claim
on the unscoped `claws` name.

## Implemented

- Independent portable Claw v1 parser and normalized inspection result.
- Local package and exact immutable ClawHub source resolution.
- Bounded archive extraction, package identity checks, and artifact integrity.
- OpenClaw preview delegation through its public JSON CLI.
- Explicit apply consent bound to the exact reviewed `planIntegrity`.
- Private content-addressed snapshot cache with expiry, size limits, and
  cross-process serialization.
- Structured propagation of native plans, blockers, partial outcomes, runtime
  incompatibility, missing Claws support, and invalid host configuration.
- Ungated `--help` and `--version`; all functional commands remain behind
  `OPENCLAW_EXPERIMENTAL_CLAWS`.
- Repeatable private tarball, offline install, npm-bin, and real OpenClaw proof.

OpenClaw remains authoritative for host policy, capability consent, mutation,
provenance, update, status, doctor, and removal. The standalone CLI does not
import OpenClaw implementation modules or reproduce those policies.

## Private Proof

```bash
pnpm proof:private
```

Set `OPENCLAW_CLI_ENTRY` to include a real OpenClaw dry-run through the packed
binary. That lane uses disposable home, state, and config paths.

Current evidence:

| Surface    | Evidence                                                                |
| ---------- | ----------------------------------------------------------------------- |
| Windows    | Full checks plus offline pack/install/bin inspection                    |
| Linux/WSL2 | Packed npm bin delegated a real current-OpenClaw preview                |
| Lifecycle  | Stale consent rejected; apply/status/remove ended with empty provenance |
| macOS      | Pending access to an existing macOS host; no paid host was provisioned  |

## Decisions For Public Incubation

1. Repository owner and final repository name.
2. Scoped npm identity and whether to pursue the unscoped `claws` transfer.
3. Executable name during experimental and stable phases.
4. Governance/versioning owner for the portable parser and conformance fixtures.
5. Default production ClawHub endpoint and compatibility policy.
6. Whether OpenClaw's existing experimental gate also gates the standalone CLI
   through public incubation.

Only after those decisions should the repository gain public metadata, trusted
publishing, provenance, a public CI matrix, or launch documentation.

## Separate Follow-Ups

- A broad `awesome-claws` collection with contribution validation.
- A Hermes adapter designed and proven with Hermes maintainers.
- Stable-v1 governance and compatibility commitments.
