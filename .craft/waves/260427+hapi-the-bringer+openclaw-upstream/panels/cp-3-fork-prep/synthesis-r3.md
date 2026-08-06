---
doc: synthesis-r3
round: 3
panel: cp-3-fork-prep
created: 2026-05-04
panels:
  - R3-claws-repo-steward
  - R3-claws-release-eng
  - R3-claws-platform-eng
  - R3-claws-ciso
  - R3-claws-skill-author-new-hire
  - simplification-audit
---

# R3 cross-package synthesis — internal claws-roles review + simplification

> Merged action list across 5 internal-role panels + 1 simplification audit. R2 was upstream-maintainer-flavored; R3 is **claws-side fork-prep**, asking what we'd flag if we were our own pre-flight gate before pasting the 5 substrates into the openclaw fork.

## Wave-level verdict

**Conditional ship**, with two weight classes:

- **Tier A — boundary leaks (4 items)**: load-bearing, MUST close before fork. The yaml/lobster pack architecture issue is the surprise — it shipped as if `*.lobster` is a universal concept, but it's downstream-specific.
- **Tier B — CI/build hygiene (4 items)**: mechanical, all `npm run build` + small package.json edits.
- **Tier C — last-mile polish (~10 items)**: real but each fix is small. Mostly README parity + flag wiring + JSDoc cleanup.
- **Tier D — simplification (5 items)**: net −160 LoC; CLI helper extraction is the headliner.
- **Tier E — compliance/security (5 BLOCKs from ciso)**: most already explicitly scoped to v0/v1+ in B1 from R2 synthesis; ciso re-flags for Microsoft enterprise specifically.

## Tier A — boundary leaks (BLOCK before fork)

### A1. `lobster.workflow` baked as canonical role in oc-paths-substrate

`oc-paths-substrate/src/plugin-sdk/oc-path/workspace/roles.ts:116-122` defines a Tier-4 canonical role for `*.lobster` workflow files. **`lobster` is a downstream concept** — the workflow runtime, not a substrate concern. Shipping this in oc-paths means upstream's universal role registry knows about a specific consumer's workflow format.

**Fix**: extract canonical role taxonomy into a `WORKSPACE_ROLES_BASE` set + `extraRoles` extension point. Let consumers (claws-side) register `lobster.workflow` as an extension. The substrate ships only the open-vocabulary core.

### A2. Two whole yaml/lobster starter packs are downstream-flavored

- `pinch/src/extensions/oclint-rules-lobster-yaml-starter/` — 4 rules citing `openclaw/lobster #25/#26/#41/#76/#77`, all `appliesTo: '*.lobster'`
- `oc-paths-doctor/src/extensions/ocdoctor-fixers-yaml-starter/` — paired fixers, same provenance

These are **claws-side starter packs masquerading as upstream content**. They reference openclaw/lobster issues, target the lobster workflow file format, and have no analogue for any other yaml dialect.

**Fix options**:

1. Move both packs to a claws-side `claws-rules` package (downstream-only, never ships upstream)
2. Re-genericize the rules to NOT reference `*.lobster` specifically; make them `*.yaml`-applicable; remove the lobster-specific issue refs

Recommend option 1 — the rules are genuinely lobster-specific (e.g., `step/shell-tool-collision` only matters for the lobster runtime).

### A3. `STARTER_IN_PROCESS_TOOLS` contains downstream-specific tool names

`pinch/src/shared/starter-values.ts:65-71` exports a list including `'lobster'` and `'clawd.invoke'`. These are claws/lobster tool names hardcoded as a "starter" universal value.

**Fix**: empty the upstream-shipped list; let consumers register their own in-process tool names via configuration or extension. The starter ships with `[]` plus documentation.

### A4. Test fixture identity hard-codes Microsoft attribution

`tests/fixtures/real/IDENTITY.md:3` reads "Microsoft / claws monorepo team". Test fixtures ship in `npm pack`.

