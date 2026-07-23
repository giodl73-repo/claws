---
covers: [atom:SKG]
---

# Graduation criteria

When an incubating SDK feature is ready to graduate — i.e., get
exposed on the `/api` facade — use this checklist.

## Checklist

- [ ] **Public-API shape settled**: no breaking changes in the last
      4 weeks of internal-consumer use
- [ ] **Test coverage**: per-file statements/branches/functions/lines
      all ≥ 95/90/95/95
- [ ] **Scenarios**: every new decision-table entry has a scenario
      (L1 integration OR L2 e2e)
- [ ] **Sub-spec update**: `SKA-public-api.md` reflects the new
      public-API entry
- [ ] **CHANGELOG**: entry under "Graduated" section
- [ ] **Internal consumer migration**: all internal callers of the
      internal-only import have switched to the `/api` facade

## Review process

Graduation PRs are reviewed by:

1. **SDK maintainer** — signs off on API shape
2. **One architect** — signs off on scope (is this really ready?)
3. **CI gates**: build green, tests green, coverage green

## What "graduated" means

- Consumers OUTSIDE the repo can rely on the API
- Breaking changes require major version bump + 2-version deprecation window
- Changes surface in CHANGELOG under "Breaking" section when bumping major
- Deprecations use `@deprecated` JSDoc + tsconfig warnings

## What "graduated" does NOT mean

- Not "the feature is complete and won't change" — additive changes
  are fine at semver-minor
- Not "the feature is done" — ongoing maintenance, bugfixes, and
  additive enhancements are expected
- Not "the internal implementation is frozen" — only the `/api`
  surface is. Internal re-writes are fine as long as the `/api`
  contract holds.

## Can a graduated feature un-graduate?

**No.** Deprecate + replace is the only path out. Keep the
deprecated API at `/api` for at least 2 minor versions with
`@deprecated` tags, then remove in a major.

See [../specs/SKG-graduation.md](../specs/SKG-graduation.md) for
the formal policy.
