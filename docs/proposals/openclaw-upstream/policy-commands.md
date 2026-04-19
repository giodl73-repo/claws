# `openclaw policy` — Subcommand Group Spec

**Not a package**: a group of subcommands contributed to the existing `openclaw` CLI.
**Powered by**: `@openclaw/policy` (library)
**Status**: Proposal (draft)
**Date**: 2026-04-18
**Companion to**: `openclaw-upstream-spec.md` (main spec, §3) · `openclaw-upstream-brief.md` (Peter-facing brief)

---

## Summary

A flat `policy` subcommand group on the existing `openclaw` CLI — no sibling binary, no sub-groups. Nine verbs; snapshot management (list/promote/rollback/serve) is the peer `openclaw snap` group (see `snap.md`), not part of policy.

- **`check`** — parse + validate source files; diagnostics only (fast, in-editor-friendly)
- **`generate`** — run the generator; write `policy-ir.json` + `gateway-plugin.ts` + `audit-manifest.json` into `.openclaw/policy/` inside the workspace
- **`watch`** — continuous `check` on file change; tight dev loop
- **`comply`** — compliance rubric run (signed `ComplianceReport`)
- **`test`** — run YAML scenarios against the current workspace
- **`sim`** — local mock OC gateway (agent-facing; for dev loop)
- **`report`** — render compliance / audit / snapshot-diff to markdown / HTML / JSON / PDF
- **`verify`** — hash-chain integrity check on the audit stream
- **`diff`** — semantic PolicyIR diff between two snapshots (also used by `openclaw snap diff` which delegates here)

Plus global meta commands absorbed into the existing `openclaw` CLI rather than duplicated under `policy`:

- `openclaw doctor` — grows policy-specific checks (generator version match, hook wiring, cache state, permissions)
- `openclaw upgrade` — grows policy-artifact migration (re-generate snapshots against new PolicyIR)

The library behind every command is `@openclaw/policy`. These handlers add zero business logic — they parse argv, call library functions, and render to the terminal.

---

## Motivation

Developers author workspace files in an editor. They need fast feedback: is SOUL.md parseable? Is the `args_from` chain valid? Did they accidentally mark an R5 tool fail-open? Running the full generation every edit is overkill — the Parse → Extract → Analyze phases produce all the diagnostics they want, without Emit.

They also need a one-command way to produce the artifacts: `generate` → files written to `.openclaw/policy/` → upload + register via snap. And they need to reason about history: which snapshots exist, what changed between them, how to roll back.

`openclaw policy` is that surface. It's what a developer types at the terminal; it's what CI calls in its pre-merge check; it's what an editor's "run on save" hook invokes. But it lives inside the existing `openclaw` CLI — one install, one tool, one `--help` tree — not a sibling binary.

---

## Interface

```bash
# Dev loop + generate
openclaw policy check                              # parse + validate workspace; diagnostics only
openclaw policy check --file SOUL.md               # single-file check
openclaw policy watch                              # re-run check on save; exits on Ctrl-C
openclaw policy generate                           # write artifacts into .openclaw/policy/

# Verify, test, simulate, render, diff
openclaw policy comply --rubric soc2               # rubric eval → signed ComplianceReport
openclaw policy test                               # run YAML scenarios against current workspace
openclaw policy sim --port 8443                    # local mock OC gateway — agents point at this
openclaw policy report --kind audit                # render compliance / audit / snapshot-diff
openclaw policy verify                             # hash-chain integrity on the audit stream
openclaw policy diff <id1> <id2>                   # semantic PolicyIR diff between two snapshots

# Snapshot + staging management is the peer `openclaw snap` group (see snap-commands.md):
#   openclaw snap stage on | off              — staging toggle (default: off)
#   openclaw snap status                      — working tree + stage + drafts + current
#   openclaw snap upload [--promote]          — commit staged → draft [→ current]
#   openclaw snap list | diff | checkout | promote | rollback | discard | serve

# Global meta — existing openclaw commands grow policy awareness
openclaw doctor                                    # includes policy-generator checks
openclaw doctor --fix                              # auto-fix safe items (cache reset, missing dirs)
openclaw upgrade                                   # migrates policy artifacts alongside other OC state
openclaw upgrade --check                           # dry run; show what would change
```