**Fix**: replace fixture content with generic placeholders ("Example Org / Example Team"). Real internal fixtures stay in `tests/fixtures/internal/` (gitignored or downstream-only).

## Tier B — CI/build hygiene (BLOCK before fork-open)

### B1. Stale dist trees missing declared subpath exports

- `lkg-recovery-substrate/dist/` missing 5 declared subpaths (`cli`, `trackers`, `test-harness`, `lint-rules-starter`, `doctor-fixers-starter`)
- `policy-substrate/dist/` missing `policy-lint-rules-starter` and `policy-doctor-fixers-starter`
- `pinch/dist/extensions/oclint-rules-claws/` is leftover dead dist with no backing src

**Fix**: `npm run build` in each affected package; commit. Add a CI script that walks `package.json#exports` and verifies every advertised path resolves to an emitted file. Auto-catches future drift.

### B2. Cross-substrate dep pins use `"*"`

Five package.json files declare cross-substrate deps as `"*"`. Upstream needs `^0.1.0` (semver-compatible).

**Fix**: bulk-replace `"*"` → `"^0.1.0"` in all 5 substrates' `dependencies`. Mechanical.

### B3. `DEPRECATED.md` tombstones reference dead `@bic/*` names

The deprecation tombstones in older packages (`openclaw-policy/DEPRECATED.md`, `openclaw-lkg/DEPRECATED.md`, etc.) point at `@bic/*` replacements. After the rename, those should say `@openclaw/oc-path` / `@openclaw/oc-lint` / `@openclaw/lkg` / `@openclaw/policy`.

**Fix**: sed-replace `@bic/*` → `@openclaw/*` mapping across DEPRECATED.md tombstones. Mechanical.

### B4. No `prepublishOnly` script

None of the 5 substrates have `prepublishOnly` in package.json. Upstream norm is to gate publish on `tsc -p tsconfig.build.json && vitest run`.

**Fix**: add `"prepublishOnly": "npm run build && npm run test"` to each substrate's package.json scripts.

## Tier C — last-mile polish (should-fix at fork-time)

### C1. README asymmetry

Only `oc-paths-substrate` ships a package-root README. The 4 others (pinch, oc-paths-doctor, lkg-recovery-substrate, policy-substrate) have none. Single biggest new-hire on-ramp blocker.

**Fix**: write a one-pager README per substrate covering (a) what this substrate does in one sentence, (b) the public SDK surface (key exports), (c) the CLI (if any), (d) link to PITFALLS.md and to the upstream PR doc.

### C2. `--tier` flag unwired in CLIs

`FixerTier` contract was added in B3 but no CLI surfaces a `--fix-additive` / `--fix-mutating` / `--fix-regenerative` flag. The contract is correct; the operator-facing surface isn't.

**Fix**: pinch and oc-doctor would expose this; oc-doctor has no CLI bin (plugs into upstream `openclaw doctor`), so the flag wiring is the host's responsibility. Document this explicitly in PR-3.

### C3. CLI ergonomics drift across the 4 CLIs

- `--cwd` (oc-paths-substrate) vs positional dir (others)
- `--skip <id>` exact-id (pinch) vs auto-glob detection on `*` or `/` (lkg)
- `installPipeGuard` only on lkg + policy; pinch + path lack it
- `scrubSentinel` declared 5 times across the 4 CLIs (folds with simplification D1)

**Fix**: standardize on positional dir + `--skip <id|glob>` (auto-detection) + `installPipeGuard` everywhere. Pairs with simplification D1 (extract CLI helpers).

### C4. pinch SDK contract gap (last-writer-wins vs throws)

`pinch/src/plugin-sdk/oc-lint/registry.ts` documents re-registering as "last-writer-wins"; `pinch/src/plugin-sdk/oc-lint/api-extension.ts` defines `LintRuleRegistrationError` with code `OC_LINT_DUPLICATE_RULE`. One says silent overwrite, the other says throw.

