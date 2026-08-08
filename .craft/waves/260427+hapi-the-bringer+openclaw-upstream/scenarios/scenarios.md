# Hapi the Bringer · Scenarios Catalog

> **Reading note (added 2026-04-30 after the chain consolidation):** PR-N references in Phases 1-3 below use the pre-pivot 6-PR numbering and are sometimes inconsistent across sections (PR-numbering changed multiple times during planning). The canonical chain is now **3 upstream PRs**: PR-1 (`@openclaw/workspace` + frontmatter raw-preserve), PR-2 (LKG carrier), PR-3 (PolicyIR + `ctx.lkgFingerprint` + hook merger conjunctive AND). Phase 4 (`SC-22..SC-39`) was authored post-pivot and is aligned with the 3-PR chain. Mapping in `carve-consumer-catalog.md` § "CHAIN CONSOLIDATION (2026-04-30)".

**Wave**: `260427+hapi-the-bringer+openclaw-upstream`
**Stage**: scenarios
**Date**: 2026-04-27

For this contribution-phase wave, "scenarios" walk what _can go wrong with each upstream PR_ (bot-reviewer pushback, reviewer rejection, merge-conflict, semantic drift) more than runtime-behavior fixtures. Detailed findings are aggregated in `FINDINGS.md` next to this file.

Catalog — 39 scenarios across 4 phases (Phase 4 added 2026-04-30 post-LKG-pivot; SC-26..SC-39 added with waves 5..18 — campaign closes):

## Phase 1 · Bot-reviewer pre-empt (5 scenarios)

The Greptile + Copilot + chatgpt-codex trio reviews every PR. These scenarios pre-empt their P1/P2/P3 categories.

### SC-01 · `upstream/bot-preempt-pluginid-scoping`

**Walk**: A new public API on our packages (`registerToolMetadata`, `registerControlUiDescriptor`, etc.) is called by plugin-X with `pluginId: 'plugin-Y'` in the payload. Bot-reviewer P1: caller-supplied `pluginId` lets plugin-X spoof plugin-Y's state. Mitigation: at every registration boundary, take `pluginId` from the AUTHENTICATED caller, never from the payload.

**Test tier**: L0 unit (per-API)
**Runner**: simulation
**Apply**: Bot-preempt-checklist (H6) gets a "every register*() takes pluginId from caller, validates against payload-supplied claim" rule. PR-2 + PR-4 + PR-5 must each include this defense.
**Findings**: F-01..F-04 (see FINDINGS.md).

### SC-02 · `upstream/bot-preempt-input-validation`

**Walk**: Plugin sends malformed input — `placement: 'INVALID'`, `ttlMs: -1`, `idempotencyKey: <30KB-string>`, session-store with `__proto__` pollution, malformed JSON. Bot-reviewer P1: untyped JS plugin code must not reach internals unvalidated.

**Test tier**: L0 unit + L1 boundary
**Runner**: simulation
**Apply**: Bot-preempt-checklist gets "every host-boundary entry validates with Zod schema, rejects with structured error code, no fallthrough to internals." PR-2 audit-event API + PR-4 policy-generate input + PR-5 snap upload payload all need this.
**Findings**: F-05..F-08.

### SC-03 · `upstream/auto-close-avoidance`

**Walk**: PR-1 description gets read by the bot trio. The bot scans for "extension," "third-party plugin," "skill" framing and slaps `r:third-party-extension` if it triggers — auto-close. PR description must lead with WHY governance must be CORE, not extension.

**Test tier**: L3 acceptance (per-PR description audit)
**Runner**: contract (PR description regex check)
**Apply**: Bot-preempt-checklist gets "PR description opens with 'governance must live in core because...' justification." H6 deliverable must include the regex/keyword list that triggers auto-close.
**Findings**: F-09..F-11.

### SC-04 · `upstream/bot-preempt-baseline-hash-refresh`

**Walk**: PR-1 adds new public types in `@openclaw/workspace`. CI fails because `docs/.generated/plugin-sdk-api-baseline.sha256` not updated. Bot-reviewer flags. Same for `docs/sdk-overview.md` table.

**Test tier**: L3 acceptance (CI hash check)
**Runner**: contract
**Apply**: Bot-preempt-checklist gets "for every public-API addition: regen baseline hash + update sdk-overview table + commit refresh in same PR." Pre-commit script reference helpful but not required.
**Findings**: F-12..F-14.

### SC-05 · `upstream/bot-preempt-swift-models-regen`

**Walk**: PR-4 adds new gateway protocol shapes (e.g., for `openclaw policy comply` HTTP). Swift protocol model files at `apps/macos/Sources/OpenClawProtocol/GatewayModels.swift` and `apps/shared/OpenClawKit/Sources/OpenClawProtocol/GatewayModels.swift` not regenerated. Bot-reviewer flags.

**Test tier**: L3 acceptance
**Runner**: contract
**Apply**: Bot-preempt-checklist gets "for every gateway protocol change: regen Swift models, commit in same PR." PR-4 + PR-5 affected; PR-1 + PR-2 likely not (no gateway protocol surface).
**Findings**: F-15..F-16.

## Phase 2 · Governance correctness (8 scenarios)

The semantic invariants the generator + plugin must hold. Real risk lives here.

### SC-06 · `upstream/oc7-approval-conjunctive-merger`

**Walk**: Three plugins return decisions. Plugin-A: `requireApproval: { title: 'A' }`. Plugin-B: `requireApproval: { title: 'B' }`. Plugin-C: allow. Current upstream merger at `src/plugins/hooks.ts:889-893` uses `??` — first-wins, plugin-B's approval lost. After OC-7: merger uses array accumulation, companion app receives BOTH descriptors; supervisor must approve ALL (conjunctive AND).

**Test tier**: L1 integration (vs current upstream merger fixture)
**Runner**: simulation
**Apply**: PR-3 (OC-7) scope; tests at `openclaw-core/src/plugins/__tests__/hooks-merger.test.ts` (or wherever upstream tests live). Existing tests asserting "first-wins" will break — those break is the proof.
**Findings**: F-17..F-21.

### SC-07 · `upstream/oc7-merger-crash-safety` (W7 deferred)

**Walk**: Plugin-A appends `requireApproval: { title: 'A' }` to its return. Plugin-B THROWS before its return is captured. Plugin-C returns allow. Question: does the merger downgrade to plugin-C's allow, or does plugin-A's approval survive?

**Expected behavior**: plugin-B's throw is an error condition. The merger MUST NOT silently swallow it AND MUST NOT downgrade plugin-A's approval. Two acceptable resolutions: (1) propagate plugin-B's error and force the whole hook to deny/review; (2) collect plugin-A's approval, log plugin-B's failure, run plugin-C, conjunctively merge all live approvals (plugin-A's stays).

