# Scout Rust Node Overlap Audit

## Source reviewed

- Repository: `edge.undockedcopilot`
- Branch: `users/lingnanzeng/lobster-scout-node`
- Commit: `1db1974594901679904a24ac34880f45a64918a0`
- Draft PR: Azure DevOps PR `16301549`, **Add Lobster Scout system.run node for
  macOS host**
- Primary implementation: `apps/scout-node`
- macOS embedding: `macos/apps/host/Undocked/Services/Scout`
- Mac onboarding: Edge Wiki page `371053`, **Mac Copilot**, plus child pages
  `371073` and `371075`
- Native shell repository: `edge/chromium.src`, especially
  `chrome/browser/edge_copilot_undocked_host_bridge/mac`

The branch is one implementation commit on its July 28 main baseline. It adds
three Rust crates (`core`, `ffi`, and `testkit`), a C ABI, a Swift loader and
Host adapter, Keychain-backed Ed25519 identity, Rust validation integration,
and a Debug-only macOS startup path.

## Desktop repository topology

The Mac onboarding guide names a wider product topology:

| Repository/system | Product responsibility | Rust-node relationship |
| --- | --- | --- |
| `chromium.src` | Copilot.app native shell; build/sign/launch; XPC bridge, bounded recovery, host arbitration, and browser-owned fallback | No Rust dependency. Must prove the app can reach the host while Scout runs. |
| `edge.undockedcopilot` | Long-lived CopilotAppHost/UndockedHost desktop companion (system-tray/menu-bar/background-host analogue), Swift Host adapter, Rust `cdylib`, and launchd integration | Direct adopter, node-lifecycle owner, and location of the thin embedding adapter. |
| `1JS` | H5 business logic | Outside the node-client implementation; relevant only to a full product scenario. |
| Sydney/backend and Lobster | Backend/runtime, approval flow, and Gateway endpoint | Own server/operator behavior and the protocol-convergence decision. |

For the Scout Rust-node slice, the two native repositories matter directly,
but they should not share the Rust implementation. The dependency direction is:

```text
chromium.src Copilot.app (interactive shell; may restart)
  -- XPC --> edge.undockedcopilot CopilotAppHost
               (long-lived desktop companion)
               -- C/Swift adapter --> openclaw-rust-node
               -- WebSocket --> Lobster/OpenClaw Gateway
```

The co-debug workflow has a real cross-repository lifecycle constraint: only
one process can own
`UBF8T346G9.com.microsoft.copilot.undockedhost.xpc`. Xcode's Debug Host must
claim the Mach service first; the Chromium dev kit then strips the bundled Host,
re-signs Copilot.app, and launches it in external-host mode. The Host uses a
`.debug` launchd identity and KeepAlive to avoid production registration
conflicts.

This makes Desktop setup materially harder than Web setup, but it does not
change the generic crate boundary. It adds a required cross-repository
acceptance lane and launch/teardown runbook, not Chromium-specific code in the
Rust crate.

The long-lived Host also changes the lifecycle target. The node connection is
owned by CopilotAppHost rather than by a browser window, chat session, or
Chromium process lifetime. The embedding proof must therefore cover Host crash
and launchd recovery, browser/XPC reconnect without recreating node identity,
account-epoch changes, sleep/wake and network transitions, clean credential
rotation, and shutdown. These are arguments for the generic per-attempt
connection provider and external signer; they are not reasons to put desktop
or XPC concepts in the Rust crate.

## Conclusion

Scout is a strong first adopter candidate for `openclaw-rust-node`, but it
cannot consume the current crate as a drop-in replacement. The two
implementations duplicate most node-client mechanics while deliberately using
different protocol identities:

- Scout targets Lobster's `/v1/openclaw-gateway`, v2 device signature,
  `client.id="cli"`, optional HTTP upgrade bearer, and Lobster presence event.
- `openclaw-rust-node` targets the published OpenClaw contract, canonical v3
  signature, `client.id="node-host"`, explicit activation/capability approval,
  and the official reconnect/error model.

The preferred convergence is to make Lobster's node endpoint accept the
official OpenClaw contract, then add only generic embedding seams to the Rust
crate. Adding a Lobster-specific wire profile to the generic crate would make
it a second protocol owner and retain the downstream fork.

## Overlap map

