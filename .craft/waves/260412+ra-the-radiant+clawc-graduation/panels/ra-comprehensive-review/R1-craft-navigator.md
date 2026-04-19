# R1 — craft/navigator Review

**Role**: craft/navigator (Cluster E — User journey coherence > implementation simplicity)
**Wave**: Ra the Radiant (260412)
**Scope**: CL-10 spec, TUI plan, deck slides, Steven's brief, scenarios S06/S26/S30
**Date**: 2026-04-16

---

## Summary

The CL-10 spec tells a genuinely coherent story from workspace files through three API layers to partner consumption. The 3-layer architecture (Generic OC, Chunks, Runtime) is one of the clearest pieces of API design in the claws corpus. The TUI plan's 3-experience model is well-structured and the deck's new oc:// and 3-layer slides maintain the narrative arc.

However, there are journey gaps that would confuse a partner reading ONLY the spec, a time-travel feature buried too deep for non-power-users, and a structural mismatch between the spec's response shapes and what scenario S06 expects. Steven's brief references the old specific-endpoint model in places rather than the current 3-layer architecture consistently. The TUI plan is comprehensive but overloaded -- 15 screens across 3 experiences in 15 pulses risks delivering breadth without polish.

---

## Findings

### N-01 [critical] — Quick Start path is missing from CL-10

The spec opens with the 3-surface overview table and dives immediately into tab-by-tab mapping. There is no Quick Start section. A partner reading this spec to build a CAP settings tab encounters 1,800+ lines before reaching the chunk examples. The spec answers "what is the API?" but never answers "how do I get started in 5 minutes?"

A partner's first journey is: (1) start claws serve, (2) GET a chunk, (3) render it, (4) PATCH it, (5) see governance feedback. This 5-step happy path should appear in the first 50 lines, before the tab-by-tab mapping. Every detail that follows becomes context for the Quick Start, not a prerequisite for it.

**Location**: CL-10 spec, top of document (lines 1-30)
**Recommendation**: Add a "Quick Start for Partners" section before the tab-by-tab mapping. Five code blocks: start serve, GET /api/chunks/connections, render the JSON, PATCH a tool toggle, observe the governance result. This becomes the spec's thesis statement.

---

### N-02 [critical] — Chunk response shape in CL-10 contradicts scenario S06

The CL-10 spec defines chunks with `tab`, `section`, `data`, `editable`, `governance`, `writeBack` fields (line 1129-1151). Scenario S06-chunk-read-connections expects `data`, `meta` at root with `tools`, `servers`, `writeBackUrl` inside data, and `compilation_id`, `etag`, `timestamp` inside meta. These are two different response shapes.

A partner following the spec builds against `Chunk<'connections'>` with `data.server`, `data.tools[]`, `editable`, `governance`. A partner following S06 builds against `data.tools[]`, `data.servers[]`, `meta.compilation_id`. The tools carry different field names (`lock.source` vs `lock.precedence`, `risk: { level, label }` vs `risk_level_enum: [R1, R2, R3, R4, R5]`).

This is not a cosmetic difference. It means either the spec or the scenario will break a partner's integration. One must be authoritative.

**Location**: CL-10 lines 1129-1151 (Chunk interface) vs S06 expect.response_shape (lines 23-33)
**Recommendation**: Reconcile. The spec's typed `Chunk<K>` interface is the better design (self-describing, type-safe). Update S06's expected shape to match the spec. Add `meta` fields (compilation_id, etag) to the Chunk interface if they are genuinely needed at the chunk level.

---

### N-03 [critical] — Time-travel API is a power feature with no progressive disclosure

The `?at=` parameter on Layer 1 endpoints (lines 1488-1556) supports three addressing modes (version, time, named snapshot), backed by three storage systems (compilation forest, snap, workspace versioning). The diff endpoint adds a fourth interaction pattern. This is powerful but entirely undiscoverable from the partner's perspective.

A partner building a CAP settings tab never encounters time-travel. It exists only in Layer 1, which the spec says power users and the TUI use directly. There is no chunk-level time-travel (no `GET /api/chunks/connections?at=v38`). The TUI plan does not include a time-travel screen. The deck does not mention it.

The feature is designed for forensic debugging ("when did send-email become R5?") but the user who needs that answer is an admin in the Companion App, not a Layer 1 API caller. The Companion App surfaces (Layer 3) do not include a time-travel endpoint.

