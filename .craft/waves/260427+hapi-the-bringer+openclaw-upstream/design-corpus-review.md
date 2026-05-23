# `design/openclaw/` corpus review for PR-1

Read 31 docs in `C:\src\claws\design\openclaw\` (review run 2026-04-28 evening). Findings ranked so a tired reader can act on just the top items.

## BLOCKING (verify before file)

### #1 — openclaw.json read path is JSON5-permissive; write path is strict-JSON

**Source**: `C:\src\openclaw-core\src\utils\parse-json-compat.ts` (the actual implementation):

```ts
export function parseJsonWithJson5Fallback(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return JSON5.parse(raw);
  }
}
```

Intent: try strict JSON first (fast path), fall back to JSON5 if that fails (slow path). The function accepts the FULL JSON5 superset.

**Asymmetry**: read path is JSON5-permissive but write path is `JSON.stringify(_, null, 2)` — strict JSON. So upstream today already silently flattens any JSON5 (or JSONC!) dialect on every `replaceConfigFile` call. Our PR-1 is what STOPS that.

**Decision: Option B** (locked in 2026-04-28 evening).

Read JSON5 superset (full input tolerance), emit JSONC (comments + trailing commas preserved; single-quoted strings normalized to double-quoted; unquoted keys normalized to quoted). Net effect:
- JSON-only users (90%+): byte-identical output (JSONC-of-strict-JSON ≡ strict-JSON).
- JSONC users (the people PR-1 exists for): comments + trailing commas survive.
- JSON5-only users (rare): one-time normalization on first write, then stable JSONC.

Plus optional `OC_CFG_PREFER_JSONC` info-level lint code to surface the normalization (not silent).



| Option | Read | Write | Comment-preservation | Effort |
|---|---|---|---|---|
| **B (rec)** | JSON5 superset | JSONC (comments + trailing commas; single-quoted → double, unquoted → quoted on first write) | Yes for JSON/JSONC users (90%+) | ~2 hrs |
| A | JSON5 superset | Strict JSON | No (matches upstream behavior — drops PR-1's headline value) | Same |
| C | JSON5 superset | Round-trip exact dialect | Yes for everyone | ~6 hrs |

**Concrete parser-loosening for B** (the work tomorrow if Option B):
1. `parseString`: accept `0x27` (`'`) as quote delimiter
2. `parseObject`: accept identifier-shaped unquoted keys
3. `parseNumber`: accept `+` sign, `0xFF` hex, `.5` leading-decimal, `5.` trailing-decimal
4. `parseValue`: accept `Infinity`, `-Infinity`, `NaN`
5. String escape parser: accept `\v`, `\0`, `\xHH`, line-continuation backslash

Total: ~80 LOC source + ~100 LOC tests.

**Optional add-on**: `OC_CFG_PREFER_JSONC` info lint code that flags JSON5-only constructs with a "consider migrating to JSONC" suggestion. ~30 LOC. Surfaces the silent-normalization rather than letting users be surprised.

## IMPORTANT (frame or fix in PR-1 description)

### #2 — Redaction model is broader than one sentinel string

**Source**: `trust-and-redaction.md:217-273` — SecretRef = `{source, provider, id}`; resolved values **never transit back** into `openclaw.json`.

The substrate principle is "no resolved secret values in config", not "reject one literal". `OcEmitSentinelError` is correct as one instance, but PR-1's framing could pre-empt "why only this string?" by:
- Listing the patterns we'd defend if we generalized (`sk-…`, `ghp_…`, `xox[baprs]-…`, `gsk_…`, `AIza…`, PEM blocks, Bearer tokens — same patterns `redactSensitiveText` uses)
- Explicitly noting that PR-1 is the floor (literal sentinel); broader pattern-matching is a follow-up if upstream wants it.

This is a description tweak, not a code change.

### #3 — Classifier missing `HOOK.md` (.hooks/<id>/HOOK.md)

**Source**: `hook-engine-legacy.md:54, 127-147` — `HOOK.md` with YAML frontmatter (events, requires.bins, os, install) lives under `.hooks/` in workspace tier.

