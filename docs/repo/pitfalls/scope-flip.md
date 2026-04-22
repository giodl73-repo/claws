---
covers: [atom:RB/scope-flip]
---

# Pitfalls: scope-flip

Flipping a package from `@bic/openclaw-*` to `@openclaw/*` is
mechanically simple but has three classic pitfalls.

## P-01 · Missed import reference

**Scenario**: The scope-flip PR updates `packages/openclaw-X/package.json`
but misses an import in `packages/claws-sdk/src/foo.ts` that still
says `@bic/openclaw-X`.

**Consequence**: build fails immediately (both names can't resolve to
the same package). Less fun: if both names DO resolve for some time
(overlap window), you get two copies of the package in the module
graph and subtle identity bugs.

**Fix**: the scope-flip PR runs `grep -r "@bic/openclaw-X"` across
the monorepo as a precondition. Zero hits → safe to flip.

## P-02 · Behaviour diff in the flip

**Scenario**: Author bundles "small cleanups" into the scope-flip PR.
"Since we're touching every file anyway."

**Consequence**: the R5 pre-merge guard catches behaviour-diff and
blocks the flip. Now you have to un-bundle the cleanups into a
separate PR, re-merge the flip, and the "I already did the work"
frustration kicks in.

**Fix**: scope-flip PRs are ATOMIC rename-only operations. No
behaviour changes, no "while I'm here" cleanups. The diff should be
100% rename tokens.

## P-03 · Stability tier not bumped

**Scenario**: Package scope-flips from `@bic/openclaw-X` (Alpha) to
`@openclaw/X` but CHANGELOG.md still says Alpha. Customers read the
CHANGELOG and assume they shouldn't rely on the API.

**Consequence**: adoption stalls. Or worse: customers DO rely on it,
but don't consider it stable, so they don't report bugs.

**Fix**: scope-flip PR MUST include:
- Stability tier bump: Alpha → Beta
- CHANGELOG.md entry: "Scope-flip to @openclaw; stability bumped to Beta"
- README.md update: "Stability: Beta"

## P-04 · Internal import didn't switch

**Scenario**: `packages/openclaw-X/package.json` says `@openclaw/X`
but an internal file under `packages/openclaw-X/src/foo.ts` still
imports `@bic/openclaw-X/utils` (a sibling file it references
incorrectly through the package name).

**Consequence**: the package self-imports via its old name. TypeScript
might resolve it (via node_modules), but the runtime import path is
broken.

**Fix**: internal cross-file imports inside a single package must
use relative paths (`./utils`), not the package name. The scope-flip
PR scans for self-references via the old name.

## P-05 · Scope-flip before v0.2

**Scenario**: Eager author tries to scope-flip a package that's still
Alpha v0.1.

**Consequence**: upstream review rejects — per
[../specs/RB-repo-boundary.md § Scope-flip mechanics](../specs/RB-repo-boundary.md),
packages graduate only after one stable wave + ref-adapter coverage
+ upstream ack.

**Fix**: don't scope-flip until the roadmap entry in
[`upstream/specs/UG-upstream.md`](../../upstream/specs/UG-upstream.md)
says the package is ready.
