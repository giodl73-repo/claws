# OpenClaw Rust Node Project

Use this area to coordinate the experimental Rust implementation of the
OpenClaw node-client contract, its headless host, conformance artifacts, and
the first Lobster embedding evidence slice.

OpenClaw remains the protocol and security-policy owner. The Rust project owns
only Rust transport/runtime ergonomics, packaging, release artifacts, and
conformance automation. Lobster is the first intended adopter, not a protocol
owner and not a reason to add product-specific wire fields.

## Active Notes

| Area | File |
| ---- | ---- |
| Session handoff | `SESSION.md` |
| Contract audit and PR plan | `contract-audit-and-pr-plan.md` |
| Node-mode analogue audit and R1-R4 briefs | `node-mode-analogue-audit.md` |
| Official implementation and capability inventory | `official-node-implementation-inventory-2026-07-29.md` |
| Scout Rust overlap audit | `scout-overlap-audit-2026-07-29.md` |
| Tauri/Rust node convergence proposal | `tauri-convergence-proposal-2026-07-29.md` |
| RFC 0028 PR body | `rfc-0028-pr-body.md` |
| OpenClaw foundation PR body | `openclaw-pr1-foundation-body.md` |
| OpenClaw runtime follow-up PR body | `openclaw-pr2-consolidated-body.md` |
| Windows adopter PR body | `windows-pr-1068-body.md` |
| Runnable-node PR body | `openclaw-pr3-body.md` |
| OpenClaw integrations PR body | `openclaw-pr4-body.md` |
| Gateway authority conformance PR body | `openclaw-pr4b-body.md` |
| Earlier Lobster-hosted proposal | `../lobster/openclaw-rust-node-host-proposal.md` |
| Earlier role review | `../lobster/openclaw-rust-node-host-role-review-2026-07-28.md` |

The canonical RFC and discussion brief live in the implementation repository:

- `C:\src\openclaw-rust-node\rfcs\0001-rust-node-client-and-host.md`
- `C:\src\openclaw-rust-node\docs\proposal.md`

## Current Design Decisions

- Use one OpenClaw-owned Rust workspace with two reusable crates:
  `openclaw-gateway-client` for role-neutral transport/session/TLS behavior and
  `openclaw-node-host` for the node profile, bounded runtime, and headless
  binary. The Linux Tauri app remains the desktop shell and consumes the shared
  gateway client.
- Pin the full published Gateway schema for integrity, but maintain a narrower
  node-contract manifest for Rust generation and conformance gates.
- Upstream missing language-neutral contracts before implementing them in
  Rust; `node.invoke.cancel` is the first known schema gap.
- Model device pairing and node capability approval as separate state machines.
- Support manual enrollment as the V1 baseline. Do not claim OpenClaw's default
  SSH auto-approval until the standalone binary satisfies the existing
  `openclaw node identity --json` probe or OpenClaw accepts a configurable
  replacement.
- Reserve OpenClaw-owned command namespaces such as `system.*`.
- Use a bounded namespaced status command for the first proof. Treat
  `system.which` as admin-sensitive and preserve its exact reference semantics.
- Treat N-1 as a node compatibility window, not a negotiated lower wire
  dialect.
- Stop at a useful read-only host unless OpenClaw owns and publishes the shared
  execution-policy corpus required for `system.run` parity.
- Keep dynamic plugin tools/skills and pending work out of V1 unless a concrete
  adopter supplies a separately reviewed need.
- Merge as work is proved. Keep at most one dependent Rust PR stacked and never
  stack across schema, ownership, security, or release gates.