**Location**: CL-10 lines 1488-1556
**Recommendation**: Either (a) expose time-travel through a Layer 3 endpoint (`GET /api/history/{oc-path}` returning a timeline) so the Companion App can render it, or (b) add a "History" screen to the TUI's Manage experience (Experience 3) that makes time-travel visually accessible. The raw `?at=` parameter can remain on Layer 1 for power users, but the feature needs a discoverable surface.

---

### N-04 [major] — TUI plan's 15 screens across 3 experiences is overloaded for 15 pulses

The TUI plan defines 15 screens across 3 experiences (Settings: 6, Lobster: 5, Manage: 8 -- counting Activity Feed, Audit Trail, etc.) plus VS Code extension work (4 pulses). That is 23 distinct screens/features in 15 pulses. Several pulses are marked "Medium" that contain substantial scope:

- Pulse 9: Governance Dashboard + Audit Trail (paginated) + Activity Feed (SSE) + Skills Store -- four distinct screens in one pulse.
- Pulse 1: Scaffold + experience selector + serve client + graceful startup + SSE listener with reconnection -- five concerns in one pulse.

The risk is breadth without polish. A partner running `claws tui --demo` will judge the product by the first screen they see. If the Connections screen (Pulse 3-4) is polished but the Governance Dashboard (Pulse 9) is rough, the demo undermines the product story.

**Location**: claws-tui plan, Pulse Breakdown section
**Recommendation**: Split Pulse 9 into two: (a) Governance Dashboard, (b) Audit Trail + Activity Feed + Skills Store. Consider whether all 8 Manage screens are needed for the demo mode. The guided walkthrough (Pulse 11) only touches 7 steps -- scope the Manage experience to those 7 and defer the rest.

---

### N-05 [major] — Steven's brief references specific endpoints alongside 3-layer model inconsistently

The brief correctly describes the 3-layer architecture in section 3 (Tool Governance) with Layer 1 and Layer 2 PATCH paths. But the Timeline table (lines 189-200) mixes package-level references with API layer references inconsistently. The `@openclaw/oc-path` row says "Layer 1: `oc://` URI scheme for `/api/oc/{path}`" which is correct. But the `@openclaw/approval-events` row says "Layer 3: `/api/sessions/:id`" which conflates the approval event schema (a package) with the session API endpoint.

More significantly, Steven's WS-4 mapping (`tenant.tools.policy.get/set` --> our chunk API) is accurate for Layer 2 but the brief does not explain that Steven's admin API would become a third provider in the ProviderRegistry, not a direct consumer of the chunk API. The composition model (deny > review > modify > allow) is described, but the brief implies Steven's API calls our API, when in fact both are providers that compose at runtime.

**Location**: hardening-integration-brief.md, sections 3 and Timeline
**Recommendation**: Clarify the composition model: Steven's admin API and claws's compiled policies are PEER providers in the ProviderRegistry. Neither calls the other. The chunk API is for UX consumers (CAP, TUI), not for Steven's runtime enforcement. Update the Timeline table to separate "package" rows from "API endpoint" rows.

---

### N-06 [major] — Deck's 3-layer slide is too dense for a presentation

The deck's "claws serve: 3-Layer API for Every Consumer" slide (lines 871-897) packs three layer descriptions, a "WHO USES WHAT" table, and a "WRITE PATH" section into a single slide. Each layer gets 5 lines. This is reference documentation, not a presentation slide.

The narrative arc of the deck is: problem -> what claws is -> proof -> enterprise -> platform. The 3-layer slide sits in the platform section and tries to compress the entire API architecture into one slide. A reader seeing this for the first time cannot absorb Layer 1 vs Layer 2 vs Layer 3 in 10 seconds.

The oc:// slide (lines 840-865) works because it has one concept (addressing) with clear examples. The 3-layer slide needs the same treatment: one slide per layer with a concrete example per slide, or a single "architecture overview" slide with a visual diagram and three follow-up slides for depth.

**Location**: docs/claws/presentations/why-claws.md, lines 871-897
**Recommendation**: Split into 2 slides: (a) "Three layers, one API" with the architecture diagram and WHO USES WHAT table only, (b) "Write path: validate, write, recompile, audit" with the write path details. The audience can absorb architecture and write semantics as two separate concepts.

---