Our classifier doesn't recognize `HOOK.md` or the `.hooks/` directory prefix. Every legitimate HOOK.md in a real workspace will fire `OC_WS_UNKNOWN_FILE` with a misleading did-you-mean. Add `HOOK.md` to canonical basenames + `.hooks/` to directory prefixes. ~10 LOC, ~3 tests.

### #5 — Upstream MEMORY.md format ≠ our structured-parser assumption

**Source**: `extension-pattern-memory.md:138-148` — MEMORY.md is the dreaming-pipeline write target; "configurable scoring policy: `score >= minScore && recallCount >= minRecallCount`."

Our memory parser expects optional `scope:` frontmatter + H2 entries. Upstream MEMORY.md is free-form distilled prose written by memory-core's deep-sleep promotion. Our structured rules (`OC_MEMORY_HOOK_TOO_LONG`, `OC_MEMORY_INDEX_OVER_LIMIT`, `OC_MEMORY_RAW_CANDIDATE_LEAK`) likely false-positive on real upstream MEMORY.md files.

**Tomorrow option**: gate structured-memory rules behind a "looks like H2-headed claws-style" detector and fall back to `note`-severity-only on free-form upstream content. OR downgrade all 4 memory rules to severity `note` for the initial PR.

### #6 — Doctor contribution shape: `note()` helper, NOT JSON

**Source**: `doctor-and-migration.md:142-159` — "Doctor does **not** emit structured JSON by default. Output is human-readable terminal notes via `note()` helper... `emitDoctorNotes()` in `src/commands/doctor/emit-notes.ts` batches + sanitizes notes."

Confirms our `runDoctorHealthContributions` integration point is correct. **PR-1's `doctor-config-lint.ts` must render via `note()`, not as JSON output.** Spot-check the `doctor-config-lint.ts` integration when we apply it to upstream tomorrow.

### #8 — `lobster.yaml` is claws-only — must not ship in upstream extract