**Fix**: pick one. Recommend **throw on duplicate at the public `register*` verb**, with a `_clearLintRuleRegistry()` test helper for tests. Last-writer-wins is too easy to depend on accidentally.

### C5. policy-substrate missing `./test-harness` export

pinch / oc-doctor / lkg all ship `./test-harness` subpath exports with rhyming verb sets (`runFixer`, `runRule`, `assertDetects`). policy-substrate does not.

**Fix**: add `./test-harness` to policy-substrate with `runExtractors`, `assertPolicyShape`, `assertDecision` helpers (~80 LoC). Brings policy to canonical-plugin-pattern parity.

### C6. `@module` JSDoc tags drift

lkg + policy SDK source files still have `@module @openclaw/plugin-sdk/lkg` / `@openclaw/plugin-sdk/policy` while package.json names landed as `@openclaw/lkg` / `@openclaw/policy`. Cosmetic but confusing.

**Fix**: bulk-replace `@module @openclaw/plugin-sdk/lkg` → `@module @openclaw/lkg` (and same for policy). Mechanical.

### C7. `requires.sdkVersion` accepted but never validated

Plugins declare `requires: { sdkVersion: '0.1.0' }` on rules / fixers / generators. The registry stores it; **nothing validates against the host's `SDK_VERSION`**.

**Fix**: add a check at registration time — if plugin.requires.sdkVersion's major doesn't match host SDK_VERSION's major, log a warning (not a throw — that breaks plugin-author iteration). Use `checkSdkCompat` (already exists in oc-doctor adapter) consistently across all 3 registries.

### C8. `workspace.json` no `schemaVersion` field

The schema is additive but has no version field at the root. Future migrations have no anchor.

**Fix**: add `version?: '0.1.0'` to `WorkspaceConfig`. Loader logs warning if version is unrecognized but doesn't fail (forward-compat).

### C9. `policyId` rotates on every regen — no fleet-sameness audit

Operators auditing 47 workspaces want to compare "are all of you on the same policy SHAPE?" `policyId` rotates on every regen because it includes `generatedAt`. The shape hash (`computePolicyShapeHash`) is stable across regens but the CLI's `generate` doesn't print it.

**Fix**: `openclaw-policy generate` JSON output adds `shapeHash` field; `openclaw-policy check` JSON output includes it too. Operators grep for shape consistency across the fleet.

### C10. Umbrella CLI dispatcher (task #182, still pending)

4 separate bins (`openclaw-path`, `openclaw-lint`, `openclaw-lkg`, `openclaw-policy`). No `openclaw <verb>` umbrella. Brand fragmentation at pinch (the package is `@openclaw/oc-lint`, the bin is `openclaw-lint`, but docs call the framework `pinch`).