**Test tier**: L1 integration
**Runner**: simulation
**Apply**: PR-3 (OC-7) scope; test must be ADDED, not just modified. Current `??` merger has undefined behavior under throw.
**Findings**: F-22..F-25.

### SC-08 · `upstream/policy-r5-fail-closed`

**Walk**: TOOLS.md declares `send-email` with `riskLevel: R5` and `failOpen: true`. `openclaw policy generate` should refuse to emit, with a generation-time diagnostic. Generated plugin must NEVER allow R5 + failOpen at runtime.

**Test tier**: L0 unit (generator) + L1 integration (emitted plugin)
**Runner**: forward + simulation
**Apply**: PR-4 scope. Generator-side test asserts diagnostic; runtime-side test asserts that even if the JSON IR is hand-edited to add `failOpen: true`, the plugin treats R5 as fail-closed (defense in depth per ciso N6).
**Findings**: F-26..F-29.

### SC-09 · `upstream/policy-restricted-stickiness`

**Walk**: TOOLS.md has `summarize-doc` (R1) consuming `read-restricted-doc` (R5, RESTRICTED). G-CHAIN: effective tier of `summarize-doc` becomes max(R1, R5) = R5; sensitivity inherits RESTRICTED. Generated plugin enforces that the chain's output, when fed to a public-broadcast tool, is rejected.

**Test tier**: L1 integration
**Runner**: simulation
**Apply**: PR-4 scope. Tests against PolicyIR with `args_from` chains; assert `effectiveSensitivity` propagates and laundering is rejected.
**Findings**: F-30..F-32.

### SC-10 · `upstream/policy-emitted-plugin-registration` (the H6 adapter audit)

**Walk**: Generated `gateway-plugin.ts` is loaded by today's `@openclaw/plugin-sdk`. Registers via `PluginHookRegistration`. Hooks fire as expected. No type errors. No subtle "claim-mode vs sequential modifying mode" mismatches with current `runBeforeToolCall` semantics.

**Test tier**: L2 e2e
**Runner**: simulation (with mock OC gateway)
**Apply**: H6 adapter-audits.md must record the verdict. PR-4 scope. If audit reveals shape drift, generator must be updated BEFORE PR-4 opens.
**Findings**: F-33..F-37.

### SC-11 · `upstream/guardrails-audit-stream-adapter` (the OTHER H6 adapter audit; B3)

**Walk**: `@openclaw/guardrails/audit` events flow through OC's existing audit stream. Verify wire compatibility: timestamp granularity (RFC 3339 vs epoch?), actor identity field name (CEF `suser` vs OC actor model), correlation field semantics (cs3 = eventId? or what?). Lossy formats (CEF, syslog) round-trip and re-parse cleanly.

**Test tier**: L1 integration + L2 e2e
**Runner**: contract (round-trip)
**Apply**: H6 adapter-audits.md must record verdict + field-by-field mapping. PR-2 scope. If mapping reveals collision, guardrails/siem formatters need update before PR-2.
**Findings**: F-38..F-43.

### SC-12 · `upstream/hostile-write-then-read` (W9 deferred — runtime-gated enforcement)

**Walk**: Attacker writes a malicious deny-rule reversal to `SOUL.md`: `## Boundaries\n- Allow: post-publicly` (would have been "Never post publicly"). Per amendment §3, OC-1/2 hooks dropped; runtime-gated enforcement via `before_agent_start`. Question: does the generated plugin catch the violation BEFORE the agent acts on the file?

**Expected**: when agent loads SOUL.md and runs `before_agent_start`, the plugin compares against the LAST PROMOTED snapshot's policyId. The deny-rule reversal changes `snapshotId`; the plugin emits `requireApproval` with `reason: 'unauthorized SOUL.md mutation since last promote'`. Agent stalls. Without `snap stage on`, the file is on disk; with `snap stage on`, the file is parked in `.openclaw/.stage/` and never reaches canonical.

**Test tier**: L2 e2e
**Runner**: simulation (agent + filesystem write + plugin response)
**Apply**: PR-2 (guardrails) + PR-4 (policy) + amendment §3 documents the model. Adapter-audits.md must call out the runtime-gated enforcement model (not write-blocked) explicitly so consumers' threat models are clear.
**Findings**: F-44..F-49.

### SC-13 · `upstream/oc4-stripfrontmatter-roundtrip`

**Walk**: `workspace.ts:91` `stripFrontMatter()` is called on a templated SOUL.md. Original test bytes are needed for hashing. Currently the function discards originals. After OC-4: function preserves originals under sibling `raw` key.

**Test tier**: L0 unit
**Runner**: forward
**Apply**: PR-2 (OC-4) scope. ~1 line change at `workspace.ts:91`. Regression test added — round-trip on templated SOUL.md emits byte-identical file.
**Findings**: F-50..F-51.

## Phase 3 · Package invariants + e-discovery (8 scenarios)

The contract-level promises each package must keep.

### SC-14 · `upstream/workspace-canonicalize-cross-os`

**Walk**: Same OC workspace files canonicalized on Linux, macOS, Windows produce **byte-identical** output (RFC 8785 JCS guarantee). CI matrix runs the canonicalize subpath on all three.

**Test tier**: L1 integration (cross-OS matrix in CI)
**Runner**: forward
**Apply**: PR-1 (workspace) scope. CI matrix added.
**Findings**: F-52..F-53.

### SC-15 · `upstream/workspace-ast-roundtrip`

**Walk**: Parse SOUL.md / TOOLS.md / AGENTS.md / IDENTITY.md / USER.md / SKILL.md, then `emit()` them back. Result must be byte-identical to input (lossless round-trip). Especially: trailing whitespace, list-marker style, code-fence language, frontmatter ordering.

**Test tier**: L0 unit (per file kind)
**Runner**: forward
**Apply**: PR-1 (workspace) scope.
**Findings**: F-54..F-56.

### SC-16 · `upstream/guardrails-audit-append-verify`

**Walk**: Append N events (N=1, 10, 1000) to the hash chain. Verify chain integrity. Tamper one event mid-stream; verify detects the tamper at the right position.

**Test tier**: L0 unit + L1 integration
**Runner**: forward
**Apply**: PR-2 (guardrails) scope.
**Findings**: F-57..F-58.

### SC-17 · `upstream/guardrails-approval-handle-replay-resistance`

**Walk**: Issue handle with `{providerId, contentHash, sequenceNumber, approverPrincipal, keyId, ttl, nonce}`. Attempt replay with same bytes — rejected (sequenceNumber check). Attempt replay with different `contentHash` — rejected. Attempt with rotated `keyId` — accepted if within grace window. Attempt past TTL — rejected.

