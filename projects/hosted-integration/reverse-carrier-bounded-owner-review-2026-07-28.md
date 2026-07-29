# Bounded Reverse-Carrier Owner Review

## Outcome

G2 and G3 are complete as linked fork-only drafts:

- OpenClaw [PR 184](https://github.com/giodl73-repo/openclaw/pull/184) at
  `f810aa8c390e03c943ec91789dc65bc3e2039515` is the single bounded owner PR.
  It composes the O11-O14 evidence over G1, owns deterministic binding
  preparation and the effective bundle-generation seam, and adds no core
  listener or runtime activation.
- Lobster [PR 59](https://microsoft.ghe.com/giodl/lobster/pull/59) at
  `ee6970551294fbb0de00b88d8cdd4364da0cc020` is the adopter proof. It registers
  one exact plugin-owned route only when explicitly selected with a prepared
  binding; disabled startup remains inert.

Both drafts are open, draft, and mergeable. No upstream OpenClaw issue or PR
was created, and no Lobster ADO pipeline was manually queued.

OpenClaw fork checks confirm Real behavior proof, actionlint, no-tabs, and
dispatch. The fork-only auto-response job fails because the personal fork does
not carry the upstream OpenClaw App secret; Lobster has no attached checks.

## Review findings

OpenClaw autoreview found and the branch fixed three concrete issues before the
final clean run: unsupported non-HTTP(S) URLs, peer-proof expiry after session
admission, and inconsistent use of the injected registry clock. Lobster's
final `codex review --base user/giodl/lobster-reverse-carrier-deployment-selection`
reported no actionable correctness issue.

## Exact-head proof

- OpenClaw public SDK: all 147 subpaths verified after the canonical declaration
  build; API baseline and export checks pass.
- OpenClaw focused proof: 64 carrier tests plus 11 host-bundle tests pass.
- Lobster plugin proof against the exact rebuilt OpenClaw head: 23 tests pass,
  including a real loopback HTTP upgrade, exact plugin route, HMAC credential,
  and Ed25519 proof admission.
- Lobster Rust package: 26 tests pass.

## Remaining boundary

G4 is intentionally absent. There is no production runtime-peer process,
reconnect supervisor, default activation, fleet rollout, Status/Doctor
projection, or rollback wiring in either draft.
