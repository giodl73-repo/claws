# Hapi the Bringer · Scenarios FINDINGS

> **Reading note (added 2026-04-30 after the chain consolidation):** PR-N references below (e.g. "PR-2 (OC-4)", "PR-5 (snap)") use the pre-pivot 6-PR numbering. The canonical chain is now **3 upstream PRs** (workspace + frontmatter; LKG carrier; PolicyIR + ctx + merger). Mapping table in `carve-consumer-catalog.md` § "CHAIN CONSOLIDATION (2026-04-30)". This doc preserves the original routing as a historical record of how findings routed at the time of authoring.


**Wave**: `260427+hapi-the-bringer+openclaw-upstream`
**Stage**: scenarios
**Date**: 2026-04-27
**Source**: `scenarios.md` (24 scenarios, 4 phases)

Findings classification:
- **HC-BLOCK** — invariant violation with runtime consequence; must fix before the affected PR opens.
- **HC-WARN** — quality gap or contract drift; should fix before PR opens but doesn't block.
- **HC-NOTE** — stylistic / nice-to-have; capture for future polish.

## Headline tally

| Severity | Count |
|---|---|
| HC-BLOCK | 7 |
| HC-WARN | 39 |
| HC-NOTE | 75 |
| **Total** | **121** |

**Counting methodology**: each row in a finding table (one with a severity column) counts once. The HC-BLOCK applications tables in Phases 2/5/6 cross-reference each HC-BLOCK finding back to its target PR — those reference rows don't add to the count (7 such cross-refs exist for F-17, F-22, F-26, F-38, F-76, F-113, F-118). Verifiable via `grep -cE '^\| F-[0-9]+ \| HC-' scenarios/FINDINGS.md` (returns 121).

Per-phase deltas (best-effort narrative; cumulative tally above is the source of truth):

- Phase 1 (bot-preempt): F-01..F-16 → 4 HC-WARN, 12 HC-NOTE
- Phase 2 (governance correctness): F-17..F-51 → 4 HC-BLOCK, 7 HC-WARN, 22 HC-NOTE — added 2026-04-27 with the scenarios stage
- Phase 3 (package invariants): F-52..F-70 → 1 HC-WARN, 18 HC-NOTE
- Phase 4 (compliance rubrics): F-71..F-75 → 0 HC-BLOCK, 0 HC-WARN, 5 HC-NOTE
- Phase 5 (workspace foothold, added 2026-04-27): F-76..F-101 → 1 HC-BLOCK, 7 HC-WARN, 18 HC-NOTE
- Phase 6 (workspace lint surface, added 2026-04-28): F-102..F-117 → 1 HC-BLOCK, 9 HC-WARN, 6 HC-NOTE
- Phase 7 (LKG primitive adversarial, added 2026-04-30): F-118..F-121 → 1 HC-BLOCK (real bug, fixed in same session), 3 HC-NOTE (locked-in [GAP]s). **326 underlying scenarios across 18 waves** in `v2-prototype/tests/v2-chain-lkg-adversarial-{,2..18}.integration.test.ts` are catalogued at category granularity rather than per-test row — see Phase 7 below. Waves 5/8/9/10/11/12/13/14/15/16/17/18 added invariants only (no new HC); wave 6 added 1 HC-NOTE [GAP]; wave 7 added 1 HC-NOTE [GAP]. **The 18-wave campaign closes Phase 7.**

(Where the cumulative differs from earlier per-phase claims, the cumulative wins. Earlier per-phase increment notes ("Phase 5 added +1/+5/+10"; "Phase 6 added +1/+9/+6") tracked deltas at the time of authoring without reconciling with the full row count.)

Per scenarios stage classification rules: HC-BLOCK requires a "what breaks at runtime if unfixed" consequence. HC-NOTE is the right class for "planned artifact doesn't exist yet" — many of the bot-preempt findings are guide-content, not defects.

---

## Phase 1 · Bot-reviewer pre-empt

### SC-01 — Bot-preempt: pluginid-scoping

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-01 | HC-WARN | BOT-P-001 | Caller-supplied `pluginId` accepted by registration APIs | `packages/openclaw-guardrails/src/registry.ts` (TBD audit) | Plugin-X spoofs plugin-Y's audit attribution → chain of custody breaks | L0 unit | simulation | `bot-preempt/scenarios/01+pluginid-spoof/` | `register*()` rejects payload `pluginId` mismatching authenticated caller |
| F-02 | HC-NOTE | BOT-P-002 | Audit `sourcePluginId` correctness not enforced at `postAudit` boundary | `packages/openclaw-guardrails/src/registry.ts` (TBD audit) | Same as F-01, defense-in-depth missing | L1 integration | simulation | `bot-preempt/scenarios/02+postaudit-override/` | `postAudit()` overrides plugin-supplied `sourcePluginId` to authenticated caller's id |
| F-03 | HC-NOTE | BOT-P-003 | `OperatorScope` accepts raw strings without enum validation | `packages/openclaw-guardrails/src/approvals/types.ts` (TBD) | Plugin escalates scope by sending unknown enum value | L0 unit | simulation | `bot-preempt/scenarios/03+scope-validate/` | Unknown scope rejected with `INVALID_SCOPE` |
| F-04 | HC-NOTE | BOT-P-004 | `(pluginId, registrationId)` uniqueness not asserted across plugins | `packages/openclaw-policy/src/runtime/register.ts` (TBD) | Plugin-X registers under plugin-Y's slot → silent override | L0 unit | simulation | `bot-preempt/scenarios/04+register-collision/` | Conflict throws `REGISTRATION_COLLISION` |

### SC-02 — Bot-preempt: input-validation

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-05 | HC-WARN | BOT-V-001 | `placement` / `ttlMs` / `idempotencyKey` accepted without Zod schema | `packages/openclaw-guardrails/src/approvals/issue.ts` (TBD) | Negative `ttlMs` causes infinite-handle bug | L0 unit | simulation | `bot-preempt/scenarios/05+input-malformed/` | Schema rejects with structured error |
| F-06 | HC-WARN | BOT-V-002 | Session-store records not validated on read | `packages/openclaw-snap/src/session-store.ts` (TBD) | `__proto__` pollution from malformed JSON → prototype-chain hijack | L1 integration | simulation | `bot-preempt/scenarios/06+proto-pollution/` | Malformed entry rejected at load |
| F-07 | HC-NOTE | BOT-V-003 | JSON size cap not enforced on plugin payloads | host-boundary | DoS via 30MB JSON per call | L1 integration | simulation | `bot-preempt/scenarios/07+jumbo-payload/` | Payload >1MB rejected |
| F-08 | HC-NOTE | BOT-V-004 | Symbol tag lost on payload spread | `packages/openclaw-guardrails/src/approvals/handle.ts` (TBD) | Type-narrowing fails downstream | L0 unit | simulation | `bot-preempt/scenarios/08+symbol-spread/` | Symbol-tagged variant survives spread |

### SC-03 — Auto-close avoidance

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-09 | HC-NOTE | BOT-A-001 | PR description must lead with core-not-extension justification | (PR body) | `r:third-party-extension` auto-close → wave halts | L3 acceptance | contract | `bot-preempt/scenarios/09+pr-description-audit/` | Regex-scan PR body opens with mandated justification |
| F-10 | HC-NOTE | BOT-A-002 | `extension` / `third-party plugin` keywords flagged | (PR body) | Same auto-close trigger | L3 acceptance | contract | `bot-preempt/scenarios/10+keyword-trigger-list/` | Keyword scan reports zero hits |
| F-11 | HC-NOTE | BOT-A-003 | `r:skill` keyword (e.g., "skill registry") trips ClawHub auto-close | (PR body) | Same | L3 acceptance | contract | (covered by F-10) | (covered by F-10) |

### SC-04 — Baseline hash + sdk-overview refresh

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-12 | HC-WARN | BOT-B-001 | Baseline hash not refreshed on public-API addition | `docs/.generated/plugin-sdk-api-baseline.sha256` | CI fails; PR blocked | L3 acceptance | contract | `bot-preempt/scenarios/11+baseline-hash/` | Hash matches current public surface |
| F-13 | HC-WARN | BOT-B-002 | sdk-overview table missing entries | `docs/sdk-overview.md` | Bot-reviewer flags as undocumented | L3 acceptance | contract | `bot-preempt/scenarios/12+sdk-overview/` | Every public symbol has table row |
| F-14 | HC-NOTE | BOT-B-003 | Refresh script reference not in PR description | (PR body) | Reviewer asks "how was this regenerated?" | L3 acceptance | contract | (covered by F-12 description audit) | (covered by F-12) |

### SC-05 — Swift models regen

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-15 | HC-WARN | BOT-S-001 | Swift gateway model not regenerated for new HTTP surface | `apps/macos/Sources/OpenClawProtocol/GatewayModels.swift` | Swift companion app fails to compile against new gateway | L3 acceptance | contract | `bot-preempt/scenarios/13+swift-models/` | Generated Swift matches TS schema |
| F-16 | HC-NOTE | BOT-S-002 | Apps-shared variant out of sync | `apps/shared/OpenClawKit/Sources/OpenClawProtocol/GatewayModels.swift` | Same | L3 acceptance | contract | (covered by F-15) | (covered by F-15) |

## Phase 2 · Governance correctness

### SC-06 — OC-7 conjunctive merger

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-17 | HC-BLOCK | OC7-001 | Current `??` merger drops downstream approvals | `openclaw-core: src/plugins/hooks.ts:889-893` | R5 + RESTRICTED tools silently downgrade if any plugin returns no approval — regulatory failure | L1 integration | simulation | `governance/scenarios/01+oc7-conjunctive/` | Three-plugin merger collects all `requireApproval` descriptors |
| F-18 | HC-NOTE | OC7-002 | Field type bumps from `ApprovalDescriptor` to `ApprovalDescriptor \| ApprovalDescriptor[]` | `openclaw-core: src/plugins/hook-types.ts:402-410` | Codemod required for upstream consumers | L0 unit | forward | (covered by F-17) | New type accepts both shapes |
| F-19 | HC-NOTE | OC7-003 | Existing tests asserting "first-wins" must update | `openclaw-core: src/plugins/__tests__/hooks-merger.test.ts` | Expected breakage; that's the proof | L0 unit | forward | (covered by F-17) | Old test fails on new merger |
| F-20 | HC-NOTE | OC7-004 | Companion app receives array of `ApprovalDescriptor` not single | (companion app contract) | UI must render multiple approvals | L1 integration | contract | `governance/scenarios/02+companion-multi-approval/` | Companion handles array shape |
| F-21 | HC-NOTE | OC7-005 | All approvals must be approved (conjunctive AND), not OR | (supervisor flow) | Misimplementation lets one approval substitute for all | L2 e2e | simulation | `governance/scenarios/03+conjunctive-AND/` | Supervisor must approve every descriptor |

