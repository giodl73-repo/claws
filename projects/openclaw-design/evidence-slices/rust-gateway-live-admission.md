# Rust Gateway Live Admission

## Frame

- **Working owner system**: the current TypeScript Gateway owns protocol
  negotiation, device authentication, node pairing, capability-surface
  approval, registration, and `hello-ok`.
- **Missing evidence**: the earlier Rust validator was pinned to protocol 1 and
  never crossed the current live Gateway boundary.
- **Thesis**: a clean-built Rust process can complete the current authenticated
  node handshake with an owner-approved empty capability surface, while an
  obsolete protocol offer fails closed.
- **Deletion target**: none yet. Admission alone does not justify deleting the
  TypeScript node host or any Gateway path.
- **Disproof**: reject the slice if it bypasses owner pairing, embeds reusable
  credentials in evidence, declares commands, executes an invocation, or
  treats `hello-ok` as readiness or Rust authority.

## Audit Result

Current Gateway protocol is 4 and authenticated node N-1 support starts at 3.
The Gateway emits `connect.challenge`; device-v3 proof signs the exact
lowercase-normalized payload containing device identity, client identity,
role, scopes, timestamp, device token, nonce, platform, and device family.
Node admission also consumes the current device token and an approved node
capability surface.

The old `C:\src\openclaw-rust-node` protocol-v1 validator is therefore retained
as historical evidence only. It is not current conformance proof.

## Bounded Slice

Controlled-fork PR:
`https://github.com/giodl73-repo/openclaw/pull/222`

- source head: `0679dace040ade395c9a2c2f739abd57ff9cf883`
- merged commit: `3010349dca462492420ba4a1233d0d65c512b5a9`
- fixture: `lobster.rfn.rust-gateway-live-admission.v1`
- Rust executable:
  `experiments/rust-gateway-live-admission/src/main.rs`
- owner-side proof:
  `src/gateway/rust-gateway-live-admission.e2e.test.ts`

The test creates an ephemeral Ed25519 identity, obtains an owner-issued node
device token, approves an empty node capability surface, starts a loopback
Gateway, clean-builds Rust into a fresh test-owned Cargo target, and executes
that exact binary.

## Results

| Lane | Result |
| --- | --- |
| Current protocol 4 | Authenticated `hello-ok`; role `node`; scopes `[]`; commands `[]` |
| Obsolete protocol 1 | Structured `INVALID_REQUEST` with `PROTOCOL_MISMATCH` |
| Disclosure | Public identity and stored identity contain no device token; executable never emits the private key |
| Authority | `none` |

Independent review found that ambient `CARGO_TARGET_DIR` could disconnect the
built artifact from the executed path and that a repository-local Cargo
`target` tree was unignored. Both were corrected before publication.

Exact-head CI produced 143 successes. Remaining failures were established
controlled-fork infrastructure blockers: missing GitHub App private key,
unchanged-base advisories in `brace-expansion`, `fast-uri`, `nanoid`, and
`undici`, and derivative `openclaw/ci-gate`. OpenGrep remained queued without a
runner. No comments or reviews appeared.

## Claims Not Proven

- invocation execution or effect authority;
- runtime readiness;
- Rust-owned state or restart recovery;
- canary selection or no-dual-dispatch routing;
- migration, release, update, downgrade, or rollback;
- operational budgets; or
- TypeScript deletion.

## Cheapest Next Test

Teach the same Rust process to consume one owner-admitted, side-effect-free
node invocation such as `system.which`, bind the request and result to the
current connection and pairing generations, and prove one structured
unsupported-command refusal. Keep selection and authority with the TypeScript
Gateway; do not claim an effect-owning Rust canary yet.
