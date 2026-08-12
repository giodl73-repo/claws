Related: #115375

## Summary

Publishes the existing Gateway-to-node `node.invoke.cancel` payload as the
shared `NodeInvokeCancelEventSchema` / `NodeInvokeCancelEvent` contract. The
required wire fields remain `{ invokeId, nodeId }`; protocol versions and
runtime behavior are unchanged.

The Gateway producer, TypeScript node-host consumer, generated registry, and
live Swift `GatewayNodeSession` now consume that same contract. This is the
narrow cancellation-schema slice needed by cross-language node runtimes,
including the Rust series described in [RFC #54](https://github.com/openclaw/rfcs/pull/54).

## Scope

- exports and registers the closed cancellation-event schema;
- updates the Gateway producer and first-party TypeScript consumer;
- regenerates the Swift model and decodes it in the live Swift node session;
- adds fixtures requiring both non-empty identifiers; and
- documents the published payload.

This PR does not add a new cancellation mechanism, alter request/response
commands, or bundle the broader Rust runtime stack.

## Validation

At head `3cac3e4a3aa`:

- focused node-schema Vitest tests — 2/2 passed;
- `pnpm protocol-registry:check` — passed;
- `pnpm protocol:check:swift` — passed; and
- `git diff --check` — passed.

The branch was rebased onto current `main`; the obsolete schema registry from
the earlier base was adapted to the current fragment registry and explicit
root exports rather than restored.

AI-assisted: Codex was used for source audit, implementation, rebase conflict
resolution, tests, and review. I reviewed the resulting contract and diff.