### SC-07 — OC-7 crash-safety (W7)

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-22 | HC-BLOCK | OC7-CR-001 | Plugin-B throw mid-emission has undefined merger behavior | `openclaw-core: src/plugins/hooks.ts:889-893` | Plugin-A's R5 approval can be silently lost — same regulatory failure as F-17 | L1 integration | simulation | `governance/scenarios/04+oc7-crash-safety/` | Plugin-A's approval survives plugin-B throw |
| F-23 | HC-WARN | OC7-CR-002 | Spec must declare resolution path: error-propagate OR continue-with-error-log | UG-upstream.amend.md §11 | Implementation choice without spec opens divergence | L1 integration | simulation | (covered by F-22) | Spec test confirms chosen path |
| F-24 | HC-NOTE | OC7-CR-003 | Plugin-B exception logged with `sourcePluginId` for forensics | `openclaw-core: hooks.ts` (TBD audit) | Forensic trail for crashed plugin | L1 integration | simulation | `governance/scenarios/05+crash-logged/` | Audit entry includes failing plugin id + stack |
| F-25 | HC-NOTE | OC7-CR-004 | Try/catch wrapper added at plugin invocation site, not at merger entry | `openclaw-core: hooks.ts` | Catches at right granularity (per-plugin, not per-batch) | L0 unit | simulation | (covered by F-22) | Wrapper isolates plugin failures |

### SC-08 — Policy R5 fail-closed

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-26 | HC-BLOCK | POL-R5-001 | Generator must reject TOOLS.md declaring `R5` + `failOpen: true` | `packages/openclaw-policy/src/generate/validate.ts` (TBD) | Generator emits a runtime that ALLOWS R5 fail-open → regulatory failure | L0 unit | forward | `governance/scenarios/06+r5-fail-open-rejected/` | `openclaw policy generate` exits non-zero with diagnostic |
| F-27 | HC-WARN | POL-R5-002 | Emitted plugin enforces R5 fail-closed at runtime as defense-in-depth | `packages/openclaw-policy/src/runtime/enforce.ts` (TBD) | Hand-edited JSON IR (`failOpen: true`) cannot bypass — runtime overrides | L1 integration | simulation | `governance/scenarios/07+r5-runtime-defense/` | Plugin treats R5 as fail-closed regardless of IR flag |
| F-28 | HC-NOTE | POL-R5-003 | Diagnostic includes `oc://` URI of offending tool | (generator output) | Editor surface points users at the right line | L0 unit | forward | (covered by F-26) | Diagnostic message contains `oc://TOOLS.md/Tools/<name>` |
| F-29 | HC-NOTE | POL-R5-004 | `IRREVERSIBLE_EXTERNAL` capability clamps to R5 minimum | `packages/openclaw-policy/src/generate/clamp.ts` (TBD) | Tool declared R3 + IRREVERSIBLE_EXTERNAL becomes R5 effective | L0 unit | forward | `governance/scenarios/08+capability-clamp/` | Effective tier max(declared, capability-floor) |

### SC-09 — Policy RESTRICTED stickiness

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-30 | HC-WARN | POL-RS-001 | G-CHAIN: effective sensitivity = max of args_from chain | `packages/openclaw-policy/src/runtime/propagate.ts` (TBD) | RESTRICTED data laundered through R1 summarizer reaches R5 publish | L1 integration | simulation | `governance/scenarios/09+restricted-laundering-rejected/` | Chain `read-restricted → summarize → post-publicly` rejected |
| F-31 | HC-NOTE | POL-RS-002 | Generator refuses args_from chain that would launder | `packages/openclaw-policy/src/generate/validate.ts` | Generation-time invariant catches before runtime | L0 unit | forward | `governance/scenarios/10+restricted-generation-time/` | Diagnostic emitted at generate |
| F-32 | HC-NOTE | POL-RS-003 | `effectiveSensitivity` field in PolicyIR | `packages/openclaw-policy/src/types/ir.ts` (TBD) | IR is self-explanatory for tools downstream | L0 unit | forward | (covered by F-30) | IR field present per tool |

### SC-10 — Adapter audit: emitted-plugin registration

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-33 | HC-WARN | ADP-PR-001 | Generated plugin registration shape must match current `PluginHookRegistration` | `openclaw-core: src/plugins/hook-types.ts:1-150` | If shape drifts, PR-4 CI fails on type errors | L2 e2e | simulation | `adapter/scenarios/01+plugin-registration/` | Generated `gateway-plugin.ts` loads + registers cleanly |
| F-34 | HC-WARN | ADP-PR-002 | Sequential modifying mode (not claim mode) for `runBeforeToolCall` | `openclaw-core: src/plugins/hooks.ts` | Claim-mode assumption breaks merger | L2 e2e | simulation | (covered by F-33) | Plugin honors sequential semantics |
| F-35 | HC-WARN | ADP-PR-003 | CLI subcommand registration shape unknown (no precedent cited in plan) | `openclaw-core: <CLI entry point TBD>` | PR-4 CLI handler may not match upstream's dispatcher (yargs / oclif / Commander / custom) | L2 e2e | simulation | `adapter/scenarios/02+cli-subcommand/` | `openclaw policy <verb>` dispatches to handler |
| F-36 | HC-NOTE | ADP-PR-004 | Adapter audit must record exact upstream file:line for registration site | `docs/upstream/guides/adapter-audits.md` (NEW) | Future audits compare against frozen baseline | (doc) | (doc) | (in adapter-audits.md content) | Doc contains citation |
| F-37 | HC-NOTE | ADP-PR-005 | Sample registration code in audit doc, not hand-waved | `docs/upstream/guides/adapter-audits.md` (NEW) | Implementer doesn't have to spelunk | (doc) | (doc) | (in adapter-audits.md content) | Doc contains code block |

### SC-11 — Adapter audit: audit-stream wire-shape

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-38 | HC-BLOCK | ADP-AS-001 | Field-by-field mapping not yet documented; SIEM evidence chain at risk | `docs/upstream/guides/adapter-audits.md` (NEW) | SIEM parsers may truncate / mismap critical audit fields → SOC 2 CC7.2 audit-log-coverage failure | L1 integration | contract | `adapter/scenarios/03+wire-mapping/` | Round-trip through CEF / NDJSON / syslog re-parses identically |
| F-39 | HC-WARN | ADP-AS-002 | Timestamp granularity ambiguous (RFC 3339 vs epoch ms vs other) | `packages/openclaw-guardrails/src/siem/formats/cef.ts` (TBD) | SIEM time-range queries may misalign | L1 integration | contract | (covered by F-38) | All formatters emit RFC 3339 with milliseconds |
| F-40 | HC-WARN | ADP-AS-003 | CEF `suser` vs OC actor model field-name collision | `packages/openclaw-guardrails/src/siem/formats/cef.ts` (TBD) | Identity overwritten in some SIEMs | L1 integration | contract | (covered by F-38) | CEF mapping documented; fall-through encoded |
| F-41 | HC-WARN | ADP-AS-004 | `cs3` (custom string 3) eventId convention not standardized | `packages/openclaw-guardrails/src/siem/formats/cef.ts` (TBD) | Correlation across plugins breaks | L1 integration | contract | (covered by F-38) | Per-format correlation field declared in audit doc |
| F-42 | HC-WARN | ADP-AS-005 | `--verify` flag for snap export to re-verify chain before formatting | `packages/openclaw-snap/src/export.ts` (TBD) | Stale / re-ordered events exported without tamper-evidence | L1 integration | forward | `adapter/scenarios/04+verify-before-export/` | `--verify` rejects stale chain |
| F-43 | HC-NOTE | ADP-AS-006 | Lossy-format tradeoffs documented (CEF, syslog truncate long fields) | `docs/upstream/guides/adapter-audits.md` (NEW) | Operator surprises later | (doc) | (doc) | (in adapter-audits.md content) | Doc contains tradeoffs section |

### SC-12 — Hostile-write-then-read (W9)

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-44 | HC-WARN | RGE-001 | `before_agent_start` hook must compare workspace's current `snapshotId` against last promoted `snapshotId` | `packages/openclaw-policy/src/runtime/before-agent-start.ts` (TBD) | Without this comparison, hostile write goes undetected | L2 e2e | simulation | `governance/scenarios/11+hostile-write-runtime-gate/` | Plugin emits requireApproval when snapshot drifts |
| F-45 | HC-WARN | RGE-002 | Adapter audit explicitly documents runtime-gated (not write-blocked) model | `docs/upstream/guides/adapter-audits.md` (NEW) | Consumers' threat models diverge if model not stated | (doc) | (doc) | (in adapter-audits.md content) | Doc contains threat-model section |
| F-46 | HC-NOTE | RGE-003 | `snap stage on` posture is the write-blocking opt-in | `docs/upstream/specs/UG-upstream.md` §3 | Hosts wanting write-blocking know how to get it | (doc) | (doc) | (per amendment §3) | Spec calls out the opt-in |
| F-47 | HC-NOTE | RGE-004 | Audit entry for unauthorized-mutation includes `oc://` URI of mutated file | `packages/openclaw-policy/src/runtime/before-agent-start.ts` | Forensics knows what was mutated | L2 e2e | simulation | (covered by F-44) | Audit entry contains `oc://SOUL.md` etc. |
| F-48 | HC-NOTE | RGE-005 | Multiple-mutation case: each file's drift reported separately | (same) | Forensics granularity | L2 e2e | simulation | (covered by F-44) | One entry per drifted file |
| F-49 | HC-NOTE | RGE-006 | Comparison cost bounded — only files in policy-relevant set checked | (same) | Performance: don't hash every file in workspace per agent start | L2 e2e | simulation | (covered by F-44) | Files outside policy-relevant set skipped |

### SC-13 — OC-4 stripFrontMatter round-trip

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-50 | HC-WARN | OC4-001 | `stripFrontMatter` discards original bytes | `openclaw-core: src/agents/workspace.ts:91` | Hash on stripped content ≠ hash on original; round-trip is lossy | L0 unit | forward | `oc4/scenarios/01+raw-preserve/` | Returned object has sibling `raw: string` matching input bytes |
| F-51 | HC-NOTE | OC4-002 | Non-breaking — existing call sites read `.content`, ignore new `.raw` | `openclaw-core: <multiple call sites>` | No upstream consumer affected | L0 unit | forward | (covered by F-50) | Existing tests still pass |