**Test tier**: L1 integration
**Runner**: forward
**Apply**: PR-2 (guardrails) scope.
**Findings**: F-59..F-61.

### SC-18 · `upstream/policy-generate-deterministic`

**Walk**: Same workspace input → byte-identical artifacts (`policy-ir.json`, `gateway-plugin.ts`, `audit-manifest.json`). Run twice, diff = 0.

**Test tier**: L0 unit + L1 integration
**Runner**: forward
**Apply**: PR-4 (policy) scope.
**Findings**: F-62.

### SC-19 · `upstream/snap-snapshot-id-stable`

**Walk**: Same workspace files (canonical bytes) → same `snapshotId` across hosts (Linux, macOS, Windows). `snapshotId = sha256(canonical(workspaceFiles))` per RFC 8785.

**Test tier**: L1 integration (cross-OS matrix)
**Runner**: forward
**Apply**: PR-5 (snap) scope.
**Findings**: F-63.

### SC-20 · `upstream/snap-promote-audited`

**Walk**: `snap promote <id>` emits `snapshot_promote` audit event with `{snapshotId, promotedAt, approverPrincipal, signedHandleId}`. Subsequent promote emits `snapshot_supersede` against previous current. Rollback emits `snapshot_rollback`.

**Test tier**: L1 integration
**Runner**: forward
**Apply**: PR-5 (snap) scope. Per amendment §7.2 synchronization invariant.
**Findings**: F-64..F-65.

### SC-21 · `upstream/snap-policy-historical-query` (W4 deferred — temporal queries)

**Walk**: Workspace promotes snapshot S1 at T1, S2 at T2, S3 at T3 (all with audit events). Query `snap resolvePolicy --at <timestamp>` for timestamps inside each promote-window. Returned `snapshotId` matches the snapshot in force at that time. Evidence object includes the promote/supersede audit-entry UUIDs.

**Test tier**: L2 e2e
**Runner**: simulation (with audit chain replay)
**Apply**: PR-5 (snap) scope. Per amendment §7.
**Findings**: F-66..F-68.

### SC-22 · `upstream/snap-http-resolve` (covers oc:// resolution)

**Walk**: `GET /v1/resolve?uri=oc://TOOLS.md/Tools/send-email/args_from` against the current snapshot returns the field's value + the snapshotId from which it was resolved. URI not found → 404 with `{code: 'OC_PATH_NOT_FOUND'}`.

**Test tier**: L1 integration
**Runner**: contract (HTTP)
**Apply**: PR-5 (snap) scope.
**Findings**: F-69..F-70.

## Phase 5 · Workspace foothold (PR-1 + PR-2 — added 2026-04-27 after restructure)

These scenarios validate the wholesale `replaceConfigFile` lossless conversion (PR-1) and the oc:// URI scheme extension to runtime config (PR-2). The user direction was "carefully validate" — these go deeper on edge cases than Phases 1–4.

### SC-25 · `upstream/jsonc-roundtrip-with-comments`

**Walk**: User has a JSONC config with `// inline comments`, `/* block comments */`, custom 4-space indent, blank lines between sections, key ordering that doesn't sort alphabetically. `openclaw update` runs and mutates ONE leaf field (e.g., bumps a version). After the AST conversion: parse → mutate that one field → emit. Result: every byte of the file unchanged EXCEPT the mutated field. Comments survive. Indent survives. Order survives. Blank lines survive.

**Test tier**: L0 unit + L1 integration
**Runner**: forward
**Apply**: PR-1 scope. The headline invariant.
**Findings**: F-76..F-80.

### SC-26 · `upstream/doctor-fix-idempotency`

**Walk**: `openclaw doctor --fix` runs on a clean config (no migrations needed). Today: stringify produces some diff because of incidental formatting changes. After AST conversion: zero-diff because parse → no-op mutation → emit reproduces the input bytes.

Run `--fix` a second time on the same already-clean config. Expected: `git diff` shows zero changes.

**Test tier**: L1 integration
**Runner**: forward
**Apply**: PR-1 scope.
**Findings**: F-81..F-82.

### SC-27 · `upstream/plain-json-backward-compat`

**Walk**: Existing user has a plain JSON config (no comments, default 2-space indent, today's stringify output format). `openclaw update` runs after the conversion. Output is bit-for-bit identical to today's stringify result.

This is the BACKWARD-COMPAT proof. The conversion must not change behavior for the 99% of users with plain JSON configs. Bot reviewers will scrutinize this case.

**Test tier**: L1 integration (high coverage required)
**Runner**: forward
**Apply**: PR-1 scope. Proof that the conversion is risk-free for the common case.
**Findings**: F-83..F-85.

### SC-28 · `upstream/workspace-file-diagnostic-oc-uri`

**Walk**: Hand-craft a parse error in TOOLS.md (e.g., malformed `args_from`). Run `openclaw doctor`. Diagnostic location is `oc://TOOLS.md/Tools/<name>/args_from`, not `path:line:col`.

**Test tier**: L1 integration
**Runner**: forward
**Apply**: PR-1 scope. The /path subpath earns its keep here.
**Findings**: F-86..F-87.

### SC-29 · `upstream/oc-config-uri-parser-roundtrip`

**Walk**: `parseOcUri('oc://config/channels/matrix/accessToken')` returns structured object; `formatOcUri()` round-trips it. Edge cases:

- Array index: `oc://config/channels/matrix/account-allowlist/0`
- Deeply nested: `oc://config/plugins/installed/my-plugin/options/timeout-ms`
- Malformed: `oc://config//double-slash`, `oc://config/x/y/`, etc. — rejected with structured codes

**Test tier**: L0 unit
**Runner**: forward
**Apply**: PR-2 scope.
**Findings**: F-88..F-90.

### SC-30 · `upstream/doctor-migration-config-uri-diagnostic`

**Walk**: `doctor-legacy-config.migrations` (the hot file — 14 commits/3mo) runs a migration. The migration's diagnostic emits `oc://config/channels/matrix/accessToken` as the location instead of `{file: 'openclaw.config.json', line: 42}`.

**Test tier**: L1 integration
**Runner**: forward
**Apply**: PR-2 scope.
**Findings**: F-91..F-92.

### SC-31 · `upstream/diagnostic-renderer-dual-shape`

**Walk**: Existing console renderer + LSP server consume diagnostics. After PR-1+2: some diagnostics carry `{file, line}` (legacy form), others carry `{ uri }` (new form). Renderers must handle both shapes correctly without losing information.

**Test tier**: L0 unit + L1 integration
**Runner**: simulation
**Apply**: PR-1 scope (diagnostic shape extension).
**Findings**: F-93..F-94.

### SC-32 · `upstream/resolve-config-uri-correctness`

**Walk**: `resolveConfigUri(uri, configRoot)` walks an OpenClawConfig fixture. Cases:

- Valid path → `{value, parentNode, leafKey, found: true}`
- Missing path → `{found: false}`, no exception
- Ambiguous path (if any wildcard form supported) → `OC_CONFIG_PATH_AMBIGUOUS`
- Invalid path syntax → `OC_CONFIG_PATH_INVALID`

**Test tier**: L0 unit + L1 integration
**Runner**: forward
**Apply**: PR-2 scope.
**Findings**: F-95..F-97.

### SC-33 · `upstream/concurrent-config-write-safety`

**Walk**: Two processes call `replaceConfigFile` simultaneously. Today: file locking via existing `replaceConfigFileSync` semantics (atomic rename pattern). After AST conversion: file locking semantics unchanged; only the _content generation_ changes from stringify to emit. AST + emit happens in-memory; the rename is the durability primitive.

**Risk to validate**: does the AST parser handle the case where another process is writing the file mid-read? Today this is handled by the atomic-rename. Confirm no regression.

**Test tier**: L1 integration
**Runner**: simulation (with concurrent writer fixture)
**Apply**: PR-1 scope. Important to verify since this is a cross-cutting safety property.
**Findings**: F-98.

### SC-34 · `upstream/large-config-perf`

**Walk**: User has a 100KB config file (large but not absurd). Compare time-to-emit between today's `JSON.stringify(config, null, 2)` and `emit(parse(input, 'jsonc'), config)`. AST + emit is necessarily slower (parses input to capture formatting) but should be within 10× for files <1MB.

**Risk**: bot reviewer (especially Greptile) flags perf regressions in hot paths. `openclaw update` is run regularly; doctor `--fix` even more.

**Test tier**: L1 integration (perf benchmark)
**Runner**: forward (with timing measurement)
**Apply**: PR-1 scope. Bench result reported in PR description.
**Findings**: F-99.

### SC-35 · `upstream/malformed-existing-config-graceful`

**Walk**: User's config on disk has a syntax error (trailing comma in a place strict JSON disallows, or a `// comment` in a place the upstream parser before us didn't accept). What happens?