### N-07 [major] — Onboard journey (S26) has no error recovery path for the user

Scenario S26 tests the happy path from onboard through first task through first tool call. Finding F05 identifies the race condition (GET before compilation completes) and F02 covers secret detection. But neither the scenario nor the CL-10 spec describes what happens when onboarding FAILS.

If `POST /api/onboard` returns a SECRET_DETECTED rejection, the integration partner knows. But what does the USER see? The CAP settings tab shows... nothing? An error page? The onboarding call transcript is lost because it was rejected?

The user's journey after a failed onboard is: (1) see an error, (2) understand what went wrong, (3) fix the seed content, (4) retry. Steps 2-4 are not specified anywhere. The error response schema (`PatchError`) does not include an `ONBOARD_REJECTED` variant. The `PatchResult` type only covers chunk PATCH results, not onboard results.

**Location**: CL-10 lines 1787-1808 (onboard validation) and S26 findings
**Recommendation**: Add an `OnboardResult` response type to CL-10 with explicit error variants (SECRET_DETECTED, SCHEMA_INVALID, SIZE_EXCEEDED, INJECTION_DETECTED). Each variant should include a human-readable message suitable for display in the onboarding UX, not just an error code.

---

### N-08 [major] — Layer 1 and Layer 2 write paths create two mental models for the same operation

CL-10 defines two write surfaces:
- Layer 1: `PATCH /api/oc/{file}#{section}/{item}` -- direct OC file editing
- Layer 2: `PATCH /api/chunks/{tab}/{section}` -- chunk-based editing

Both route through the same write-time validation layer. But they create two mental models for a partner: "edit the file" vs "edit the chunk." The spec says partners use chunks and power users use Layer 1. But the TUI plan has Lobster screens using Layer 1 (`PATCH /api/oc/SOUL.md`) and Settings screens using Layer 2 (`PATCH /api/chunks/connections/{server}`).

A developer building a new surface has to decide: do I use Layer 1 or Layer 2? The decision criteria are not documented. When should a consumer prefer Layer 1 over Layer 2? What are the trade-offs?

**Location**: CL-10 Three-Layer Architecture section (lines 584-660) and TUI plan interactions
**Recommendation**: Add a "When to use which layer" decision guide to CL-10. Rule of thumb: Layer 2 for form-based UIs that map to CAP tabs, Layer 1 for document-editing UIs that work with file sections directly. Make this explicit so the third partner does not have to infer it from examples.

---

### N-09 [major] — Session model is described but has no user-facing entry point

The Session Model section (lines 282-510) describes session types (main, cron, channel, agent), session lifecycle, scoped tool views, and three session API endpoints. The TUI plan includes Sessions Overview, Session Detail, Cron Run History, and Session Tools screens. The deck does not mention sessions.

But there is no explanation of how a USER discovers sessions exist. The CAP settings tabs (Experience 1) do not show sessions. A user toggling tools in the Connections tab has no idea that their cron session sees a different tool subset. The session model is developer-facing (API consumers, TUI power users) but not user-facing.

