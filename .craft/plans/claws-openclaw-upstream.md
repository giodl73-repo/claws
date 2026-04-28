---
slug: claws-openclaw-upstream
preset: "claws"
plan: "6 headlines: 4 packages land at openclaw/openclaw, OC-4+OC-7 surgical PRs + oc:// URI vocabulary unification, bot pre-empt checklist + adapter audits as reusable artifacts"
area: release
status: Active
wave: 260427+hapi-the-bringer+openclaw-upstream
specs: [UG-upstream]
stages:
  scenarios:
    reviews: [claws:ciso, claws:compliance, claws:gateway-eng]
  implementation:
    reviews: [claws:claws-release-eng, claws:compliance, claws:ciso]
  delivery:
    reviews: [claws:claws-release-eng, claws:claws-repo-steward]
---

# claws-openclaw-upstream — Land 4 Packages + 2 Surgical PRs at openclaw/openclaw

<!-- Successor to `claws-upstream-contrib` (Implemented). That plan delivered seven
     standalone @bic/* packages incubated internally. This plan executes the
     contribution-upstream phase: rename to @openclaw/*, propose 2 surgical
     OC-core PRs (OC-4 + OC-7), and land six PRs at github.com/openclaw/openclaw
     paced to upstream's 10-PR-per-author cap and ~2-PRs-open-at-a-time review
     culture. Adapts the OneDrive 2026-04-18 spec to upstream HEAD `5e8cc1d9c`
     after ~4785 commits of drift. -->

## Headlines

1. **H1: `@openclaw/workspace` is merged at openclaw/openclaw AND immediately consumed in two PRs** — three subpaths (`/path` for oc:// URIs, `/ast` for PEG grammars + typed AST + lossless emitters, `/canonicalize` for RFC 8785 JCS) land as a new top-level package; each subpath earns its keep in the same wave: `/ast` replaces `JSON.stringify` in `src/config/io.ts:1381+2082` (`replaceConfigFile`'s only write path) so every `openclaw update` and `doctor --fix` preserves user comments + key ordering + indentation; `/path` extends the diagnostic-location format so workspace-file diagnostics emit `oc://...` URIs (PR-1) and runtime-config diagnostics emit `oc://config/...` URIs (PR-2 oc:// scheme extension); `/canonicalize` underwrites cross-OS byte-identical hashing (CI matrix proves it).
   - Validation: PR-1 status = MERGED at `openclaw/openclaw`; package resolves under `@openclaw/workspace`
   - Validation: vitest + pnpm build green against openclaw-core HEAD; `plugin-sdk-api-baseline.sha256` updated; SDK overview table updated
   - Validation: cross-OS canonicalize byte-identicality test passes in CI matrix
   - Validation: round-trip-with-comments test — JSONC config with comments + custom indentation survives `update` + `doctor --fix` cycles unchanged
   - Validation: idempotency test — `doctor --fix` on already-clean config = byte-zero diff
   - Validation: doctor diagnostic emitter accepts `oc://...` URIs as location; existing `{file, line}` form still accepted for backward compat
   - Validation: PR-2 (oc:// scheme extension to `oc://config/...`) MERGED; runtime-config diagnostics cite addressable URIs
   - Validation: PR description leads with core-not-extension justification (avoids `r:third-party-extension` auto-close)

2. **H2: `@openclaw/guardrails` is merged at openclaw/openclaw** — `GuardrailProvider` + `FileIngestProvider` peer interfaces plus six runtime subpaths (`/audit`, `/approvals`, `/budget`, `/identity`, `/siem`, `/secrets`) ship in one install, each subpath independently tree-shakable.
   - Validation: PR-3 status = MERGED at `openclaw/openclaw`
   - Validation: hash-chained audit append+verify round-trip green; approval handle binding (`{providerId, contentHash, sequenceNumber, approverPrincipal, keyId, ttl, nonce}`) replay-resistant under test
   - Validation: zero `@microsoft/*` imports verified by CI gate; intra-scope `@openclaw/*` deps declared in `peerDependencies`
   - Validation: audit-stream wire shape matches today's openclaw-core audit envelope (see H6 adapter audit)

3. **H3: `@openclaw/policy` + `openclaw policy` subcommand group merged at openclaw/openclaw** — generator writes `policy-ir.json` + `gateway-plugin.ts` + `audit-manifest.json` into `.openclaw/policy/`; nine flat verbs (`check`, `generate`, `watch`, `comply`, `test`, `sim`, `report`, `verify`, `diff`) added to existing `openclaw` CLI; emitted plugin registers cleanly via today's `PluginHookRegistration`.
   - Validation: PR-5 status = MERGED at `openclaw/openclaw`
   - Validation: `openclaw policy generate` is deterministic — same workspace input → byte-identical output in CI
   - Validation: emitted gateway plugin loads + registers against current `@openclaw/plugin-sdk` types without modification (see H6 adapter audit)
   - Validation: generation-time invariants enforced — generator refuses to emit R5 fail-open or RESTRICTED-laundering policies

4. **H4: `@openclaw/snap` + `openclaw snap` subcommand group merged at openclaw/openclaw** — content-addressable snapshot registry + HTTP server, eleven flat verbs (`stage on/off`, `status`, `diff --staged`, `discard --stage`, `upload`, `list`, `diff <a> <b>`, `checkout`, `promote`, `rollback`, `discard <id>`, `serve`); zero runtime dep on `@openclaw/policy`.
   - Validation: PR-6 status = MERGED at `openclaw/openclaw`
   - Validation: `snapshotId = sha256(canonical(workspaceFiles))` is byte-identical across hosts; same files → same id in CI
   - Validation: `snap promote` audited; signed approvalHandle required when configured
   - Validation: HTTP surface (`/v1/snapshots`, `/v1/snapshots/:id/promote`, `/v1/policy/current`, `/v1/resolve?uri=oc://…`, `/v1/healthz`) green under E2E

5. **H5: OC-4 + OC-7 surgical OC-core PRs merged** — `stripFrontMatter` preserves originals under sibling `raw` key (~1 line change, non-breaking); `requireApproval` adopts conjunctive merging across the plugin-merger chain at `src/plugins/hooks.ts:889-893` — replacing `??` (nullish coalesce, which drops downstream approvals) with array accumulation; field type bumps from `ApprovalDescriptor` to `ApprovalDescriptor | ApprovalDescriptor[]` (per R1-consolidated G-W1: field is already object-only at `hook-types.ts:402-410`, never `boolean`; the change is array-coercion, not boolean-deprecation).
   - Validation: PR-2 (OC-4) MERGED; round-trip test on templated SOUL.md / TOOLS.md emits byte-identical file
   - Validation: PR-4 (OC-7) MERGED; merger test asserts: when plugin-A returns `requireApproval`, plugin-B returning no approval cannot downgrade; companion app receives every `ApprovalDescriptor` (conjunctive)
   - Validation: codemod migration note ships with PR-4 covering the `ApprovalDescriptor → ApprovalDescriptor | ApprovalDescriptor[]` array-coercion; no boolean was ever in scope per current upstream

6. **H6: bot pre-empt checklist + two adapter audits published as reusable artifacts** — checklist for the Greptile + Copilot + chatgpt-codex review trio (pluginId-scoping, host-boundary input validation, bounded retention + timer cleanup, no generic try/catch, DRY helpers, baseline hash refresh, SDK overview table refresh, CHANGELOG end-of-section, Swift protocol model regen); generator-emitted-plugin and audit-stream adapter audits documented before the dependent package PRs open.
   - Validation: `docs/upstream/guides/bot-preempt-checklist.md` exists; cited by every PR-N description in this plan
   - Validation: `docs/upstream/guides/adapter-audits.md` documents (a) emitted-plugin registration vs current `PluginHookRegistration` shape, (b) audit-stream wire match vs current OC audit envelope; both reach "OK to land" verdict before H2/H3 PRs open
   - Validation: `docs/upstream/specs/UG-upstream.md` amended with revised contribution roadmap (drop OC-1/2/6, move OC-3 to snap-layer, narrow OC-5, surgical OC-4 + OC-7, drop OC-8/9/10)

## Summary

The four `@bic/openclaw-*` packages (workspace, guardrails, policy, snap) compile clean against today's openclaw-core HEAD `5e8cc1d9c` with zero type-level coupling — the rename to `@openclaw/*` is textual. This plan executes the contribution-upstream phase: six PRs at `github.com/openclaw/openclaw` paced two-open-at-a-time across three waves, with two surgical OC-core PRs (OC-4 raw-preserve, OC-7 conjunctive approval merger) replacing the original seven (OC-1/2/6 dropped, OC-3 moved to snap-layer, OC-5 narrowed, OC-8/9/10 stay in our domain). Every PR carries a bot pre-empt checklist tuned to upstream's bot-reviewer trio (Greptile + Copilot + chatgpt-codex), whose median time-to-merge is under four hours. Two adapter-surface audits (emitted-plugin registration, audit-stream wire shape) are pre-cleared before the dependent package PRs open.

## Coverage Contract

### Specs
- [ ] UG-upstream — amend with revised OC-PR roadmap (drop OC-1/2/6, move OC-3 to snap, narrow OC-5, surgical OC-4 + OC-7, drop OC-8/9/10) and the bot-reviewer + 10-PR-cap operating constraints
- [ ] UG-upstream — add adapter-audit obligations: emitted-plugin registration must verify against current `PluginHookRegistration`; audit-stream adapter must verify against current OC audit envelope

### Concept Guides
- [ ] docs/upstream/guides/contribution-workflow.md — UPDATE: bot-reviewer pre-empt section, two-open-at-a-time pacing, baseline-hash + SDK-overview-table + Swift-models update obligations, CLAUDE.md authority, CHANGELOG end-of-section rule
- [ ] docs/upstream/guides/bot-preempt-checklist.md — NEW: per-PR checklist (pluginId-scoping, host-boundary validation, bounded retention + timer cleanup, no generic try/catch, DRY helpers, baseline hash refresh, SDK overview table refresh, CHANGELOG end-of-section, Swift protocol model regen, core-not-extension justification)
- [ ] docs/upstream/guides/adapter-audits.md — NEW: emitted-plugin registration audit + audit-stream wire-shape audit, with file:line citations into openclaw-core HEAD and verdict per audit

### Scenario Coverage
- [ ] upstream/workspace-canonicalize-cross-os — RFC 8785 JCS byte-identical Linux/Windows/macOS
- [ ] upstream/workspace-ast-roundtrip — parse + emit lossless on SOUL.md / TOOLS.md / AGENTS.md / IDENTITY.md / USER.md / SKILL.md
- [ ] upstream/guardrails-audit-append-verify — hash-chained append + verify integrity
- [ ] upstream/guardrails-approval-handle-replay-resistance — handle binding rejects replay across sequenceNumber + nonce
- [ ] upstream/guardrails-audit-stream-adapter — events match current OC audit envelope shape
- [ ] upstream/policy-generate-deterministic — same workspace → byte-identical artifacts
- [ ] upstream/policy-emitted-plugin-registration — plugin loads + registers via today's PluginHookRegistration unmodified
- [ ] upstream/policy-r5-fail-closed — generator refuses R5 fail-open declarations
- [ ] upstream/policy-restricted-stickiness — generator refuses RESTRICTED-laundering args_from chains
- [ ] upstream/snap-snapshot-id-stable — snapshotId byte-identical across hosts for same files
- [ ] upstream/snap-promote-audited — promote emits audit event with snapshotId + approverPrincipal
- [ ] upstream/snap-http-resolve — `/v1/resolve?uri=oc://…` resolves against current snapshot
- [ ] upstream/oc4-stripfrontmatter-roundtrip — raw bytes preserved under sibling key, byte-identical re-emit
- [ ] upstream/oc7-approval-conjunctive-merger — plugin-A approval cannot be downgraded by plugin-B; companion receives every ApprovalDescriptor
- [ ] upstream/bot-preempt-pluginid-scoping — registration APIs reject caller-supplied identifiers; pluginId always taken from authenticated caller
- [ ] upstream/bot-preempt-input-validation — host validates every plugin-supplied field at boundary
- [ ] upstream/auto-close-avoidance — PR description audit confirms `r:third-party-extension` and `r:skill` triggers absent

### Test Tier Targets (updated 2026-04-27 across two scenarios passes; deltas in italics)
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | **30** | Per-package: workspace path/ast/canonicalize (6), guardrails subpaths (8), policy generator + invariants (6), snap registry + http (4); *Phase 5 workspace foothold: JSONC round-trip (5), config-URI parser (3), resolveConfigUri (3) — minus 5 overlap consolidation* |
| L1 integration | **24** | Cross-package composition: policy + workspace/canonicalize (2), policy + guardrails/audit (2), snap + workspace (2), guardrails approval-handle E2E (2), OC-7 merger conjunctive (2), OC-4 round-trip (2), *audit-stream adapter wire-shape* (4), *OC-7 crash-safety* (2); *Phase 5: backward-compat for plain JSON (3), `doctor --fix` idempotency (2), migration-config-URI (2), concurrent-write safety (1), large-config perf (1), malformed-config graceful (1) — minus 3 overlap* |
| L2 e2e | 8 | Each of 7 PRs (was 6): smoke against openclaw-core HEAD; emitted-plugin-registration adapter audit; audit-stream adapter audit |
| L3 acceptance | **8** | One per landed PR (7 PRs); *plus SOC 2 rubric→control mapping coverage* (1); *plus HIPAA rubric→control mapping coverage* (1) — total 9, but trimmed to 8 since one of the per-PR L3s overlaps with the rubric coverage |
| **Total** | **70** | (was 50; +20 from Phase 5 workspace-foothold risk surface) |

## Scope

### Adapter audits + checklist artifacts (lands BEFORE PR drafts)
- `docs/upstream/guides/adapter-audits.md` (NEW) — generator-emitted-plugin + audit-stream wire-shape audits with verdicts
- `docs/upstream/guides/bot-preempt-checklist.md` (NEW) — bot-reviewer pre-empt checklist
- `docs/upstream/specs/UG-upstream.md` (UPDATE) — revised OC-PR roadmap (v0.2 amendment)
- `docs/upstream/CHANGELOG.md` (UPDATE) — entry for revised roadmap

### Seven PRs at `openclaw/openclaw` (the impl checkpoints)

**Wave A · workspace foothold (PR-1, PR-2 — open simultaneously)**
- PR-1: ship `@openclaw/workspace` (subpaths `/path`, `/ast`, `/canonicalize` — JSONC grammar covers today's config files including comments) AND wholesale-convert `src/config/io.ts:replaceConfigFile` from `JSON.stringify(_, null, 2)` (lines 1381 + 2082) to lossless `parse → mutate → emit` via `@openclaw/workspace/ast`. Diagnostic-emitter shape extended to accept `oc://...` URIs as location (workspace-file diagnostics use them; runtime-config diagnostics still `{file, line}` until PR-2). Cross-OS canonicalize CI matrix. Internal consumer = the chokepoint that backs `openclaw update` + `doctor --fix` + every config-mutation path. **Skin in the game**: PR description leads with the concrete user delight — comments + key ordering + indentation preserved across `openclaw update` cycles, where today they're stripped via stringify.
- PR-2: extend `oc://` URI scheme to address runtime config (`oc://config/channels/matrix/accessToken` becomes a thing). Doctor's existing config-mutation paths emit URI-cited diagnostics. Spec amendment locks the scheme extension. Bridges from "oc:// addresses workspace files" → "oc:// is the unified addressing vocabulary across workspace + runtime config." Pairs with PR-1 since they're conceptually independent (PR-1 = lossless emit; PR-2 = URI scheme).

**Wave B · small surgical + governance (PR-3, PR-4 — opens after Wave A merges)**
- PR-3: OC-4 — `src/agents/workspace.ts:stripFrontMatter` preserves original bytes under sibling `raw` key (~1 line); regression test added. Surgical pair to PR-4.
- PR-4: rename `packages/openclaw-guardrails/` → upstream `@openclaw/guardrails`; six subpaths intact; `peerDependencies` to `@openclaw/workspace`; SDK overview + baseline hash refreshed; audit-stream adapter audit cited; audit entries cite `oc://...` URIs natively (consumes the vocabulary PR-1+2 introduced — workspace + config).

**Wave C · merger + generator (PR-5, PR-6 — opens after Wave B merges)**
- PR-5: OC-7 — `src/plugins/hooks.ts:889-893` merger replaces `??` (nullish coalesce) with array accumulation; `requireApproval` field bumps from `ApprovalDescriptor` to `ApprovalDescriptor | ApprovalDescriptor[]` at `hook-types.ts:402-410`; non-downgradable / conjunctive across the plugin chain (~5 lines + tests + try/catch wrapper for crash-safety + codemod migration note for array-coercion). Surgical pair to PR-6.
- PR-6: rename `packages/openclaw-policy/` → upstream `@openclaw/policy`; nine-verb `openclaw policy` subcommand group added to existing CLI; emitted-plugin registration adapter audit cited; policy diagnostics use `oc://...` URI vocabulary (workspace + config); SDK overview + baseline hash refreshed.

**Wave D · registry (PR-7 — opens after Wave C merges)**
- PR-7: rename `packages/openclaw-snap/` → upstream `@openclaw/snap`; eleven-verb `openclaw snap` subcommand group + `resolvePolicy --at <timestamp>` (e-discovery temporal query) + HTTP server with `/v1/resolve?uri=oc://...` endpoint (the URI vocabulary's resolution endpoint — accepts both workspace and config URIs since PR-2 unified the scheme); cross-OS snapshotId stability matrix; SOC 2 + HIPAA rubric coverage; SDK overview + baseline hash refreshed.

### Local repo work (in this monorepo, no upstream PR)
- `packages/openclaw-workspace/package.json` — name flip prep (kept under `@bic/` until upstream merge; flip in scope-flip PR per UG-upstream § Scope-flip)
- `packages/openclaw-guardrails/package.json` — same
- `packages/openclaw-policy/package.json` — same
- `packages/openclaw-snap/package.json` — same
- `docs/upstream/CHANGELOG.md` — track every landed upstream PR with merge SHA

## Deliverables

### Specs & Design (lands first)
- [ ] `docs/upstream/specs/UG-upstream.md` v0.2 — revised OC-PR roadmap amendment
- [ ] `docs/upstream/CHANGELOG.md` — v0.2 entry
- [ ] `docs/upstream/guides/bot-preempt-checklist.md` (NEW)
- [ ] `docs/upstream/guides/adapter-audits.md` (NEW) — both audits resolved to "OK to land"
- [ ] `docs/upstream/guides/contribution-workflow.md` (UPDATE) — bot pre-empt section + two-open-at-a-time pacing

### Wave A · workspace foothold (PR-1 + PR-2 — 2 PRs simultaneous)
- [ ] PR-1: `@openclaw/workspace` package + wholesale `replaceConfigFile` AST conversion (lines 1381 + 2082 of `src/config/io.ts`) + diagnostic-shape extension to accept `oc://` URIs; opened with bot pre-empt checklist + core-not-extension justification leading on user-facing delight ("comments + ordering + indent preserved across `openclaw update`")
- [ ] PR-1: JSONC round-trip with comments preserved (the headline invariant), plain-JSON behavior unchanged (backward compat proof), `doctor --fix` idempotency, cross-OS canonicalize CI matrix
- [ ] PR-1: MERGED — H1 validators confirmed against trunk; comment-preservation invariant green
- [ ] PR-2: oc:// URI scheme extension to runtime config (`oc://config/channels/matrix/accessToken`) opened; doctor's existing config-mutation paths cite URI locations in diagnostics
- [ ] PR-2: parser round-trip clean; `doctor-config-flow` + `doctor-legacy-config.migrations` tests green; `openclaw doctor --json` output includes `oc://config/...` URIs
- [ ] PR-2: MERGED — H1 fully confirmed (vocabulary unification across workspace + runtime config)

### Wave B · small surgical + governance (opens after Wave A merges)
- [ ] PR-3: OC-4 opened (~1 line change to `src/agents/workspace.ts:91` + regression test)
- [ ] PR-3: MERGED — H5 partial (OC-4 confirmed); round-trip on templated SOUL.md / TOOLS.md byte-identical
- [ ] PR-4: `@openclaw/guardrails` opened with audit-stream adapter audit cited; bot pre-empt checklist + core-not-extension justification; audit entries cite `oc://...` URIs natively
- [ ] PR-4: hash-chain integrity test, approval-handle replay-resistance test, zero-`@microsoft/*` CI gate, mandatory `sourcePluginId` in `AuditEntrySummary`
- [ ] PR-4: MERGED — H2 confirmed

### Wave C · merger + generator (opens after Wave B merges)
- [ ] PR-5: OC-7 opened (~5 line merger change + try/catch wrapper + Swift model regen + codemod migration note for array-coercion)
- [ ] PR-5: MERGED — H5 confirmed; merger conjunctive + plugin-B-throw crash-safety + Swift models regen on trunk
- [ ] PR-6: `@openclaw/policy` + `openclaw policy` subcommand group opened with emitted-plugin-registration adapter audit cited; policy diagnostics use `oc://` URI vocabulary
- [ ] PR-6: deterministic-generation test, R5 fail-closed test, RESTRICTED-stickiness test, runtime-gated enforcement model
- [ ] PR-6: MERGED — H3 confirmed

### Wave D · registry + closeout (opens after Wave C merges)
- [ ] PR-7: `@openclaw/snap` + `openclaw snap` subcommand group + HTTP server with `/v1/resolve?uri=oc://...` (accepts both workspace and config URIs); `resolvePolicy --at <timestamp>` for e-discovery; SOC 2 + HIPAA rubric coverage
- [ ] PR-7: snapshotId-stability cross-OS matrix, promote-audited test, HTTP smoke (workspace-URI resolve + config-URI resolve), historical query at three promote-windows
- [ ] PR-7: MERGED — H4 confirmed

### Closeout
- [ ] All six PR merge SHAs recorded in `docs/upstream/CHANGELOG.md`
- [ ] Adapter audits checked back against post-merge trunk; deltas (if any) recorded
- [ ] `claws-upstream-contrib` plan (predecessor) cross-linked from this plan's notes for traceability
- [ ] **Scope-flip executed** (R1-consolidated B1) — `@bic/openclaw-*` → `@openclaw/*` rename across our monorepo lands as the LAST cp-4 deliverable, AFTER the four upstream package PRs merge but BEFORE any `@openclaw/*` npm publish. Avoids transient publish-time versioning gap where internal lockfiles still point at `@bic/*` while upstream publishes `@openclaw/*`. Either: (a) bundle scope-flip into cp-4 closing pulse, or (b) document the transient versioning window + internal migrate path in `docs/upstream/CHANGELOG.md`
- [ ] **OC-7 codemod validation gate** (R1-consolidated W1) — testing-stage gate confirms internal consumers (`@bic/openclaw-policy` + `@bic/openclaw-snap`) compile against the widened `requireApproval: boolean | ApprovalDescriptor | ApprovalDescriptor[]` field BEFORE PR-4 merges. Codemod note lands as a section in `docs/upstream/CHANGELOG.md` v0.2 entry (machine-runnable script optional; advisory-only acceptable if internal consumers already compile cleanly)
- [ ] **Post-merge verification runbook** (R1-consolidated W2) — `docs/upstream/guides/post-merge-verification.md` (NEW) documents how H1–H4 validation criteria are checked against `openclaw/openclaw` trunk: command sequence (`gh api repos/openclaw/openclaw/pulls/<N>` → assert merged=true; clone trunk; run validators); when verification runs (immediately after merge, not batched); how deltas are recorded in `docs/upstream/CHANGELOG.md`

### Scenario Findings (added during wave)
*(empty — populated during implementation)*

## Out of Scope

- The OneDrive proposal's original OC-1, OC-2, OC-6 hook PRs (workspace-file-ingest hooks). Workaround: govern via `before_agent_start` + generated-plugin internal logic
- The OneDrive proposal's OC-3 hash-in-workspace-cache PR. Workaround: compute hashes in `@openclaw/snap` at snapshot-commit time
- OC-8 / OC-9 / OC-10 (first-class risk + sensitivity metadata, native gateway staging). Stays in our domain — generator emits enforcement, OC stays thin
- npm-registry publish under `@openclaw/*` — gated on upstream merge + Microsoft public-release path; happens in a follow-up plan
- ~~Scope-flip PR (`@bic/openclaw-*` → `@openclaw/*` rename across our monorepo)~~ — *moved INTO scope per R1-consolidated B1*; lands as the closing cp-4 deliverable
- LTS-branch backport posture (target branches, cadence) — coordinated with upstream maintainers post-merge, not a contribution-blocker

## Notes

- Successor to `claws-upstream-contrib` (Implemented, 2026-Q1). That plan delivered seven internal `@bic/*` packages; this plan executes the contribute-upstream phase with the revised four-package surface.
- The 10-PR-per-author auto-close cap means no more than ~2 PRs from the contributing author can be open simultaneously; pacing reflects this.
- **OC-1/2/6 residual gap** (per R1-consolidated G-W2). The plan workarounds dropped OC-1/2/6 file-ingest hooks via `before_agent_start` + the generated policy plugin's runtime checks. But `before_agent_start` fires AFTER files load (`hook-before-agent-start.types.ts:59-68`) — it can audit + block agent execution but cannot prevent the file write itself. The original OC-1/2/6 spec governed file-write-at-persist-time; the workaround shifts enforcement to runtime gating. If write-time blocking is critical for any consumer, this is a residual gap that the bot pre-empt checklist must call out, and the adapter-audits guide must document as "enforcement model: runtime-gated, not write-blocked." Decision deferred to scenarios stage: write a scenario that exercises a hostile-write-then-read flow and confirm the runtime gate catches it before agent execution.
- Bot-reviewer trio (Greptile + Copilot + chatgpt-codex) functionally replaces a human area-owner team. Pre-empt their classes of comment via the checklist artifact (H6) and merges typically resolve same-day.
- `r:third-party-extension` / `r:skill` auto-close labels are real — every PR description must lead with WHY governance must be core, not ClawHub. Failing this triggers auto-close.
- Two adapter surfaces (generator-emitted plugin registration + audit-stream wire shape) are the residual technical risk. Both audited as deliverables in H6 BEFORE the dependent package PRs open.
- Dependency order between PRs: H6 (adapter audits) → H5/PR-2 (OC-4) → H1/PR-1 (workspace) → H5/PR-4 (OC-7) → H2/PR-3 (guardrails) → H3/PR-5 (policy) || H4/PR-6 (snap). PR-5 and PR-6 can open simultaneously since policy ↔ snap are runtime-independent (snap has zero runtime dep on policy).
- Source materials co-located: `C:\Users\giodl\OneDrive - Microsoft\lobster\openclaw-upstream\` (brief, spec, deck, per-package docs). Upstream HEAD pinned at `5e8cc1d9c` (2026-04-27 pull) for audit baseline.