| Area | Scout branch | `openclaw-rust-node` | Classification |
| --- | --- | --- | --- |
| WebSocket transport | Challenge ordering, message cap, ping/pong, close classification | Challenge ordering, URL/TLS policy, request correlation, bounded in-flight work, retained/live events, close propagation | Replace Scout mechanics after protocol convergence |
| Reconnect | Fresh Host connection attempt, bounded exponential retry, pairing loop | Side-effect-free typed reconnect policy, terminal pauses, trusted-token fallback, healthy-session retention | Reuse/adapt generic policy; retain Host refresh callback |
| Device identity | Swift Keychain key and Lobster v2 signing | Rust key mechanics, application-owned persistence, OpenClaw v3 signing | Reuse key primitives only today; add generic external signer seam |
| Invocation wire | `node.invoke.request` and `node.invoke.result`; `paramsJSON`/`payloadJSON` | Same core request/result names with stricter published-contract validation | High overlap once Lobster wire converges |
| Dispatch/runtime | One hard-coded `system.run`, handled synchronously on the socket loop | Exact typed routing, deadlines, zero queued work, bounded concurrency/output, duplicates, panic containment, result saturation | Reuse generic runtime for non-`system.*`; future execution module needed |
| Execution | Local argv policy, process runner, Host authorization and audit handles | Intentionally excludes `system.run` until an upstream-owned policy corpus exists | Scout remains owner for Debug proof; not portable production parity |
| Native embedding | Versioned C ABI, async JSON callbacks, Swift `dlopen` lifecycle | Rust library and foreground binary only | Adapt Scout ABI; propose a generic embedder crate separately |
| Secret/config ownership | Host refreshes endpoint, transport bearer, Gateway credential, account epoch | Static URL per connect; application owns identity/auth persistence | Add generic per-attempt connection provider, not Lobster fields |
| Packaging/CI | Edge monorepo Cargo workspace and Azure Rust validation | Native package acceptance, RustSec, CycloneDX SBOM, provenance | Reuse evidence patterns; distribution ownership remains unresolved |

## Scout-owned behavior that should stay downstream

- Swift `dlopen` and callback lifetime management.
- Keychain storage policy and macOS Host startup integration.
- Lobster account epoch and transport-bearer acquisition.
- Product Debug gates and local visible E2E setup.
- Lobster approval UI and audit integration.
- The exact set of commands Scout chooses to expose.

## Generic seams worth extracting

1. **External challenge signer**: permit an embedding-owned signer to receive
   the final canonical OpenClaw signing material after the Gateway challenge,
   keeping the private key in Keychain or another platform store.
2. **Per-attempt connection provider**: acquire the URL, HTTP upgrade headers,
   and OpenClaw auth material for every retry without baking Lobster account
   concepts into the crate.
3. **Embeddable lifecycle surface**: start, stop, state events, and request
   completion suitable for a thin C/Swift adapter. Scout's versioned C ABI is
   a useful analogue, not necessarily the final public ABI.
4. **Future execution module boundary**: keep process preparation,
   authorization, audit reservation/finalization, and execution separate from
   transport. Do not expose `system.run` until shared OpenClaw fixtures and
   security ownership exist.

## Important gaps in the Scout proof

These are acceptable for its explicitly Debug-only experiment but block using
it as production `system.run` parity evidence:

- It signs Lobster v2 rather than the published OpenClaw v3 payload.
- Invocation execution is awaited directly in the WebSocket receive loop, so
  one command blocks later frames, heartbeat handling, and other invocations.
- The execution-plan digest binds argv, resolved executable, raw display text,
  and timeout, but not working directory, session/account identity, environment,
  or executable/file identity.
- `systemRunPlan` fields are accepted but ignored by Rust preparation.
- An approved `/bin/sh -lc ...` is executed as supplied; timeout kills the
  direct child but not a separate process group, so descendants may survive.
- The Swift Host authorization is a local-execution opt-in plus structural argv
  validation, not the complete OpenClaw execution-policy corpus or a fleet kill
  switch.
- The testkit has a happy path, reconnect recovery, and stop-during-backoff
  proof, but not the generic runtime's duplicate, saturation, malformed input,
  disconnect cleanup, or adversarial execution-policy matrix.

## Recommended convergence sequence

1. Run the current `openclaw-rust-node` client against the Lobster endpoint and
   capture the exact v3 rejection. Use this to decide whether Lobster can accept
   the official v3/client identity without a compatibility profile.
2. Add an external-signer seam and per-attempt connection provider to
   `openclaw-rust-node`, each as an independently tested generic PR.
3. Build a small Scout adapter against those seams while retaining the existing
   Swift Keychain, Host callbacks, and Debug execution implementation.
4. Delete Scout's duplicate WebSocket, reconnect, challenge parsing,
   invocation routing, and result-delivery code only after the same fake-Lobster
   and real local E2E proofs pass.
5. Treat production `system.run` as a separate shared-policy program. Use the
   Scout implementation as evidence and test input, not as the cross-language
   authority.
6. Add a Desktop acceptance proof that builds the Rust dylib and Debug Host in
   `edge.undockedcopilot`, then builds/signs/launches Copilot.app from
   `chromium.src` in external-host mode. Verify single Mach-service ownership,
   XPC readiness/recovery, node inventory, one approved invocation, and clean
   teardown. Keep this proof out of the crate's ordinary unit-test gate.

The deletion target is now precise: duplicate node-client/runtime mechanics
inside the long-lived CopilotAppHost integration, not the CopilotAppHost
process itself and not Chromium's XPC bridge.

## Decision

Do not ask the Scout PR to switch dependencies immediately. The Rust crate is
unpublished, release ownership is unresolved, and the Lobster v2 contract is
not compatible with its official OpenClaw v3 core. Align the contract and two
generic embedding seams first; after that, Scout should be able to delete most
of `crates/core` while retaining its product-specific FFI, platform storage,
and execution adapter.
