# Extending `@openclaw/workspace`

This document describes how to add a new workspace file kind, lint rule, or
discovery diagnostic to the package. The package is intentionally
unopinionated about which file kinds matter — we expect new ones to land
regularly as openclaw grows. The rules below keep that growth honest.

## Adding a new file kind

A "file kind" is a logical category (e.g. `agents`, `memory`, `hook`) that
the workspace classifier maps a path to. Adding one is three steps.

### 1. Pick where the file lives

There are three placement patterns:

| Pattern | Use when | Example |
|---|---|---|
| **Root-anchored basename** | A canonical file lives at the workspace root only. | `AGENTS.md` |
| **Anywhere basename** | A file may legitimately appear nested (e.g. per-skill). | `SKILL.md`, `HOOK.md` |
| **Directory prefix** | Any file inside a known directory belongs to the kind. | `skills/`, `.hooks/` |

Reach for **root-anchored** by default. Prefer **anywhere** only when the
file is intentionally nested in a per-instance directory. **Directory
prefix** is appropriate when the directory is a contained namespace owned
entirely by one kind.

### 2. Register the kind

Edit `src/ast/grammars.generated.ts`:

1. Add the kind to the `WorkspaceFileKind` union (alphabetical).
2. Add the kind to `WORKSPACE_FILE_KINDS` (alphabetical).
3. Add a grammar entry — either a real PEG grammar string (preferred for
   structural validation) or a stub describing the format.

If your kind has no Tier-3 PEG grammar yet, follow the precedent of
`bootstrap` / `hook` / `dreams`: a short stub that documents the format and
references the upstream design doc.

### 3. Wire the classifier

Edit `src/ast/classify.ts` to add ONE of:

- An entry in `ROOT_BASENAME_MAP` (if root-anchored).
- An entry in `ANYWHERE_BASENAME_MAP` (if anywhere-matching).
- An entry in `DIRECTORY_PREFIX_MAP` (if directory-prefixed).

If users sometimes write the basename in non-canonical case (e.g.
`agents.md` instead of `AGENTS.md`), add a corresponding entry to
`ROOT_CASING_VARIANT_MAP` or `ANYWHERE_CASING_VARIANT_MAP`. The discovery
pipeline will emit `OC_WS_CASING_VIOLATION` automatically.

If users had a legacy basename that's deprecated but still tolerated (e.g.
`memory.md` before it became `MEMORY.md`), add to `LEGACY_BASENAME_MAP`.
The discovery pipeline emits `OC_WS_LEGACY_BASENAME` with a rename
suggestion.

### 4. Add tests

`tests/ast/classify-extended.unit.test.ts` should gain at least:

- One positive test (`expect(classify('NEW.md')).toBe('new-kind')`).
- One negative test (root-anchored kinds: nested instance returns `null`).
- One casing-variant test if applicable.

## Adding a structured parser

Most kinds can ship without a structured parser — the default `BaseAst`
parser extracts frontmatter + preamble + H2 blocks, which is enough for
most rules. **Only add a structured parser when you have a lint rule that
needs the structure.**

If you do:

1. Define a per-kind AST type in `src/ast/ast-types.ts`.
   - Extend `BaseAst`.
   - Carry only the fields a downstream consumer needs. Avoid speculative
     ergonomics.
2. Build the parser in `src/ast/parsers/<kind>.ts`.
   - **Soft-error policy**: never throw on user input. Grammar violations
     become `Diagnostic` warnings.
   - Spread `...base` so `ast.raw` continues to be byte-identical to input.
   - Match the grammar's intent — quote it if behavior is non-obvious.
3. Wire dispatch in `src/ast/parse.ts`.
4. Tests under `tests/ast/parsers/<kind>.unit.test.ts`:
   - Positive (well-formed input → expected typed AST).
   - Negative (malformed → expected diagnostic, no throw).
   - Round-trip (`parse(kind, content); ast.raw === content`).
   - At least one adversarial input (empty, whitespace-only, BOM, etc.).

## Adding a lint rule

Lint rules are evidence-anchored. **Each rule MUST cite at least one
upstream issue in its `evidenceIssues` field.** Speculative rules (no
issue tracker evidence) are not accepted; if you believe the rule has
value but no issue exists, file the issue first and link it.

Exception: substrate / cross-file rules where the value is the substrate
itself can have empty `evidenceIssues` IF the rule's docstring explicitly
documents why and the rule is added to the `evidenceExempt` set in
`tests/lint/workspace.unit.test.ts`. Use sparingly.

