# Slice 3: Runtime Candidate

## Question

Can the layer pipeline produce the same source/runtime separation expected by
`createConfigIO` while leaving existing single-file loading and snapshot
publication untouched?

## Slice

```text
Layer[]
  -> raw/plugin-aware validation per sparse layer
  -> declared-shape projection
  -> recursive exact-authority fold
  -> ordinary full effective validation once
  -> existing `materializeRuntimeConfig(..., "load")`
  -> { sourceConfig, runtimeConfig, provenance }
```

`sourceConfig` remains sparse and represents declared input composition.
`runtimeConfig` contains the ordinary defaults and normalization expected by
runtime consumers. No runtime module sees layers.

## Boundary

This slice does not change `createConfigIO`, runtime snapshot state, file
watching, reload planning, or public config selection. It proves the candidate
adapter those surfaces can call. The next edit should be a narrow invocation
inside the existing load path rather than moving layer semantics into `io.ts`.

## Proof Matrix

- sparse source and materialized runtime remain distinct;
- one composed runtime retains values from multiple layers;
- authority conflict stops before materialization;
- invalid individual layers retain layer-attributed findings.

## Proof

- Date: 2026-07-11
- Environment: local WSL2 `Ubuntu-24.04`
- Command:

  ```bash
  OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs \
    src/config/layer-composition.test.ts \
    src/config/layer-preparation.test.ts \
    src/config/layer-runtime.test.ts
  ```

- Result: `3` test files passed, `19` tests passed.
- Slice 3 tests: `3` passed.
- Repository wrapper: `12.72s`.

## Slice Result

The complete internal candidate pipeline is viable without modifying
`createConfigIO`. The integration change should select and resolve layer
sources, call `prepareLayeredRuntimeConfig`, and feed its source/runtime pair to
the existing snapshot path. Composition, validation projection, and
materialization remain outside `io.ts`.
