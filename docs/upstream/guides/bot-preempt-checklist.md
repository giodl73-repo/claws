---
title: Bot Pre-empt Checklist — Greptile + Copilot + chatgpt-codex review trio
status: draft
applies_to:
  - PR-1 (@openclaw/workspace + lint surface + oc://config URI scheme + doctor migration emit)
  - PR-2 (OC-4 stripFrontMatter raw-preserve)
  - PR-3 (@openclaw/guardrails)
  - PR-4 (OC-7 conjunctive merger)
  - PR-5 (@openclaw/policy)
  - PR-6 (@openclaw/snap)
upstream_baseline: openclaw/openclaw HEAD dd643c82b (2026-04-28 pull)
companion_to:
  - docs/upstream/specs/UG-upstream.md § 2 (bot-reviewer operating constraints)
  - docs/upstream/guides/adapter-audits.md (verdicts cited in §2.5 + §3.10)
  - docs/upstream/guides/post-merge-verification.md (triggers re-empt-pass on trunk advance)
---

# Bot Pre-empt Checklist

Operational playbook for landing PRs against `github.com/openclaw/openclaw`
through the **Greptile + Copilot + chatgpt-codex** review trio. Every
contribution-wave PR carries §3 of this checklist as a section in its
description.

## §1 The reviewer trio

Upstream uses three automated reviewers in addition to human maintainers:

| Reviewer          | Cares about                                                                                    | Common verdict patterns                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Greptile**      | Cross-file consistency, perf regressions in hot paths, type narrowing, subtle behavior changes | Flags untyped JSON entry, missing baseline-hash refresh, `any`-typed boundary, hot-path generic try/catch                                       |
| **Copilot**       | Idioms, naming, comment density, duplicate helpers                                             | Flags duplicate utility, inconsistent naming, missing JSDoc on public symbol, helper that lives in the wrong module                             |
| **chatgpt-codex** | Security posture, plugin tenancy, input validation, prototype pollution                        | Flags caller-supplied `pluginId`, missing Zod schema at host boundary, missing JSON size cap, prototype-pollution paths in plugin payload reads |

Median time to first review: **<4 hours**. The trio enforces the **10-PR-per-author cap** (auto-close at 11) and the **2-open-at-a-time** culture (more than two open from the same author triggers reviewer pushback). PR descriptions that lead with explicit core-not-extension justification close in **median <4 hours with 1 round of changes**; descriptions that read as extension/skill-shaped get auto-closed with `r:third-party-extension` or `r:skill` labels.

**The trio does not negotiate.** The pre-empt rules below are not "what the bots probably want" — they are the rules the bots enforce. Treat the checklist as a hard precondition for opening, not a polish pass after.

## §2 The 10 operating constraints

Normative reference: `docs/upstream/specs/UG-upstream.md` § 2.1.

1. **`pluginId`-scoped registration** — every `register*()` API takes `pluginId` from the authenticated caller, never from payload. Spoofing a peer plugin's identity breaks chain-of-custody. (F-01 / BOT-P-001)
2. **Host-boundary input validation** — every plugin-supplied field is validated with a Zod schema at the boundary. Untyped JSON does not reach internals. (F-05 / BOT-V-001)
3. **No prototype-pollution paths in plugin payload reads** — `__proto__`, `constructor.prototype`, and `Object.assign` against untrusted objects are forbidden. (F-06 / BOT-V-002)
4. **JSON payload size cap** — 1MB default. Configurable per plugin, never disabled. (F-07 / BOT-V-003)
5. **No generic `try/catch` in hot path** — failure modes are distinguished (parse error vs IO error vs runtime error vs schema error) so observability isn't a soup. (chatgpt-codex pattern from upstream review history.)
6. **DRY helpers** — shared utilities live in **one** module per concern. Duplicate helpers in two modules trigger Copilot pushback. (Pattern from upstream review #72287.)
7. **Public-API addition refreshes baseline hash** — every change to a public symbol regenerates `docs/.generated/plugin-sdk-api-baseline.sha256` in the same commit. CI fails otherwise. (F-12 / BOT-B-001)
8. **Public-API addition updates SDK overview table** — `docs/sdk-overview.md` table gains a row for the new symbol in the same commit. (F-13 / BOT-B-002)
9. **Gateway-protocol changes regenerate Swift models** — both `apps/macos/Sources/OpenClawProtocol/GatewayModels.swift` and `apps/shared/OpenClawKit/Sources/OpenClawProtocol/GatewayModels.swift` regenerate in the same commit. (F-15 / BOT-S-001)
10. **CHANGELOG entry appended at end of target section** — not mid-section. Section ordering is preserved across releases. (F-12 corollary; see CHANGELOG mid-section anti-pattern.)

## §3 Per-PR checklist (copy-paste into PR description)

```markdown
### Bot pre-empt checklist

- [ ] PR description leads with **core-not-extension justification** (paragraph below the headline; explains why this can't be an extension or skill)
- [ ] No keywords trigger `r:third-party-extension` / `r:skill` (`scripts/scan-pr-body.sh PR-DESCRIPTION.md` exits 0 — every match of the §3.2 regex is a §3.2-recognised architectural carve-out, OR there are no matches; NEVER-SAFE phrases from §3.2 produce non-zero exit)
- [ ] **Public-API additions**: `docs/.generated/plugin-sdk-api-baseline.sha256` refreshed in same commit
- [ ] **Public-API additions**: `docs/sdk-overview.md` table updated with new symbol(s) in same commit
- [ ] **Gateway protocol changes**: Swift models regenerated at both `apps/macos/.../GatewayModels.swift` and `apps/shared/OpenClawKit/.../GatewayModels.swift` in same commit
- [ ] **Every `register*()` / `pluginPatch` / `sessions` API**: `pluginId` taken from authenticated caller, never from payload
- [ ] **Every host-boundary entry**: Zod schema validates input, rejects with structured error code
- [ ] **No `__proto__` / prototype-pollution paths** in plugin payload reads
- [ ] **JSON size cap** present (1MB default)
- [ ] **No generic `try/catch` in hot path**; failure modes distinguished (parse vs IO vs runtime vs schema)
- [ ] **No duplicate helpers**; shared utilities live in one module per concern
- [ ] **CHANGELOG entry** appended at END of target section (not mid-section)
```

### §3.1 Core-not-extension justification template

PR descriptions for any new package or new public API lead with one paragraph in this shape:

> This PR adds **<package or symbol>** to OpenClaw core. The `r:third-party-extension` auto-close exists for good reason — but **<symbol>** is structurally core because **<one specific reason>**: e.g., it sits below every config-mutation path, every governance plugin imports it as a peer dependency, every gateway protocol consumer needs the shape. Doing it as an extension would force every consumer to opt in (and produce <specific anti-pattern, e.g., #N1255-style fragmentation>); doing it at the chokepoint means every consumer benefits transparently.

PR-1 leads with the lossless `replaceConfigFile` chokepoint argument. PR-3 leads with the audit-stream substrate for governance plugins. PR-5 leads with the generator-emitted plugin needing the registration vocabulary defined in `@openclaw/plugin-sdk`.

### §3.2 Auto-close keyword scan

Bot-reviewer regex pattern (canonical):

```
(?i)(third.?party|extension|skill|clawhub)
```

The regex matches frequently in legitimate architectural prose; the §3 checkbox above asks for "every match is a recognised carve-out OR no matches," not "zero matches verbatim." Run `scripts/scan-pr-body.sh PR-DESCRIPTION.md` to enforce mechanically: it greps for the pattern, then for each match decides via the carve-out / NEVER-SAFE lists below.

**Safe carve-outs** (regex matches, but the bot trio reads context):

- `third-party-{compatible|interop|library|format}` — interoperability descriptors, not extension claims
- `extension-point`, `extension-mechanism`, `extension to <symbol>` (when `<symbol>` is a TS/JS/architectural concept like `extension to OpenClaw's diagnostic shape`) — architectural terms
- `extension` inside `WorkspaceFileKind`, type names, file paths (`.tsx extension`), or other code-shaped contexts
- `SKILL` / `skill` inside `WorkspaceFileKind` enum, file names (`SKILL.md`), or describing the workspace-file kind by name
- Quoted occurrences (in backticks or markdown code-fences) — clearly referring to symbols

**NEVER-SAFE phrases** (any occurrence triggers the auto-close):

- `third-party plugin`, `third-party extension`, `third-party skill`
- `extension to OpenClaw` (NOT preceded by a TS/architectural symbol)
- `OpenClaw skill`, `OpenClaw extension`
- `ClawHub`, `Claw Hub`, `clawhub`
- `r:third-party`, `r:skill`, `r:extension`
- `make this an extension`, `ship as an extension`, `ship as a skill`

PR descriptions containing any NEVER-SAFE phrase get auto-closed regardless of merit. Use `scan-pr-body.sh` to flag these mechanically before push.

## §4 Pre-flight commands

Run locally before pushing the PR. Each command's exit code is the gate.

```bash
# Public-API baseline + sdk-overview pre-flight (run in openclaw-core checkout)
npm run gen:baselines
git diff docs/.generated/plugin-sdk-api-baseline.sha256 docs/sdk-overview.md
# If diff is empty, no public-API surface changed. If non-empty, both files
# must be staged and committed in the same commit as the source change.

# Auto-close keyword scan on PR description (save your draft to PR-DESCRIPTION.md first)
grep -iE "(third.?party|extension|skill|clawhub)" PR-DESCRIPTION.md \
  && echo "AUTO-CLOSE RISK — rewrite hits before pushing" \
  || echo "PR description clear of auto-close triggers"

# Pre-flight tests (workspace + core)
pnpm --filter @openclaw/<package> test
pnpm --filter @openclaw/<package> tsc --noEmit
pnpm test src/config/io.test.ts                                    # if config-touching
pnpm test src/commands/doctor-legacy-config.migrations.test.ts     # if config-touching (hot file: 14 commits / 3 months)

# Swift model regen (only if gateway protocol changed)
npm run gen:swift-protocol
git diff apps/macos/Sources/OpenClawProtocol/GatewayModels.swift \
         apps/shared/OpenClawKit/Sources/OpenClawProtocol/GatewayModels.swift

# CHANGELOG mid-section check (manual — visual inspection of the diff context)
git diff CHANGELOG.md
# Confirm the new entry sits at the END of the target section, not the top or middle.
```

## §5 Reviewer-comment patterns to pre-empt

Top categories of reviewer pushback observed in upstream history (with anchor PR # for reference). Pre-empting these in the description / code prevents the round-trip.

| Category          | What the bot says                                                 | Pre-empt by                                                                         |
| ----------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Plugin tenancy    | "caller-supplied `pluginId` allows spoofing"                      | Take `pluginId` from authenticated caller; cite §2 rule 1 in description            |
| Memory leaks      | "timer not cleared on unsubscribe"                                | Bounded retention + explicit cleanup in `dispose()` / `unsubscribe()`               |
| Untyped input     | "boundary accepts `unknown`; no validation"                       | Zod schema at boundary; cite §2 rule 2                                              |
| Behavior parity   | "this changes behavior for <case>; no test asserting equivalence" | Add backward-compat test (cf. PR-1's plain-JSON case); cite the test in description |
| CHANGELOG drift   | "CHANGELOG entry inserted mid-section"                            | Append at end of target section; cite §2 rule 10                                    |
| Generic catch     | "`catch (e)` in hot path masks failure modes"                     | Distinguish error sources with named error types; cite §2 rule 5 (PR #72287 anchor) |
| Schema exports    | "schema imported but not exported from package"                   | Re-export Zod schema from package root; check `dist/index.d.ts` after build         |
| Duplicate helpers | "this util duplicates `<other-file>:fn`"                          | One module per concern; cite §2 rule 6 (PR #72287 anchor)                           |

## §6 Citation anchors (back to UG-upstream § 2.1)

| Constraint                      | Spec anchor          | Checklist item                      |
| ------------------------------- | -------------------- | ----------------------------------- |
| pluginId scoping                | UG-upstream § 2.1.1  | §3 item 6                           |
| Host-boundary validation        | UG-upstream § 2.1.2  | §3 item 7                           |
| Prototype-pollution prohibition | UG-upstream § 2.1.3  | §3 item 8                           |
| JSON size cap                   | UG-upstream § 2.1.4  | §3 item 9                           |
| No generic try/catch            | UG-upstream § 2.1.5  | §3 item 10                          |
| DRY helpers                     | UG-upstream § 2.1.6  | §3 item 11                          |
| Baseline hash refresh           | UG-upstream § 2.1.7  | §3 item 3                           |
| SDK overview refresh            | UG-upstream § 2.1.8  | §3 item 4                           |
| Swift models regen              | UG-upstream § 2.1.9  | §3 item 5                           |
| CHANGELOG end-of-section        | UG-upstream § 2.1.10 | §3 item 12                          |
| 10-PR cap + 2-open culture      | UG-upstream § 2.2    | (wave-level constraint, not per-PR) |
| Bot-reviewer trio               | UG-upstream § 2.3    | §1 of this guide                    |

## §7 Versioning

This checklist is at v0.1 (initial publication 2026-04-28). When upstream's
auto-close labels evolve or new bot-reviewer categories emerge, the keyword
scan list (§3.2) and reviewer-comment patterns (§5) update; the 10
operating constraints (§2) are stable and version with the spec.
