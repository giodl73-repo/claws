# @bic/claws-sdk

The enterprise SDK — every durable library behind the claws CLI.
Fleet runtime, compliance pack, SIEM integration, press pipeline,
relax engine, context assembler, snapshot runtime, and the 29 G-rule
compiler internals. Consumed by `claws`, `claws-serve`, `claws-action`,
and the claws-test harness.

## Two-letter code

**SK** — package primary. Sub-specs: **SKA** (public API), **SKG**
(graduation), **SKI** (subpath imports), **SKC** (compiler
internals), **SKF** (fleet runtime), **SKR** (relax engine).

## Stability

- **Stability tier**: Alpha
- **Upstream target**: none (internal enterprise SDK)

## Contents

### Specs

- [SK-sdk.md](./specs/SK-sdk.md) — primary spec
- [SKA-public-api.md](./specs/SKA-public-api.md)
- [SKG-graduation.md](./specs/SKG-graduation.md)
- [SKI-subpath-imports.md](./specs/SKI-subpath-imports.md)
- [SKC-compiler-internals.md](./specs/SKC-compiler-internals.md)
- [SKF-fleet-runtime.md](./specs/SKF-fleet-runtime.md)
- [SKR-relax-engine.md](./specs/SKR-relax-engine.md)

### Guides

- [graduation-criteria.md](./guides/graduation-criteria.md)
- [pass-ordering.md](./guides/pass-ordering.md)

### Pitfalls

- [imports.md](./pitfalls/imports.md)
- [cache.md](./pitfalls/cache.md)

## Quick links

- [ATOMS.md](./ATOMS.md)
- [CHANGELOG.md](./CHANGELOG.md)
