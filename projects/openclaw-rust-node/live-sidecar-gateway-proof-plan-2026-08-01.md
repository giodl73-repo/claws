# Live Gateway Through Sidecar: Next Proof Boundary

## Outcome

The protected process-launch slice is complete, but a real Gateway session
through the Windows sidecar cannot be added honestly without one more generic
contract. The current sidecar configuration contains only immutable capability
registrations and runtime bounds. It deliberately has no Gateway URL, trust
policy, authentication secret, signing callback, issued-token delivery, or
revocation message.

Passing those values through arguments, inherited environment variables, logs,
or files would contradict RFC 0028 and regress the protection established by
Rust PR #12 and Windows fork PR #4.

## Existing evidence

- Rust PR #9 proves pairing, command-surface approval, issued-token reconnect,
  successful and structured-failure invocation, and invalid-token fail-closed
  behavior against a disposable real Gateway.
- OpenClaw PR #116863 and Windows #1068 prove the transport-neutral authenticated
  sidecar messages and independent native dispatch.
- Rust PR #12 at `3d1357f` plus Windows fork PR #4 at `199eaa1f` prove a real
  process, protected bootstrap, exact artifact identity, path substitution
  resistance, configuration, admission, invocation, and result delivery.

No current proof composes all three layers into one Gateway-to-native round trip.

## Generic contract required

The next OpenClaw-owned surface must decide how a product supervisor provides:

1. Gateway endpoint and transport trust policy;
2. configured authentication and later issued device tokens;
3. challenge signing without requiring export of a platform-held private key;
4. token replacement, revocation, and reconnect authorization; and
5. secret-free lifecycle/audit correlation back to the supervisor.

The preferred production shape is a scoped credential/signing capability over
the already authenticated local channel. A private test identity may be used in
an evidence harness, but its serialized seed must remain explicitly test-only
and must not become the portable product contract by accident.

## Contract slice completed

RFC 0028 now defines the product-neutral connection-control contract and shared
fixture for:

- feature negotiation and peer-confidential IPC;
- per-attempt material request, denial, cancellation, and race convergence;
- endpoint trust, external signing without private-key export, and durable
  issued-token acknowledgement;
- distinct manifest, connection, and sidecar-session generations;
- runtime closure, supervisor retirement, one bounded token-mismatch fallback,
  and fail-closed timeout behavior; and
- secret-free status/audit correlation.

Gateway, platform, and CISO role review is recorded beside the RFC. The
deterministic fixture's JSON, SHA-256 correlation, device ID derivation, and
Ed25519 signature verify independently. Codex review is clean after resolving
the terminal-message and timeout races.

## Next implementation slice

Implement the fixture and state machine in `openclaw-node-host`, then add one
independent adopter consumer over the already protected process channel. Keep
Windows runtime selection disabled and run the composed child only against
disposable Gateway state.

The acceptance proof then composes the exact Rust and Windows revisions and
must cover pairing, approval-generation reconnect, native success/failure,
cancellation, issued-token reuse, invalid-token pause, revocation, and clean
teardown. Packaging/signing, crash-loop policy, resource/audit evidence,
rollout, rollback, and incumbent deletion remain later gates.
