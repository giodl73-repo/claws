# Contributing — Doc scrub checklist

bic/claws is a standalone repo. Content that originated in the
gim-home/craftworks monorepo has been lifted, but lineage is not content —
anything that still reads as craftworks-internal ceremony, names a package
scope that no longer exists here, or describes a world that only exists
there, is a scrub target.

This guide is the 5-step protocol you run on every migrated doc or runtime
code file before it lands. Steps 1–2 and 5 are automated by the scrubber;
steps 3–4 are human judgement. Every scrubbed file goes through a
second-pair-of-eyes review before merge.

## Why scrub

- **Identity**: bic/claws docs describe bic/claws; "craftworks" as an
  org-reference doesn't resolve to anything a reader of this repo can use.
- **Gate honesty**: the `no-craftworks` CI gate (see `concepts--no-craftworks-gate.md`)
  treats unallowlisted `@craftworks/*` or bare `craftworks` mentions as
  build failures. Scrub is what keeps the gate quiet.
- **Currency**: migrated content may describe flows that existed in
  craftworks but no longer exist here. Dead references mislead readers.

## The 5-step protocol

### Step 1 — Content + import rewrite (automated)

Rewrite package scopes and import paths to the bic/claws scope model:

| From                                     | To                                                                |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `@craftworks/openclaw-*`                 | `@bic/openclaw-*` (contributed-staged)                            |
| `@craftworks/clawc-*`                    | `@bic/clawc-*` (internal-only)                                    |
| `@craftworks/*` (other)                  | flag for manual review — reword or drop                           |
| generic `"craftworks"` as org reference  | drop (not applicable in standalone repo)                          |
| `craft-cli`, `compiler-sdk`, `agent-sdk` | drop or reword — these are monorepo packages that don't ship here |

### Step 2 — Terminology translation (automated)

| From     | To                                          |
| -------- | ------------------------------------------- |
| `atom:`  | **stays** (the registry concept survives)   |
| `phase:` | `checkpoint:` (bic/claws uses CPs in prose) |
| `wave:`  | drop (craftworks ceremony)                  |
| `pulse:` | reword as "task" or drop                    |

Atom references keep their slug; the registry is bic/claws-native.

### Step 3 — Currency check (human)

For each claim, ask: "does this describe a world that still exists in
bic/claws?" A guide describing `craftworks-sdk/src/domains/docs/` is stale
here — the code lives in `devtools/repo-ops/src/doc-validator/` now.
Verify described behaviour still holds; don't just rewrite paths.

### Step 4 — Audience check (human)

Strip craftworks-internal ceremony — pulses, stages, flair, pulse-plan
cross-references, sentences that only resolve by reading `.craft/waves/…`.
If a file's _topic_ is craftworks history (e.g. `docs/contributing/migration.md`),
it's allowlist-protected and can keep the references it needs.

### Step 5 — No-craftworks grep (automated)

Run the gate on the scrubbed file:

```bash
claws doctor --check no-craftworks
```

Any non-allowlisted match fails the scrub with exit code `2`. The walker is
`@nodelib/fs.walk`-based (not shell grep) so Windows path semantics match
Linux CI.

## Running the scrubber

```bash
# Single file
node scripts/scrub-doc.mjs docs/concepts/some-guide.md

# Multiple files
node scripts/scrub-doc.mjs docs/concepts/*.md packages/openclaw-policy/src/**/*.ts

# Stdin (for editor integrations)
cat input.md | node scripts/scrub-doc.mjs --stdin

# Human-readable report (default is JSON)
node scripts/scrub-doc.mjs --format human docs/concepts/some-guide.md
```

Scrubber properties (spelled out so you can trust the output):

- **Idempotent** — running twice yields byte-equal output
- **CRLF-preserving** — Windows line endings survive the pass
- **BOM-preserving** — UTF-8 BOM markers survive
- **Deterministic report** — `{filesChanged, rulesMatched: {ruleId: count}, warnings: [...]}`

## Runtime code is in scope

Per architect finding F-06, the scrubber also runs on `.ts`, `.tsx`,
`.mjs`, `.js`, `.cjs`. Import rewrites happen mechanically; `// @craftworks/*`
historical-lineage comments get flagged for manual conversion to audit-chain
evidence notes. You rewrite the comment prose; the scrubber flags it.

```bash
node scripts/scrub-doc.mjs packages/openclaw-guardrails/src/**/*.ts
```

## Allowlist vs rewrite

Some files legitimately name `craftworks` and stay. They are listed in
`.no-craftworks-allowlist.yaml` (CODEOWNERS-gated by `@bic/claws-release-eng`):

| Allowlisted                      | Reason                                            |
| -------------------------------- | ------------------------------------------------- |
| `MIGRATION.md`                   | attribution: root-level migration narrative       |
| `LICENSE`, `NOTICE`              | copyright attribution if present in original      |
| `docs/contributing/migration.md` | contributor-facing migration lineage              |
| `scripts/scrub-doc.mjs`          | scrubber source must name the pattern it enforces |
| `devtools/repo-ops/src/**`       | no-craftworks gate source must name the pattern   |
| `devtools/repo-ops/test/**`      | gate tests need fixtures containing the string    |
| `.no-craftworks-allowlist.yaml`  | self-reference                                    |

Anything else that matches the pattern gets rewritten. Adding to the
allowlist requires a PR reviewed by `@bic/claws-release-eng`, not a
drive-by edit.

## Review burden

Every scrubbed file goes through a second-pair-of-eyes review before merge:

- Automated steps (1, 2, 5) — reviewer verifies the scrubber report shows
  zero warnings and the `no-craftworks` gate is green.
- Human steps (3, 4) — reviewer reads the prose end to end and asks the
  currency + audience questions. If the reviewer can't make it past step 4
  without a "wait, what does this refer to?" moment, the scrub isn't done.

PRs that touch 5+ scrubbed files in one batch need an explicit
`@bic/claws-release-eng` reviewer (per boundary-critical convention).

## Cross-references

- [`concepts--no-craftworks-gate.md`](../concepts/no-craftworks-gate.md) — scope, allowlist, exit codes
- `specs/CL-13-repo-boundary.md` §Validation — canonical residue-grep regex that the gate implements
- `devtools/repo-ops/src/scrubber/scrub-rules.ts` — the authoritative regex table the scrubber uses