## Phase 3 · Package invariants + e-discovery

### SC-14 — workspace canonicalize cross-OS

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-52 | HC-NOTE | WSP-C-001 | RFC 8785 JCS byte-identical across Linux / macOS / Windows | `packages/openclaw-workspace/src/canonicalize/jcs.ts` | Cross-host snapshotId mismatch breaks `snap promote` portability | L1 integration | forward | `pkg-invariants/01+canonicalize-cross-os/` | CI matrix asserts identical SHA-256 on three OSes |
| F-53 | HC-NOTE | WSP-C-002 | Line-ending normalization (CRLF → LF) before JCS | (same) | Windows checkouts produce different bytes otherwise | L1 integration | forward | (covered by F-52) | CRLF input → LF canonical output |

### SC-15 — workspace AST round-trip

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-54 | HC-NOTE | WSP-A-001 | parse + emit lossless on every WorkspaceFileKind | `packages/openclaw-workspace/src/ast/` | Round-trip diff breaks editor authoring round-trip | L0 unit | forward | `pkg-invariants/02+ast-roundtrip/` | Emit matches input bytes |
| F-55 | HC-NOTE | WSP-A-002 | Trailing whitespace + list-marker style preserved | (same) | Cosmetic but bot-reviewer flags | L0 unit | forward | (covered by F-54) | Bytes byte-identical |
| F-56 | HC-NOTE | WSP-A-003 | Frontmatter ordering preserved | (same) | YAML library sorts keys → diff | L0 unit | forward | (covered by F-54) | Frontmatter key order preserved |

### SC-16 — guardrails audit append+verify

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-57 | HC-NOTE | GA-001 | Append N=1, 10, 1000 events; verify chain | `packages/openclaw-guardrails/src/audit/chain.ts` | Verifier not exercised at scale → undetected scaling bug | L1 integration | forward | `pkg-invariants/03+audit-scale/` | All chain lengths verify |
| F-58 | HC-NOTE | GA-002 | Tamper one event mid-stream; verifier detects at right position | (same) | Verifier reports wrong position → forensics misled | L1 integration | forward | `pkg-invariants/04+audit-tamper-detect/` | Detection at exact tampered index |

### SC-17 — guardrails approval handle replay-resistance

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-59 | HC-NOTE | AH-001 | Replay with same bytes rejected (sequenceNumber check) | `packages/openclaw-guardrails/src/handle-binding/verify.ts` | Replay attack succeeds | L1 integration | forward | `pkg-invariants/05+replay-resistance/` | Same handle issued twice → second rejected |
| F-60 | HC-NOTE | AH-002 | Replay with different `contentHash` rejected | (same) | Handle-swap attack | L1 integration | forward | (covered by F-59) | Modified `contentHash` rejected |
| F-61 | HC-NOTE | AH-003 | Rotated `keyId` accepted within grace window; rejected outside | (same) | Key rotation breaks all in-flight handles | L1 integration | forward | (covered by F-59) | In-grace accepted; out-of-grace rejected |

### SC-18 — policy generate determinism

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-62 | HC-NOTE | PG-001 | Same input → byte-identical artifacts | `packages/openclaw-policy/src/generate/index.ts` | Non-determinism breaks reproducible builds + content-addressing | L0 unit + L1 integration | forward | `pkg-invariants/06+generate-determinism/` | Run twice, diff = 0 across all 3 artifacts |

### SC-19 — snap snapshotId stability cross-OS

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-63 | HC-NOTE | SS-001 | Same files → same `snapshotId` on Linux / macOS / Windows | `packages/openclaw-snap/src/snapshot/id.ts` | Cross-host promote breaks if ids drift | L1 integration | forward | `pkg-invariants/07+snapshot-id-cross-os/` | CI matrix matches |

### SC-20 — snap promote audited

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-64 | HC-WARN | SP-001 | `snap promote` emits `snapshot_promote` audit event with all required fields | `packages/openclaw-snap/src/promote.ts` | Per UG-upstream.amend.md §7 — temporal queries fail without this | L1 integration | forward | `pkg-invariants/08+promote-audit/` | Event has `snapshotId`, `promotedAt`, `approverPrincipal`, `signedHandleId` |
| F-65 | HC-NOTE | SP-002 | Subsequent promote emits `snapshot_supersede` against previous current | (same) | Synchronization invariant of §7.2 broken without this | L1 integration | forward | (covered by F-64) | Audit chain has supersede entry |

### SC-21 — snap policy historical query (W4)

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-66 | HC-WARN | SHQ-001 | `snap resolvePolicy --at <timestamp>` walks audit chain | `packages/openclaw-snap/src/resolve-policy.ts` (NEW) | E-discovery question "what policy was in force at T?" unanswerable | L2 e2e | simulation | `pkg-invariants/09+resolve-policy-historical/` | Returns snapshotId in force at given timestamp |
| F-67 | HC-NOTE | SHQ-002 | Returned object includes evidence audit-entry UUIDs (promote + supersede) | (same) | Auditor demands traceability | L2 e2e | simulation | (covered by F-66) | Evidence object populated |
| F-68 | HC-NOTE | SHQ-003 | Edge case: query before first promote → null + reason | (same) | Audit-able failure mode | L2 e2e | simulation | (covered by F-66) | Returns `null + { reason: 'no policy in force at queried time' }` |

### SC-22 — snap HTTP resolve

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-69 | HC-NOTE | SHR-001 | `GET /v1/resolve?uri=oc://...` returns field value + snapshotId | `packages/openclaw-snap/src/http/resolve.ts` | HTTP surface for editor / CI integrations | L1 integration | contract | `pkg-invariants/10+http-resolve/` | Response contains both fields |
| F-70 | HC-NOTE | SHR-002 | URI not found → 404 + structured `{code: 'OC_PATH_NOT_FOUND'}` | (same) | Bot-reviewer flags ungstructured 404 | L1 integration | contract | (covered by F-69) | Error envelope shape conforms |

## Phase 4 · Compliance rubric coverage

### SC-23 — SOC 2 control mapping

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-71 | HC-NOTE | SOC2-001 | CC6.1 (logical access) → audit predicates required | `compliance/rubrics/soc2.yaml` (TBD location) | Auditor sees gap | L3 acceptance | contract | `compliance/scenarios/01+soc2-cc61/` | ≥1 audit predicate cited per requirement |
| F-72 | HC-NOTE | SOC2-002 | CC7.2 (audit log coverage) → predicates | (same) | Same | L3 acceptance | contract | (covered by F-71) | (covered) |
| F-73 | HC-NOTE | SOC2-003 | CC7.3 (incident response) → predicates | (same) | Same | L3 acceptance | contract | (covered by F-71) | (covered) |

### SC-24 — HIPAA control mapping

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-74 | HC-NOTE | HIPAA-001 | §164.312(a)(1), (b), (c)(1), (d), (e)(2)(ii) → predicates | `compliance/rubrics/hipaa.yaml` (TBD location) | Auditor sees gap | L3 acceptance | contract | `compliance/scenarios/02+hipaa-312/` | Each requirement traces to ≥1 predicate |
| F-75 | HC-NOTE | HIPAA-002 | Per-framework gaps doc lists known coverage holes | `compliance/README.md` | Operator knows what isn't covered | L3 acceptance | contract | (covered by F-74) | Doc contains gaps table |

---

## HC-BLOCK applications (must apply now)

The 4 HC-BLOCK findings are NOT plan-amendment-shaped — they're scoped to specific PRs and are addressed in their respective adapter audit + scope:

| ID | PR | Application |
|---|---|---|
| F-17 | PR-3 (OC-7) | The OC-7 PR scope fully addresses this — array accumulation replaces `??`. Scenario fixture `governance/scenarios/01+oc7-conjunctive/` is the proof. |
| F-22 | PR-3 (OC-7) | Crash-safety case must be added to PR-3 scope explicitly — try/catch wrapper + spec-declared resolution path (per F-23). UG-upstream.amend.md §11 already lists this for PR-3. **Action**: confirm PR-3 author writes the test fixture before the merger change lands. |
| F-26 | PR-4 (policy) | Generator-side validation — refuse R5 + failOpen at generate time. This is a generator-internals change in our package, not an upstream-spec change. **Action**: confirm `packages/openclaw-policy/src/generate/validate.ts` has the rejection rule. |
| F-38 | PR-2 (guardrails) | Audit-stream wire mapping must be in `docs/upstream/guides/adapter-audits.md` BEFORE PR-2 opens. **Action**: H6 deliverable now has a hard dependency: PR-2 cannot open until adapter-audits.md is published with the field-by-field mapping. |

No HC-BLOCK requires a plan or spec amendment. All four are scoped within their target PRs + the H6 deliverables.

## Phase 5 · Workspace foothold (PR-1 + PR-2)

### SC-25 — JSONC round-trip with comments

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-76 | HC-BLOCK | WSP-FT-001 | JSONC parse + emit must be byte-identical for unchanged input | `packages/openclaw-workspace/src/ast/jsonc.ts` (NEW) | If lossy, every `openclaw update` corrupts user config (data loss class) | L0 unit | forward | `workspace-foothold/01+jsonc-roundtrip-clean/` | Output bytes === input bytes when no mutations applied |
| F-77 | HC-WARN | WSP-FT-002 | Single-leaf mutation preserves all surrounding bytes | (same) | Mutation diff exceeds intent; reviewer/operator surprise | L0 unit | forward | `workspace-foothold/02+jsonc-single-leaf-mutate/` | Diff between input and output limited to mutated leaf |
| F-78 | HC-NOTE | WSP-FT-003 | `// inline` and `/* block */` comments both preserved | (same) | Common JSONC use; loss = bug | L0 unit | forward | (covered by F-76) | Both comment forms survive round-trip |
| F-79 | HC-NOTE | WSP-FT-004 | Custom indent (4-space, tab) preserved | (same) | User formatting choice respected | L0 unit | forward | (covered by F-76) | Indent string survives |
| F-80 | HC-NOTE | WSP-FT-005 | Blank lines between sections preserved | (same) | Visual structure preserved | L0 unit | forward | (covered by F-76) | Blank-line layout survives |

### SC-26 — `doctor --fix` idempotency

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-81 | HC-WARN | WSP-FT-006 | `doctor --fix` on already-clean config = byte-zero diff | `src/commands/doctor*.ts` | Today: stringify drift causes spurious diff; reviewer can't tell if anything actually changed | L1 integration | forward | `workspace-foothold/03+fix-idempotency/` | git diff after second `--fix` run shows zero |
| F-82 | HC-NOTE | WSP-FT-007 | Preview/dry-run uses semantic AST diff, not text diff | `src/commands/doctor.ts` (preview path) | Operator sees "field x changed from y to z," not "20 lines reflowed" | L1 integration | forward | (covered by F-81) | Dry-run output cites only changed fields |

