# RB — Repo boundary (primary spec)

**Absorbs**: CL-13 v1.8

## Package location rules

Every package in bic/claws lives in one of four locations:

1. **`packages/openclaw-*/`** — incubating packages destined for
   `@openclaw/*` upstream. Public scope after scope-flip.
2. **`packages/claws*/`** — internal-only packages (claws, claws-sdk,
   claws-serve, claws-action, claws-skill-kit, claws-test). `@bic/*`
   scope, never flipped.
3. **`devtools/*/`** — repo-business tooling (doc-validator, residue
   scanner, accept-runner). `@bic/*` scope, never published.
4. **`test/e2e/`** — the end-to-end test harness. Not a published
   package.

No package lives outside these four locations.

## Dependency direction

Packages form a DAG (no cycles). Allowed directions:

```
  workspace ◀── guardrails ◀── policy
                    ▲              ▲
                    │              │
                    └── snap ◀─────┘
                    ▲
                    │
                    claws-sdk ◀── claws, claws-serve, claws-test, claws-action, claws-skill-kit
```

- `workspace` is sink — imports nothing from other `openclaw-*`
- `guardrails` imports workspace
- `policy` imports workspace + guardrails
- `snap` imports workspace + guardrails
- `claws-sdk` imports all openclaw-* packages
- `claws`/`claws-serve`/etc. import claws-sdk only

Reverse imports (e.g., `workspace` importing `guardrails`) are BLOCK
findings in `devtools/repo-ops/`. Cycles are compile-blocking.

## Scope-flip mechanics

When `@bic/openclaw-X` graduates to `@openclaw/X`:

1. Package.json `name` field updates
2. Every import statement in the monorepo that references
   `@bic/openclaw-X` updates to `@openclaw/X`
3. tsup config, vitest config, and any alias configs update
4. CHANGELOG.md gets a "Scope-flip to @openclaw" entry
5. The package's stability tier bumps from Alpha to Beta

See [../pitfalls/scope-flip.md](../pitfalls/scope-flip.md) for the
traps.

## Atom status semantics

Every atom in `ATOMS.md` has an implied status:

- **`active`** — default. Atom is shipping, doc obligations apply.
- **`draft`** — row exists; authority spec is in `specs/drafts/`.
  Gates apply but tolerate in-flight drift.
- **`retired`** — atom superseded by another; row + spec stay for
  reference but obligations are waived.

Status is derived from the atom's spec file: `drafts/` → draft;
`Status: Retired` header → retired; else → active.

## 4 oracle invariants

The `devtools/repo-ops/src/check.ts` oracle enforces four invariants:

1. **atoms registry authority** — every atom declared in a package's
   `ATOMS.md` has its `Needs` met by a spec-prefix-matched file OR a
   doc file with `covers: [atom:XX]` frontmatter
2. **doc-validation authority** — every package doc directory
   follows the `README.md + ATOMS.md + CHANGELOG.md` top-level rule;
   all content lives in typed subdirectories
3. **accept-test authority** — every `scenarios/{CODE}/` directory
   has a manifest entry with runner + min-count; every manifest
   entry meets its min-count
4. **no-craftworks gate** — no file under `docs/` references
   `craftworks`, `.craft/`, or internal craftworks tooling (those
   references belong in `c:\src\craftworks\` only)

Violations of any invariant are BLOCK findings. Oracle runs in CI
on every PR.

## 11-value layer enumeration

Packages are tagged with a `layer:` annotation in their package.json
`publishConfig`:

| Layer | Meaning |
|-------|---------|
| `incubating` | `@bic/openclaw-*` pre-scope-flip |
| `shipping` | `@openclaw/*` post-scope-flip |
| `internal-cli` | claws + friends |
| `internal-sdk` | claws-sdk |
| `internal-test` | claws-test + test/e2e |
| `internal-action` | claws-action |
| `internal-skill-kit` | claws-skill-kit |
| `devtools` | `devtools/*` |
| `deprecated` | kept for reference, not imported |
| `retired` | scheduled for removal next wave |
| `removed` | deleted in this wave, record retained |

Layer drives CI behaviour (which test projects run, which coverage
thresholds apply, which upstream channel publishes).
