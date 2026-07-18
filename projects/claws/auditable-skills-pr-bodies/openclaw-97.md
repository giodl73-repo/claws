## Opportunity

Agent work often produces a durable business fact: a case was resolved, inventory was sent, or a payment was authorized. Today that fact can disappear into transcript prose or a tool-specific database.

This PR gives OpenClaw one small outcome primitive. A trusted tool attaches a typed receipt to a successful result; OpenClaw adds the session, run, tool, and time it can observe; an authorized operator or later agent can get, list, or count those receipts.

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

For a support inbox, the existing channel thread remains the work history while `case.resolved` becomes a searchable index over completed work. The same contract works for billing, inventory, onboarding, and fulfillment without teaching OpenClaw those business schemas.

## What this changes

- Adds `AgentToolResult.receipts` as a producer-facing contract for typed business evidence.
- Admits receipts only from successful, sanitized tool results. A malformed optional field rejects the whole receipt.
- Adds trusted receipt ID, time, agent, session, run, tool, and tool-call correlation; producers cannot assert those fields.
- Stores the full record once in a configurable local SQLite database shared by agents on the Gateway host. The default is `~/.openclaw/state/receipts.sqlite`.
- Supports idempotent record, get by ID, exact-filter list, stable pagination, and payload-free count.
- Records only a bounded `audit.receipt.recorded` trajectory reference. Evidence such as `AUTH-9482` is not copied into every trajectory.
- Admits at most 16 receipt candidates from one tool result, reports overflow, prepares payloads before taking the SQLite write lock, and commits the accepted batch atomically under one bounded lock wait.
- Initializes the SQLite schema transactionally and contains recording failures so a receipt-store problem cannot rewrite a completed tool result.

The implementation reuses OpenClaw's sanitized private tool-result observer shared by the OpenClaw, Codex, and Copilot harnesses; native session and run identity; trajectory recording; config metadata; Kysely/SQLite helpers; WAL and private-file conventions; and lazy CLI registration.

## Why this boundary is independently useful

This is not workflow scaffolding. It answers a complete product question on its own: **what happened, to what, where, and what evidence came back?** Managed skill identity and run-level token usage may enrich that answer later, but neither is required to record or retrieve receipts.

The dedicated database reflects the different volume, sensitivity, and retention needs of full business evidence. Version 1 is explicitly single-host local SQLite. A deployment may configure another local path; network-filesystem and multi-host SQLite sharing are outside this slice. The producer and query semantics are portable, but this PR does not add a speculative provider interface. Production retention, snapshot/export, and health diagnostics remain explicit follow-up work.

## Boundaries

This PR does not add a CRM, payment ledger, workflow engine, skill invocation, token accounting, cost attribution, budget enforcement, remote store, or compliance attestation. It also does not infer success from model prose.

## Validation

- 20 focused receipt-normalization, SQLite-store, and backend-composition tests pass on the hardening commit, including overflow, pre-lock size rejection, and atomic rollback.
- 349 existing OpenClaw, Codex, and Copilot tool-result observer tests pass.
- 32 config help and generated-baseline tests pass.
- 21 CLI registration/help tests pass.
- The focused core TypeScript check reports only inherited current-base diagnostics in `packages/net-policy` and missing `web-push` declarations; it reports no receipt-change diagnostics.
- Full lint, formatting, runtime import-cycle, config-baseline, i18n glossary, and docs-link checks pass; 6,038 internal links were checked.
- The aggregate `pnpm check` reaches a current-base shrinkwrap preflight failure for the root package, `extensions/llama-cpp`, and `extensions/twitch`; this branch does not change those files.
- Fork-only `auto-response`, label, and companion-signing failures are caused by unavailable upstream secrets. The separate Real behavior proof gate passes.

## Real behavior proof

Behavior or issue addressed:
A successful trusted tool result can record durable typed business evidence that is retrievable and countable without copying its full payload into the session trajectory.

Real environment tested:
Windows checkout on the PR head using the real OpenClaw tool-result observer, receipt store, trajectory recorder, and CLI against a temporary OpenClaw state directory. The business tool and payment identifiers were deterministic fixtures; no external payment, inventory, or CRM system was called.

Exact steps or command run after this patch:
1. Emit a successful `payment.authorized` tool result for invoice `INV-1042` with authorization code `AUTH-9482`.
2. List and count receipts by exact type, then retrieve the recorded receipt by ID.
3. Inspect the matching trajectory reference.
4. Replay equivalent receipt JSON with a different property order, then submit failed and malformed tool results.
5. Run `openclaw receipts --help` and an empty exact-type JSON query against a temporary state directory.

Evidence after fix:
The source-harness transcript on the receipt feature head returned one stored `payment.authorized` receipt containing `AUTH-9482`; exact-type list and count found it; get-by-ID returned the full evidence; the trajectory contained only the bounded receipt reference; equivalent replay returned the same record; failed and malformed results created no success receipt. The hardening commit then passed the real SQLite store and shared observer tests for the same path plus bounded batch behavior. The fork Real behavior proof check passed.

Observed result after fix:
OpenClaw retained one canonical outcome record, made it searchable and countable, preserved its originating session/run correlation, and kept the full producer payload out of the trajectory.

What was not tested:
No live line-of-business system was mutated. Multi-host storage, remote providers, production retention/export, and regulatory attestation are outside this PR.

## Related evidence

- [RFC 0022 - Auditable Skills](https://github.com/giodl73-repo/rfcs/pull/6)
- **OpenClaw #97 - standalone durable outcome receipts**
- [OpenClaw #98 - managed skill identity POC](https://github.com/giodl73-repo/openclaw/pull/98)
- [OpenClaw #100 - managed result POC](https://github.com/giodl73-repo/openclaw/pull/100)
- [OpenClaw #109 - exact-run usage POC](https://github.com/giodl73-repo/openclaw/pull/109)

The later PRs are evidence that receipts can support richer execution accounting. They are not dependencies of this slice and are not the proposed landing stack.

Draft fork proof for maintainer review; nothing is proposed to `openclaw/openclaw` by this PR.

Head `f04293c9153b`; 32 files, 1,673 additions, 27 deletions.
