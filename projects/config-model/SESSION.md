# OpenClaw Config Model Session Context

## Agent Start

1. Read this file.
2. Read `README.md`, `source-audit.md`, and `slice-1-read-only-model.md`.
3. Check the LobsterClaw proof worktree.
4. Read the Managed Configuration session before adding writes.

## Baseline

- Area: OpenClaw Config Model.
- Owner runtime: OpenClaw.
- Delivery substrate: LobsterClaw pinned generation.
- Proof worktree: `C:\src\lobsterclaw-config-model-proof`.
- Branch: `user/giodl/config-model-proof` at `a03889e2eb`.

## Current Session

- Last updated: 2026-08-15.
- Last agent: GitHub Copilot CLI.
- Current focus: prove a read-only framework-neutral Config Model on the
  current LobsterClaw 2026.6.33 generation.
- Active branch / PR: local fork-only branch; no PR.
- Result: added `@openclaw/gateway-client/model/config` with immutable
  snapshots, explicit refresh, read-scoped schema lookup, malformed-response
  rejection, disposal fencing, four focused tests, and package build proof.
- Known dirty state: proof worktree is clean at `a03889e2eb`. `claws-hapi`
  contains unrelated pre-existing changes.
- Blocking question: governed writes require Managed Configuration authority,
  provenance, preview, generation, and transactional activation contracts.

## Resume Checklist

- Review the read-only model API and naming.
- Add package acceptance/import proof.
- Decide whether Control UI or a small Lobster adapter is the first adopter.
- Do not add `config.set`, `config.patch`, or `config.apply` commands until the
  writable-source and preview contract exists.
- Rebase or reconstruct the proof as an ordered LobsterClaw patch only after
  the model shape is accepted.

## Guardrails

- OpenClaw owns schema meaning, defaults, validation, effective values, and
  runtime activation.
- Lobster owns product UX, tenant/operator storage, rollout, and source
  materialization.
- Do not infer per-field authority from UI visibility or coarse admin scopes.
- Never expose unredacted secrets through the model.

## Open Threads

- Add descriptor caching and schema-version invalidation.
- Add source provenance and lock reasons from Managed Configuration.
- Define candidate preview, findings, diff, conflict, generation, commit, and
  activation status.
- Pick the first native Lobster settings page after the read-only contract is
  reviewed.

