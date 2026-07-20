# Auditable Skills Lobster plugin POC

Date: 2026-07-19

## Thesis

A Lobster-bundled OpenClaw plugin can prove that an agent can complete one
trusted business operation and later retrieve or count its typed outcome,
without requiring a new OpenClaw core API or a workflow engine.

The thesis is disproved if the return authorization code cannot be recovered
from a fresh database connection by exact receipt type, subject, receipt ID, or
session without rereading conversation prose.

## Evidence slice

- Repo/worktree: `C:\src\lobster-auditable-skills-poc`
- Branch: `user/giodl/auditable-skills-lobster-poc`
- Commit: `26398a247` (`feat(openclaw): add auditable skills plugin proof`)
- Base: `user/giodl/scout-catalog-node-prompt` at `8471b690a`
- Plugin: `src/openclaw_container/plugins/auditable-skills`
- Baked state: bundled and allowlisted, but `entries.auditable-skills.enabled`
  remains `false`.

The plugin provides `authorize_return`, `receipts_search`, and
`receipts_count`. Its companion skill declares
`metadata.outcomes: "return.authorized"`. The trusted tool directly records a
canonical producer receipt in configurable
`~/.openclaw/state/receipts.sqlite`; model prose and the declaration do not
record evidence.

## Proof

`just auditable-skills-plugin-test` passes six cases:

- authorization issuance and recovery by subject and receipt ID;
- replay of the same source identity without duplication;
- rejection when the same source identity is reused with different input;
- exact counts across two sessions;
- malformed input creates no success receipt;
- tool contracts and portable skill outcome metadata remain packaged.

The same recipe passes Lobster's strict code-mode container wiring guard.
`just openclaw-container-fmt-check` passes with the installed stable Rust
toolchain. The full plugin runner is locally blocked by missing `tsx`; the full
OpenClaw Rust test recipe is locally blocked by missing Lobster Cargo registry
credentials.

## Boundaries and migration

- This is a local proof authorization, not an external returns integration.
- The plugin records only its own operation; it does not intercept arbitrary
  tools or harnesses.
- The local receipt store is not a CRM, workflow state machine, compliance
  ledger, or multi-host service.
- Enabling the query tools grants agents allowed to call them access to the
  shared POC store; host authorization is a Receipt Core migration concern.
- Migration deletes the plugin recorder, retains the producer receipt and
  skill declaration, and points the query experience at OpenClaw's canonical
  receipt store/API.

The runtime/operator/simplicity/security review kept the slice in-process,
disabled by default, bounded to exact queries, idempotent under replay, and
explicit about sensitive shared-store access. It adds no sidecar or service.
