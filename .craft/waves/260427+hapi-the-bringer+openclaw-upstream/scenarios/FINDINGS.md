# Hapi the Bringer · Scenarios FINDINGS

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
| HC-BLOCK | 6 |
| HC-WARN | 39 |
| HC-NOTE | 72 |
| **Total** | **117** |

**Counting methodology**: each row in a finding table (one with a severity column) counts once. The HC-BLOCK applications tables in Phases 2/5/6 cross-reference each HC-BLOCK finding back to its target PR — those reference rows don't add to the count (6 such cross-refs exist for F-17, F-22, F-26, F-38, F-76, F-113). Verifiable via `grep -cE '^\| F-[0-9]+ \| HC-' scenarios/FINDINGS.md` (returns 117).

Per-phase deltas (best-effort narrative; cumulative tally above is the source of truth):

- Phase 1 (bot-preempt): F-01..F-16 → 4 HC-WARN, 12 HC-NOTE
- Phase 2 (governance correctness): F-17..F-51 → 4 HC-BLOCK, 7 HC-WARN, 22 HC-NOTE — added 2026-04-27 with the scenarios stage
- Phase 3 (package invariants): F-52..F-70 → 1 HC-WARN, 18 HC-NOTE
- Phase 4 (compliance rubrics): F-71..F-75 → 0 HC-BLOCK, 0 HC-WARN, 5 HC-NOTE
- Phase 5 (workspace foothold, added 2026-04-27): F-76..F-101 → 1 HC-BLOCK, 7 HC-WARN, 18 HC-NOTE
- Phase 6 (workspace lint surface, added 2026-04-28): F-102..F-117 → 1 HC-BLOCK, 9 HC-WARN, 6 HC-NOTE

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
