---
covers: [atom:TXN]
---

# No-craftworks gate

Why we run a separate gate for craftworks references, what it
catches, and how to use the allowlist responsibly.

## Why separate from doc-validation

Doc-validation (TXD) checks structure. No-craftworks (TXN) checks
content for a specific kind of leak. They're different concerns,
they fire different exit codes, and a team can run them
independently.

## What gets flagged

1. **Literal references**: the string `craftworks` (case-insensitive),
   `.craft/`, `/c/src/craftworks/`
2. **Path-style references**: `from '@craftworks/*'` imports
3. **Homoglyph substitutions**: `сraftworks`, `crаftworks`, etc.
4. **Tool references**: `/craft:plan`, `/craft:run`, `/craft:make`,
   etc. in docs or help text

## What does NOT get flagged

- `devtools/repo-ops/` — this IS repo-business tooling that
  legitimately references craftworks (allowlisted)
- `.craft/` — skipped as a directory (craftworks lives inside this
  dir on the craftworks side, but on the claws side `.craft/`
  doesn't exist)
- Test fixtures explicitly added to the allowlist

## Running

```bash
claws test no-craftworks
```

Exit code:

- `0` — no references found
- `2` — references found (distinct from doc-gate's exit 1)

## Reading the output

```
[BLOCK] no-craftworks/literal: packages/claws/src/foo.ts: references /c/src/craftworks/
[BLOCK] no-craftworks/homoglyph: docs/guide.md: 'сraftworks' (non-ASCII 'с')

no-craftworks check: 2 BLOCK, 0 WARN
```

## Using the allowlist

`.test/no-craftworks-allowlist.txt`:

```
# allowlist for no-craftworks gate
devtools/repo-ops/**
test/fixtures/oc-workspace-minimal/**
```

Additions need:

1. Reason comment on the line
2. Reviewer signoff
3. Expiry (optional but encouraged)

Do NOT add blanket `**/*.md` — the allowlist should be as narrow
as possible.

## Pre-commit integration

Developers can run `claws test no-craftworks` as a git pre-commit
hook:

```bash
#!/bin/bash
# .git/hooks/pre-commit
claws test no-craftworks --fail-fast
```

Catches leaks before they hit CI.

## Why we care

Claws ships as a customer-facing governance product. References to
craftworks (our internal dev orchestrator) would:

1. Confuse customers ("what's craftworks? should I install it?")
2. Expose internal tooling details
3. Create a dependency on our internal infrastructure

The gate is cheap insurance against copy-paste leaks.