**Source**: not in any of the 31 design docs (it's a claws-internal file).

Our classifier currently has `'lobster.yaml': 'config'` with comment `// claws-internal — dropped at upstream extraction`. **Verify the actual upstream extraction step (step 0a tomorrow) strips this entry.** Otherwise an upstream reviewer asks "what is this", and rightly so.

## NOTE (won't change PR-1 but worth knowing)

- **#4** — `DREAMS.md` + `.dreams/` directory exist (memory-core artifacts). Add to classifier eventually.
- **#7** — `MAX_PLUGIN_MANIFEST_BYTES = 256 KB` (`manifest-schema.md:196`). Only relevant if our cross-file rules ever read `openclaw.plugin.json`. They don't today.
- **#9** — Diagnostic event stream (OTel/Prometheus) is the right channel if PR-1 ever emits lint counts as observability. Not needed today.
- **#10** — SDK API baseline `sha256` gate (`sdk-api-baseline.md:188-196`). Only fires if we add to `scripts/lib/plugin-sdk-entrypoints.json`. Verify our package isn't in there.
- **#11** — `isBlockedObjectKey()` filters `__proto__`, `constructor`. If our JSONC AST→object materializer walks user input, we should re-export from `src/infra/prototype-keys.ts` for parity.
- **#12** — Manifest's `legacyPluginIds` field is the upstream alias mechanism — `OC_WS_LEGACY_BASENAME` should NOT fire for files referenced via this mechanism (no overlap today; one defensive test).
- **#13** — Hooks (`inbound_claim` etc.) silently drop later plugins per `hook-engine-typed.md:213`. Not relevant to PR-1.

## What PR-1 got RIGHT

- `replaceConfigFile` ownership: `src/config/` is the canonical owner per AGENTS.md owner-boundary rule. We're on the right side.
- `runDoctorHealthContributions(ctx)` IS the right doctor entry point.
- Manifest-first / owner-boundary rules: PR-1 doesn't add `register*()` APIs, doesn't extend the SDK baseline, doesn't touch protocol codegen. Clean.
- Sentinel rejection IS the correct substrate-level defense, just narrowly framed.
- Doctor lint is *passive discovery*; doctor `--fix` is *active repair*. Our integration is on the passive side, exactly where the design doc puts it.

## Late-night addendum (2026-04-28 — upstream load-pattern map)

After mapping `loadWorkspaceBootstrapFiles` (`agents/workspace.ts:602-667`), `loadSingleSkillDirectory` (`agents/skills/local-loader.ts:50`), `loadHookFromDir` (`hooks/workspace.ts:83-148`), and `resolveConfigPath` (`config/paths.ts:145-180`), three corrections to the classifier:

### Correction A: drop `workflows/` / `roles/` / `governance/` directory prefixes

**Reality**: no upstream loader searches these directories. Pure speculation.

**Fix tomorrow**: remove from `DIRECTORY_PREFIX_MAP` in `classify.ts`. If we want forward-compat for future community conventions, gate them behind an opt-in `extraDirectoryPrefixes` option on the classifier. Don't ship them as ambient.

### Correction B: drop `DREAMS.md` from classifier

**Reality**: no upstream loader for `DREAMS.md`. The design doc mentions it as a memory-core dreaming-pipeline write-target, but the corresponding read code doesn't exist. We added it speculatively.

**Fix tomorrow**: remove from `ROOT_BASENAME_MAP`. Remove `'dreams'` from `WorkspaceFileKind` union. Remove `.dreams/` from `DIRECTORY_PREFIX_MAP`. Drop the test cases.

### Correction C: re-examine `memory.md` (lowercase) legacy

**Reality**: bootstrap loading is **case-sensitive everywhere**. `VALID_BOOTSTRAP_NAMES` is a literal Set; no `.toLowerCase()` in the loader. The earlier survey's claim that "memory.md is legacy-tolerated" was wrong — files with lowercase basenames are silently dropped by upstream.

**Fix tomorrow**: either:
- **Drop `LEGACY_BASENAME_MAP` entirely** — the classifier shouldn't pretend lowercase is loaded when upstream silently drops it.
- OR keep it but reframe `OC_WS_LEGACY_BASENAME` as "this file is invisible to upstream — rename to UPPERCASE.md to make it load." That's actually a STRONGER warning than "deprecated", since the file effectively doesn't exist from upstream's POV.

The latter framing is more useful. Bump the diagnostic message to make the consequences explicit.

### Note: `openclaw.json` at workspace root

**Reality**: upstream reads from `~/.openclaw/openclaw.json` (state dir). The `$OPENCLAW_CONFIG_PATH` env var allows redirecting to a project-local file, so a workspace `openclaw.json` IS reachable but only via env-var override.

**Decision**: keep the workspace-root classifier entry. Document in EXTENDING.md that this catches the env-var-redirected case, not the default state-dir read.

## Tomorrow's checklist (in priority order)

1. **Verify JSON5 tolerance** in our `parseJsonc` — read the parser, decide between loosen / document / smoke-test (Finding #1, BLOCKING).
2. **Add `HOOK.md` + `.hooks/` to classifier** with one positive test (Finding #3, IMPORTANT, ~15 min).
3. **Add `DREAMS.md` + `.dreams/` to classifier** (Finding #4, NOTE, fold into the same commit as #3).
4. **Gate or downgrade MEMORY.md structural rules** (Finding #5, IMPORTANT) — recommend severity downgrade to `note` for the 4 memory rules, with docstring noting they're tuned for claws-style MEMORY.md and may not apply cleanly to upstream's free-form distilled MEMORY.md.
5. **Tweak PR-1 redaction framing** to acknowledge the broader principle (Finding #2, IMPORTANT, ~5 min description edit).
6. **Verify `doctor-config-lint.ts` renders via `note()`** when we wire it upstream (Finding #6, verification step during step 0a).
7. **Confirm upstream extraction strips `lobster.yaml`** (Finding #8, verification step during step 0a).

Total estimate: ~2 hours tomorrow before file. JSON5 tolerance is the long pole.