For the CAP settings partner, this is fine -- they do not need sessions. But for the Lobster collaboration vision (where the user's Teams DM is one session and their cron job is another), the user needs to understand that changes they make in the settings tab affect ALL sessions. The spec does not explain this user-facing implication.

**Location**: CL-10 lines 282-330 (Session Model) and 318-322 (Two Kinds of Edits)
**Recommendation**: Add a paragraph to the "Two Kinds of Edits" section explaining the user impact: "When you change a tool's approval policy in Settings, it affects every session -- your chat, your cron jobs, your delegated agents. Session-scoped changes only apply to one session." This bridges the developer model to the user model.

---

### N-10 [warning] — S30 concurrent multi-tab scenario uses Layer 1 paths but the story is about CAP tabs

Scenario S30 describes "Two CAP tabs sending PATCHes simultaneously." But the expected endpoints use Layer 1 paths: `PATCH /api/oc/TOOLS.md#Tools` and `PATCH /api/oc/SOUL.md#Boundaries`. CAP tabs use Layer 2 chunks, not Layer 1.

If CAP tabs use `PATCH /api/chunks/connections/{server}` and `PATCH /api/chunks/preferences/instructions`, the concurrency behavior is the same (both eventually write OC files) but the entry point is different. The scenario should test the path that CAP partners actually use, or explicitly state that it is testing the underlying Layer 1 behavior that both layers share.

**Location**: S30-concurrent-multi-tab expect.concurrent_patches (lines 14-21)
**Recommendation**: Update S30 to use Layer 2 endpoints (`PATCH /api/chunks/connections/outlook` and `PATCH /api/chunks/preferences/instructions`) since the problem statement describes CAP tabs. Add a note that the compilation queue behavior is layer-independent.

---

### N-11 [warning] — Deck's oc:// slide introduces a concept not yet used by partners

The oc:// slide (lines 840-865) is in the "Platform" section of the deck, positioned after the enterprise governance slides. It introduces the URI scheme with 7 examples and 5 usage contexts. This is well-written for developers who will consume the API.

But the deck's audience (from the narrative arc) includes stakeholders who care about "why claws?" not "how does the addressing scheme work?" The oc:// slide is a technical deep-dive that breaks the presentation flow between "Upstream: What We Give Back" and "claws serve: 3-Layer API."

For a partner reading the deck to understand the product, oc:// is meaningful. For a leadership audience deciding whether to fund the project, it is noise.

**Location**: docs/claws/presentations/why-claws.md, lines 840-865
**Recommendation**: Move the oc:// slide to an appendix section or a "Technical Deep Dive" subsection at the end of the deck. In its current position, replace it with a single line in the "claws serve" slide: "All paths use oc:// addressing (contributed upstream)." Partners who want depth can find the appendix.

---

### N-12 [warning] — TUI demo mode walkthrough does not cover the Lobster experience

The guided walkthrough (7 steps, TUI plan lines 193-200) covers: welcome, Settings tools, R5 rejection, Soul Editor, deny rule warning, Trust tier, Audit. Steps 2-3 are Settings, steps 4-5 are Lobster (Soul Editor), step 6 is Lobster (Trust), step 7 is Manage (Audit).

Missing from the walkthrough: Memory Browser, Schedule, and Work Queue. The Lobster experience has 5 screens but only 2 appear in the guided tour. The Schedule screen (calendar view of HEARTBEAT.md) and Work Queue (task list) are core Lobster concepts that differentiate claws from a settings panel.

For a partner evaluating whether to integrate with the Lobster APIs, the demo should show: "Here is your agent's schedule as calendar events. Here is its work queue as tasks." These are the surfaces that sell the Lobster collaboration model.

**Location**: claws-tui plan, Demo Mode section, guided walkthrough steps
**Recommendation**: Add step 5.5: "Schedule: See your agent's upcoming tasks as calendar events." and step 5.6: "Work Queue: Tasks your agent is working on." This extends the walkthrough to 9 steps but covers all three experiences meaningfully.

---

### N-13 [warning] — CL-10 TypeScript interfaces mix spec-level types with implementation-level types

The Chunk interface (lines 1129-1151) imports `RiskClassification` from `@openclaw/approval-events` (CL-12). The `FieldEditability` interface references `ItemLock`. The `PatchResult` and `PatchError` types are fully specified with TypeScript syntax.

This is useful for implementers but creates a coupling problem for the spec: CL-10 is now dependent on CL-12's type definitions. If CL-12 changes `RiskClassification`, CL-10's chunk format changes. The spec should define its own types at the contract level and note that the implementation may reuse CL-12 types.

More practically: a partner reading CL-10 to build a CAP settings tab does not have access to `@openclaw/approval-events`. They need the chunk JSON shape, not the TypeScript interface that imports from another package.

**Location**: CL-10 lines 1014, 1129-1151
**Recommendation**: Add a "JSON contract" section showing the chunk response as plain JSON with inline type annotations (like the existing examples do). Keep the TypeScript interfaces for implementers but make it clear that the JSON examples are the partner contract and the TypeScript interfaces are the implementation guide.

---

## Verdict

The CL-10 spec is the most important document in the Ra wave because it defines how partners consume claws's value. The 3-layer architecture is sound, the chunk model is well-designed, and the write-time validation layer is thorough. The TUI plan and deck support the story.

The critical gaps are: (1) no Quick Start path for partners, (2) response shape mismatch between spec and S06, and (3) time-travel buried without a discoverable surface. Fixing these three makes the spec navigable for its primary audience -- the partner developer who needs to build a CAP settings tab next week.

**Findings**: 13 total (3 critical, 6 major, 4 warning)
