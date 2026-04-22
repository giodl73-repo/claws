---
covers: [atom:KTB/artifact-prohibition]
---

# Pitfalls: skill build

## P-01 · SDK inclusion in output

**Scenario**: Author imports `@bic/claws-sdk/api` directly in skill
code — they want to use a fleet client function.

**Consequence**: build-time prohibition check fails:
`ERR_PROHIBITED_IMPORT: @bic/claws-sdk/api in my-skill/src/index.ts`.
Build aborts.

**Fix**: skills shouldn't reach into host-side SDK internals. If
the skill needs capability X that only exists on the SDK side, it's
not a skill — it's part of the host. Re-architect.

## P-02 · Runtime → build import

**Scenario**: Runtime code imports from `@bic/claws-skill-kit/build`.

**Consequence**: bundled runtime pulls in the build tooling. Artifact
balloons in size; the prohibition check catches the transitive
import chain.

**Fix**: strict separation. Runtime imports only from
`@bic/claws-skill-kit/runtime`. Build tooling is a dev-time concern.

## P-03 · Bundle-only dependency without declaration

**Scenario**: Skill uses a third-party lib (`node-fetch`) without
declaring it in `manifest.json`'s `capabilities`. The bundle
includes `node-fetch`'s 200KB of network code.

**Consequence**: huge artifact; host can't validate the dependency.

**Fix**: declare every external dependency in `manifest.json`:

```json
{ "capabilities": ["network"] }
```

The host uses `capabilities` to decide whether to install the skill
at all — a host that denies network capabilities refuses the skill.

## P-04 · Source-map leak to prod

**Scenario**: Skill builds with `--source-maps` (default) and
ships. Production hosts see the skill's source in stack traces.

**Consequence**: if source contained comments like "hack for
customer X", they're now visible. Competitive intel or security
posture exposure.

**Fix**: production builds use `--no-source-maps`. The default
`--source-maps` is for internal development + debugging.

## P-05 · Manifest version mismatch

**Scenario**: Skill bumps `skillKitVersion: '0.2.0'` in
manifest.json manually, but was actually built against 0.1.0.

**Consequence**: host might refuse to install (version not supported)
or might silently run with wrong assumptions.

**Fix**: the build tool writes `skillKitVersion` from the
`package.json` of the claws-skill-kit package that was used to
build. Don't edit manifest.json by hand.
