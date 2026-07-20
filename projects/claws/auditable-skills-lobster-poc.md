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
- Draft PR: [bic/lobster#5211](https://microsoft.ghe.com/bic/lobster/pull/5211)
- Commit: `9df86837c` (`feat(openclaw): add auditable skills plugin proof`)
- Base: `user/giodl/scout-catalog-node-prompt` at `e39a2998e`
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

### OpenClaw host proof

The committed Lobster plugin was also copied byte-for-byte into a temporary
WSL directory and loaded through OpenClaw's real plugin loader and agent tool
resolver from `/root/src/openclaw-audit-receipts` at `ff4b4a86057`.
The loader was bounded to `onlyPluginIds: ["auditable-skills"]`; OpenClaw
loaded one plugin with three registered tool entries, and its optional-tool
policy exposed only the tool explicitly selected for each run.

Two separate Node processes shared one temporary `receipts.sqlite`:

1. Agent context `returns-agent` / `email:return-1001` resolved and executed
   `authorize_return`, recording `return.authorized` for `RET-1001` with
   authorization code `RMA-2C7A27324C`.
2. After that process exited, agent context `audit-agent` /
   `ops:audit-review` independently resolved `receipts_search` and recovered
   the same receipt, source session metadata, and authorization code using
   exact receipt-type and subject filters.

The temporary store directory was mode `0700` and the SQLite database was mode
`0600`. This proves discovery, optional-tool selection, trusted agent/session
context capture, durable recording, and fresh-process recovery at the actual
OpenClaw plugin boundary. It does not claim LLM tool-choice behavior or an
external returns-system authorization.

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

## Publication

Draft Lobster PR #5211 is stacked on Scout PR #4297. After the Scout branch was
force-updated, the single POC commit was rebased onto its current head and the
two overlapping wiring guards were resolved by retaining both Scout and
Auditable Skills coverage. The focused six-case test, strict container wiring
guard, stable Rust formatting check, and diff check all passed again at
`9df86837c`. GitHub reports the draft mergeable and clean. The required Lobster
runtime checks are not yet all attached and green; no ADO pipeline was manually
queued.