- AST + JSONC parser accepts trailing commas and comments by default → migration succeeds where stringify would have failed (better)
- AST + JSONC parser rejects truly invalid input → returns structured `OC_CONFIG_PARSE_ERROR` → `openclaw update` reports "your config is malformed at line X; fix and retry"

Today's `JSON.parse` rejects MORE inputs than JSONC parse. So the conversion is strictly more forgiving. Document this in PR description.

**Test tier**: L1 integration
**Runner**: forward
**Apply**: PR-1 scope.
**Findings**: F-100.

### SC-36 · `upstream/migration-bug-safety`

**Walk**: A migration in `doctor-legacy-config.migrations` has a bug — it produces an invalid config object (e.g., a required field is null). Today: stringify writes the broken config to disk. After AST conversion: emit accepts whatever object you give it; doesn't validate. Same behavior — emitting an invalid config is the migration's bug, not the emitter's.

**Risk**: reviewer asks "did you add validation?" — answer is "no, that's out of scope; the conversion is purely about format preservation." Document this clearly so the question doesn't loop.

**Test tier**: L0 unit
**Runner**: forward
**Apply**: PR-1 scope. Documentation point, not new code.
**Findings**: F-101.

## Phase 6 · Workspace lint surface (PR-1, added 2026-04-28 per `claws-workspace-lint` plan)

These scenarios validate the 13-code JSONC config lint surface. Built claws-side first in `@bic/openclaw-workspace/lint`; upstream as `@openclaw/workspace/lint` via PR-1. Detection-only at PR-1; class-by-class fixers ship in follow-up PRs per UG-upstream § 13.

### SC-37 · `upstream/lint-engine-schema-DI`

**Walk**: Caller passes a `JsoncDocument` to `lint()` without a `LintSchema`. AST-only rules (5: duplicate-key, trailing-whitespace, mixed-indent, trailing-comma, redacted-placeholder) fire on relevant fixtures. Schema-aware rules (8: dead-comment, unknown-field, deprecated-field, legacy-field, type-mismatch, missing-required, plugin-id-collision, secret-ref-ambiguous) silently skip. With a schema injected, all 13 rules participate.

**Test tier**: L0 unit
**Runner**: forward
**Apply**: PR-1 scope. Engine is schema-agnostic; schema is dependency-injected.
**Findings**: F-102, F-103.

### SC-38 · `upstream/lint-oc-uri-on-every-finding`

**Walk**: Every `LintFinding` carries `ocUri: 'oc://config/<encoded-path>'`. For findings with a non-empty `path`, the `ocUri` is also appended to `message` text in parens so plain-log surfaces (CI, stderr, audit chain) carry the deep-linkable form. File-level findings (empty path) use `oc://config` without trailing slash.

**Test tier**: L0 unit + L1 integration
**Runner**: forward
**Apply**: PR-1 scope. Per UG-upstream § 12.4. Round-trip contract: `formatOcConfigUri(parseOcConfigUri(uri).path) === uri`.
**Findings**: F-104.

### SC-39 · `upstream/lint-issue-14998-schema-key-allowed`

**Walk**: Config file has `"$schema": "https://docs.openclaw.ai/..."` — a legitimate JSON Schema convention added by editors for autocomplete. Schema's `knownChildKeys` includes `$schema` at root. Lint must NOT fire `OC_CFG_UNKNOWN_FIELD` on this key. Negative test — confirms the false-positive class is closed.

**Test tier**: L1 integration
**Runner**: forward (issue replay)
**Apply**: PR-1 scope. Closes false-positive for #14998.
**Findings**: F-105.

### SC-40 · `upstream/lint-issue-20478-plugin-id-collision`

**Walk**: Same plugin id appears at `channels.bluebubbles` AND `plugins.entries.bluebubbles`. Schema's `pluginIdSources(doc)` returns both. Lint fires `OC_CFG_PLUGIN_ID_COLLISION` on the second occurrence with a message citing the first occurrence's path.

**Test tier**: L1 integration
**Runner**: forward (issue replay)
**Apply**: PR-1 scope. Closes #20478.
**Findings**: F-106.

### SC-41 · `upstream/lint-issue-22272-unrecognized-keys-with-did-you-mean`

**Walk**: Config has typo'd channel-config keys: `homserver` (should be `homeserver`), `acessToken` (should be `accessToken`). Lint fires `OC_CFG_UNKNOWN_FIELD` for each, with `suggestion` populated by edit-distance match within ≤ 3.

