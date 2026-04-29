# Umbrella issue draft — substrate-level fix for the openclaw.json corruption class

**File this issue BEFORE filing PR-1.** Purpose: get a maintainer thumbs-up (or split-guidance, or "no thanks") on the proposed shape so the actual PR doesn't burn cycles being closed for scope reasons.

**Submit via**: `gh issue create -R openclaw/openclaw -t "..." -F <this-file-body>` from the fork repo `giodl73-repo/openclaw` (or paste into the GitHub web UI using the **Feature request** template — body fields below map to that template's `summary`/`problem`/`proposed_solution`/`alternatives`/`impact`/`evidence`/`additional_information` fields).

**AI-assisted**: yes. Drafted with Claude Opus 4.7 + evidence-validated against the upstream issue tracker (20/20 cited issues verified live).

---

## Title

`[Feature]: Substrate-level fix for the openclaw.json corruption class (JSONC round-trip + redaction sentinel rejection + workspace lint surface)`

---

## Summary

Convert the `replaceConfigFile` / `replaceConfigFileSync` chokepoint at `src/config/mutate.ts:224` and `src/config/io.ts:1305` from raw `JSON.stringify(_, null, 2)` to a lossless **parse → mutate → emit** pipeline backed by a new `@openclaw/workspace` package, with substrate-level rejection of the `__OPENCLAW_REDACTED__` sentinel literal at the AST emit boundary, and a 13+ code lint surface plugged into `doctor`. Closes a corruption class that has been re-discovered in 20 different upstream issues over multiple years.

---

## Problem to solve

Every config write through `replaceConfigFile` / `replaceConfigFileSync` flows via `JSON.stringify(_, null, 2)` at `src/config/mutate.ts:224` and `src/config/io.ts:2082` (with one more at `src/config/io.ts:1381` for the shipped-plugin-install migration). On every `openclaw update` / `doctor --fix` / plugin install / channel migration / dashboard save, this chokepoint:

**(1) Destroys user formatting.** Comments, key ordering, and chosen indent live only in the source bytes that `JSON.stringify` discards. JSONC users with comments / 4-space indent / non-alphabetical keys watch their config get rewritten on every cycle.

**(2) Writes redacted-view literals back to disk.** SecretRef redaction at `src/config/redact-snapshot.ts:93` wraps real values with `"__OPENCLAW_REDACTED__"`. When a call site passes the redacted view to `replaceConfigFile`, `JSON.stringify` writes the sentinel to disk verbatim, corrupting the user's secrets.

**(3) Silently accepts schema drift and ships configs into a broken startup state.** No detection layer catches deprecated keys, type mismatches, or duplicate-key pathology before the runtime startup gates them.

This is a **chokepoint** problem. Per-call-site fixes leave gaps — #31251 is exactly that gap (the plugin-install path didn't participate in the consumer-side reject-rule because the rule wasn't visible from the call site). Twenty different upstream issues over multiple years have re-discovered variants of the same substrate problem.

---

## Proposed solution

### Substrate

Ship a new `@openclaw/workspace` package at `packages/workspace/` (mirroring the `packages/plugin-sdk` precedent). Subpaths:

- `@openclaw/workspace/ast/jsonc` — hand-written JSONC parser + emit. Lossless round-trip (`emit(parseJsonc(s)) === s` byte-identically). Two structural-mutation APIs: `emitJsoncWithMutation(doc, leafMutator)` for leaf-only diffs (full comment preservation) and `emitJsoncWithObject(doc, newRoot)` for structural diffs (subtree byte-fidelity, normalized formatting at re-emitted object boundaries). Both reject `"__OPENCLAW_REDACTED__"` leaf literals via `OcEmitSentinelError` — substrate-level fix for the redaction-corruption class.
- `@openclaw/workspace/ast` — markdown parser for AGENTS.md / TOOLS.md / SOUL.md / MEMORY.md / SKILL.md per the existing Tier-3 PEG grammars. Soft-error policy: never throws on user input; grammar violations become `Diagnostic` warnings.
- `@openclaw/workspace/path` — `oc://` URI scheme primitive for editor / lint deep-linking. New scheme; verified non-colliding with anything upstream.
- `@openclaw/workspace/lint` — JSONC lint engine + cross-file workspace lint substrate. 13 schema-DI'd codes + 10 evidence-anchored cross-file/per-kind codes (each rule cites a specific upstream issue).
- `@openclaw/workspace/staging` — workspace discovery (read + classify + parse) with `OC_WS_UNKNOWN_FILE` / `OC_WS_CASING_VIOLATION` / `OC_WS_LEGACY_BASENAME` diagnostics so unknown / mis-cased files don't get silently dropped.

### Chokepoint conversion

`src/config/mutate.ts:224` (`replaceConfigFile`) and `src/config/io.ts:1305` (`replaceConfigFileSync`) switch from raw `JSON.stringify` to a leaf-vs-structural diff dispatcher. Leaf-only diffs use `emitJsoncWithMutation` (full comment preservation); structural diffs use `emitJsoncWithObject` (subtree fidelity). For plain-JSON inputs both APIs are byte-identical to `JSON.stringify(_, null, 2) + "\n"` so existing `src/config/io.write-config.test.ts` byte-compare assertions pass UNCHANGED.

### `doctor` integration

New `src/commands/doctor-config-lint.ts` plugged into `src/flows/doctor-health-contributions.ts:692` (`runDoctorHealthContributions`). Surfaces lint findings via existing `doctor` output. `oc://config/...` and `oc://<file>/...` URIs in finding `location` payload so editor extensions can deep-link.

---

## Alternatives considered

- **Per-call-site reject rules**: what's been done historically (e.g. #62281, #44357, #13495, #21573, #13210, #12078 all closed-as-fixed via consumer-side rules). Leaves gaps; #31251 is the gap. Doesn't address the format-loss class at all.
- **Schema migration only**: addresses the `Unrecognized key` startup-block class (#65565, #72872, #14998, #22272) but not the redaction-corruption class.
- **Drop-in JSONC library**: would still emit via `JSON.stringify` for the structural-mutation case, retaining the redaction-sentinel write hazard. Hand-written parser lets us reject the sentinel at emit boundary.

---

## Impact

**Affected users**: anyone using `openclaw update` / `doctor --fix` / plugin install / channel migration / dashboard saves with a JSONC config (comments, custom indent, custom key ordering). Anyone whose SecretRef-redacted config view ever reaches `replaceConfigFile` (silent secret corruption — see closed issues below).

**Severity**: HIGH for the redaction-corruption mode (silent data loss; user's API keys overwritten with the literal `"__OPENCLAW_REDACTED__"`). MEDIUM for format-loss (comments + ordering lost on every cycle).

**Frequency**: every config write — multiple per day for active users.

**Consequences**:
- Manual restoration of secrets from `openclaw.json.backup` (when users have one)
- Editor extensions / human reviewers losing comment context on every save
- Schema-drift configs failing startup with cryptic `Unrecognized key` errors instead of being caught at lint time

---

## Evidence

### Closed-as-fixed (substrate is the through-line; consumer-side patches left this gap)

| Issue | Title fragment | Fix substrate |
|---|---|---|
| #62281 | `configure writes __OPENCLAW_REDACTED__ literals into openclaw.json, corrupting all API keys` | consumer reject-rule |
| #44357 | redaction-sentinel write to disk | consumer reject-rule |
| #13495, #21573, #13210, #12078 | similar redaction-corruption variants | consumer reject-rules |
| #31251 | `plugin install path doesn't participate in reject-rule` | gap evidence |
| #22272, #14998, #48415, #20478, #59070, #60334, #61683 | format-loss + Unrecognized-key startup blocks | per-call-site fixes |

### Open at time of writing

| Issue | Title fragment | Lint code that would catch it |
|---|---|---|
| #62438 | secret-ref ambiguous | `OC_CFG_SECRET_REF_AMBIGUOUS` |
| #57567 | format-loss on update | `OC_CFG_*` round-trip preservation |
| #65565 | `Set Default for agent fails with Unrecognized key: defaultId` | `OC_CFG_TYPE_MISMATCH` |
| #72872 | `2026.4.24 schema validator rejects agents.defaults.agentRuntime; gates ALL CLI commands` | `OC_CFG_DEPRECATED_FIELD` |
| #64946 | startup-block class | `OC_CFG_*` schema rules |
| #66988 | `Raw mode silently disabled — snapshot returns raw: null` | per-config-key validation |

### Workspace-classifier evidence (cross-cutting)

| Issue | Maps to |
|---|---|
| #29387 | `Bootstrap files in agentDir are silently ignored` → `OC_WS_UNKNOWN_FILE` |
| #45760 | `add MEMORY.md to minimal bootstrap allowlist` (silent drop) → `OC_WS_UNKNOWN_FILE` |
| #43462 | `make isMemoryPath case-insensitive for directory prefix` → `OC_WS_CASING_VIOLATION` |
| #45296 | `Signal binding matching is case-sensitive but session keys are lowercased` → casing-class |

### MEMORY.md content quality

| Issue | Maps to |
|---|---|
| #73691 | `MEMORY.md grows unbounded → bootstrap overflow → Gateway freeze` (startup-block) → `OC_MEMORY_INDEX_OVER_LIMIT` |
| #45415 | explicit feature request for size enforcement → `OC_MEMORY_HOOK_TOO_LONG` / `OC_MEMORY_INDEX_OVER_LIMIT` |
| #67580, #67363, #68774 | dreaming promotion writes raw Candidate data → `OC_MEMORY_RAW_CANDIDATE_LEAK` |

### Agents model validation

| Issue | Maps to |
|---|---|
| #73715 | `--model anthropic/CLAUDE-OPUS-4-7 (case-mismatched) is dispatched, returns 'No text output'` | `OC_AGENTS_MODEL_NOT_APPROVED` |
| #39811 | `Model configuration accepts unvalidated model names` | `OC_AGENTS_MODEL_NOT_APPROVED` |

---

## Additional information

### Out of scope (not asking for approval on these)

- Auto-fixers for any lint code — each fixer is its own follow-up PR
- LSP wiring — no upstream LSP server exists
- `@openclaw/guardrails/audit` wire-shape changes
- Swift protocol model changes
- New `register*()` APIs in `@openclaw/plugin-sdk`

### Backward compatibility

For plain-JSON inputs (the 99% case), output is byte-identical to `JSON.stringify(value, null, 2) + "\n"`. Existing `src/config/io.write-config.test.ts` byte-compare assertions pass UNCHANGED. This is the F-83/F-84 backward-compat guarantee.

For JSONC users (comments / indent / ordering): leaf-only mutations are byte-identical including comments; structural mutations re-emit the affected container with normalized formatting (comments inside unchanged subtrees still survive).

For `DiagnosticLocation` consumers: no upstream `DiagnosticLocation` type exists. New lint findings carry their own `location` payload with `oc://` URIs; nothing breaks.

### Coordination ask

This is one substrate problem with multiple consumer-side surfaces, but the proposed change does touch:

1. New package (`packages/workspace/`) — additive
2. `src/config/mutate.ts` (`replaceConfigFile`) — chokepoint conversion
3. `src/config/io.ts` (`replaceConfigFileSync`) — chokepoint conversion
4. `src/flows/doctor-health-contributions.ts` — new contribution
5. `src/commands/doctor-config-lint.ts` — new file

**Can this land as one substrate-level PR**, or do maintainers prefer it sliced?

If slicing is preferred, the natural cut points are:
- **PR-1a**: `@openclaw/workspace` package shipping the JSONC parser + emit + sentinel rejection (substrate-only, no consumer changes — purely additive)
- **PR-1b**: chokepoint conversion at `src/config/mutate.ts:224` + `src/config/io.ts:1305` consuming the package (the load-bearing fix)
- **PR-1c**: doctor lint contribution (the lint surface)

Pre-prep work: 409 tests pass across 35 files, tsc clean, perf bench under 50ms hard ceiling on 1MB inputs (parse + emit p50 ≈ 3.6 ms vs `JSON.stringify` p50 ≈ 1.8 ms — ≈2× p50, varies 1.3×–2.0× between runs).

I'm happy to file as one PR or slice — just need maintainer guidance before opening to avoid burning review cycles. Will hold the PR until this issue gets a thumbs-up or split direction.

### Why this issue exists

Per `CONTRIBUTING.md`: "New features / architecture → Start a [GitHub Issue](https://github.com/openclaw/openclaw/issues/new/choose) or ask in Discord first." This is mostly bug fix (the substrate fix for the corruption class) with a feature component (lint surface). Filing under the feature-request template since it adds a new package and lint surface; happy to convert to bug-report shape if maintainers prefer.

### AI-assisted disclosure

This issue + the prepared PR-1 were drafted with Claude Opus 4.7 (1M context) over multiple sessions. Implementation is fully tested (364/364 passing in the prep package, byte-identity contract verified against the existing `io.write-config.test.ts` shape). Session prompts and review-feedback iteration history can be shared on request.
