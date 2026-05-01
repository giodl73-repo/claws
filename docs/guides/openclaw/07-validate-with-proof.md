# Validate with Proof

<!-- atom:openclaw-validate-with-proof (OC-G07) -->

These guides are authored as proof source files in `design/src/openclaw/`
and compiled to `docs/guides/openclaw/` via `proof compile`. The toolchain
gives the team three benefits the team would not get from hand-authored
markdown: ASCII art geometry validation, live-data dashboards from markdown
tables, and source-document URI checking. This guide explains how to lint
and rebuild the guide set, plus what the team's diagnostics catch.

---

## Setup

<!-- proof:compiled from="proof:tree kind=taxonomy" uri="" -->
```taxonomy
Required tooling
├── proof binary: C:/src/PROOF/target/release/proof.exe (release build)
├── mdpath sibling: required for md:// URI resolution
└── proof.toml at design/proof.toml: maps source_dir to output_dir
```
<!-- /proof:compiled -->

`proof.toml` maps `src/openclaw/` → `docs/guides/openclaw/` and excludes the
deep-dive specs at `design/openclaw/*.md` so they are not reformatted.

---

## Build commands

| Command | What it does |
|---------|--------------|
| `proof compile src/openclaw` | Rebuild every `.md` under `docs/guides/openclaw/` |
| `proof compile src/openclaw --check` | Validate without writing |
| `proof check .` | Lint all markdown for ASCII geometry + structure |
| `proof check . --errors-only` | CI mode |
| `proof check . --by-code` | Group counts by diagnostic code |
| `proof check . --deduplicate` | Collapse repeated warnings |
| `proof status .` | One-screen corpus health |

Run from the `design/` directory.

---

## What proof catches

<!-- proof:compiled from="proof:tree kind=taxonomy" uri="" -->
```taxonomy
Diagnostic categories
├── ASCII art geometry
│   ├── ascii_box_width: top and bottom borders mismatch
│   ├── ascii_box_col: internal column drifts across rows
│   ├── ascii_flow_geometry: connector continuity broken
│   └── char_wide: em dash or CJK glyph in monospace
├── Markdown structure
│   ├── md_missing_section: required H2 absent
│   ├── md_h1_count: zero or multiple H1
│   └── md_heading_order: H3 before any H2
├── Tables
│   ├── table_missing_row: required row by key absent
│   ├── table_column_count: rows have different column counts
│   └── table_separator_dashes: header separator malformed
└── Links
    ├── link_broken_target: prose link points at nonexistent file
    ├── md_broken_uri: source-doc md:// reference not found
    └── md_broken_heading: heading anchor not found in target file
```
<!-- /proof:compiled -->

Every diagnostic includes file, line, column, code, message, and a
did-you-mean suggestion when applicable.

---

## Sample output

```
src/openclaw/03-gateway-bus.source.md:14:1   error    ascii_box_width     bottom border 64 chars, top 63
src/openclaw/05-trust-boundary.source.md:38:1 warning md_missing_section Required H2 'Related' absent
docs/guides/openclaw/01-plugin-lifecycle.md:27:14 error   char_wide          U+2014 EM DASH (2 cols) breaks alignment
docs/guides/openclaw/02-three-channels.md:18:1    error   md_broken_heading  Heading 'three-cahnnels' not found — did you mean 'three-channels'?

FAIL — 8 files checked, 3 errors, 1 warning
```

---

## Wave-side workflow

| Stage | Command | Purpose |
|-------|---------|---------|
| Authoring | edit `design/src/openclaw/*.source.md` | source of truth |
| Local validate | `proof compile src/openclaw --check` | catch errors before commit |
| Local rebuild | `proof compile src/openclaw` | regenerate `.md` outputs |
| Pre-PR check | `proof check .` | full corpus lint |
| CI lint | `proof check . --errors-only -f github` | GitHub Actions annotations |

The team's existing `docs/architecture/three-rings.md` and
`three-engine-model.md` are hand-authored — they predate proof. New
guides should be proof-sourced so the team gains lint coverage as the
guide set grows.

---

## What proof does not catch