### Single-file (JSONC) rule

For rules that operate on `openclaw.json` only:

1. Add a `LintCode` member to `src/lint/types.ts`. Use the `OC_CFG_*`
   namespace.
2. Create `src/lint/rules/<rule-name>.ts`. Implement the `LintRule`
   interface.
3. Register in `src/lint/registry.ts`.
4. Test under `tests/lint/<rule-name>.unit.test.ts` with positive +
   negative + at least one schema-DI'd path if applicable.

### Cross-file or markdown rule

For rules that need workspace context (multiple files) or operate on
non-JSONC kinds:

1. Add a `LintCode` member to `src/lint/types.ts`. Use the kind's
   namespace prefix (`OC_AGENTS_*`, `OC_MEMORY_*`, `OC_SKILL_*`, etc.).
2. Create `src/lint/workspace-rules/<rule-name>.ts`. Implement the
   `WorkspaceLintRule` interface. Per-rule docstring must cite evidence
   issues.
3. Register in `src/lint/workspace-registry.ts`.
4. Test under `tests/lint/workspace-rules/<rule-name>.unit.test.ts` with
   positive + negative + wrong-kind hygiene (the rule MUST NOT fire on
   files of an unexpected kind).

### Severity guide

Pick the lowest severity that's still actionable:

| Severity | Use when |
|---|---|
| `error` | Runtime hard-fails or data corruption. The user MUST act. |
| `warn` | Actionable user mistake; could surface as silent bug if ignored. |
| `note` | Best-practice nudge; the user may legitimately ignore. |

Default to `note` if uncertain. It's easier to bump up than to defend a
premature `error`.

## Adding a discovery diagnostic

Discovery diagnostics (`OC_WS_*`) are emitted by `discoverWorkspaceFiles`
when the read+classify pipeline notices something worth surfacing. They
are NOT lint rules — they fire on the workspace shape, not on file
content.

| Code | Severity | Fires when |
|---|---|---|
| `OC_WS_UNKNOWN_FILE` | `info` | Path doesn't classify to any known kind. Includes did-you-mean if within edit-distance ≤3. |
| `OC_WS_CASING_VIOLATION` | `warning` | Lowercase variant of a canonical bootstrap basename (e.g. `agents.md` instead of `AGENTS.md`). |
| `OC_WS_LEGACY_BASENAME` | `warning` | Deprecated basename still tolerated for backward compatibility. |

To add a new code, edit `src/lint/index.ts` (`DiscoveryCode` union and
`ALL_DISCOVERY_CODES`) and `src/staging/discover.ts` (the emission
site). The discovery codes are intentionally narrow — most "I noticed
something about this file" findings belong as a lint rule, not a
discovery diagnostic.

## Telemetry / observability

The package emits diagnostics in-process. It does NOT call out to any
observability backend. Consumers that want to wire findings into OTel /
Prometheus / structured logs should:

1. Run `lint(doc)` or `lintWorkspace(ctx)` to get findings.
2. Translate findings into their backend's event shape.
3. Use `formatOcUri(parsedOcUri)` if they want a stable file-deeplink
   identifier.

We deliberately don't ship a built-in observability adapter so the
package stays dependency-free at runtime.

## Performance budget

Workspace lint runs at-most-once per `doctor` invocation, not in any
per-tool-call hot path. Budget per `lintWorkspace` call:

| Workspace size | Target p50 |
|---|---|
| 10 files | <5 ms |
| 100 files | <50 ms |
| 1000 files | <500 ms |

If a new rule pushes p50 past 50% of these targets, profile and optimize
before merging. The bench at `tests/perf/bench.test.ts` covers the
JSONC parser/emit path; consider extending it for new rule classes.

## Backward-compatibility contract

The package's public API is everything exported from `src/index.ts` and
`src/lint/index.ts`. Changes to:

- `LintFinding` shape, `WorkspaceLintFinding` shape — major break, requires version bump and migration note.
- `LintCode` union — additive only; never remove a code (deprecate via
  `enabledCodes` exclusion if needed).
- `LintSchema` interface — additive only via optional methods.
- `WorkspaceFileKind` union — additive only; never repurpose a kind.

The 13 `OC_CFG_*` rules' behavior is locked by `tests/lint/issue-replay.test.ts`
— don't change rule output without a corresponding fixture update + a
clear changelog entry explaining what an upstream consumer would observe
differently.
