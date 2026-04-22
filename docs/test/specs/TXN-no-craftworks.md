# TXN — No-craftworks gate

**Sub-spec of**: [TX-test.md](./TX-test.md)

## Purpose

The no-craftworks gate prevents craftworks-internal references from
leaking into published claws artifacts. Craftworks is the
development orchestrator; claws is the governance product. References
to craftworks paths, tools, or concepts do NOT belong in claws
customer-facing code or docs.

## Scope

The gate scans:

- Every file under `packages/*/src/` and `packages/*/dist/`
- Every file under `docs/`
- Every scenario file
- Every test fixture

Skipped:

- `.craft/` (craftworks internal)
- `devtools/repo-ops/` (repo-business tooling — may reference craftworks)
- Test fixtures that intentionally exercise craftworks-like paths
  (must be listed in allowlist)

## Allowlist

Rare legitimate references go in
`.test/no-craftworks-allowlist.txt`:

```
# File-scope allowlist for no-craftworks gate
# Format: one pattern per line; supports glob
devtools/repo-ops/**/*
test/fixtures/synthetic-workspace/**
```

The allowlist is version-controlled; additions require a reviewer
signoff. Adding a new entry without justification is a review smell.

## Homoglyph detection

The gate detects attempts to smuggle craftworks references via
Unicode homoglyphs:

- `crаftworks` (Cyrillic а) → detected, rejected as homoglyph
- `сraftworks` (Cyrillic с) → detected
- `craftwоrks` (Cyrillic о) → detected
- `сraftwоrks` → detected

Detection normalises NFKC + compares ASCII folding. Any non-ASCII
in a suspicious token → rejected as `homoglyph`.

See [../pitfalls/validation.md § Homoglyph bypass](../pitfalls/validation.md)
for the attack + defence story.

## Exit-code

- `0` — clean
- `2` — one or more craftworks references found

Exit 2 (not 1) distinguishes this gate from the doc-validation
gate. CI can show which gate fired at a glance.

## Match patterns

The gate flags:

- Literal string `craftworks`
- Literal string `.craft/`
- Literal string `/c/src/craftworks/` (or Windows-style equivalents)
- Any of the above with homoglyph substitutions

Matches are case-insensitive for the literal `craftworks` token
(catches `CraftWorks`, `CRAFTWORKS`, etc.).

## Testing

Every CI run includes `claws test no-craftworks` as a post-build
check. Skill artifacts go through the same gate — skills that
reference craftworks are rejected at build time.
