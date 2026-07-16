## Opportunity

Agent Skills can describe reusable work, but businesses also need a simple answer after the work runs: **what actually happened, where did it happen, and what evidence came back?**

This first slice gives OpenClaw a durable outcome primitive. A trusted tool can attach a typed receipt such as `case.resolved`, `inventory.sent`, or `payment.authorized` to a successful result. OpenClaw adds the trusted run and thread correlation, stores the full record once, and makes it easy to find or count later.

```ts
return {
  content: [{ type: "text", text: "Payment authorized." }],
  details: {},
  receipts: [
    {
      type: "payment.authorized",
      subject: { type: "invoice", id: "INV-1042" },
      data: { authorizationCode: "AUTH-9482" },
    },
  ],
};
```

```bash
openclaw receipts --type payment.authorized --json
openclaw receipts --type case.resolved --count
openclaw receipts --id <RECEIPT_ID>
```

For a support inbox, the existing channel thread remains the case history while `case.resolved` provides a small, searchable index over completed work. The same primitive works for inventory, billing, onboarding, fulfillment, or any other producer-owned outcome type. It does not require OpenClaw to understand those business schemas.

## What this slice proves

- `AgentToolResult.receipts` is a small producer-facing contract for typed business evidence.
- Receipts are admitted only from successful, sanitized tool results. A malformed optional field rejects that receipt as a whole.
- OpenClaw supplies receipt id, time, agent, session, run, tool, and tool-call correlation; producers cannot assert those trusted fields.
- One configurable local SQLite store is shared by agents served by the Gateway host. The default is `~/.openclaw/state/receipts.sqlite`.
- The store supports idempotent record, get by id, exact-filter list, stable pagination, and count without materializing receipt data.
- Exact type, subject, agent, session, run, invocation, skill, and tool dimensions are indexed or queryable for later managed-skill and workflow slices.
- The trajectory records only an `audit.receipt.recorded` reference. Full evidence such as `AUTH-9482` remains in the receipt store instead of being copied into every trajectory.
- Recording failures are contained and do not rewrite a completed tool result. SQLite lock waits on the result path are bounded to 50 ms.

The implementation reuses current OpenClaw primitives: the sanitized private tool-result observer already shared by OpenClaw, Codex, and Copilot harnesses; native session/run identity; the trajectory recorder; config schema metadata; Node SQLite through Kysely; WAL, private-file, transaction, and user-version helpers; and lazy CLI registration.

## Storage boundary

Version 1 is a single-host local SQLite profile. A deployment may configure another **local** path, but direct network-filesystem and multi-host SQLite sharing are outside this slice. The store boundary leaves room for a later remote provider without changing receipt producers or workflow results.

Receipt data has a different lifecycle from metadata-only activity audit rows and conversation transcripts, which is why this proof uses a dedicated database. Production retention, snapshot backup/export, store health diagnostics, and remote query authorization remain explicit follow-up work rather than hidden behavior in this PR.

## Natural path to workflows

This is the first stepping stone, not a workflow language. Once a durable outcome can be recorded and resolved by id, later slices can add:

1. portable `SKILL.md` declarations for intended outcomes and possible child skills;
2. managed skill invocation with exact executed-skill identity and parent/child lineage;
3. workflow steps that consume recorded outcomes rather than model prose;
4. normalized run token usage, captured cost, and caller-owned budget enforcement.

Simple composition can stay in OpenClaw. Advanced retries, approvals, structured input, and durable resume can continue to use Lobster through the same receipt and accounting contracts.

## Boundaries

This proof does not add a CRM, payment ledger, workflow engine, model-prose inference, skill invocation, token accounting, cost attribution, budget enforcement, retention policy, remote store, or compliance attestation. It establishes the durable evidence and query seam those features can reuse.

## Validation

- 16 focused receipt, store, command, trajectory, and backend-composition tests pass.
- 349 existing OpenClaw, Codex, and Copilot tool-result observer tests pass.
- 32 config help and generated-baseline tests pass.
- 21 CLI registration/help tests pass.
- Production and root-test TypeScript checks pass.
- Full lint, formatting, runtime import-cycle, config-baseline, i18n glossary, and docs-link checks pass; 6,038 internal links were checked.
- Real CLI smoke: `openclaw receipts --help` and an empty exact-type JSON query succeed against a temporary state directory.
- The aggregate `pnpm check` reaches a current-base shrinkwrap preflight failure for the root package, `extensions/llama-cpp`, and `extensions/twitch`; this branch does not change those files. The remaining relevant gates above were run directly.
- Two fork-only CI jobs lack upstream secrets: `auto-response` cannot create its GitHub App token, and the Linux companion successfully compiles and bundles before signing fails without `TAURI_SIGNING_PRIVATE_KEY`. These are fork infrastructure rather than branch failures; the separate real-behavior proof passes.

**Real behavior:** a successful `payment.authorized` result retains invoice `INV-1042` and authorization code `AUTH-9482` in the configured shared store; exact-type list and count can find it; get-by-id returns the full evidence; the trajectory reference contains no receipt `data`; replay with equivalent JSON in a different key order is idempotent; failed or structurally malformed results produce no success receipt.

No live payment, inventory, CRM, or other external business system was mutated.

## Auditable Skills series

1. [RFC 0022 - Auditable Skills](https://github.com/giodl73-repo/rfcs/pull/6)
2. **OpenClaw #97 - core durable outcome receipts**
3. [OpenClaw #98 - managed skill runs](https://github.com/giodl73-repo/openclaw/pull/98)
4. [OpenClaw #100 - managed run results](https://github.com/giodl73-repo/openclaw/pull/100)
5. [OpenClaw #109 - exact-run token usage](https://github.com/giodl73-repo/openclaw/pull/109)
6. [Lobster #1 - accounting continuity prototype](https://github.com/giodl73-repo/lobster/pull/1)

Depends on RFC 0022. Draft fork proof for maintainer review; nothing is proposed to `openclaw/openclaw` by this PR.

Head `738ca6d79d3`; 32 files, 1,489 additions, 27 deletions.

## Current continuation

The compact fork series now continues through [#109](https://github.com/giodl73-repo/openclaw/pull/109), which retains cumulative usage on the exact native managed run, and [#113](https://github.com/giodl73-repo/openclaw/pull/113), which deduplicates explicit completed run IDs and applies an optional caller-owned between-step token ceiling. This PR's scope is unchanged; the later slices build on its native boundary without adding a second execution, usage, or budget ledger.
