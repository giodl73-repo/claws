# Slice 4: Generic Layer Sources

## Question

Can OpenClaw describe and resolve ordered configuration sources without
hard-coding deployment roles or prematurely selecting a public file/CLI shape?

## Internal Contract

```ts
type ConfigLayerDescriptor<Source> = {
  id: string;
  source: Source;
  access: "read-only" | "read-write";
};
```

The descriptor array defines authority order. `id` is diagnostic provenance.
`source` is opaque to the composition engine. `access` is an explicit source
capability, not inferred from name or position.

A source resolver returns:

```ts
{
  config: unknown;
  sourceIdentity: string;
}
```

The identity is stable and redacted. A concrete resolver may later use a guarded
file, control-plane object, or another supported delivery mechanism without
changing composition.

## Semantics

- validate empty and duplicate layer IDs before source I/O;
- resolve independent sources concurrently;
- retain descriptor order regardless of completion order;
- attribute resolution failures to their layer;
- fail the candidate as a whole when any source fails;
- return access and source identity with each resolved layer.

## Deliberate Deferrals

- public descriptor syntax;
- file path and digest fields;
- source identity hashing format;
- write implementation for `read-write` sources;
- file watching and control-plane refresh;
- CLI flags and environment variables.

## Next Integration

Combine source resolution with `prepareLayeredRuntimeConfig`, then adapt the
successful source/runtime pair into the existing runtime snapshot preflight and
finalization path. A failed source, layer validation, authority admission, or
effective validation must not publish a snapshot.

## Proof

- Date: 2026-07-11
- Environment: local WSL2 `Ubuntu-24.04`
- Command:

  ```bash
  OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs \
    src/config/layer-composition.test.ts \
    src/config/layer-preparation.test.ts \
    src/config/layer-runtime.test.ts \
    src/config/layer-sources.test.ts
  ```

- Result: `4` test files passed, `23` tests passed.
- Slice 4 tests: `4` passed.
- Repository wrapper: `16.24s`.

## Slice Result

Opaque generic source references, role-neutral access, concurrent resolution,
stable declared order, source identities, and fail-whole-candidate behavior are
viable without selecting a public source syntax.