Representative session:

```bash
$ openclaw policy check
SOUL.md:12:1 error R5 fail-closed violation (R5-FAIL-CLOSED)
  'send-email' tool is declared R5 with fail-open.
  R5 fail-open is non-waivable.

1 error, 0 warnings. Fix and retry.

$ openclaw policy generate
Generated into .openclaw/policy/
    policy-ir.json             ( 18 KB )
    gateway-plugin.ts          ( 14 KB )
    audit-manifest.json        (  2 KB )
  diagnostics: 0 error, 2 warnings (see report.txt)

$ openclaw snap diff sha256:3a7f sha256:4c01
  SOUL.md      1 deny rule added
  TOOLS.md     send-email: R4 → R5 (raised)
  AGENTS.md    (unchanged)
```

---

## Semantics / Behavior

### `openclaw policy check` — Parse → Extract → Analyze only

No Emit phase. Produces diagnostics, not artifacts. Fast enough for editor-on-save or pre-commit hooks. `--file <path>` scopes to a single file for even faster feedback, though cross-file rules are skipped in single-file mode and flagged in the output.

Per-file rule table (grouped):

| Category | Rule | Severity |
|----------|------|----------|
| **Structural** | Bootstrap file exists (SOUL, USER, AGENTS, TOOLS, IDENTITY) | error if missing required |
| | Markdown is parseable | error |
| | YAML frontmatter is valid (SKILL.md) | error |
| **Semantic** | Deny rules in SOUL.md parse to known patterns | warning if ambiguous |
| | Models in allowlist are known identifiers | warning |
| | OBO scope in USER.md is well-formed | error |
| | Delegation map in AGENTS.md references existing agents | error |
| | TOOLS.md `args_from` sources are valid (user_prompt, tool_output.*, memory.*, agent_literal) | error |
| | R-tier classifications are in 0..5 | error |
| **Cross-file** | Every agent in AGENTS.md delegation map has a SOUL or can inherit | warning |
| | Every skill capability is reachable through declared tools | warning |
| | `args_from` transitive chains don't cycle | error (OC-POLICY-E230) |
| **Governance-fatal** | R5 fail-open is declared anywhere | **error, non-waivable** |
| | IRREVERSIBLE_EXTERNAL capability without `args_from` | error (OC-POLICY-E233) |
| | R3+ tool consuming non-`user_prompt` without declared provenance | error (OC-POLICY-E231) |
| **Secrets** | `@openclaw/guardrails/secrets` findings at `confidence: 'high'` | error |
| **Sensitivity** | RESTRICTED content reaches R1/R2 tool without propagation | error |

Diagnostic shape is LSP-compatible so editors render inline:

```
SOUL.md:12:1 error R5 fail-closed violation (R5-FAIL-CLOSED)
  'send-email' tool is declared R5 with fail-open.
  R5 fail-open is non-waivable.
```

### `openclaw policy generate` — write artifacts into the workspace