<!-- proof:compiled from="proof:tree kind=taxonomy" uri="" -->
```taxonomy
Out of scope
├── Semantic accuracy: does the guide match the spec at design/openclaw/
├── Dead source citations: file path moved, not detected
├── Outdated cite line numbers: src/foo.ts:142 stale because foo.ts changed
└── Spec drift across waves: claws plan vs upstream plan differences
```
<!-- /proof:compiled -->

Semantic accuracy stays a human-review concern. The deep-dive specs at
`design/openclaw/*.md` remain the source of truth; the guides here are the
at-a-glance layer above.

---

## Adding a new guide

<!-- proof:compiled from="proof:tree kind=taxonomy" uri="" -->
```taxonomy
Add a new guide
├── Step 1 Pick atom id: OC-Gnn for the next available number
├── Step 2 Create design/src/openclaw/nn-name.source.md
├── Step 3 Frontmatter atom comment: <!-- atom:NAME (OC-Gnn) -->
├── Step 4 Add table + at least one proof:tree directive
├── Step 5 Cross-link to design/openclaw/spec-name.md for deep dive
├── Step 6 Update 00-orientation.source.md index table
├── Step 7 proof compile src/openclaw
├── Step 8 proof check . — must pass
└── Step 9 commit source plus generated output together
```
<!-- /proof:compiled -->

---

## Why bother

Three classes of bug stop happening:

| Bug | Proof catches |
|-----|---------------|
| ASCII art that looks fine in your editor but mis-aligns when rendered with a different font | yes |
| Em-dash sneaking into a monospace box | yes |
| Cross-reference to a deep-dive spec that has been renamed | yes |
| Required `## Related` section accidentally cut during edit | yes |

These are not hypothetical — `docs/architecture/three-rings.md` was
authored carefully and still ships clean today, but the team's claws skill
docs and external analysis docs have drift. Proof would catch all of it
on the next CI run.

---

## Known proof issues — found while authoring this guide set

We hit three issues writing the guides. Reporting here so the team has them
in one place; the proof maintainer is taking them.

### Issue 1: tree directives flatten 2-level indentation

| Where | What happens |
|-------|--------------|
| Source | `- Parent` then `  - child` (two-space-indented child) |
| Expected | `└── Parent` with `│   ├── child` continuation |
| Actual | `├── Parent` then `├── child` — sibling, not child |
| Affects | `kind=org`, `kind=taxonomy` |
| Severity | medium — content readable, hierarchy lost |
| Workaround | flatten to single level; convey hierarchy in prose or labels |
| Cross-check | reproducible in proof's own corpus at `C:/src/PROOF/docs/guides/05-trees.md` for `kind=org` blocks |

### Issue 2: `kind=outline` silently no-ops on dash syntax

| Where | What happens |
|-------|--------------|
| Source | `kind=outline` with `- foo` / `- bar` body |
| Expected | rendered tree, or warn that outline needs numbered format |
| Actual | wrapper applied (`<!-- proof:compiled -->`) but body preserved verbatim — no rendering |
| Affects | `kind=outline` |
| Severity | medium — silent no-op; users expect dash syntax to work because `kind=org` / `kind=taxonomy` accept it |
| Workaround | use `kind=taxonomy` for dash bullets, `kind=outline` only for numbered format `1. / 1.1` |
| Suggested fix | detect dash body in `kind=outline` and auto-promote OR warn |

### Issue 3: misleading "0 directives" on compile

| Where | What happens |
|-------|--------------|
| Output | `(0 directives)` reported per file even when directives are processed |
| Expected | count processed directives, or rename label |
| Actual | every file shows `(0 directives)` despite `<!-- proof:compiled -->` wrappers being emitted |
| Affects | `proof compile` console output |
| Severity | low — UX confusion only, no functional impact |
| Suggested fix | rename to `(0 deferred)` or report processed count |

---

## Related

- proof tutorial: `C:\src\PROOF\docs\TUTORIAL.md`
- proof guides corpus: `C:\src\PROOF\src\guides\` (sources) + `C:\src\PROOF\docs\guides\` (compiled)
- This repo's proof config: `design/proof.toml`
- [00 Orientation](00-orientation.md) — the index this guide is mentioned in