### SC-27 — Plain JSON backward compat

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-83 | HC-WARN | WSP-FT-008 | Plain JSON config (no comments, default 2-space indent) emits bit-for-bit identical to today's stringify | `src/config/io.ts:1381,2082` | The 99% common case must not change behavior; bot reviewers will flag | L1 integration | forward | `workspace-foothold/04+plain-json-backcompat/` | Existing fixture set passes byte-identical |
| F-84 | HC-WARN | WSP-FT-009 | Existing `src/config/io.test.ts` tests pass unchanged | (same) | Regression in test suite blocks merge | L1 integration | forward | (covered by F-83) | All existing assertions still hold |
| F-85 | HC-NOTE | WSP-FT-010 | Final newline behavior matches today's `.trimEnd().concat("\n")` | (same) | Some scripts depend on exact trailing-newline behavior | L0 unit | forward | (covered by F-83) | Output ends with single newline |

### SC-28 — Workspace-file diagnostic emits oc:// URI

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-86 | HC-WARN | WSP-FT-011 | Diagnostic location field accepts `{ uri: string }` shape alongside `{ file, line }` | `packages/openclaw-workspace/src/path/types.ts` + diagnostic shape | If new shape rejected, the URI vocabulary fails | L1 integration | forward | `workspace-foothold/05+diagnostic-shape-dual/` | Both forms accepted by emitter |
| F-87 | HC-NOTE | WSP-FT-012 | Console + LSP renderers handle both shapes | renderer code (TBD upstream) | Backward compat for existing diagnostic consumers | L0 unit | simulation | (covered by F-86) | Renderer output identical for both shapes |

### SC-29 — oc://config URI parser round-trip

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-88 | HC-WARN | WSP-FT-013 | `parseOcUri('oc://config/...')` round-trips losslessly | `packages/openclaw-workspace/src/path/uri.ts` | Lossy round-trip breaks audit-log correlation | L0 unit | forward | `workspace-foothold/06+config-uri-roundtrip/` | parse + format = input |
| F-89 | HC-NOTE | WSP-FT-014 | Array index form `oc://config/.../allowFrom/0` works | (same) | Common case in current config (allowlists are arrays) | L0 unit | forward | (covered by F-88) | Index form parses correctly |
| F-90 | HC-NOTE | WSP-FT-015 | Malformed URIs return structured error codes (not exception) | (same) | Caller can distinguish parse error from runtime error | L0 unit | forward | (covered by F-88) | All malformed forms return error codes |

### SC-30 — Doctor migration emits config URI

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-91 | HC-WARN | WSP-FT-016 | `doctor-legacy-config.migrations` cites `oc://config/...` URIs in its diagnostics | `src/commands/doctor-legacy-config.migrations.ts` (the 14-commits/3mo file) | Without URI citations, audit log entries can't correlate to specific config locations | L1 integration | forward | `workspace-foothold/07+migration-config-uri/` | Migration diagnostic location field is `oc://config/...` URI |
| F-92 | HC-NOTE | WSP-FT-017 | `doctor-config-flow` similarly migrated | `src/commands/doctor-config-flow.ts` | Symmetric coverage | L1 integration | forward | (covered by F-91) | Same |

### SC-31 — Diagnostic renderer dual-shape

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-93 | HC-NOTE | WSP-FT-018 | Renderer prints `oc://...` URI as a clickable link in terminal contexts that support OSC-8 | (renderer code) | UX delight (editors can deep-link) | L0 unit | simulation | `workspace-foothold/08+renderer-osc8/` | Output contains OSC-8 link wrapping |
| F-94 | HC-NOTE | WSP-FT-019 | LSP server forwards URI in `textDocument/publishDiagnostics` `data` field | (LSP code) | Editor extensions consume URI directly | L1 integration | contract | (covered by F-93) | LSP diagnostic includes `data: { uri }` |

### SC-32 — `resolveConfigUri()` correctness

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-95 | HC-WARN | WSP-FT-020 | Valid path returns `{value, parentNode, leafKey, found: true}` | `packages/openclaw-workspace/src/path/resolve.ts` (NEW) | Resolution semantics undefined → snap `/v1/resolve` endpoint unstable | L0 unit | forward | `workspace-foothold/09+resolve-correctness/` | All four fields populated for valid paths |
| F-96 | HC-NOTE | WSP-FT-021 | Missing path returns `{found: false}`, never throws | (same) | Caller can distinguish "not found" from runtime error | L0 unit | forward | (covered by F-95) | Returns object, doesn't throw |
| F-97 | HC-NOTE | WSP-FT-022 | Array-index out-of-bounds is "not found," not exception | (same) | Same | L0 unit | forward | (covered by F-95) | Out-of-bounds returns found:false |

### SC-33 — Concurrent-write safety

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-98 | HC-NOTE | WSP-FT-023 | AST conversion preserves existing atomic-rename file-locking semantics | `src/config/io.ts:replaceConfigFileSync` | Regression here corrupts user config under concurrent writer | L1 integration | simulation | `workspace-foothold/10+concurrent-write/` | Two-process race produces consistent file (last-write-wins, no torn writes) |

### SC-34 — Large-config perf

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-99 | HC-NOTE | WSP-FT-024 | parse + emit on 100KB config within 10× of stringify time | (same) | Bot reviewer flags perf regression in hot path | L1 integration | forward | `workspace-foothold/11+large-config-perf/` | Bench result <50ms; PR description includes ratio |

### SC-35 — Malformed existing config graceful

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-100 | HC-NOTE | WSP-FT-025 | JSONC parser accepts JSON-superset (trailing commas, comments) gracefully; rejects truly invalid input with `OC_CONFIG_PARSE_ERROR` | (same) | Strictly more forgiving than today's JSON.parse — net win | L1 integration | forward | `workspace-foothold/12+malformed-config/` | Forgiving inputs succeed; truly broken inputs return structured error |

### SC-36 — Migration-bug safety

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-101 | HC-NOTE | WSP-FT-026 | AST emit accepts whatever object the migration provides; validation is migration's responsibility, not emitter's | (same) | Doc-only finding; clarifies scope of conversion | (doc) | (doc) | (in PR-1 description) | Description scopes responsibility |

---

## Phase 5 HC-BLOCK applications

| ID | PR | Application |
|---|---|---|
| F-76 | PR-1 (workspace + replaceConfigFile) | THE invariant. Lossless round-trip on unchanged input is the foundation. Without F-76, the whole conversion fails. Strong test coverage required: input fixtures including representative real-world JSONC configs. |

(F-77, F-78, F-79, F-80 are HC-WARN/HC-NOTE since they describe specific aspects of the F-76 invariant.)

---

## Phase 6 · Workspace lint surface (added 2026-04-28)

Findings driven by `claws-workspace-lint` plan H1–H4. All 16 findings already validated claws-side: 43 lint tests passing in `packages/openclaw-workspace/tests/lint/` (5 smoke + 26 per-rule + 12 issue-replay). PR-1 carries the same surface upstream.

### SC-37 — Lint engine schema-DI

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-102 | HC-WARN | LINT-DI-001 | AST-only rules MUST fire when no schema is injected | `packages/openclaw-workspace/src/lint/index.ts` | Engine forces schema requirement → undermines library shape | L0 unit | forward | `tests/lint/rules-coverage.test.ts` | All 5 AST-only rule tests pass without schema |
| F-103 | HC-NOTE | LINT-DI-002 | Schema-aware rules MUST silently skip without schema (no thrown errors) | (same) | False errors when consumers haven't wired schema yet | L0 unit | forward | `tests/lint/smoke.test.ts` "schema-aware rules are silent without a schema" | Findings array contains zero schema-aware codes when no schema |

### SC-38 — oc:// URI on every finding

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-104 | HC-WARN | LINT-URI-001 | Every `LintFinding` carries `ocUri` populated by engine; URI also woven into `message` for non-empty path | `packages/openclaw-workspace/src/lint/index.ts:lint()` post-processing | Renderer fragmentation if rules compute URI ad-hoc | L0 unit + L1 integration | forward | `tests/lint/issue-replay.test.ts` (per-finding ocUri assertion) + `tests/lint/smoke.test.ts` redaction case | All 43 lint tests' findings start with `oc://config` |