Runs `generate({ workspaceRoot })` from `@openclaw/policy` and writes three files into `.openclaw/policy/` inside the workspace: `policy-ir.json`, `gateway-plugin.ts`, `audit-manifest.json`. Every run writes the full artifact set — no target flag. Consumers that only want the IR read `policy-ir.json` and ignore the plugin file. Deterministic and re-runnable: same source + same generator version → byte-identical output. Exit code: 0 if no errors (warnings don't block); non-zero if any governance-fatal or structural error fires.

### `openclaw policy comply` — rubric evaluation

`openclaw policy comply --rubric <id>` evaluates the current workspace (or a named snapshot via `--snapshot <id>`) against a rubric and returns a signed `ComplianceReport`. The heavy lifting (rubric evaluation, evidence collection, signing) lives in the library — `evaluateCompliance` is a direct export of `@openclaw/policy`; the CLI is a thin adapter.

### `openclaw policy diff` — semantic PolicyIR diff

`openclaw policy diff <id1> <id2>` reads the PolicyIR from two snapshots (pulled from the local store or a remote snap server, depending on config) and renders a structural diff: deny-rule adds/removes, R-tier changes, `args_from` provenance deltas. Not a raw text diff. Powers `openclaw snap diff` (which delegates to this command under the hood).

### Global meta — how policy folds into `openclaw doctor` / `openclaw upgrade`

Rather than `openclaw policy doctor` and `openclaw policy upgrade` (which would duplicate the existing OC commands), the existing commands grow policy awareness:

- `openclaw doctor` — already checks OC installation health; we add a policy-generator section (generator version match, `.openclaw/policy/` state, hook-surface wiring, snapshot-store permissions).
- `openclaw upgrade` — already migrates OC workspace state across versions; we add policy-artifact migration (re-generate snapshots against new PolicyIR, bump PolicyIR major if needed, warn on breaking changes).

### Exit codes

`0` on success. `1` on any governance-fatal or structural error. `2` on internal generator error (bug). `3` on CLI usage error (unknown flag, missing argument). Consistent across all subcommands so CI can pattern-match.

---

## Integration mechanism

Two viable shapes for landing the subcommand group in `openclaw` — Peter's call:

| Option | How it lands | Tradeoff |
|--------|--------------|----------|
| **A. Direct patch** | Subcommand handlers added to `openclaw-core`'s CLI source, importing `@openclaw/policy` | Simpler; one package (`@openclaw/policy`); no extension boundary to maintain |
| **B. CLI plugin** | `@openclaw/policy-commands` registers itself as a plugin into the `openclaw` CLI's extension surface (if one exists or is added) | Cleaner seam for testing; lets third-party command groups follow the same pattern |

Recommendation: **A unless OC already has a CLI plugin system.** The contribution is minimal-surface — `openclaw-core/src/cli/policy/*.ts` + a registration line — and maps one-to-one with `@openclaw/policy` methods.

---

## Versioning

Semver on the library (`@openclaw/policy`). The CLI surface — command names, flag names, exit codes, diagnostic ID prefix (`OC-POLICY-E`) — is the stable contract. Adding a subcommand or flag is a minor bump; renaming a subcommand or changing exit-code semantics is major. Diagnostic IDs are permanent once assigned: a rule may be retired but its ID is never reused. LTS alignment follows `@openclaw/policy`.

---

## Testing

- **L0 unit** — argument parsing round-trips every documented form; exit codes match expectations for each error class; `--file` scoping correctly skips cross-file rules; diagnostic rendering produces LSP-compatible output.
- **L1 integration** — paired with `@openclaw/policy`: `openclaw policy check` fixture workspace → expected diagnostics; `openclaw policy generate` fixture workspace → expected artifacts in `.openclaw/policy/`; `openclaw policy diff` between two known snapshots → expected structural delta.
- **L2 E2E** — full developer flow: edit a workspace, `openclaw policy check` (clean), introduce an R5 fail-open, `openclaw policy check` (error), fix, `openclaw policy generate`, `openclaw snap list` (uploads + shows new snapshot via the peer `snap` group).

---

## Dependencies

Zero `@microsoft/*` imports. The handlers depend only on `@openclaw/policy` (the library) and whatever argv parser `openclaw-core`'s CLI already uses — no new CLI-framework dependency introduced.

---

## Open items

- **Integration mechanism** (above): direct patch vs CLI plugin — depends on whether `openclaw-core` has an extension surface.
- Output format for `openclaw policy generate` — current plan is human-readable text to stdout, JSON on `--json`. Not yet specified in the main spec.
- Whether `openclaw snap rollback` should require confirmation or run unattended. CI wants unattended; developers probably want confirmation. (Lives under `snap`, not `policy`.)
- Autocompletion scripts (bash / zsh / fish) — nice to have; not in the main spec.

---
