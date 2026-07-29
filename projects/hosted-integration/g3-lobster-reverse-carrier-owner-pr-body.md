## Summary

- activate the existing Lobster external-plugin WebSocket route only from a G2-prepared reverse-carrier owner binding
- require the exact `lobster/host` bundle identity and effective OpenClaw bundle generation before registration
- recompute and verify the content-addressed owner generation, then pin peer admission to the prepared fingerprint and authority
- keep the disabled/default startup path inert and free of bundle-authority reads

This is an adopter proof stacked on the deployment-selection draft. It does not start the production runtime peer, add a reconnect supervisor, enable default activation, or change the manifest-only startup entry.

Fork-only OpenClaw owner contract: https://github.com/giodl73-repo/openclaw/pull/184

## Proof

Against OpenClaw fork head `f810aa8c390`, the plugin suite used a real loopback HTTP server and `handleUpgrade` on `/plugins/lobster-host/reverse-provider/v1`, then admitted an HMAC credential and Ed25519 proof bound to the exact prepared authority.

Observed terminal result: `tests 23`, `pass 23`, `fail 0`. The selected branch registered one exact route and admitted the prepared peer; the unselected branch did not read plugin authority or register anything.

## Validation

- 23 Node plugin tests across connection ownership, deployment authority, composition, selected Gateway registration, and manifest inertness
- 26 Rust package tests
- deterministic plugin bundle drift check
- `codex review --base user/giodl/lobster-reverse-carrier-deployment-selection` (no actionable findings)

No ADO pipeline was manually queued.
