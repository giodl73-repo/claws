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
| RFC 0028 companion-spec role review | `rfc-0028-companion-spec-role-review-2026-07-30.md` |
| Sidecar fork stack and role review | `sidecar-fork-stack-2026-07-30.md` |
| Live Gateway through sidecar proof boundary | `live-sidecar-gateway-proof-plan-2026-08-01.md` |
| Sidecar protocol fork PR body | `fork-sidecar-protocol-pr-body.md` |
| Sidecar handshake fork PR body | `fork-sidecar-handshake-pr-body.md` |
| Sidecar runtime-bridge fork PR body | `fork-sidecar-runtime-bridge-pr-body.md` |
| Windows sidecar adapter fork PR body | `windows-sidecar-adapter-pr-body.md` |
| Live PR feedback resolution | `feedback-resolution-2026-07-30.md` |
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
| `giodl73-repo/openclaw-rust-node` | [PR #7](https://github.com/giodl73-repo/openclaw-rust-node/pull/7) | `agent/sync-openclaw-crates` | Squash-merged into `main` as `236c136`; all six hosted checks passed | Make the two proposed OpenClaw crates and their six consumed conformance fixtures available as an auditable integration drop while retaining the original prototype and package evidence. |
| `giodl73-repo/openclaw-rust-node` | [PR #8](https://github.com/giodl73-repo/openclaw-rust-node/pull/8) | repository-layout branch | Squash-merged into `main` as `e56dd94` | Separate exact OpenClaw-facing crate/fixture snapshots, Microsoft-owned Edge/Chromium integration code, and pinned cross-repository composition evidence. |
| `giodl73-repo/openclaw-rust-node` | [Draft PR #9](https://github.com/giodl73-repo/openclaw-rust-node/pull/9) | `agent/shared-live-gateway-validation` | Green at `84f879ec`; live run passed against OpenClaw `89394978`; all ordinary and package checks pass | Add a standalone real-Gateway conformance harness for approval, pairing-generation reconnect, invocation success/failure, issued-token reuse, and invalid-token fail-closed behavior while preserving the exact crate snapshot. |
| `giodl73-repo/openclaw-rust-node` | [Draft PR #10](https://github.com/giodl73-repo/openclaw-rust-node/pull/10) | `agent/windows-adopter-conformance`, stacked on #9 | Green at `69528b0`; hosted Windows composition passed 122 Rust plus 60 Windows sidecar tests and three exact fixture blobs | Pin and compose the green shared runtime with Windows adopter #1068 without launching or selecting Rust in production. |
| `giodl73-repo/openclaw-rust-node` | [Draft PR #11](https://github.com/giodl73-repo/openclaw-rust-node/pull/11) | `agent/windows-sidecar-process-proof`, stacked on #10 | All seven checks green at `83f11ff`; hosted run 30679730608 and local pinned composition pass 122 Rust plus 61 Windows tests, three exact fixture blobs, and a real Rust child-process round trip | Prove the shared Rust sidecar and Windows supervisor interoperate over real framed stdin/stdout without enabling production selection. |
| `giodl73-repo/openclaw-rust-node` | [Draft PR #12](https://github.com/giodl73-repo/openclaw-rust-node/pull/12) | `agent/protected-sidecar-bootstrap`, stacked on #11 | All seven checks green at `3d1357f`; local and hosted run 30681737723 pass 122 Rust plus 64 Windows tests, all three fixture blobs, and deterministic junction-path rejection | Replace environment bootstrap with a bounded private-pipe record, bind the authenticated offer to the exact executable identity, and pin the path-safe Windows launcher. |
| `giodl73-repo/openclaw-windows-node` | [Draft fork PR #3](https://github.com/giodl73-repo/openclaw-windows-node/pull/3) | `agent/rust-sidecar-process-proof`, stacked on the #1068 adapter snapshot | Local focused suite passes 61 tests with the real Rust probe configured | Launch the test-only Rust child and relay handshake, configuration, admission, invocation, and result frames through the Windows supervisor. |
| `giodl73-repo/openclaw-windows-node` | [Draft fork PR #4](https://github.com/giodl73-repo/openclaw-windows-node/pull/4) | `agent/rust-sidecar-verified-launch`, stacked on fork #3 | At `199eaa1f`; 64 focused tests with the real Rust child and deterministic junction path pass; full warning-free build passes; Codex review clean after closing a path-substitution P1 | Verify and lock the exact executable path through launch, deliver bootstrap only over the private pipe, and require the same artifact identity in the authenticated handshake. |
| `openclaw/openclaw` | [Draft PR #115390](https://github.com/openclaw/openclaw/pull/115390), [Issue #115375](https://github.com/openclaw/openclaw/issues/115375) | `feat/node-invoke-cancel-contract` | Draft at `7c8dc5f5f22`; mergeable | Publish the existing cancellation payload schema/type. Lifecycle fixtures and the node-contract projection remain follow-ups. |
| `openclaw/openclaw` | [Issue #115975](https://github.com/openclaw/openclaw/issues/115975) | N/A | Open; maintainer decision requested | Decide whether OpenClaw will adopt, govern, publish, and support the proven Rust node client and bounded headless host. |
| `microsoft.ghe.com/bic/lobster` | TBD | TBD | Evidence slice only | Prove one bounded `lobster.runtime.describe` handler after the generic client contract is accepted. |
| `giodl73-repo/openclaw` | [Branch](https://github.com/giodl73-repo/openclaw/tree/agent/rust-gateway-core) | `agent/rust-gateway-core` | Pushed at `12659125fc7`; no PR yet | Make Linux Tauri the first consumer of a Tauri-free core for TLS pinning and connect/reconnect policy. |
| `openclaw/openclaw` | [Draft PR #116050](https://github.com/openclaw/openclaw/pull/116050) | `agent/rust-gateway-client` | Draft at `41f4e705887`; three sequential reviewer passes clean; 56 Rust tests plus strict static gates pass | Submit the complete two-crate shared Rust layer and migrate Linux Tauri in one OpenClaw PR for Peter's review. |
| `openclaw/openclaw` | [Draft PR #116450](https://github.com/openclaw/openclaw/pull/116450) | `giodl73-repo:agent/rust-runtime-followup` logically stacked on #116050 | Upstream draft at `894d125ee76`; rebased onto exact #116050 head; three sequential reviewer passes clean after cancellation, UTF-8, redaction, and namespace fixes; 73 stacked Rust tests plus strict static gates pass | Consolidate native signing/token delivery, lifecycle/reconnect, duplex invocation, admission, Gateway-authority conformance, connection manifests, and the shared TypeScript/Rust lifecycle corpus into the second OpenClaw review surface. |
| `openclaw/openclaw` | [Draft PR #116863](https://github.com/openclaw/openclaw/pull/116863) | `giodl73-repo:agent/rust-sidecar-runtime-bridge`, logically stacked on #116450 | At `8d0a1b013ea`; consolidates closed fork PRs #193-#195 without rewriting their reviewed commits; 110 Rust workspace tests and strict gates pass | Add authenticated bounded framing, negotiation, immutable configuration, the ordinary-command runtime bridge, and three exact cross-language corpora without choosing product IPC or bootstrap. |
| `openclaw/rfcs` | [Draft RFC PR #54](https://github.com/openclaw/rfcs/pull/54) | `user/giodl/rfc-0028-openclaw-rust-runtime` | RFC 0028 draft at `ea6891d`; adds the reviewed sidecar Gateway connection-control contract, deterministic cryptographic/race fixture, protected-launch evidence, and remaining production gates | Put the reusable runtime and conformance contract under OpenClaw ownership while Microsoft retains its product shells and authorized controllers manage nodes only through the Gateway. |
| `openclaw/openclaw-windows-node` | [Draft PR #1068](https://github.com/openclaw/openclaw-windows-node/pull/1068) | `giodl73-repo:agent/rust-node-sidecar-seam` | At `3ca913a4`; now includes merged fork PR #2; built-in Codex and final correctness/design/security reviews clean; full build, 60 focused sidecar, 3,462 Shared, 2,023 Tray, and 519 Connection tests pass; the unchanged C# default path has prior 2/2 live Gateway MXC proof | Combine the replaceable seam, shared Windows dispatcher, and independent non-selectable C# sidecar adapter while retaining C# as production default. |

## Cheapest Next Test

Keep PRs #9-#12 and Windows fork PRs #3/#4 draft. The connection-control
contract is now reviewed in RFC #54. The next cheapest proof is a Rust fixture
consumer/state machine followed by an independent adopter consumer over the
protected channel; that enables a disposable live-Gateway sidecar run covering
pairing/issued-token reconnect, invocation, cancellation, invalid-token failure,
and revocation. Follow with packaged signing/discovery, crash/resource/audit,
opt-in selection, rollout, and rollback evidence before default selection or
incumbent deletion.

## Related Areas

- `projects/lobster/README.md`
- `projects/hosted-integration/README.md`
- `projects/layering-contracts/README.md`
- `projects/openclaw/README.md`