- Treat the reusable Rust primitive as a role-safe Gateway session, not as a
  Tauri client or node host. Extract Tauri's stronger TLS, device-token,
  reconnect, and heartbeat behavior; retain the experimental implementation's
  node profile, concurrent session, invocation lifecycle, bounded runtime, and
  headless host.

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| ---- | ---------- | ------ | ------ | ------- |
| `giodl73-repo/openclaw-rust-node` | [PR #1](https://github.com/giodl73-repo/openclaw-rust-node/pull/1) | `docs/rfc-0001-rust-node-host` | Merged into `main` as `dbc2774` | Establish ownership, node-contract, pairing, security, release, and bounded-runtime gates. |
| `giodl73-repo/openclaw-rust-node` | [PR #2](https://github.com/giodl73-repo/openclaw-rust-node/pull/2) | `agent/r1-protocol-conformance` | Merged into `main` as `d341c353` | Deliver the generic async client, identity/reconnect/activation/typed-dispatch layers, and bounded reusable `CommandRuntime` with real-Gateway proof. |
| `giodl73-repo/openclaw-rust-node` | [PR #3](https://github.com/giodl73-repo/openclaw-rust-node/pull/3) | `agent/r7-headless-host` | Merged into `main` as `94c1643a` | Deliver the generic foreground host, injected-secret config, supervised bounded local health/readiness, redacted diagnostics, in-memory issued-token reconnect, and graceful cancellation/Ctrl-C/SIGTERM shutdown. |
| `giodl73-repo/openclaw-rust-node` | [PR #4](https://github.com/giodl73-repo/openclaw-rust-node/pull/4) | `agent/r8-package-acceptance` | Merged into `main` as `7749536` | Build, checksum, extract, and execute short-lived native package evidence on Linux x64, Windows x64, and macOS ARM64 without publishing or claiming a release. |
| `giodl73-repo/openclaw-rust-node` | [PR #5](https://github.com/giodl73-repo/openclaw-rust-node/pull/5) | `agent/r8-supply-chain-evidence` | Merged into `main` as `3079454` | Audit the locked Rust dependency graph and retain a validated CycloneDX executable SBOM without signing, attaching, or publishing it. |
| `giodl73-repo/openclaw-rust-node` | [Draft PR #6](https://github.com/giodl73-repo/openclaw-rust-node/pull/6) | `agent/r8-package-provenance` | Green and independently verified at `9654b94`; mergeable | Attest each accepted native archive with repository-bound SLSA provenance and document hosted-builder verification without publishing or code-signing. |
| `openclaw/openclaw` | [Draft PR #115390](https://github.com/openclaw/openclaw/pull/115390), [Issue #115375](https://github.com/openclaw/openclaw/issues/115375) | `feat/node-invoke-cancel-contract` | Draft at `7c8dc5f5f22`; mergeable | Publish the existing cancellation payload schema/type. Lifecycle fixtures and the node-contract projection remain follow-ups. |
| `openclaw/openclaw` | [Issue #115975](https://github.com/openclaw/openclaw/issues/115975) | N/A | Open; maintainer decision requested | Decide whether OpenClaw will adopt, govern, publish, and support the proven Rust node client and bounded headless host. |
| `microsoft.ghe.com/bic/lobster` | TBD | TBD | Evidence slice only | Prove one bounded `lobster.runtime.describe` handler after the generic client contract is accepted. |
| `giodl73-repo/openclaw` | [Branch](https://github.com/giodl73-repo/openclaw/tree/agent/rust-gateway-core) | `agent/rust-gateway-core` | Pushed at `12659125fc7`; no PR yet | Make Linux Tauri the first consumer of a Tauri-free core for TLS pinning and connect/reconnect policy. |
| `openclaw/openclaw` | [Draft PR #116050](https://github.com/openclaw/openclaw/pull/116050) | `agent/rust-gateway-client` | Draft at `7600501dd50`; completed Codex passes fixed session ordering, address trust, TLS/reconnect classification, and final-event delivery; 47 Rust tests plus strict static gates pass | Submit the complete two-crate shared Rust layer and migrate Linux Tauri in one OpenClaw PR for Peter's review. |
| `openclaw/openclaw` | [Draft PR #116450](https://github.com/openclaw/openclaw/pull/116450) | `giodl73-repo:agent/rust-runtime-followup` logically stacked on #116050 | Upstream draft at `c533982d751`; rebased onto exact #116050 head; completed Codex pass fixed rejected-device-token fallback; 62 stacked tests plus strict static gates pass; temporarily targets `main` because GitHub cannot use a fork branch as an upstream PR base | Consolidate native signing/token delivery, lifecycle/reconnect, duplex invocation, admission, Gateway-authority conformance, connection manifests, and the shared TypeScript/Rust lifecycle corpus into the second OpenClaw review surface. |
| `openclaw/rfcs` | [Draft RFC PR #54](https://github.com/openclaw/rfcs/pull/54) | `user/giodl/rfc-0028-openclaw-rust-runtime` | RFC 0028 draft at `cdc10f5`; links upstream PRs #116050 and #116450 plus Windows adopter #1068; maintainer ownership decision requested | Put the reusable runtime and conformance contract under OpenClaw ownership while Microsoft retains its product shells and Scout Cloud manages the canonical node. |
| `openclaw/openclaw-windows-node` | [Draft PR #1068](https://github.com/openclaw/openclaw-windows-node/pull/1068) | `giodl73-repo:agent/rust-node-sidecar-seam` | Rebased at `194928fd`; mergeable/CLEAN with all hosted checks complete and green; fork PR #1 absorbed; full build, 3,402 Shared, 2,022 Tray, 516 Connection, and 2/2 live Gateway MXC tests pass | Combine the replaceable runtime boundary and shared Windows capability dispatcher while retaining C# as the default and WinUI/operator/MCP/approval/native capability ownership. |

## Cheapest Next Test

Seek maintainer feedback on RFC 0028, foundation PR #116050, stacked Rust
follow-up #116450, and rebased Windows adopter #1068. After #116050 lands,
verify that #116450 shrinks to the exact ten-commit follow-up. The next implementation
slice is the paired, versioned local IPC contract and opt-in Windows adapter
that feeds invocations into `NodeCapabilityDispatcher`; keep C# as the default
and require live Gateway parity plus rollback before deletion.

## Related Areas

- `projects/lobster/README.md`
- `projects/hosted-integration/README.md`
- `projects/layering-contracts/README.md`
- `projects/openclaw/README.md`