**Test tier**: L1 integration
**Runner**: forward (issue replay)
**Apply**: PR-1 scope. Closes #22272 (catches typos pre-startup, where doctor's --fix today doesn't actually remove them).
**Findings**: F-107.

### SC-42 · `upstream/lint-issue-31251-missing-after-clobber`

**Walk**: Plugin install/uninstall flow has stripped the required `gateway.dmPolicy` key from the file. Lint fires `OC_CFG_MISSING_REQUIRED_FIELD` on the post-clobber state. (The lossless write path eliminates the clobber root cause; this lint is the fail-safe if a non-AST consumer corrupts the file.)

**Test tier**: L1 integration
**Runner**: forward (issue replay)
**Apply**: PR-1 scope. Closes #31251 (recurrence prevention via lossless emit; lint detects already-clobbered state).
**Findings**: F-108.

### SC-43 · `upstream/lint-issue-48415-trailing-comma-mix`

**Walk**: Config file has trailing comma in one container (`channels.matrix`) but not others. Today: Control UI saves invalid JSON5 in this state. Lint fires `OC_CFG_TRAILING_COMMA_INCONSISTENT` flagging the minority style so user can normalize.

**Test tier**: L1 integration
**Runner**: forward (issue replay)
**Apply**: PR-1 scope. Closes #48415.
**Findings**: F-109.

### SC-44 · `upstream/lint-issue-59070-defaultId-typo`

**Walk**: Config has root key `defaultId` — a typo for `defaultAgent`. Lint fires `OC_CFG_UNKNOWN_FIELD` with `suggestion: 'defaultAgent'`.

**Test tier**: L1 integration
**Runner**: forward (issue replay)
**Apply**: PR-1 scope. Closes #59070 (catches before gateway rejects + permanent unsaved-changes state).
**Findings**: F-110.

### SC-45 · `upstream/lint-issue-60334-legacy-root-keys`

**Walk**: Config has legacy root keys `mediaLocalRoots`, `bootstrapMaxCharsPerFile` rejected by 2026.4.2+. Schema's `legacyKeys` recognizes both with replacement `null` (no auto-migration target — these must be removed). Lint fires `OC_CFG_LEGACY_FIELD` for each.

**Test tier**: L1 integration
**Runner**: forward (issue replay)
**Apply**: PR-1 scope. Closes #60334.
**Findings**: F-111.

### SC-46 · `upstream/lint-issue-61683-missing-gateway-required`

**Walk**: Config has `gateway` object missing the required `dmPolicy` child. Lint fires `OC_CFG_MISSING_REQUIRED_FIELD` with path `['gateway', 'dmPolicy']`.

**Test tier**: L1 integration
**Runner**: forward (issue replay)
**Apply**: PR-1 scope. Closes #61683 (catches before plugin-scoped error aborts gateway startup).
**Findings**: F-112.

### SC-47 · `upstream/lint-issue-62281-redacted-corruption`

**Walk**: Config has `accessToken: "__OPENCLAW_REDACTED__"` — corruption introduced by a stringify-over-redacted-view path. Lint fires `OC_CFG_REDACTED_PLACEHOLDER` at severity `error`. The lossless write path _prevents recurrence_; lint catches any residual instances.

**Test tier**: L1 integration
**Runner**: forward (issue replay)
**Apply**: PR-1 scope. Closes recurrence vector for the corruption class — closed historicals #13495, #44357, #62281, #21573, #13210, #12078 plus open #60917, #68423, #66832, #59945.
**Findings**: F-113.

### SC-48 · `upstream/lint-issue-62438-secret-ref-clean`

**Walk**: Config has `accessToken: "${MATRIX_ACCESS_TOKEN}"` — a clean env reference. Lint must NOT fire `OC_CFG_SECRET_REF_AMBIGUOUS`. Negative test — confirms the upstream false-positive (resolved-vs-unresolved confusion) is closed.

**Test tier**: L1 integration
**Runner**: forward (issue replay)
**Apply**: PR-1 scope. Closes #62438 false-positive.
**Findings**: F-114.

### SC-49 · `upstream/lint-issue-65565-default-agent-typo-nested`

**Walk**: Config has `agents.defaults.defaultId` — typo'd at a non-root path. Lint fires `OC_CFG_UNKNOWN_FIELD` at the nested location.

**Test tier**: L1 integration
**Runner**: forward (issue replay)
**Apply**: PR-1 scope. Closes #65565 (related to #59070 but at a different config depth).
**Findings**: F-115.

### SC-50 · `upstream/lint-issue-72872-agentRuntime-legacy`

**Walk**: Config has `agents.defaults.agentRuntime: "v3"` — rejected by 2026.4.24 schema validator. Schema's `legacyKeys` at `['agents', 'defaults']` maps `agentRuntime → runtimeVersion`. Lint fires `OC_CFG_LEGACY_FIELD` with auto-migration suggestion `runtimeVersion`.

**Test tier**: L1 integration
**Runner**: forward (issue replay)
**Apply**: PR-1 scope. Closes #72872.
**Findings**: F-116.

### SC-51 · `upstream/lint-fixer-roadmap-contract`

**Walk**: PR-1 ships detection-only. Each lint code's auto-fixer ships in a separate follow-up PR per UG-upstream § 13. Contract: every fixer-PR title prefix `feat(workspace-lint): auto-fix for <CODE>`, scope ≤ 200 LOC of fix logic + ≤ 100 LOC of tests, fix-then-re-lint produces zero findings of the target code on same input.

**Test tier**: L3 acceptance (per future fixer-PR)
**Runner**: contract
**Apply**: Future fixer-PRs scope. PR-1 only documents the contract.
**Findings**: F-117.

---

## Phase 4 · Compliance rubric coverage (deferred from N4)

### SC-23 · `upstream/comply-rubric-soc2-control-mapping` (N4 deferred)

**Walk**: For each SOC 2 requirement (CC6.1 logical access, CC7.2 audit log coverage, CC7.3 incident response), the comply rubric must trace to ≥1 audit predicate emitted by `@openclaw/guardrails/audit`. Manual mapping pass produces evidence table.

**Test tier**: L3 acceptance (per-rubric coverage audit)
**Runner**: contract
**Apply**: H6 deliverable; lives in `compliance/README.md` per-framework gaps doc. PR-2 scope.
**Findings**: F-71..F-73.

### SC-24 · `upstream/comply-rubric-hipaa-control-mapping`

**Walk**: For each HIPAA Security Rule requirement (§164.312(a)(1) access control, §164.312(b) audit controls, §164.312(c)(1) integrity controls, §164.312(d) information access management, §164.312(e)(2)(ii) encryption), the comply rubric must trace to ≥1 audit predicate.

