# Rust Gateway Side-Effect-Free Invocation

## Frame

- **Working owner system**: the TypeScript Gateway owns authentication, node
  pairing, command policy, route selection, pairing generations, invocation
  correlation, and result settlement.
- **Missing evidence**: EVID-015 proved authenticated Rust admission but
  declared no commands and executed no invocation.
- **Thesis**: the admitted Rust process can declare and execute exactly one
  side-effect-free `system.which` command after owner approval, while an
  allowlisted but undeclared command is refused before Rust dispatch.
- **Deletion target**: none. One command does not establish a supported runtime
  profile or justify deleting TypeScript node-host behavior.
- **Disproof**: reject the slice if it bypasses live pairing approval, lacks
  connection or pairing-generation fencing, dispatches the refusal to Rust,
  executes an effect, or claims readiness or Rust authority.

## Audit and Evaluation

Gateway `node.invoke` validates the durable pairing generation and current
connection before `NodeRegistry.invoke` emits `node.invoke.request`. Results
return through `node.invoke.result` with the exact invocation and node
identities. Current TypeScript `system.which` returns `{ bins: { name: path } }`
without running the discovered executable.

The slice reuses these owner seams and adapts only that bounded result contract.
It avoids copying general node-host execution, shell, approval, streaming,
cancellation, or effect behavior. Runtime-owner, operator, and
security/simplicity review kept TypeScript authoritative and required a second
Rust-side unsupported-command guard without treating it as the primary policy.

## Bounded Slice

Controlled-fork PR:
`https://github.com/giodl73-repo/openclaw/pull/223`

- source heads:
  `cfd957696f2a86f8b91cc2f0dfeb0fe5758f2d56`,
  `3d541fcf061f200c5a56d926e29633a9fe3c7306`
- merge commit: `5bfec98e44c1d7ee4fb463f2f5f7b8dd5e171ee9`
- fixture:
  `lobster.rfn.rust-gateway-side-effect-free-invocation.v1`
- published proof:
  `pnpm lobster:rust-gateway-side-effect-free-invocation`

The Rust process completes protocol-v4 device-v3 authentication, declares
`system.which` with signed host metadata, waits while an operator approves the
pending surface through `node.pair.approve`, then settles one live invocation.

## Results

| Lane | Result |
| --- | --- |
| Accepted | One `system.which` request; non-empty `node` path; request and result IDs identical |
| Fencing | Dispatch carries the expected connection ID and pairing generation |
| Refusal | Allowlisted but undeclared `system.notify` returns `INVALID_REQUEST` with `command not declared by node` before `NodeRegistry.invoke` |
| Rust guard | Any unexpected command is also refused locally as `UNSUPPORTED_COMMAND` |
| Effects and authority | No executable is run; side effects `false`; authority `none` |

Exact-head CI produced 123 successes. Remaining failures were established
controlled-fork blockers: missing GitHub App private key for label and
auto-response, unchanged advisories in `brace-expansion`, `fast-uri`, `nanoid`,
and `undici`, and derivative `openclaw/ci-gate`. OpenGrep remained queued
without a runner. No comments or reviews appeared.

## Claims Not Proven

- a general Rust node runtime or complete supported profile;
- effect authority, streaming, deadlines, cancellation, or disconnect truth;
- readiness, restart, reconnect, state, or recovery;
- canary selection, no-dual-dispatch migration, release, rollback, or budgets;
- TypeScript deletion.

## Cheapest Next Test

Prove restart-safe continuity for this bounded profile: reconnect under a new
connection incarnation, refuse a late result from the old connection, and
retain explicit authority `none`. Do not add effect-owning commands yet.
