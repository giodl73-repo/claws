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
- Current focus: adopt the read-only Config Model in one native Lobster
  settings category without moving Gateway authority into React.
- Active branch / PR: `user/giodl/config-model-lc1` at `cb71803d68`; local
  fork-only branch, no PR.
- Result: carried `@openclaw/gateway-client/model/config`, added a main-process
  presentation-safe adapter and typed IPC/service port, and rendered default
  model, agent workspace, and gateway mode with schema help and reload impact.
  Final review fixes use the union-safe model descriptor path, label authored
  versus inherited values accurately, and scope renderer caching by Gateway
  principal. Final code review is clean.
- Known dirty state: the committed adopter is complete. Dependency restoration
  left uncommitted formatting-only agent-file and lockfile churn outside the
  commit. `claws-hapi` contains unrelated pre-existing changes.
- Blocking question: governed writes require Managed Configuration authority,
  provenance, preview, generation, and transactional activation contracts.

## Resume Checklist

- Review the LC1 native settings evidence and naming.
- Add package acceptance/import proof if this slice is promoted.
- Keep the current native surface read-only.
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
- Decide which additional presentation-safe fields belong in the native page.