**Test tier**: L3 acceptance
**Runner**: contract
**Apply**: H6 deliverable; PR-2 scope.
**Findings**: F-74..F-75.

---

## Test materialization summary

Per-tier materialization (planned, fixtures created during pulses stage acceptance test pulses, not now):

| Tier           | Count  | Series                                                                                                                                      |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| L0 unit        | 24     | bot-preempt (4), generator-side (6), workspace path/ast/canonicalize (6), guardrails subpaths (8)                                           |
| L1 integration | 18     | OC-7 merger (5), audit chain (4), approval handle (3), HTTP surface (3), policy + workspace (3)                                             |
| L2 e2e         | 8      | hostile-write-then-read (1), emitted-plugin-registration adapter (1), audit-stream adapter (1), snap historical query (1), per-PR smoke (4) |
| L3 acceptance  | 8      | per-PR landed verification (6), SOC 2 rubric coverage (1), HIPAA rubric coverage (1)                                                        |
| **Total**      | **58** | aligns with plan Coverage Contract targets (24 / 18 / 8 / 6 with +2 acceptance for rubrics)                                                 |

Plan Coverage Contract target was 24 / 12 / 8 / 6. Scenarios stage exercised the catalog and found 6 additional L1 integration tests warranted (12 → 18) and 2 additional L3 acceptance tests for compliance rubric coverage (6 → 8). These deltas are reflected in the FINDINGS.md apply-back.

## Apply-back routing

Findings route to (per FINDINGS.md classification):

- **Plan amendment** — none required from this stage; the test tier deltas update the Coverage Contract numbers
- **Spec amendment** — none beyond what UG-upstream.amend.md already covers
- **Bot-preempt-checklist guide** (H6 deliverable) — F-01..F-16 (15 findings shape the checklist content)
- **Adapter-audits guide** (H6 deliverable) — F-33..F-43 (11 findings shape the audit content)
- **PR-2 (OC-4) scope** — F-50..F-51
- **PR-2 (guardrails) scope** — F-38..F-49, F-57..F-61, F-71..F-75
- **PR-3 (OC-7) scope** — F-17..F-25
- **PR-4 (policy) scope** — F-26..F-37, F-62
- **PR-5 (snap) scope** — F-63..F-70
- **Pulse decomposition** — Coverage Contract Test Tier targets bumped per above table; pulse plans must reflect new targets

---

## Phase 4 · LKG primitive adversarial (added 2026-04-30, post-pivot)

After the snap → LKG strategic pivot, four waves of adversarial scenarios were authored to probe the new primitive's threat surface beyond the happy-path E2E. These are runtime-behavior scenarios (not PR-review scenarios), so they ship as live tests rather than fixture/runner descriptions. The full per-test detail lives in `packages/v2-prototype/tests/v2-chain-lkg-adversarial-{,2,3,4}.integration.test.ts`. **76 scenarios across 16 categories, all green.**

### SC-22 · `lkg/wave-1-tamper-recovery-validator-plugin-git-paths`

**Walk**: Probe the LKG primitive's contract surface end-to-end across L tamper, R recovery, V validators, P plugin-shell, G git-backend, X path hygiene. 24 scenarios in `v2-chain-lkg-adversarial.integration.test.ts`.

**Test tier**: L1 integration · **Runner**: forward (real fs + real git binary; vitest)
**Apply**: Locks contract invariants for the FS and git LKG backends. Findings raised: none (all expected behaviors).

### SC-23 · `lkg/wave-2-concurrency-audit-io-boundaries-merge-no-lkg`

**Walk**: 19 scenarios across C concurrency · A audit observability · E external I/O · B boundary inputs · M multi-agent merge · N no-LKG-initial-state.

**Test tier**: L1 integration · **Runner**: forward
**Apply**: Locks audit-hook-isolation and two-store-independence invariants. Findings raised: none.

### SC-24 · `lkg/wave-3-schema-policy-ir-shape-scale-fs-edges`

**Walk**: 18 scenarios across S schema evolution · Q PolicyIR shape · Z performance/scale · F filesystem oddities (unicode paths, deeply nested dirs, paths with spaces).

**Test tier**: L1 integration · **Runner**: forward
**Apply**: Locks performance gates (1000-rule PolicyIR <500ms; 1MB recovery byte-for-byte). Findings raised: none.

### SC-25 · `lkg/wave-4-error-injection-crash-recovery-git-dedup-parity`

**Walk**: 15 scenarios across EI error injection · CR crash recovery · GD git dedup parity · GW git worktree edges.

**Test tier**: L1 integration · **Runner**: forward
**Apply**: **Findings raised: F-118 HC-BLOCK** (real bug: `gitLKGStore.commitPromote` was sweeping pre-staged paths into the LKG commit; fixed in-session at `git-lkg-store.ts:234` to use `git commit -m msg -- <relPath>`) and **F-119 HC-NOTE** (locked-in [GAP]: FS tamper detection is recovery-path-only at `lkg-store.ts:189`; mitigation lives at deployment).

### SC-26 · `lkg/wave-5-security-observability-encoding-git-advanced-policyir-fingerprint`

**Walk**: 24 scenarios across SEC security-specific (symlinks, special chars, TOCTOU) · OBS audit/observability completeness · ENC encoding edges (CRLF, BOM, trailing newline) · GIT2 advanced git states (bare repo, unique-commit-per-content) · PV PolicyIR↔LKG bridge specifics · FP fingerprint determinism. Two POSIX-only tests (SEC1 symlink-as-tracker; SEC2 hash-check-rejects-symlinked-LKG) are skipped on Windows hosts.

**Test tier**: L1 integration · **Runner**: forward
**Apply**: **No new HC findings**. Wave 5 is invariant-locking, not bug-finding. Pins 8 additional contract properties (see `FINDINGS.md` Phase 7 contract-invariants subsection): bytes-only fingerprint determinism, audit field completeness + monotonic ts + recovery-notice cross-link, byte-for-byte preservation through promote+recover, git unique-commit-per-content, cache eviction on fingerprint flip. These properties become evidence in PR conversations that the contract is well-pinned.

### SC-27 · `lkg/wave-6-limits-time-multi-tracker-registration-fault`

**Walk**: 19 scenarios across LIM limits/quotas (1000 trackers, 5MB single file, 100KB single line, depth-100 nested JSON) · T time/clock semantics (deterministic ts, clobbered-collision-under-frozen-clock, valid-outcome ts, backwards-clock not enforced) · MT multi-tracker independence (per-tracker dedup, audit attribution, parallel observe) · REG registration semantics edges (`path.normalize` collapses `./` so equivalent paths COLLIDE; trailing-separator forms register independently — `[shape]` documented) · FAULT lightweight synthetic failures (exotic parse() shapes, validator extra fields, async-validator type-error path).

