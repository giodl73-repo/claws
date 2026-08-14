# OpenClaw Dependency Remediation Plan - 2026-08-13

## Current Upstream Check

Compared the reviewed baseline with upstream `main` commit
`18163ba269c375b92a390a0f03ef20fdfa24dc13`. Every reviewed High package
finding still exists. The local `openclaw-sandbox:bookworm-slim` reference is
not an external mutable dependency: it is a documented local image contract
built from the repository's digest-pinned Debian base and fails closed when
missing. It is therefore Moderate/R3, not High.

## Prepared Remediation - 2026-08-14

OpenClaw branch `enterpriseclaw/dependency-governance-remediation`, through
commit `39b18ffbe4f`, implements the first five P0/P1 rows:

- ClawHub `0.23.3`, resolving release-tool Undici to `7.29.0`;
- `js-yaml@4.3.1`;
- `@aws-sdk/core@3.977.6`; and
- `werift@0.24.3`, removing `rx.mini` and preserving recovery from transient
  WebRTC disconnection under werift's current consent-freshness behavior; and
- an immutable digest for the live-media runner's Ubuntu `24.04` base, reusing
  the digest already used by the installer smoke image.

The frozen pnpm lock, isolated ClawHub install, and focused OpenAI WebRTC test
pass. This is remediation evidence, not Microsoft control closure. A normal
governed install still fails closed on `@openclaw/fs-safe@0.5.5`, which CFS
does not yet expose, and CG has not yet reconciled the remediated manifest.
OpenClaw PR #123513 was closed on 2026-08-14 when the work returned to
analysis-only scope. The branch is retained only as supporting analysis
evidence, not as an active implementation or publication plan.

## Small Remediation Sequence

| Priority | Change | Why | Proof required |
| --- | --- | --- | --- |
| P0 | Update ClawHub release root `0.23.1` to CFS-admitted `0.23.3` and regenerate its lock | The resolved graph moves `undici` from vulnerable `7.28.0` to `7.29.0` | Lock diff plus release-tool smoke |
| P0 | Override `js-yaml` to CFS-admitted `4.3.1` | Clears the authoritative High CG remediation for `4.3.0` | Lock absence of `4.3.0`; YAML/config tests |
| P1 | Update the root `@aws-sdk/core` override from `3.977.1` to CFS-admitted `3.977.6` | Removes the deprecated JSON number-parsing build across shipped AWS paths | Provider and Bedrock tests; lock convergence |
| P1 | Update OpenAI extension `werift` from `0.24.1` to CFS-admitted `0.24.3` | `0.24.3` removes the unlicensed `rx.mini` dependency chain | OpenAI realtime/WebRTC tests; lock absence of `rx.mini` |
| P1 | Pin the live-media runner's `ubuntu:24.04` base to the already used immutable Ubuntu digest | Removes the remaining external mutable container tag | Image build and live-media smoke |
| P2 | Replace the direct WhatsApp `audio-decode` alias with `@audio/decode` or prove it is removable | Clears a deprecated direct optional dependency | WhatsApp audio acceptance and package-contract tests |
| P2 | Resolve `crypto-js` through `zca-js` ownership | Latest `zca-js@2.1.2` still requires unmaintained `crypto-js`; a direct override cannot remove it | ZaloUser protocol/crypto compatibility proof |
| P2 | Record the `@lydell/node-pty` fork provenance decision | Latest fork remains the beta version; upstream `node-pty@1.1.0` is not a drop-in decision | Native build matrix, PTY behavior, and security-owner signoff |
| P3 | Plan the Linux GTK3/Tauri migration | Fifteen shipped GTK3/Unicode crates remain unmaintained; `glib@0.18.5` also has an unsoundness fixed in `0.20.0` | Linux application build, launch, tray, WebKit, and update proof |

## Parent-Owned Blocker

Updating Vercel from `58.4.4` to current CFS-admitted `58.7.1` does **not**
remove the reviewed findings. A clean lock resolution still contains:

- `sandbox@3.4.0`;
- `tar@7.5.7`;
- `undici@5.28.4`; and
- `undici@5.29.0`.

Do not add speculative nested overrides. Keep release inputs trusted and route
the issue to Vercel ownership until a parent release resolves the sandbox,
archive, and unsupported HTTP-client chains.

## Exact Feed Admission Gaps

Thirteen exact npm identities remain unavailable from CFS after the
2026-08-14 recheck:

- security/control boundaries: `@openclaw/fs-safe@0.5.5`,
  `@openclaw/uirouter@0.1.1`, and `@trycua/cua-driver@0.19.3` plus its six
  platform packages;
- runtime transitives: `eventsource-parser@3.1.1`, `hono@4.13.2`,
  and `ws@8.21.3`;
- build-only transitive: `nanoid@3.3.18`.

The exact actual package behind the `node-domexception` alias,
`@nolyfill/domexception@1.0.28`, is now admitted. The remaining exact artifacts
are present upstream, and upstream tag timestamps place all but `ws@8.21.3`
inside the current seven-day npm minimum-release window; `ws` crossed that
boundary only hours before the recheck. Wait for normal admission and escalate
through the official CFS support path if a version remains absent after the
hold. Do not bypass the protected feed or blindly downgrade.

## Evidence-Only Closures

- Blacksmith Testbox: locate the procurement/GovID/SSPA record or submit the
  action/service through Third Party Software Governance. Internal use is not
  approval.
- Cloudflare image: substitute the promoted immutable OpenClaw digest at
  deployment time; the checked-in placeholder is intentionally not an exact
  image.
- Component registration remains deferred until explicitly authorized.