**Fix**: ship `openclaw` umbrella bin that dispatches `openclaw path` / `openclaw pinch` / `openclaw lkg` / `openclaw policy` / `openclaw doctor` (the last delegates to upstream's existing `openclaw doctor`). The `pinch` brand survives as the umbrella verb (`openclaw pinch run`), giving the CLI a brand without owning the bin name.

## Tier D — simplification (~−160 LoC, refactor)

| #   | What                                                                                                                                                                    | Where                    | LoC saved | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------- | ------ |
| D1  | Extract CLI helpers (`safeWrite`, `installPipeGuard`, `isClosedPipeError`, `scrubSentinel`, `SCRUB_PLACEHOLDER`, `emit`, `emitError`) → `@openclaw/oc-path/cli-helpers` | 4 CLIs                   | ~150      | S      |
| D2  | Hoist `_tools-md-scan.ts` to `policy-substrate/src/extensions/_shared/`                                                                                                 | policy lint+doctor packs | ~36       | XS     |
| D3  | Add `parseForKind` dispatch helper to oc-paths-substrate                                                                                                                | 3 CLIs + 2 tests         | ~50       | XS     |
| D4  | Folded into D1 (SCRUB_PLACEHOLDER + workspace section helpers)                                                                                                          | —                        | —         | —      |
| D5  | Add `./test-harness` to policy-substrate                                                                                                                                | new helper               | +80       | S      |

**Net delta**: ~−160 LoC. Qualitative wins bigger than LoC: kills the silent CLI-helper asymmetry (only 2 of 4 CLIs have pipe-guards today), brings policy-substrate to test-harness parity.

**Sequencing**: D2 + B3 first (zero risk), then D3 + C5/D5, then D1 + D4 as one CLI-helpers pass.

## Tier E — compliance/security (mostly already-scoped, ciso re-flag)

These were addressed in B1 (R2 synthesis) with v0/v1+ scope notes. ciso re-flags for explicit Microsoft enterprise:

- **GDPR scrub primitive** — BLOCK for EU. v0 needs `LKGStore.scrub(path)`. (Was Tier 2 B12 in R2 synthesis — agreed deferred to fork; ciso says ship in v0.)
- **Audit chain tamper-evidence** — BLOCK for HIPAA/FedRAMP. Add `prevHash` to `LKGAuditRecord`. (Was R2 B4 — partial; ciso flags the primitive missing.)
- **`evaluate` enumeration** — BLOCK. Add `--allow-enumeration` gate, default `false` in production via `WorkspacePolicyConfig.debugCliAllowed`. (Was R2 B15.)
- **`workspace.json` integrity** — BLOCK for Purview. Plain JSONC at workspace root; `lint.skip: ["*"]` silences governance. Needs LKG-tracking on workspace.json itself + signed-config story. (Was R2 B2 — partial; ciso flags integrity gap remains.)
- **Per-tenant sentinel rotation** — BLOCK for multi-tenant. (Was R2 B1 — covered in threat-model section but documented as v1+.)

Decision needed: which of these become hard-gates for fork-open vs. stay v1+?

## Punchlist — order of operations before fork-open

**Must clear before pasting into the openclaw fork**:

1. **A1-A4**: lobster/yaml boundary leaks. Move starter packs out of upstream-shipped subdirs OR de-lobster the rules. Decide before fork-prep starts.
2. **B1**: rebuild dists for 3 packages; remove dead `oclint-rules-claws/` dist.
3. **B2**: bump `"*"` → `"^0.1.0"` cross-substrate deps.
4. **B3**: refresh DEPRECATED.md tombstone names.
5. **B4**: add `prepublishOnly` scripts.

**Should clear at fork-time (before opening the first PR)**: 6. **C1**: ship 4 missing READMEs. 7. **C4**: pinch register conflict semantics (last-writer-wins vs throws — pick one). 8. **C5**: ship policy-substrate `./test-harness`. 9. **C6**: `@module` JSDoc bulk-fix. 10. **C7**: wire `requires.sdkVersion` validation through 3 registries. 11. **C8**: `workspace.json` `version` field. 12. **C9**: `shapeHash` in policy CLI output. 13. **D1+D4**: extract CLI helpers (kills the silent pipe-guard asymmetry). 14. **D2**: hoist `_tools-md-scan.ts`. 15. **D3**: `parseForKind` helper.

**Discuss with maintainers / explicitly defer**: 16. **C2/C3**: `--tier` flag wiring + CLI ergonomics standardization. 17. **C10**: umbrella CLI dispatcher (task #182). 18. **Tier E** items 1-5: ciso BLOCKers — decide v0 vs v1+ per item.

**Total estimated effort** for fork-open clearing (items 1-5): ~half-day. Fork-time items (6-15): 1-2 days. Discuss-with-maintainers items: depends on direction.

---

🤖 Synthesis from 6 R3 internal-roles panels + simplification audit. Update as items close.