**Test tier**: L1 integration · **Runner**: forward
**Apply**: **One new HC-NOTE finding raised: F-120 LKG-T-001** (`clobbered.<ts>` sidecar uniqueness depends on `observedAt` advancing — under a frozen clock, back-to-back recoveries write the same path and the second overwrites the first preserved bytes). Documented as `[GAP]`; mitigation is replay-mode hosts bumping `now()` between observes, OR a future hardening adds a sequence counter. Plus 8 additional contract invariants pinned (registry scale, streaming-free large-file integrity, clock-determinism, per-tracker dedup isolation, path normalization at register-time, prototype-pollution resistance).

### SC-39 · `lkg/wave-18-final-shape-lock-documented-examples-type-level`

**Walk**: 12 scenarios across DOC documented examples (README minimal usage, audit hook, recovery-notice, readLastKnownGood) · TYPE TypeScript type-level (LKGObservation discriminated-union exhaustive switch narrowing; `LKGTracker<T>` generic flows; contract-type imports assignable; LKGStore structural typing) · FINAL public-export shape lock (exact 7-key set: `{LKGErrorImpl, clobberedPathFor, hashRaw, isCompanionPath, lkgPathFor, lkgStore, makeFingerprint}`; LKGFingerprint exact 11-key shape; pure-function semantics for path/hash helpers).

**Test tier**: L1 integration · **Runner**: forward
**Apply**: **No new HC findings**. Wave 18 is the **closing shape lock**. Future changes to public exports, documented examples, or type shapes will surface as broken assertions, making the change intentional. **Closes the 18-wave Phase 7 adversarial campaign.**

### SC-38 · `lkg/wave-17-property-based-corpus-stability`

**Walk**: 12 scenarios across PROP property-based forall assertions (forall valid bytes: hash=sha256; forall good/bad pairs: recover restores good byte-for-byte; forall observe orderings: audit FIFO; forall N trackers: failure-isolation) · CORP replay corpus (4 good × 5 bad PolicyIR-shape fixtures = 16 cross-pair coverage; deterministic hash) · STAB stability across 5 concurrent runs (identical audit-record sequences; hashRaw regression-locked; LKG companion file byte-stable).

**Test tier**: L1 integration · **Runner**: forward
**Apply**: **No new HC findings**. Wave 17 is forall-assertion + corpus + stability lock.

### SC-37 · `lkg/wave-16-conformance-type-shape-fuzz`

**Walk**: 14 scenarios across CONF synthesized fixtures matching upstream's `recoverConfigFromLastKnownGood` documented behavior (canonical hash fixtures; companion suffix parity for POSIX + Windows; clobbered ISO format; validate-then-promote; invalid-then-recover with restored-from hash matching prior promote) · TS type-shape exhaustiveness (every `LKGFingerprint` / `LKGEntry` / `AuditRecord` field reachable; all 5 `LKGObservation` outcomes have variant-specific fields) · FUZZ generated random valid + invalid + size-distribution (1B to 100KB) inputs.

**Test tier**: L1 integration · **Runner**: forward
**Apply**: **No new HC findings**. Wave 16 establishes upstream config-LKG byte-format conformance + complete type-shape coverage. The CONF cluster is the wire-parity test the v2-lkg-contract pre-RFC promised.

### SC-36 · `lkg/wave-15-git-ref-movement-pack-gc-rebase`

**Walk**: 13 git-backend deeper-edge scenarios across REF HEAD ref movement (external commit; branch switch; symbolic-ref; HEAD-without-file) · PACK packed vs loose objects (post-gc identity) · GC git-gc / pruning (reachable blobs preserved; promote messages preserved; many-promote survival) · RBASE rebase / amend / cherry-pick (working-tree blob preserved through rebase; amend keeps observe working; cherry-pick preserves promote-message structure).

**Test tier**: L1 integration · **Runner**: forward (real git binary against scratch repos)
**Apply**: **No new HC findings**. Wave 15 establishes the git backend is robust against the full range of operator git ops — LKG bytes are reachable through git's content-addressed object DB regardless of how the commit graph is reshaped, as long as HEAD ultimately points at a commit that contains the tracker path.

### SC-35 · `lkg/wave-14-metrics-telemetry-health-rate`

**Walk**: 16 scenarios across MET metrics aggregation (counters by outcome / by tracker; rate-per-window from monotonic ts; byte-volume from fingerprint) · TEL telemetry semantics (sha256 hash safe-for-correlation; validator-controlled `issues[].message` is operator-territory PII; tracker path leaks deployment topology) · HEALTH health/readiness from getEntry (composite-ready signal across all trackers; degraded signal from rising recovery-rate) · RATE rate-of-recovery alarm patterns (burst pattern, ratio bounds, 3+ consecutive recoveries threshold).

**Test tier**: L1 integration · **Runner**: forward
**Apply**: **No new HC findings**. Wave 14 is the observability contract — defines what's metric-safe, what's PII-territory, how recovery-rate maps to health signals. Hosts can wire LKG tracker into existing telemetry without architectural changes.

### SC-34 · `lkg/wave-13-multi-lkg-composition-cross-tracker-pool-isolation`

**Walk**: 17 scenarios across CHAIN multi-LKG composition (multiple trackers in one store, cross-store non-overlap, partial-chain failure isolation, 50-tracker break-and-recover-all) · XDEP cross-tracker dependencies (validator-of-B reads `getEntry()` of A; ordering unlocks validation; no cascade recovery) · ORD promotion ordering (strict serial, `Promise.all` parallel, repeat-parallel-on-same-target) · POOL plugin pool isolation (per-plugin LKGStore independence, per-store audit hooks, error isolation across plugins).

**Test tier**: L1 integration · **Runner**: forward
**Apply**: **No new HC findings**. Wave 13 is composition-and-isolation locks. Pins invariants for multi-tracker / multi-store / multi-plugin deployments — the gateway scenario where a single host runs many plugins each with their own LKG state.

### SC-33 · `lkg/wave-12-wire-format-migration-replay-diagnostics`

**Walk**: 17 scenarios across WIRE upstream config-LKG byte-format parity (`.lkg` suffix on full target path; `clobbered.<ts>` ISO format with `:`/`.`→`-`; sha256 lower-hex hash; audit `source: "lkg"` constant) · MIG migration story (orphan `.lkg` re-promote; 1:N mapping; non-config files; no lifecycle-specific hooks) · REPL audit-log replay (final fingerprint reconstructible; ts monotonic; identical observe-sequence → identical audit sequence; canonical lifecycle outcome sequence) · DIAG diagnostics (getEntry shallow copy; null-vs-empty signal for unregistered-vs-unobserved; **registry opacity** — no `listTrackers / unregister / clear / reset`).