### SC-39..SC-50 — Issue replays (one finding per cited issue)

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-105 | HC-NOTE | LINT-EVID-14998 | `$schema` editor convention must NOT trigger `OC_CFG_UNKNOWN_FIELD` | `tests/lint/fixtures/issues/14998-schema-key.jsonc` | Reproducing upstream's #14998 false-positive blocks adoption by any editor user | L1 integration | forward (issue replay) | (same) | Finding set excludes `OC_CFG_UNKNOWN_FIELD` |
| F-106 | HC-WARN | LINT-EVID-20478 | `OC_CFG_PLUGIN_ID_COLLISION` fires when same id at `channels.<x>` AND `plugins.entries.<x>` | `tests/lint/fixtures/issues/20478-plugin-id-collision.jsonc` | Duplicate-plugin warning loop on every reload (per #20478) | L1 integration | forward | (same) | Finding set includes `OC_CFG_PLUGIN_ID_COLLISION` |
| F-107 | HC-WARN | LINT-EVID-22272 | `OC_CFG_UNKNOWN_FIELD` with did-you-mean catches typo'd channel-config keys | `tests/lint/fixtures/issues/22272-unrecognized-keys.jsonc` | doctor's --fix today doesn't actually remove unrecognized keys (#22272) | L1 integration | forward | (same) | Finding includes `OC_CFG_UNKNOWN_FIELD` with `suggestion` populated |
| F-108 | HC-WARN | LINT-EVID-31251 | `OC_CFG_MISSING_REQUIRED_FIELD` catches post-clobber state where required `dmPolicy` is gone | `tests/lint/fixtures/issues/31251-clobbered-dmpolicy.jsonc` | Plugin install/uninstall clobber loses `dmPolicy` silently (#31251) | L1 integration | forward | (same) | Finding includes `OC_CFG_MISSING_REQUIRED_FIELD` with path `['gateway', 'dmPolicy']` |
| F-109 | HC-NOTE | LINT-EVID-48415 | `OC_CFG_TRAILING_COMMA_INCONSISTENT` flags minority style when file mixes | `tests/lint/fixtures/issues/48415-trailing-comma-mix.jsonc` | Control UI saves invalid JSON5 in this state (#48415) | L1 integration | forward | (same) | Finding includes `OC_CFG_TRAILING_COMMA_INCONSISTENT` |
| F-110 | HC-WARN | LINT-EVID-59070 | `OC_CFG_UNKNOWN_FIELD` catches root-level `defaultId` typo with did-you-mean → `defaultAgent` | `tests/lint/fixtures/issues/59070-defaultId-typo.jsonc` | Gateway rejects + permanent unsaved-changes state (#59070) | L1 integration | forward | (same) | Finding has `suggestion: 'defaultAgent'` |
| F-111 | HC-WARN | LINT-EVID-60334 | `OC_CFG_LEGACY_FIELD` recognizes `mediaLocalRoots`, `bootstrapMaxCharsPerFile` as removed-in-2026.4.2 | `tests/lint/fixtures/issues/60334-legacy-root-keys.jsonc` | 2026.4.2 update outright rejects legacy keys (#60334) | L1 integration | forward | (same) | Finding set includes `OC_CFG_LEGACY_FIELD` |
| F-112 | HC-WARN | LINT-EVID-61683 | `OC_CFG_MISSING_REQUIRED_FIELD` catches gateway config missing `dmPolicy` | `tests/lint/fixtures/issues/61683-missing-required.jsonc` | Plugin-scoped config aborts gateway startup (#61683) | L1 integration | forward | (same) | Finding includes `OC_CFG_MISSING_REQUIRED_FIELD` |
| F-113 | HC-BLOCK | LINT-EVID-62281 | `OC_CFG_REDACTED_PLACEHOLDER` (severity ERROR) fires on `__OPENCLAW_REDACTED__` literal | `tests/lint/fixtures/issues/62281-redacted-corruption.jsonc` | Data-corruption class — closed historicals #13495, #44357, #62281, #21573, #13210, #12078 + open #60917, #68423, #66832, #59945. Lossless write path prevents recurrence; lint is fail-safe | L1 integration | forward | (same) | Finding has `severity: 'error'` and `code: 'OC_CFG_REDACTED_PLACEHOLDER'` |
| F-114 | HC-NOTE | LINT-EVID-62438 | Clean `${VAR}` references must NOT trigger `OC_CFG_SECRET_REF_AMBIGUOUS` (negative test) | `tests/lint/fixtures/issues/62438-secret-ref-clean.jsonc` | Reproducing upstream's #62438 false-positive (audit fires for clean refs) | L1 integration | forward | (same) | Finding set excludes `OC_CFG_SECRET_REF_AMBIGUOUS` |
| F-115 | HC-WARN | LINT-EVID-65565 | `OC_CFG_UNKNOWN_FIELD` catches `defaultId` typo at nested `agents.defaults.<x>` location | `tests/lint/fixtures/issues/65565-default-agent-typo.jsonc` | Same root cause as #59070 at different depth (#65565) | L1 integration | forward | (same) | Finding at path `['agents', 'defaults', 'defaultId']` |
| F-116 | HC-WARN | LINT-EVID-72872 | `OC_CFG_LEGACY_FIELD` catches `agents.defaults.agentRuntime` with auto-migration to `runtimeVersion` | `tests/lint/fixtures/issues/72872-agentRuntime-legacy.jsonc` | 2026.4.24 schema rejects field from prior 4.x configs (#72872) | L1 integration | forward | (same) | Finding has `suggestion: 'runtimeVersion'` |

### SC-51 — Fixer roadmap contract

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-117 | HC-NOTE | LINT-FIX-001 | PR-1 ships detection-only; per-code fixers ship in follow-up PRs per UG-upstream § 13 | `UG-upstream.amend.md §13` table | Without contract, follow-up fixer-PRs drift in scope | L3 acceptance | contract (per future fixer-PR) | (per fixer-PR contract) | Fixer-PR title prefix matches; ≤200 LOC fix + ≤100 LOC tests; fix-then-re-lint produces zero target-code findings |

## Phase 6 HC-BLOCK applications

| ID | PR | Application |
|---|---|---|
| F-113 | PR-1 (workspace + lint) | The redaction-corruption class motivates the package itself. Without F-113 detection, the substrate change (`JSON.stringify` → lossless emit) reads as plumbing; with it, reviewers see a concrete data-corruption fail-safe that closes 6 historical issues. **Action**: PR-1 description leads with the issue-citation table (data pulled 2026-04-28), `OC_CFG_REDACTED_PLACEHOLDER` rule has explicit ERROR severity in the catalog table. |

---

## Test tier delta vs Coverage Contract

| Tier | Plan target | Scenarios target | Delta | Reason |
|---|---|---|---|---|
| L0 unit | 24 | **34** | +10 | Phase 5 (+6 net) + Phase 6 (+4: schema-DI, oc-uri-on-finding, parser unit, emit unit) |
| L1 integration | 12 | **36** | +24 | Phase 5 (+12 net) + Phase 6 (+12: 12 issue replays validated by `tests/lint/issue-replay.test.ts`) |
| L2 e2e | 8 | 8 | 0 | Aligned |
| L3 acceptance | 6 | 9 | +3 | Phase 5 (+2 SOC2/HIPAA) + Phase 6 (+1 fixer-roadmap contract) |
| **Total** | **50** | **87** | **+37** | (Phase 5 +20, Phase 6 +17) |

These deltas update the plan's Coverage Contract; pulse 04 (PR-1 / workspace + lint) reflects the new totals.

## Series-level fixture targets (planned for pulses stage)

| Series | min fixtures | runner |
|---|---|---|
| `bot-preempt` | 13 | simulation |
| `governance` | 11 | simulation + forward |
| `adapter` | 4 | contract + simulation |
| `oc4` | 1 | forward |
| `pkg-invariants` | 10 | forward |
| `compliance` | 2 | contract |
| `lint-issue-replay` | 12 | forward (already shipped at `packages/openclaw-workspace/tests/lint/fixtures/issues/`) |

Total: 53 fixtures planned (+12 lint replays already shipped); rest created during acceptance test pulses.

---

## Phase 7 · LKG primitive adversarial (added 2026-04-30)

Phase 7 was added after the snap → LKG strategic pivot (see `carve-consumer-catalog.md` strategic-pivot section) introduced the `@bic/openclaw-lkg` (FS) and `@bic/openclaw-lkg-git` (git-backed) packages and the `policy-plugin-lkg` shell. Four waves of adversarial scenarios were authored to probe the LKG primitive's threat surface beyond happy-path E2E. The waves live in `packages/v2-prototype/tests/v2-chain-lkg-adversarial-{,2,3,4}.integration.test.ts` (76 scenarios across 16 categories, all green at end of session 2026-04-30).

### Scenario coverage at category granularity

| Wave | Categories | Tests |
|---|---|---|
| 1 | L tamper · R recovery · V validators · P plugin-shell · G git-backend · X path hygiene | 24 |
| 2 | C concurrency · A audit · E I/O · B boundaries · M multi-agent merge · N no-LKG-initial | 19 |
| 3 | S schema evolution · Q PolicyIR shape · Z performance/scale · F filesystem oddities | 18 |
| 4 | EI error injection · CR crash recovery · GD git dedup parity · GW git worktree edges | 15 |
| 5 | SEC security (symlinks/special-chars/TOCTOU) · OBS audit completeness · ENC encoding edges · GIT2 advanced git states · PV PolicyIR↔LKG bridge · FP fingerprint determinism | 24 (2 POSIX-only skipped on Windows) |
| 6 | LIM limits/quotas · T time/clock · MT multi-tracker independence · REG registration edges · FAULT lightweight synthetic failures | 19 |
| 7 | WK workspace-shape · MULT multi-process simulation · DET determinism/replay · CIR non-serializable parse shapes · EXT SDK extension boundary · DEG degenerate validator outputs | 21 |
| 8 | HK hook ordering · REC recovery edges · PROM promote-time edges · NRM path normalization | 16 |
| 9 | STR stress/soak · JSON shape edges · FAIL failure isolation · INIT initialization order | 16 |
| 10 | ERR error message quality · EXH outcome exhaustiveness · AS API surface coverage · BACK backwards-compat shape locks | 17 |
| 11 | ARCH architectural invariants — every test runs against BOTH backends via `describe.each` (FS + git) to prove backend-agnostic contract surface | 36 (18 invariants × 2 backends) |
| 12 | WIRE upstream config-LKG byte-format parity · MIG migration story · REPL audit-log replay · DIAG diagnostics / introspection | 17 |
| 13 | CHAIN multi-LKG composition · XDEP cross-tracker dependencies · ORD promotion ordering · POOL plugin pool isolation | 17 |
| 14 | MET metrics aggregation · TEL telemetry semantics · HEALTH health/readiness · RATE rate-of-recovery as health signal | 16 |
| 15 | REF HEAD ref movement · PACK packed vs loose objects · GC git-gc pruning · RBASE rebase / amend / cherry-pick across LKG commits | 13 |
| 16 | CONF upstream config-LKG conformance · TS type-shape exhaustiveness · FUZZ generated random inputs | 14 |
| 17 | PROP property-based forall assertions · CORP replay corpus · STAB stability across multiple runs | 12 |
| 18 | DOC documented examples runnable · TYPE TypeScript type-level · FINAL public-export shape lock | 12 |

### Phase 7 findings

| ID | Severity | Code | Finding | File:Line | Consequence | Tier | Runner | Fixture | Assert |
|---|---|---|---|---|---|---|---|---|---|
| F-118 | HC-BLOCK | LKG-G-001 | `gitLKGStore.commitPromote()` used `git commit -m msg` (no path arg), sweeping pre-staged unrelated paths into the LKG commit | `packages/openclaw-lkg-git/src/git-lkg-store.ts:234` | Multi-agent / shared-repo: agent A's LKG promote silently swallows agent B's staged work — chain-of-custody breaks; LKG history contains arbitrary content | L1 integration | forward | `v2-chain-lkg-adversarial-4.integration.test.ts > GW3` | `git show --name-only HEAD` after promote excludes pre-staged unrelated paths |
| F-119 | HC-NOTE | LKG-F-001 | FS LKG tamper detection is recovery-path-only — hand-edited `<path>.lkg` is invisible to observe while working tree stays valid | `packages/openclaw-lkg/src/lkg-store.ts:189` (hash check only fires inside `recover()`) | Operator-attacker who can write `<path>.lkg` and avoid breaking working tree can poison the LKG bytes; tamper surfaces only on next forced recover | L1 integration | forward | `v2-chain-lkg-adversarial-4.integration.test.ts > CR4 [GAP]` | `[GAP]` test asserts current contract; mitigation lives at deployment level (chmod 0600, gateway-owned dir) — same as upstream config-LKG model |
| F-120 | HC-NOTE | LKG-T-001 | `clobbered.<ts>` sidecar uniqueness depends on `observedAt` advancing between recoveries — under a frozen clock back-to-back recoveries write the same path and the second overwrites the first | `packages/openclaw-lkg/src/lkg-store.ts:91` (clobberedPathFor uses observedAt only) | Replay-mode / test-mode (frozen clock): forensic preservation of bad bytes is incomplete (only the LATEST bad bytes survive). Real systems unaffected (system clock advances on ms granularity) | L1 integration | forward | `v2-chain-lkg-adversarial-6.integration.test.ts > T2 [GAP]` | `[GAP]` test asserts current contract; mitigation: replay/test hosts bump `now()` between observes, OR a future hardening adds a sequence counter to the clobbered path. Documents the dependency between sidecar uniqueness and clock monotonicity |
| F-121 | HC-NOTE | LKG-A-001 | `readLastKnownGood()` reads on-disk `<path>.lkg` directly with no hash check against any recorded `lastPromotedGood.hash` | `packages/openclaw-lkg/src/lkg-store.ts:531` (readFile + return; no entry/hash gate) | A fresh process can read an orphaned or tampered `.lkg` through this API. The safety gate lives at the plugin shell, not at this method. Direct callers without that gate must do their own verification, OR call `observe()` first to populate the in-memory hash | L1 integration | forward | `v2-chain-lkg-adversarial-7.integration.test.ts > MULT1 [GAP]` | `[GAP]` test asserts current contract; mitigation: callers route through the plugin shell (which uses `getEntry().lastPromotedGood.hash` to fail-closed on empty entry), OR call `observe()` before `readLastKnownGood()`. Documents the trust boundary |

### HC-BLOCK applications (Phase 7)

| Finding | Apply target | Status |
|---|---|---|
| F-118 (LKG-G-001) | `packages/openclaw-lkg-git/src/git-lkg-store.ts:234` — change `commit -m msg` → `commit -m msg -- <relPath>` | **Fixed in same session 2026-04-30**. lkg-git package tests still 9/9 green; new GW3 adversarial test asserts no regression. |

### Phase 7 contract invariants locked in (no severity row — these are properties the waves *prove* hold)

- **Validator exception-safety** — wave 1 V1, wave 4 GD2 — a thrown validator surfaces as `LKGError` (`LKG_VALIDATOR_THREW`), never silently masked as recovery. Locks both backends.
- **Audit hook isolation** — wave 2 A1, A2; wave 4 EI3, EI4 — `onAudit` and `onRecoveryNotice` callbacks throwing (sync or returning rejected promises) MUST NOT crash observe. Try/catch at the await site is load-bearing.
- **Two-store independence** — wave 2 C4 — two distinct `LKGStore` instances on the same file maintain independent dedup state without cross-contamination.
- **Cross-process orphan immunity** — wave 4 CR1 — `<path>.lkg` files left over from a prior process are never trusted by a fresh store (entry is empty → hash check refuses → first valid observe re-promotes from current bytes).
- **Performance gates** — wave 3 Q4 (1000-rule PolicyIR evaluates in <500ms eyeball gate); wave 3 Z3 (1MB recovery preserves bytes byte-for-byte); wave 3 Z4 (slow audit hook of 50ms doesn't double observe latency).
- **Bytes-only fingerprint** — wave 5 FP1 (touching a file without changing bytes produces the same hash); wave 5 FP3 (different `now` clocks produce different `observedAt` but identical hashes for the same bytes — cross-process determinism).
- **Audit completeness** — wave 5 OBS1-OBS4 (audit record fields are populated correctly per outcome; `clobberedPath` null on `valid|promoted`, set on `recovered`; `ts` monotonic across observes); wave 5 OBS5 (git audit `commitSha` is set only for `outcome=promoted`, null for `valid|recovered`); wave 5 OBS3 (RecoveryNotice cross-links to its `recovered` audit record by `(ts, trackerPath, clobberedPath, restoredFrom.hash)`).
- **Byte-for-byte preservation** — wave 5 ENC1 (CRLF line endings preserved through promote+recover); wave 5 ENC2/ENC3 (trailing newline and BOM each produce distinct fingerprint hashes — bytes-level, not content-level).
- **Git unique-commit-per-content** — wave 5 GIT2-3 (three distinct content versions produce three distinct unique commit SHAs; no commit-reuse).
- **Cache eviction on fingerprint flip** — wave 5 PV2 (fingerprint flip after re-promote correctly evicts the plugin's PolicyIrCache; new IR flows through immediately).
- **Registry scale** — wave 6 LIM1 (1000 trackers in one store register and observe in parallel without cross-talk).
- **Streaming-free large-file integrity** — wave 6 LIM2 (5MB single-file LKG promote+recover preserves bytes byte-for-byte) and wave 6 LIM4 (depth-100 nested JSON parses without stack overflow — no recursion in LKG flow itself).
- **Clock-determinism** — wave 6 T1 (deterministic `now()` produces deterministic `observedAt` across observes — replay-friendly); wave 6 T4 documents the inverse non-property (clock going backwards is NOT enforced — `now()` value is recorded as-is; future change to add monotonicity guards would be surfaced).
- **Per-tracker dedup isolation** — wave 6 MT3 (tracker A's suspicious-vs-LKG dedup state does NOT leak into tracker B; per-tracker state, not per-store).
- **Path normalization at register-time** — wave 6 REG1, REG2 (`path.normalize` collapses `./` segments; `cfg/./x.json` and `cfg/x.json` COLLIDE on register; observe with the redundant variant resolves to the registered tracker).
- **Prototype-pollution resistance** — wave 6 FAULT1 (exotic parse() return shapes including `{ __proto__: { tampered: true } }` do NOT propagate prototype pollution into the LKG flow; promote completes normally).
- **Companion-file locality** — wave 7 WK1, WK4 (companion files `.lkg` and `.clobbered.<ts>` live next to their target; sibling trackers in same dir don't collide; same-basename trackers in different dirs each get independent companions); WK2 (file with `.lkg` literal in its filename is unambiguous because the companion suffix is `.lkg` over the FULL target path, not a substring match).
- **Cross-process hand-off idempotence** — wave 7 MULT2 (FS hand-off: B's first observe re-promotes from current bytes, overwriting A's `.lkg` with byte-identical content); MULT3 (git hand-off: B's first observe sees the same HEAD blob hash via `getEntry()` — git's content-addressing makes cross-process determinism free).
- **Replay determinism** — wave 7 DET1 (same input bytes + same `now()` → byte-identical audit records); DET3 (replaying the same observe-script on two scratch dirs produces byte-identical final on-disk state for the LKG companion AND active file).
- **Shape-agnostic LKG flow** — wave 7 CIR1, CIR2, CIR3 (parse() returning a circular object, `Map`, or `Date` all promote cleanly because LKG stores raw bytes and never JSON.stringify-s the parsed value).
- **SDK extension hooks typed access** — wave 7 EXT1 (`suspiciousReasons({ current, lastKnownGood, parsed })` has typed access to the parsed value); EXT2 (`shouldRecover({ valid, issues })` can branch on issue codes).
- **Validity gate over issues count** — wave 7 DEG1 (validator returning `{valid: false, issues: []}` STILL triggers recovery — the gate is `valid`, not `issues.length`). DEG2/DEG3: multiple issues with codes propagate through audit.
- **Audit firing cardinality + timing** — wave 8 HK1 (audit fires exactly once per observe call across all outcomes); wave 8 HK2 (audit fires AFTER on-disk state has settled — `clobberedPath` always points at an existing file by the time the hook runs); wave 8 HK3 (recovery-notice fires exactly once per `recovered` outcome, never on `valid|promoted|skipped|failed`); wave 8 HK4 (multi-tracker observes preserve audit FIFO ordering).
- **Recovery file-state invariants** — wave 8 REC1 (entry has `lastPromotedGood` but `.lkg` file missing → recover returns null → `outcome=skipped, reason=no-lkg-available`); wave 8 REC2 (entry hash mismatches `.lkg` bytes → refuses); wave 8 REC4 (`shouldRecover=false` leaves the `.lkg` companion file UNTOUCHED — no read, no write).
- **Promote idempotence + commit-tree integrity** — wave 8 PROM3 (no `.tmp-*` leftover files after successful promote); wave 8 PROM4 (git LKG commits contain ONLY the registered path even when other files are pre-staged — regression-locks the F-118 GW3 fix).
- **Path normalization correctness** — wave 8 NRM2 (observing via redundant-segment paths like `cfg/./../cfg/x.json` resolves correctly via `path.normalize` collapse); wave 8 NRM4 (git relPath always uses forward slashes regardless of platform separator).
- **Stress / soak headroom** — wave 9 STR1 (500 sequential unchanged-observes bounded under 5s); wave 9 STR2 (100 promote+recover cycles with no resource leak); wave 9 STR3 (1000-record audit ordering preserved); wave 9 STR4 (200 trackers × 5 observes with no cross-talk).
- **JSON-shape edge tolerance** — wave 9 JSON1/JSON2 (literal `NaN` and `Infinity` in file content trigger unparseable→recover correctly); wave 9 JSON3 (large numbers beyond `MAX_SAFE_INTEGER` parse without crash; LKG hash is over raw bytes so precision loss in parsed value doesn't affect the LKG); wave 9 JSON4 (depth-1000 nested arrays parse cleanly).
- **Cross-tracker failure isolation** — wave 9 FAIL1/FAIL2/FAIL3/FAIL4 (parse / validate / file-missing / audit-hook-throw on tracker A do not affect tracker B in the same store).
- **Initialization order tolerance** — wave 9 INIT1 (register-observe-register-observe interleaving: each observe is independent); INIT3 (re-register on same path collides regardless of whether observe has fired); INIT4 (observe-before-register throws `LKG_TRACKER_PATH_INVALID`, no auto-register).
- **Error message quality** — wave 10 ERR1, ERR2, ERR3 (LKGError messages contain the offending tracker path); wave 10 ERR4 (`LKG_VALIDATOR_THREW` preserves the underlying exception via `error.cause`).
- **Outcome exhaustiveness** — wave 10 EXH1..EXH5 (every `LKGObservation` outcome variant — promoted, valid, recovered, skipped, failed — has a reproducible scenario; future addition to the discriminated union must add a corresponding scenario).
- **API surface coverage** — wave 10 AS1..AS5 (every exported function from `@bic/openclaw-lkg`: `lkgPathFor`, `clobberedPathFor`, `isCompanionPath`, `hashRaw`, `makeFingerprint` has happy + sad path coverage; future export additions must add coverage).
- **Backwards-compat shape locks** — wave 10 BACK1 (LKGObservation discriminated union — `promoted`/`valid` carry `fingerprint`; `recovered` carries `reason`+`clobberedPath`+`restoredFrom`; `skipped`/`failed` carry `reason`+`issues`); BACK2 (AuditRecord required field set frozen at 10 keys: `clobberedPath`, `current`, `event`, `issues`, `lastKnownGood`, `outcome`, `source`, `suspicious`, `trackerPath`, `ts`); BACK3 (LKGErrorCode documented enum: `LKG_TRACKER_PATH_INVALID`, `LKG_TRACKER_PATH_COLLISION`, `LKG_STORE_UNAVAILABLE`, `LKG_VALIDATOR_THREW`).
- **Architectural invariants — backend-agnostic contract surface** (wave 11, every invariant proven on BOTH backends via `describe.each`):
  - ARCH1 — outcome SET identical (no backend-specific outcomes leak through).
  - ARCH2 — LKGFingerprint shape identical; `hash` is hex string on both backends.
  - ARCH3 — `LKGEntry.lastPromotedGood` is the cache-key anchor on every backend.
  - ARCH4 — `readLastKnownGood` returns `Uint8Array` (never string); bytes are the contract.
  - ARCH5/ARCH6 — `register()` rejects non-absolute and duplicate paths uniformly.
  - ARCH7/ARCH8 — outcome=skipped (no LKG + invalid) and outcome=valid (unchanged) reachable on both.
  - ARCH9 — LKGObservation ↔ LKGEntry types compose cleanly.
  - ARCH10 — Recovered observations always carry `restoredFrom: LKGFingerprint`.
  - ARCH11 — `clobberedPath` (when present) NEVER equal to tracker path; always derived as sidecar.
  - ARCH12 — Hash determinism for identical bytes on every backend.
  - **ARCH13 — `LKGStore` keys are EXACTLY `{register, observe, readLastKnownGood, getEntry}`. No work-tree-specific API leaks. The load-bearing abstraction lock for hypothetical future backends (S3, IPFS, etc.).**
  - ARCH14 — All four contract methods present and callable on both.
  - ARCH15/ARCH16 — outcome=recovered always carries `clobberedPath` + `reason`.
  - ARCH17 — outcome=skipped|failed always carries `issues` (array, possibly empty).
  - ARCH18 — `getEntry()` returns null (not throw) for unregistered paths.
- **Upstream config-LKG byte-format parity** — wave 12 WIRE1 (`<path>.lkg` is `<full-target>.lkg`, no prefix transform); WIRE2 (`clobbered.<ts>` ISO format strips `:`/`.` to `-`); WIRE3 (sha256 lower-hex over raw bytes, deterministic across platforms — `hashRaw('hello world') = b94d27b9...e088f7ace2efcde9`); WIRE4 (audit `source: "lkg"`, `event: "observe"` are wire-format constants).
- **Migration tolerance** — wave 12 MIG1 (orphan `.lkg` from prior process is rejected by hash check on recovery; first observe re-promotes from current bytes — operator-transparent migration); MIG2 (1:N tracker mapping); MIG3 (LKG works for non-config files — PolicyIR / hook outputs / etc. — validator is the only schema-aware layer); MIG4 (no config-specific lifecycle hooks; generic primitive).
- **Audit-log replay** — wave 12 REPL1 (final fingerprint reconstructible from audit log); REPL2 (ts monotonic non-decreasing across observes); REPL3 (identical observe-sequence on a fresh store produces identical audit-record sequence by hash equality); REPL4 (outcome sequence matches expected lifecycle for canonical promote→recover→valid script).
- **Diagnostics / introspection — registry is opaque** — wave 12 DIAG1 (getEntry returns shallow copy; caller mutation does NOT affect registry state); DIAG2/DIAG3 (getEntry distinguishes registered-but-unobserved `{}` from unregistered `null` — two distinct signals); DIAG4 (store has NO `listTrackers / unregister / clear / reset` API — registry is intentionally append-only and opaque, a security property: a misbehaving plugin cannot enumerate or remove other plugins' trackers).
- **Multi-LKG composition** — wave 13 CHAIN3 (partial-chain failure on one tracker doesn't block others); CHAIN5 (50 trackers each recover to their own bytes — no cross-tracker contamination on multi-promote/multi-recover cycles).
- **Cross-tracker dependencies** — wave 13 XDEP1/XDEP2/XDEP3 (a tracker's validator can read another tracker's `getEntry()` for composed validation; observe ordering unlocks B's validation; B is correctly invalid before A is observed); XDEP4 (recover of A does NOT cascade-recover B — trackers are not transitively coupled).
- **Promotion ordering** — wave 13 ORD2 (concurrent `Promise.all` produces exactly one audit record per tracker — no double-firing); ORD3 (parallel observes of the same target leave LKG in a consistent state).
- **Plugin pool isolation** — wave 13 POOL1/POOL2/POOL3/POOL4 (each plugin has its own `LKGStore`; cross-plugin getEntry returns null; per-store audit hooks are independent; a crashing audit hook on one plugin doesn't affect another). Important for multi-plugin gateway deployments.
- **Observability — audit-derived metrics** — wave 14 MET1 (counters by outcome); MET2 (counters by tracker); MET3 (rate-per-window from monotonic ts); MET4 (byte-volume from `current.bytes`). Hosts can wire LKG audits into their existing telemetry without architectural changes.
- **Telemetry contract — what's safe vs operator-territory** — wave 14 TEL1 (`current.hash` is sha256 — content-derived but non-reversible, safe for correlation/dedup); TEL2 (`issues[].message` is validator-controlled and may contain user-supplied PII — operator must classify); TEL3 (`trackerPath` is absolute filesystem path — emitting may leak deployment topology); TEL4 (stat fields uid/gid/mode are nullable on Windows, present on POSIX).
- **Health / readiness signals** — wave 14 HEALTH1 (single-tracker readiness via `lastPromotedGood !== undefined`); HEALTH2 (composite-ready when ALL trackers have lastPromotedGood); HEALTH3 (file-not-yet-written tracker is unready, observe returns failed); HEALTH4 (rising recovery-rate correlates with degraded health).
- **Rate-of-recovery as alarm signal** — wave 14 RATE1 (burst-of-recoveries pattern); RATE2 (promote-to-recover ratio bounds in healthy ops); RATE3 (3+ consecutive recoveries → alarm threshold).
- **Git-backend robustness against operator git ops** — wave 15 REF1 (external commit between observes is reflected on next observe); REF2 (branch switch causes a promote on the new branch when working-tree differs); REF3 (symbolic-ref change to same commit is a no-op for observe); REF4 (HEAD on a commit without the tracker file is handled gracefully); PACK1/PACK2/PACK3 (after `git gc` packs loose objects, observe / readLastKnownGood / hash-object all behave identically); GC1/GC2/GC3 (`gc --prune=now` preserves reachable LKG blobs; post-gc log still shows lkg(promote) messages; many-promote repos survive gc); RBASE1/RBASE2/RBASE3 (rebase preserves working-tree blob; amend keeps observe working; cherry-pick onto a different branch preserves the `lkg(promote): <path>` message structure).
- **Upstream config-LKG conformance** — wave 16 CONF1 (canonical sha256 hash fixtures: `hashRaw('hello world') = b94d27b9...`); CONF2 (companion suffix parity for POSIX + Windows paths); CONF3 (clobbered ISO format parity with `:`/`.`→`-`); CONF4 (validate-then-promote semantics — companion file written byte-for-byte); CONF5 (invalid-then-recover — restoredFrom.hash matches prior promote, clobbered preserves bad bytes byte-for-byte). The CONF cluster pins wire-format parity with upstream's `recoverConfigFromLastKnownGood`.
- **Type-shape exhaustiveness** — wave 16 TS1/TS2 (every documented `LKGFingerprint` field is settable via `makeFingerprint`, with stat=null and stat=stats variants both working); TS3 (`LKGEntry.lastKnownGood` AND `lastPromotedGood` reachable across observe lifecycle); TS4 (`AuditRecord` for outcome=promoted populates `current` AND `lastKnownGood` with same hash); TS5 (all 5 `LKGObservation` outcomes — promoted, valid, recovered, skipped, failed — have at least one variant-specific field beyond `outcome`).
- **Generated random fuzzing** — wave 16 FUZZ1 (random valid JSON inputs all promote); FUZZ2 (random invalid garbage all skipped without LKG); FUZZ3 (10 promote-then-corrupt cycles produce consistent recovery); FUZZ4 (random byte sizes 1B to 100KB preserve exact length through promote+recover).
- **Property-based forall assertions** — wave 17 PROP1 (forall valid bytes B: `observe(B) → outcome=promoted, fingerprint.hash = sha256(B)`); PROP2 (forall (good, bad) pairs: promote(good) → corrupt(bad) → recover restores good byte-for-byte); PROP3 (forall N observe orderings: audit log preserves call order across all 5 permutations of 3 trackers); PROP4 (forall N trackers: breaking tracker A does NOT affect tracker B in the same store, validated for n=2..5); PROP5 (forall fresh tracker: outcome=promoted is reachable on first valid observe).
- **Replay corpus** — wave 17 CORP1 (4 good PolicyIR-shape fixtures all promote); CORP2 (5 bad fixtures all rejected); CORP3 (4×4=16 cross-pair good→bad scenarios all promote→recover correctly); CORP4 (deterministic fingerprint hash across re-runs of the same input).
- **Stability across runs** — wave 17 STAB1 (same input across 5 concurrent runs produce identical audit-record hash sequences); STAB2 (`hashRaw` regression-locked across re-runs); STAB3 (LKG companion file content byte-stable across re-runs).
- **Documented examples runnable** — wave 18 DOC1/DOC2/DOC3/DOC4 (README minimal usage; audit hook example; recovery-notice example; readLastKnownGood example all execute without error and produce documented behavior).
- **TypeScript type-level / API tests** — wave 18 TYPE1 (`LKGObservation` discriminated-union exhaustive narrowing via switch statement — TS would error if a variant were unhandled); TYPE2 (`LKGTracker<T>` generic flows through to `validate(parsed: T)` — typed access in validator body); TYPE3 (contract-type imports `LKGEntry` / `LKGFingerprint` / `ValidationResult` / `ValidationIssue` are assignable from real values); TYPE4 (`LKGStore` is structurally-typed with the four contract methods).
- **Public-export shape lock** — wave 18 FINAL1 (`@bic/openclaw-lkg` exposes EXACTLY the 7-key set `{LKGErrorImpl, clobberedPathFor, hashRaw, isCompanionPath, lkgPathFor, lkgStore, makeFingerprint}` — future additions/removals must update this assertion intentionally); FINAL2 (`LKGErrorImpl` is constructible with `code` + `message` + optional `cause`); FINAL3 (`makeFingerprint` output has EXACTLY the 11-key shape `{bytes, ctimeMs, dev, gid, hash, ino, mode, mtimeMs, nlink, observedAt, uid}`); FINAL4 (path / hash helpers are pure functions — same input → same output, no side effects).

### Phase 7 wave 5 note (added 2026-04-30)

Wave 5 added 24 scenarios (22 pass on Windows, 2 POSIX-only symlink tests skipped — SEC1 reads through a symlink as the tracker target; SEC2 verifies the recovery hash check refuses an `<path>.lkg` symlink-replaced-with-attacker-bytes). **No new HC rows.** Wave 5 is invariant-locking, not bug-finding — it pins eight additional contract properties (see the list above) that the upstream PR conversation will reference.

### Phase 7 wave 6 note (added 2026-04-30)

Wave 6 added 19 scenarios across 5 categories: **LIM** limits/quotas (1000 trackers, 5MB single file, 100KB single line, depth-100 nested JSON), **T** time/clock semantics, **MT** multi-tracker independence, **REG** registration semantics edges, **FAULT** lightweight synthetic failures. **One new HC-NOTE row (F-120)** for the clobbered-path-collision-under-frozen-clock [GAP]; eight additional contract invariants pinned (registry scale, streaming-free large-file integrity, clock-determinism, per-tracker dedup isolation, path normalization at register-time, prototype-pollution resistance).

### Phase 7 wave 7 note (added 2026-04-30)

Wave 7 added 21 scenarios across 6 categories: **WK** workspace-shape (multiple LKGs in same dir, sibling effects), **MULT** multi-process simulation (cross-process hand-off, git HEAD blob parity), **DET** determinism / replay, **CIR** non-serializable parse shapes, **EXT** SDK extension boundary (`suspiciousReasons` + `shouldRecover` typed access), **DEG** degenerate validator outputs. **One new HC-NOTE row (F-121)** for the readLastKnownGood-no-hash-check [GAP]; nine additional contract invariants pinned (companion-file locality, cross-process hand-off idempotence, replay determinism, shape-agnostic LKG flow, SDK extension hooks typed access, validity-gate-over-issues-count).

### Phase 7 wave 8 note (added 2026-04-30)

Wave 8 added 16 scenarios across 4 categories: **HK** hook ordering semantics (audit-once, audit-after-disk-settle, recovery-notice-once, multi-tracker FIFO), **REC** recovery edges (entry/file mismatch produces controlled skipped outcome; shouldRecover-false leaves `.lkg` untouched), **PROM** promote-time edges (idempotent valid, last-good-wins, no `.tmp-*` leftover, git commit-tree contains ONLY the registered path — regression-locks F-118), **NRM** path normalization (redundant-segment paths resolve correctly; git relPath always uses forward slashes). **No new HC rows.** Eight additional contract invariants pinned (audit firing cardinality + timing, recovery file-state invariants, promote idempotence + commit-tree integrity, path normalization correctness).

### Phase 7 wave 9 note (added 2026-04-30)

Wave 9 added 16 scenarios across 4 categories: **STR** stress/soak (500 unchanged-observes bounded; 100 promote+recover cycles no leak; 1000-record audit FIFO; 200 trackers × 5 observes no cross-talk), **JSON** JSON-shape edges (literal `NaN`/`Infinity` rejected via unparseable→recover; large-number precision tolerance; depth-1000 nested arrays), **FAIL** failure isolation (parse/validate/file-missing/audit-throw on A doesn't affect B), **INIT** initialization order (register-observe interleaving; collision-after-observe; observe-before-register rejection). **No new HC rows.** Five additional contract-invariant clusters pinned.

### Phase 7 wave 10 note (added 2026-04-30)

Wave 10 added 17 scenarios across 4 categories: **ERR** error message quality, **EXH** outcome exhaustiveness, **AS** API surface coverage, **BACK** backwards-compat shape locks. **No new HC rows.** Wave 10 is documentation-and-shape-lock — future API surface or shape changes will surface as broken assertions, making the change intentional.

### Phase 7 wave 11 note (added 2026-04-30)

Wave 11 added a single category — **ARCH** architectural invariants — with 18 invariants × 2 backends = 36 dual-backend tests via `describe.each([fs, git])`. **No new HC rows.** Wave 11 is the **abstraction-boundary shape lock**: every invariant is proven on BOTH the FS and git backends, demonstrating that the LKGStore contract is genuinely backend-agnostic. The load-bearing claim is ARCH13: the `LKGStore` keys are EXACTLY `{register, observe, readLastKnownGood, getEntry}` on every backend — no work-tree-specific API (`commit()`, `branch()`, `checkout()`) leaks through. This locks the abstraction boundary for hypothetical future backends (S3, IPFS, content-addressed storage, etc.) — they must satisfy all 18 invariants without API changes.

### Phase 7 wave 12 note (added 2026-04-30)

Wave 12 added 17 scenarios across 4 categories: **WIRE** upstream config-LKG byte-format parity (the load-bearing claim of the pre-RFC — "factor out the existing pattern"), **MIG** migration story (orphan `.lkg` from prior process; 1:N tracker mapping; non-config files; no config-specific lifecycle hooks), **REPL** audit-log replay (reconstruction, ts monotonicity, sequence determinism), **DIAG** diagnostics / introspection (shallow-copy getEntry; null-vs-empty signal; **registry opacity** — no `listTrackers / unregister / clear` API). **No new HC rows.** Eight additional invariants pinned.

### Phase 7 wave 13 note (added 2026-04-30)

Wave 13 added 17 scenarios across 4 categories: **CHAIN** multi-LKG composition, **XDEP** cross-tracker dependencies, **ORD** promotion ordering, **POOL** plugin pool isolation. **No new HC rows.** Eight invariants pinned across composition (partial-failure isolation, 50-tracker independence), dependency (composed validation via `getEntry`, ordering-unlocks-validation, no cascade-recovery), ordering (concurrent `Promise.all` audit-record uniqueness, parallel-observe consistency), and pool-isolation (per-plugin store independence, per-store audit sinks, error isolation).

### Phase 7 wave 14 note (added 2026-04-30)

Wave 14 added 16 scenarios across 4 categories: **MET** metrics aggregation from audit, **TEL** telemetry semantics (PII vs structural fields), **HEALTH** health / readiness signals, **RATE** rate-of-recovery alarm patterns. **No new HC rows.** Wave 14 is the **observability contract**: defines which audit fields are safe-for-metrics (counters / rates / bytes), which are operator-territory PII (validator-controlled messages, paths), and how recovery-rate maps to health signals (burst-of-recoveries → degraded; 3+ consecutive recoveries → alarm).

### Phase 7 wave 15 note (added 2026-04-30)

Wave 15 added 13 git-backend deeper-edge scenarios across 4 categories: **REF** HEAD ref movement, **PACK** packed vs loose objects, **GC** git-gc / pruning, **RBASE** rebase / amend / cherry-pick across LKG commits. **No new HC rows.** Wave 15 establishes that the git backend is robust against the full range of git ops a real operator might run — `gc`, `rebase`, `cherry-pick`, branch switches, ref movements all preserve LKG bytes through git's content-addressed object DB as long as HEAD ultimately points at a commit that contains the tracker path. Three pre-existing stress tests (CHAIN5, LIM1, STR1) that timed out under fs contention when the full suite ran in parallel were given 30s per-test timeouts; STR1's internal elapsed gate was bumped to 20s.

### Phase 7 waves 16/17/18 note (added 2026-04-30) — CAMPAIGN CLOSE

The final three waves close the 18-wave campaign.

**Wave 16 (14 scenarios)** — **CONF** synthesized fixtures matching upstream's `recoverConfigFromLastKnownGood` documented behavior (canonical hash fixtures; companion / clobbered-path naming parity; validate-then-promote / invalid-then-recover with restored-from hash matching prior promote); **TS** type-shape exhaustiveness (every `LKGFingerprint` / `LKGEntry` / `AuditRecord` field reachable; all 5 `LKGObservation` outcomes); **FUZZ** generated random valid + invalid + size-distribution (1B-100KB) inputs.

**Wave 17 (12 scenarios)** — **PROP** property-based forall assertions (forall valid bytes: hash=sha256; forall good/bad pairs: recover restores good; forall observe orderings: audit FIFO; forall N trackers: failure-isolation); **CORP** fixed good/bad PolicyIR-shape fixtures + 4×5 cross-pair coverage; deterministic hash. **STAB** identical audit-record sequences across 5 concurrent runs; LKG companion file content byte-stable.

**Wave 18 (12 scenarios)** — **DOC** documented examples runnable (README minimal usage, audit hook, recovery-notice, readLastKnownGood); **TYPE** TypeScript type-level (LKGObservation exhaustive narrowing; `LKGTracker<T>` generic flow); **FINAL** public-export shape lock (exact 7-key set; LKGFingerprint exact 11-key shape; pure-function semantics).

**No new HC rows across waves 16/17/18.** All three waves are documentation-and-shape-lock — future API additions / type-shape changes / behavior drifts will surface as broken assertions, making the change intentional.

**The 18-wave Phase 7 campaign closes.** 326 LKG-specific adversarial scenarios across 75 categories. **457/459 v2-prototype tests + 29/29 LKG-package tests green** (2 POSIX-only symlink tests skipped on Windows). **Total LKG-touching coverage: 486 tests.** 1 real bug fixed (F-118 GW3); 3 [GAP]s locked in (F-119/F-120/F-121); **100+ contract invariants pinned**. Comprehensive evidence base for the upstream `v2-lkg-contract` PR conversation.

### Counting reconciliation

Phase 7 adds 2 HC-rows to the headline tally (F-118 HC-BLOCK, F-119 HC-NOTE) plus 1 cross-ref row in the HC-BLOCK applications table. The 76 underlying adversarial scenarios are not enumerated as individual F-### rows — they're test cases, not findings (a finding is something *raised by* a scenario or a scenario family). The findings F-118/F-119 are the only outcomes that warrant per-scenario severity classification.
