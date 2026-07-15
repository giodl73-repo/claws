# Slice 2: Presence-Preserving Layer Preparation

## Question

Can OpenClaw validate each sparse layer through its existing plugin-aware schema
without allowing validator-injected defaults to become authority claims?

## Existing Behavior

`validateConfigObjectRawWithPlugins` avoids ordinary core defaults but channel
and plugin AJV validation still runs with `applyDefaults: true`. Current config
writes remain sparse by persisting the pre-validation candidate rather than
`validated.config`.

Managed layers need the equivalent invariant for composition: validation may
normalize declared values, but it may not expand the set of declared paths.

## Slice

1. Validate a clone of each declared layer with
   `validateConfigObjectRawWithPlugins`.
2. Project the validated result back onto the declared document shape.
3. Pass the projected layers to the proven recursive exact-authority fold.
4. Attribute schema issues to the layer that supplied them.
5. Keep final default application, runtime overrides, snapshots, and I/O outside
   this slice.

## Important Boundary

Projection is schema-shape preservation, not merge precedence. Objects retain
only explicitly declared children. Arrays, scalars, and accepted `null` values
are atomic and take their normalized validated value.

## Proof Matrix

- injected nested defaults do not appear in the projected layer;
- explicitly declared normalized leaves retain their validated value;
- arrays and null remain atomic;
- two valid sparse layers compose and preserve siblings;
- an invalid layer produces layer-attributed schema issues.

## Next Slice

After proof, integrate prepared composition into a `createConfigIO` candidate
load path and run ordinary full validation/materialization once on the composed
source. Do not add a public loader or CLI flag until that internal path works.

## Proof

- Date: 2026-07-11
- Environment: local WSL2 `Ubuntu-24.04`
- Command:

  ```bash
  OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs \
    src/config/layer-composition.test.ts \
    src/config/layer-preparation.test.ts
  ```

- Result: `2` test files passed, `16` tests passed.
- Slice 2 tests: `5` passed.
- Repository wrapper: `13.66s`.

## Slice Result

The existing raw/plugin-aware validator is reusable when its result is projected
back onto declared shape before composition. No new schema or validator is
needed for sparse layers.
