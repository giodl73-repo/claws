# TX — @bic/claws-test (primary spec)

**Status**: Alpha · **Upstream target**: none

## Package overview

The claws test harness. Three load-bearing components:

1. **Accept-runner** — manifest-driven scenario execution, series
   registration, min-count enforcement (see TXA)
2. **Doc-validation gate** — 17 diagnostic codes across
   doc-structure, atom-coverage, readme-reachability (see TXD)
3. **No-craftworks gate** — content-scan gate that prevents
   craftworks-internal references from leaking into claws
   artifacts (see TXN)

## Sub-spec index

| Code | File | Authority over |
|------|------|----------------|
| **TXA** | [TXA-accept-runner.md](./TXA-accept-runner.md) | manifest schema, runner registry, scenario min-count |
| **TXD** | [TXD-doc-validation.md](./TXD-doc-validation.md) | 17 diagnostic codes, exit-code semantics |
| **TXN** | [TXN-no-craftworks.md](./TXN-no-craftworks.md) | allowlist, homoglyph detection, exit-code 2 |

## Where it runs

- `claws test accept` — accept-runner (TXA)
- `claws test docs` — doc-validation (TXD)
- `claws test no-craftworks` — content gate (TXN)
- Part of `claws doctor` on every run
- Part of `claws-action` on every PR

## Stability

Alpha. The 17 TXD diagnostic codes and the TXA manifest schema are
stable; both are append-only within Alpha (new codes / series don't
break existing).