**Test tier**: L1 integration · **Runner**: forward
**Apply**: **No new HC findings**. Wave 12 is upstream-alignment-and-introspection. Pins 8 invariant clusters: byte-format parity (the load-bearing claim of the pre-RFC), migration tolerance, audit-log replay, registry opacity (security property).

### SC-32 · `lkg/wave-11-architectural-invariants-dual-backend`

**Walk**: 18 architectural invariants × 2 backends = 36 dual-backend tests via `describe.each([fs, git])`. Probes the abstraction boundary: outcome SET identical across backends, LKGFingerprint shape identical (hex string `hash` field), `LKGEntry.lastPromotedGood` is the cache-key anchor on every backend, `readLastKnownGood` returns `Uint8Array`, `register()` rejects non-absolute/duplicate paths uniformly, `LKGObservation` per-variant fields stable. **The load-bearing invariant is ARCH13: `LKGStore` keys are EXACTLY `{register, observe, readLastKnownGood, getEntry}` on every backend — no work-tree-specific API leaks (`commit()` / `branch()` / `checkout()` / etc.).**

**Test tier**: L1 integration · **Runner**: forward (each invariant runs against real FS + real git binary)
**Apply**: **No new HC findings**. Wave 11 is the abstraction-boundary shape lock. Future backend additions (S3, IPFS, content-addressed storage, etc.) must satisfy all 18 invariants without API changes.

### SC-31 · `lkg/wave-10-error-quality-exhaustiveness-api-surface-backwards-compat`

**Walk**: 17 scenarios across ERR error message quality (LKGError messages contain offending path; `LKG_VALIDATOR_THREW` preserves `error.cause`) · EXH outcome exhaustiveness (every `LKGObservation` outcome variant — promoted/valid/recovered/skipped/failed — has a reproducible scenario) · AS API surface coverage (every exported function from `@bic/openclaw-lkg`: `lkgPathFor`, `clobberedPathFor`, `isCompanionPath`, `hashRaw`, `makeFingerprint` has happy + sad path coverage) · BACK backwards-compat shape locks (LKGObservation discriminated union shape; AuditRecord required-field set frozen at 10 keys; LKGErrorCode documented enum value set).

**Test tier**: L1 integration · **Runner**: forward
**Apply**: **No new HC findings**. Wave 10 is documentation-and-shape-lock. Future API surface or shape changes will surface as broken assertions in this wave, making the change intentional. Pins 3 shape-lock clusters: AuditRecord field set fixed at 10 keys; LKGErrorCode enum fixed at 4 codes; LKGObservation per-variant fields stable.

### SC-30 · `lkg/wave-9-stress-soak-json-edges-failure-isolation-init-order`

**Walk**: 16 scenarios across STR stress/soak (500 unchanged-observes bounded time; 100 promote+recover cycles; 1000-record audit FIFO; 200 trackers × 5 observes) · JSON JSON-shape edges (literal `NaN`/`Infinity` → unparseable→recover; `Number.MAX_SAFE_INTEGER + 1` precision; depth-1000 nested arrays) · FAIL failure isolation (parse/validate/file-missing/audit-hook-throws on A don't affect B) · INIT initialization order (register-observe interleaving; collision-after-observe; observe-before-register rejection).

**Test tier**: L1 integration · **Runner**: forward
**Apply**: **No new HC findings**. Wave 9 is invariant-locking. Pins 5 additional invariant clusters (stress/soak headroom, JSON-shape edge tolerance, cross-tracker failure isolation, initialization order tolerance).

### SC-29 · `lkg/wave-8-hook-ordering-recovery-edges-promote-edges-path-normalization`

**Walk**: 16 scenarios across HK hook ordering (audit-once-per-observe, audit-after-disk-settle, recovery-notice-once-per-recovered-outcome, multi-tracker FIFO) · REC recovery edges (entry has lastPromotedGood but `.lkg` missing → skipped; entry hash mismatch → refuses; recover preserves bytes byte-identical to LKG file; shouldRecover=false leaves `.lkg` untouched) · PROM promote-time edges (idempotent valid for unchanged bytes, last-good-wins for new bytes, no `.tmp-*` leftover, git commit-tree contains ONLY registered path — regression-locks F-118) · NRM path normalization (baseline, redundant segments via path.normalize collapse, Windows mixed-slash handling, git relPath always forward-slash regardless of platform).

**Test tier**: L1 integration · **Runner**: forward
**Apply**: **No new HC findings**. Wave 8 is invariant-locking. Pins 8 additional contract properties (audit firing cardinality + timing, recovery file-state invariants, promote idempotence + commit-tree integrity, path normalization correctness). PROM4 specifically regression-locks the F-118 GW3 fix to ensure future changes to `commitPromote` cannot reintroduce the "sweep pre-staged paths into LKG commit" bug.

### SC-28 · `lkg/wave-7-workspace-multi-process-determinism-extension-degenerate`

**Walk**: 21 scenarios across WK workspace-shape (multiple LKGs in same dir, sibling effects, basename collisions across dirs) · MULT multi-process simulation (FS hand-off idempotence, git HEAD blob hash parity across processes) · DET determinism / replay (same inputs + same `now()` → same audit + same on-disk state) · CIR non-serializable parse shapes (circular refs, `Map`, `Date`) · EXT SDK extension boundary (`suspiciousReasons` typed access, `shouldRecover` issue-code branching, default behaviors when hooks omitted) · DEG degenerate validator outputs (empty issues array still triggers recovery, multi-issue propagation, code propagation through audit).

**Test tier**: L1 integration · **Runner**: forward
**Apply**: **One new HC-NOTE finding raised: F-121 LKG-A-001** (`readLastKnownGood()` reads on-disk `<path>.lkg` directly with no hash check — a fresh process can read an orphaned or tampered `.lkg` through this API). Documented as `MULT1 [GAP]`; safety gate lives at the plugin shell, not at this method. Plus 9 additional contract invariants pinned (companion-file locality, cross-process hand-off idempotence, replay determinism, shape-agnostic LKG flow, SDK extension hooks typed access, validity-gate-over-issues-count).

### Phase 4 routing

Findings route to:

- **PR for `@openclaw/plugin-sdk/lkg` contract** (the v2-lkg-contract upstream PR) — F-118 fix is in the downstream `@bic/openclaw-lkg-git` reference impl; the upstream PR's reference implementation should land with the same fix from day one. F-119 is documented as the existing config-LKG model's known limit (not a regression introduced by this PR).
- **Adversarial test artifacts** — the 76 scenarios are downstream test artifacts; the upstream PR doesn't ship them. They serve as evidence in PR conversations that the contract has been stress-tested beyond the conformance matrix.
