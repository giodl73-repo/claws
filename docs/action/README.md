# @bic/claws-action

The GitHub Action that runs `claws doctor + claws policy validate`
on pull requests, posts findings as SARIF, and gates merges based on
severity.

## Two-letter code

**AC** — package primary. Sub-specs: **ACS** (SARIF pipeline),
**ACC** (action cache), **ACR** (real behavior proof).

## Stability

- **Stability tier**: Alpha
- **Upstream target**: none (internal GH Action)

## Contents

### Specs

- [AC-action.md](./specs/AC-action.md) — primary spec
- [ACS-sarif-pipeline.md](./specs/ACS-sarif-pipeline.md)
- [ACC-action-cache.md](./specs/ACC-action-cache.md)
- [ACR-real-behavior-proof.md](./specs/ACR-real-behavior-proof.md)

### Guides

- [github-action-setup.md](./guides/github-action-setup.md)

### Pitfalls

- [severity.md](./pitfalls/severity.md)

## Quick links

- [ATOMS.md](./ATOMS.md)
- [CHANGELOG.md](./CHANGELOG.md)
