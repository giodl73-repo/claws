# Lobster Canonical Runtime Inventory Adopter Review

Date: 2026-07-27

## Frame

Prove OpenClaw PR 175 with a real external plugin without importing the old
hosted-readiness implementation or its credential and dispatch prerequisites.
Lobster owns the five criterion results; OpenClaw owns registration,
sanitization, inventory projection, and operator selection.

## Audit And Simplification

Old Lobster PR 37 is stacked on credential materialization and provider
traffic/dispatch experiments. Three of its five `True` results depend on those
packages. Reusing that stack would falsely make them prerequisites of PR 175.

PR 49 instead starts from standalone host-bundle proof PR 32 and reports all
five contributions as `Unknown`, matching the inert plugin's actual state. It
adds no credential, traffic, dispatcher, carrier, status, health, or startup
authority.

## Evidence Slice

- Lobster fork draft PR 49, head `c4bf85b7ff`.
- OpenClaw fork draft PR 175, exact head `6e51687283c`.
- Five canonical same-plugin manifest references.
- Five plugin-owned inactive readiness registrations.
- One production OpenClaw inventory projection.
- One explicit operator-required selection proof.
- One failed-registration transaction rollback proof.
- One self-contained plugin-bundle regression gate.

The exact proof reports one `lobster/host` bundle, five `Unknown`
contributions, required selection of `plugin.lobster-host.capi-ready`, and
successful rollback cleanup.

## Review Findings

- Accepted: the generic transpiler made the deployed entry import a
  repository-only deployment JSON path. Replaced it with a dedicated esbuild
  bundle and added a regression test against repository-parent imports.
- Rejected: a later review claimed the in-memory manifest drops
  `readinessCriterion`. `defineLobsterContributionManifest` freezes
  `{ ...entry }`, preserving the field, and the six-test suite directly asserts
  the complete projection.

## Verification

- `just openclaw-host-plugin-test`: 6/6 passed.
- Focused `lobster-host-provider` deployment-contract test passed.
- `just rust-fmt-check` passed.
- `git diff --check` passed.
- Exact cross-repo runtime proof passed at both committed heads.

## Promotion State

PR 49 is a clean, mergeable fork draft with no attached checks. Required
`GitOps/GitHubPop` and `Lobster-Runtime-PullRequest` contexts are therefore
missing, not green. They were not manually queued. No OpenClaw issue or
upstream PR is authorized.
