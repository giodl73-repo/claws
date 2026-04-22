# @bic/openclaw-policy

The tool-using-workspace compilation pipeline: take an OpenClaw
workspace, compile it to a `PolicyIR`, validate it, cache it. The
public surface of the compiler — internals live in `compiler-sdk`.

## Two-letter code

**PO** — package primary. Sub-specs: **POI** (policy-IR types + schema),
**POC** (compiler public API).

## Stability and upstream

- **Stability tier**: Alpha
- **Upstream target**: `@openclaw/policy`

## Contents

### Specs

- [PO-policy.md](./specs/PO-policy.md) — primary spec
- [POI-policy-ir.md](./specs/POI-policy-ir.md)
- [POC-compiler.md](./specs/POC-compiler.md)

### Guides

- [using-the-compiler.md](./guides/using-the-compiler.md)

### Tutorials

- [first-policy.md](./tutorials/first-policy.md)

### Pitfalls

- [failmode.md](./pitfalls/failmode.md)

## Quick links

- [ATOMS.md](./ATOMS.md) — atom registry
- [CHANGELOG.md](./CHANGELOG.md) — version history
- [specs/PO-policy.md](./specs/PO-policy.md) — primary spec
