---
role: craft/navigator
round: 1
wave: "Ra the Radiant (XCIII)"
scope: "All 59 pulses — partner handoff, demo-ability, TUI flow, error UX, VS Code, onboarding"
tension: "User journey coherence > implementation simplicity"
date: 2026-04-15
finding_count: 18
severity_distribution:
  HC-BLOCK: 3
  HC-WARN: 7
  MEDIUM: 5
  LOW: 3
---

# R1 — craft/navigator Review: Ra Wave Pulse Sequence

## Summary

The Ra wave is a 59-pulse, 10-checkpoint build that graduates claws from monorepo internals to a standalone compiler + enterprise extension, then layers a full serve API, terminal TUI, and VS Code extension on top. From a user journey perspective, the wave tells a coherent story: internals first (CP-1 through CP-4), then read APIs (CP-5), write APIs (CP-6), collaboration surfaces (CP-7), companion features (CP-8), terminal UX (CP-9), and editor UX (CP-10). This is the right macro ordering.

However, the pulse-level sequencing reveals several journey coherence gaps. The most significant: partners have no clear "start building" signal between CP-5 and the full API surface at CP-8, the error UX is assembled across three separate checkpoints rather than designed as a unified experience, and the onboarding pulse produces a feature that cannot be tested end-to-end until the TUI demo in pulse 55 — 12 pulses later.

I evaluated every pulse. Findings below are ordered by severity, then by pulse number.

---

## Findings

### F-01: No explicit "API stable" milestone for partners [HC-BLOCK]

**Pulses affected**: CP-5 gate (pulse 28)

After CP-5, partners can build read-only CAP tabs. After CP-6 (pulse 34), they can build read-write tabs. But there is no explicit "API is stable, start building" marker in the pulse sequence. The CP-5 gate pulse (28) says "Partners can build read-only CAP settings tabs" — this is a comment in a gate pulse, not a partner-facing deliverable.

A maker's first interaction with the claws API surface needs a tangible artifact: an OpenAPI spec, a Postman collection, or at minimum a typed client package. Pulse 21 (serve scaffold) creates the routes; pulse 28 (SSE events) closes the read side. But no pulse between 21-28 produces an OpenAPI schema or SDK client that a partner team can import.

**Recommendation**: Add a deliverable to pulse 28 (CP-5 gate): generate an OpenAPI 3.1 schema from Fastify route declarations and commit it as `packages/@claws/serve-api/openapi.yaml`. This becomes the partner contract. Partners start building when this schema lands.

### F-02: Error UX is fragmented across three checkpoints [HC-BLOCK]

**Pulses affected**: 30 (validation layer), 31 (PATCH routes), 34 (patch errors E2E), 49 (TUI patch)

The error experience is built incrementally:
- Pulse 30 defines the PatchError union (8 error codes)
- Pulse 31 maps PatchError to HTTP status codes
- Pulse 34 tests all 8 errors end-to-end through HTTP
- Pulse 49 maps error codes to human-readable messages

The human-readable error messages in pulse 49 are the actual user experience. But pulse 49 is in CP-9 — 15 pulses and 3 checkpoints after the error codes are defined. This means the error codes are designed in isolation from the user-facing language, and the human sentences are bolted on rather than co-designed.

Example: pulse 30 defines `R5_LOCKED` as an error code. Pulse 49 maps it to "This tool acts on your behalf (R5). Approval is required on every call and cannot be disabled." That sentence is excellent — but it should have been written when the error code was defined, not 19 pulses later.

**Recommendation**: Add a deliverable to pulse 30: define the human-readable message template for each PatchError code alongside the error code definition. Pulse 49 then consumes these templates rather than inventing them. This ensures error language is designed alongside error semantics.

### F-03: VS Code extension depends on pulse 30 but skips CP-5 through CP-8 entirely [HC-BLOCK]

**Pulses affected**: 56, 57, 58, 59

Pulse 56 (vscode-lsp-validation) depends on pulse 30 (validation layer, CP-6). This means the VS Code extension can start development after CP-6, not after CP-9. Yet the pulse is placed in CP-10, the final checkpoint. The dependency graph says "start after pulse 30" but the checkpoint placement says "start last."

This matters because the VS Code extension is the only way to edit OC files with live governance feedback during development. A developer working on the API from CP-5 onward would benefit from governance diagnostics in their editor. Placing all VS Code work in CP-10 means 30+ pulses of development happen without the editing experience that would catch governance issues early.

**Recommendation**: Split pulse 56 (LSP validation + diagnostics) into CP-6 or CP-7, immediately after its dependency (pulse 30) is complete. Keep decorations (57), code actions (58), and webview (59) in CP-10. This gives developers governance diagnostics in VS Code during the entire API implementation phase, rather than bolting them on at the end.

### F-04: Onboarding API (pulse 43) cannot be tested as a first-run experience until demo mode (pulse 55) [HC-WARN]

**Pulses affected**: 43, 55

Pulse 43 produces POST /api/onboard: accept transcript, generate SOUL.md + MEMORY.md. It includes L2 E2E tests for the API. But the actual first-run user experience — "I just installed claws, I have no workspace, I paste my setup conversation" — is only testable through the TUI demo in pulse 55.

The gap: pulse 43 tests that the API works, but not that the generated files produce a coherent workspace experience. The SOUL.md generated from a transcript must render correctly in pulse 46 (General screen), produce valid connections in pulse 47, and survive the full PATCH cycle in pulse 49. Those pulses are 3-6 pulses later. If the onboard generator produces structurally correct but semantically poor OC files, it will not be caught until the TUI demo.

**Recommendation**: Add an integration test to pulse 43 that feeds the generated SOUL.md + MEMORY.md through the full chunk assembly pipeline (pulse 23) and verifies the chunk shapes match what pulses 46-50 expect. This closes the loop between "generate" and "render" without waiting for the TUI.

### F-05: TUI screens 45-55 ordering produces an incomplete experience at multiple points [HC-WARN]

**Pulses affected**: 45 through 55

The TUI screen order is:
- 45: Scaffold (3 experiences, no screens)
- 46: General + Preferences (read + edit)
- 47: Connections L1 (read only — no PATCH until pulse 49)
- 48: Connections L2 (read only — toggles do nothing until pulse 49)
- 49: PATCH integration (wires all edits)
- 50: Memory, Groups, Entitlements (read)
- 51: Soul Editor + Memory Browser (Lobster)
- 52: Trust, Schedule, Work Queue (Lobster)
- 53: Companion screens (Manage)
- 54: SSE live updates
- 55: Demo mode

A developer implementing in pulse order would build connections drill-in (48) with toggles that do nothing, then wire them 1 pulse later (49). This is a minor annoyance. But memory screens (50) are read screens placed AFTER the PATCH integration pulse (49). A developer implementing pulse 50 must know the PATCH handler exists but not wire it for memory knowledge toggles — because memory PATCH is not mentioned in pulse 50. Yet memory has toggles per the screen design. This creates ambiguity: does pulse 50 wire PATCH for knowledge source toggles, or not?

**Recommendation**: Pulse 50 should explicitly state whether knowledge source toggles fire PATCHes (using the handler from 49) or are read-only with PATCH wired later. If they fire PATCHes, pulse 50's dependency list should include pulse 49. If read-only, the deliverables should note "toggles are visual only; PATCH wiring is out of scope for this pulse."

### F-06: SSE live updates (pulse 54) wired after most screens are done [HC-WARN]

**Pulses affected**: 54

SSE live updates are pulse 54 of 55 TUI pulses. This means all TUI screens (45-53) are built without live update awareness. The `useSSERefresh` hook from pulse 54 must be wired into screens that were already completed: connections (47/48), soul editor (51), governance dashboard (53).

If screens are designed without live update hooks, adding them in pulse 54 requires editing 6+ already-completed screen files. Pulse 54 acknowledges this by listing EDIT deliverables for connections, soul-editor, and governance-dashboard. But the risk is that the screen components were not designed with a refresh slot — the state management must accommodate external refresh triggers.

**Recommendation**: Pulse 45 (scaffold) should include the `useSSERefresh` hook definition and the SSE dispatch infrastructure as part of the scaffold. This way every screen built in pulses 46-53 can optionally wire the hook from day one, even if the SSE connection is not yet active. Pulse 54 then activates the SSE connection and tests the refresh behavior, rather than retroactively editing screens.

### F-07: CP-5 demo-ability is strong; CP-6 demo-ability is unclear [HC-WARN]

**Pulses affected**: 28 (CP-5 gate), 34 (CP-6 gate)

After CP-5 (pulse 28), you can demo: "Here's a running server. Hit /api/chunks/connections. See the tools, their risk levels, the R5 locks. Hit /api/events — watch the SSE stream as I edit TOOLS.md in another terminal." This is a compelling demo.

After CP-6 (pulse 34), the new capability is PATCH operations + error responses. The demo story is: "Now I toggle a tool. Success — the chunk updates. Now I toggle an R5 tool. 403 — locked. Now I break the fleet policy. 503 — degraded mode." This is testable but not viscerally demoable without a UI. The error JSON is technically correct but not impressive to a non-developer audience.

The TUI demo (pulse 55) is the real showcase, but it is 21 pulses away. Between CP-6 and CP-9, the wave is building powerful APIs with no visual showcase.

**Recommendation**: Consider a lightweight `claws serve --ui` fallback in CP-6 that serves a single HTML page rendering the connections chunk with live PATCH. Not a full TUI — just enough HTML to make the error responses visible. Alternatively, accept that CP-6 through CP-8 are API-only milestones and schedule partner demos for after CP-5 (read APIs) and after CP-9 (TUI), not after CP-6.

### F-08: Chunk assembler (pulse 23) is the heaviest SDK pulse but has no TUI validation for 22 pulses [HC-WARN]

**Pulses affected**: 23, 45-46

Pulse 23 builds the ChunkDataMap assembler that produces all 9 data shapes consumed by every subsequent pulse. It includes 8 L0 tests, 4 L1 tests, and 1 L2 E2E test. But the chunk shapes are not validated against a real rendering surface until pulse 46 (General + Preferences screen) — 23 pulses later.

The risk: chunk assembly produces technically correct JSON that renders poorly. For example, the `editable` record's field types (string, text, enum, object) drive `<ChunkPanel>` rendering in pulse 46. If the types are misaligned, it will not surface until the TUI phase.

**Recommendation**: Add a fixture-based snapshot test to pulse 23 that captures the exact JSON shape each chunk produces and commits it as a reference snapshot. Pulses 46-50 (TUI screens) can then test their rendering against these committed snapshots rather than live API calls, catching shape misalignment early.

### F-09: Workspace parser file list inconsistency [HC-WARN]

**Pulses affected**: 1, 22

Pulse 1 (OC Workspace Readers) reads 9 files: SOUL.md, TOOLS.md, AGENTS.md, MEMORY.md, IDENTITY.md, USER.md, HEARTBEAT.md, skills/, lobster.yaml.

Pulse 22 (Workspace Parser) reads 9 files: SOUL.md, MEMORY.md, IDENTITY.md, TOOLS.md, AGENTS.md, HEARTBEAT.md, DENY.md, KNOWLEDGE.md, ENTITLEMENTS.md.

These are different file lists. Pulse 1 has USER.md, skills/, lobster.yaml. Pulse 22 has DENY.md, KNOWLEDGE.md, ENTITLEMENTS.md. Only 6 files overlap. This is likely intentional (pulse 1 is the compiler reader; pulse 22 is the serve workspace parser), but nowhere in the wave is the relationship between these two parsers explained. A developer arriving at pulse 22 after implementing pulse 1 will be confused by the different file list.

**Recommendation**: Pulse 22 should include a note explaining that the serve workspace parser reads a different (partially overlapping) file set from the compiler readers, and why. The ChunkDataMap in pulse 23 bridges the gap.

### F-10: Trust escalation JWT flow has no TUI input mechanism [HC-WARN]

**Pulses affected**: 39, 52

Pulse 39 implements PATCH /api/trust/escalate with JWT verification (5 checks). Pulse 52 renders the Trust Dashboard in the TUI with a "Request Escalation" button. But the TUI cannot generate or input a JWT. Pulse 52 says "without token: rejection with 'requires manager approval'; with token: tier promotes."

The user journey gap: how does a TUI user provide a JWT? Is there a token input field? A file path? An environment variable? Pulse 52 does not specify. This leaves the TUI implementation team guessing about the interaction pattern.

**Recommendation**: Pulse 52 should specify the JWT input mechanism in the TUI. Options: (a) prompt for token paste, (b) read from `~/.claws/approval-token`, (c) clipboard integration. The mechanism must be defined before implementation.

### F-11: Allow-all (pulse 33) result reporting designed without TUI context [MEDIUM]

**Pulses affected**: 33, 47

Pulse 33 returns a summary: enabled count, already-enabled count, skipped count. Pulse 47 renders the "Allow all" result. But the summary shape in pulse 33 does not include the list of R5 tool names that were skipped — only a count. The TUI (pulse 47) needs tool names to render "send-email is R5 and still requires individual approval" per pulse 49's error messages.

**Recommendation**: Add `skippedTools: { name: string, reason: string }[]` to the allow-all response shape in pulse 33 so the TUI can render per-tool R5 explanations.

### F-12: Incremental cache (pulse 32) is in CP-6 but serves both PATCH and SSE use cases [MEDIUM]

**Pulses affected**: 32, 28, 54

Pulse 32 (incremental cache) depends only on pulse 21 but is placed in CP-6. The SSE event stream (pulse 28, CP-5) would benefit from the incremental cache — file change events could include compilation duration that reflects incremental rather than full compilation. Without the cache, SSE recompilation events during CP-5 testing reflect full-compile times, which are misleading.

**Recommendation**: This is acceptable but worth noting: CP-5 SSE events will report full-compile durations until CP-6 lands the incremental cache. The demo story should not cite sub-200ms recompile times until after CP-6.

### F-13: Connections L2 (pulse 48) toggles are inert for exactly 1 pulse [MEDIUM]

**Pulses affected**: 48, 49

Pulse 48 renders tool toggles (Space bar). Pulse 49 wires them to PATCH. A developer implementing pulse 48 builds toggle UI that does nothing for 1 pulse. This is acceptable sequencing — the read side should exist before the write side is wired. But pulse 48 should explicitly state that Space bar on a toggle is a no-op until pulse 49, to prevent the implementer from prematurely wiring PATCH.

**Recommendation**: Add acceptance criterion to pulse 48: "Space bar on a non-locked tool renders visual toggle state change locally but does NOT send a PATCH request. PATCH wiring is pulse 49."

### F-14: Demo fixture workspace (pulse 55) is defined late [MEDIUM]

**Pulses affected**: 55, 23, 43

The demo fixture workspace in pulse 55 includes specific content: 3 MCP servers, fleet policy, R5 send-email, deny rules, HEARTBEAT.md, trust tier, seeded audit chain. This fixture is the reference workspace for the entire product experience. But it is defined in pulse 55 — the last TUI pulse.

Earlier pulses (23 chunk assembler, 43 onboard API) create their own test fixtures independently. The demo fixture is the canonical "this is what claws looks like" workspace, yet it is not available during the 32 pulses (23-54) where the product experience is being built.

**Recommendation**: Define the demo fixture workspace content in pulse 23 (chunk assembler) or as a shared fixture in the CP-5 scaffold. Reference it from all subsequent pulses. Pulse 55 then uses the canonical fixture rather than defining it fresh.

### F-15: VS Code webview (pulse 59) duplicates TUI connections rendering [MEDIUM]

**Pulses affected**: 47, 59

Pulse 47 (TUI Connections L1) and pulse 59 (VS Code webview Connections panel) render identical data with identical visual semantics (risk badges, lock indicators, tool counts). But they are implemented independently — Ink components in pulse 47, HTML generation in pulse 59. There is no shared rendering logic.

This is pragmatic (Ink and HTML are different rendering targets) but creates a maintenance burden: risk badge color mapping must stay in sync between `<RiskBadge>` (Ink) and `connections-panel.ts` (HTML). No shared constant or test verifies this.

**Recommendation**: Extract risk level color mapping into a shared constants file in claws-sdk (e.g., `claws-sdk/src/workspace/risk-colors.ts`). Both TUI and VS Code import the same mapping. Add a cross-surface test in pulse 59 that verifies TUI and webview use identical color assignments.

### F-16: Schedule calendar (pulse 37) timezone rejection may surprise users [LOW]

**Pulses affected**: 37

Pulse 37 rejects HEARTBEAT.md events without explicit timezone with 400 Bad Request. This is correct per P-278, but the error message needs to be actionable: "Event 'daily standup' has no timezone. Add `timezone: America/Los_Angeles` to the event block." Without this guidance, the user sees a 400 and does not know how to fix it.

**Recommendation**: Ensure the 400 response includes the event name and a fix example in the error body.

### F-17: Memory screen toggle ambiguity with knowledge sources [LOW]

**Pulses affected**: 50

Pulse 50 renders memory knowledge sources with toggles but the knowledge source toggle interaction is not specified. Are these the same ToggleEdit operations as connections tools? Do they go through the same PATCH handler? The pulse says nothing about PATCH integration despite having toggles.

**Recommendation**: Covered by F-05. Explicit PATCH scope needed.

### F-18: Lobster screens (pulses 51-52) are Lobster "preview" but depend on real APIs [LOW]

**Pulses affected**: 51, 52

Pulses 35-39 build real Loop/Calendar/Trust APIs. Pulses 51-52 build TUI screens that consume them. The naming "preview the Lobster collaboration APIs as terminal renderings" suggests these are mockups, but they consume real endpoints. A developer reading "preview" might implement with mock data rather than live API calls.

**Recommendation**: Rename the Lobster TUI screens from "preview" to "terminal client" in the pulse descriptions to clarify they consume live APIs.

---

## Checkpoint Demo-ability Assessment

| Checkpoint | Pulses | What you can demo | Demo quality |
|-----------|--------|-------------------|-------------|
| CP-1 | 1-6 | Compile 9-file workspace, R5 fail-closed rejection | Internal only |
| CP-2 | 7-12 | Compile to OC + Claude Code targets, full pipeline | Internal only |
| CP-3 | 13-18 | `npm pack @claws/compiler` standalone, 17 packages | Internal + partner preview |
| CP-4 | 19-20 | Publish pipeline dry-run, migration guide | Partner-ready |
| CP-5 | 21-28 | `curl /api/chunks/connections`, SSE stream, live file watching | Partner handoff (read) |
| CP-6 | 29-34 | PATCH tool toggle, R5 rejection JSON, atomic rollback | Partner handoff (read+write), but JSON-only |
| CP-7 | 35-39 | Loop soul sync, calendar events, trust escalation | Partner handoff (collaboration) |
| CP-8 | 40-44 | Skills store, audit trail, fleet view, onboarding | Full API surface |
| CP-9 | 45-55 | `claws tui --demo`, guided walkthrough, live editing | Executive demo, customer demo |
| CP-10 | 56-59 | VS Code extension with diagnostics, decorations, code actions, webview | Developer experience showcase |

**Key insight**: The wave has two natural demo points: CP-5 (read APIs, compelling curl demos) and CP-9 (TUI, compelling visual demos). Everything between CP-5 and CP-9 is API plumbing that is technically impressive but visually flat. This is fine if stakeholder expectations are set correctly.

---

## TUI Flow Coherence Assessment

The TUI builds in a sensible order within each experience:
- **Settings**: General/Preferences (46) -> Connections overview (47) -> Connections drill-in (48) -> Wire all PATCHes (49) -> Remaining screens (50)
- **Lobster**: Soul editor (51) -> Trust/Schedule/Queue (52)
- **Manage**: Companion screens (53)
- **Cross-cutting**: SSE live updates (54) -> Demo mode (55)

The read-before-write pattern is correct. The main coherence issue is F-05 (memory toggle ambiguity) and F-06 (SSE wired late). Overall, a developer implementing in pulse order would produce a working TUI, though they would need to revisit screens when SSE and PATCH are wired.

---

## VS Code as Afterthought Assessment

The VS Code extension is NOT an afterthought architecturally — it shares the same `claws serve` backend as the TUI and consumes the same chunk APIs. The dependency graph is clean: pulse 56 depends on pulse 30 (validation layer), not on any TUI pulse.

However, the checkpoint placement IS afterthought-like. Per F-03, the LSP diagnostics could start in CP-6 and provide developer value during 30 pulses of API implementation. Placing all 4 VS Code pulses in CP-10 means the extension is built last and tested last, which creates integration risk: if the LSP's serve client has issues, they surface at the end of the wave rather than mid-wave when there is time to fix them.

The webview (pulse 59) builds naturally on the LSP and serve infrastructure. Code actions (pulse 58) build naturally on diagnostics and decorations. The internal VS Code sequence (56 -> 57 -> 58 -> 59) is well-ordered. The issue is external: the whole block should start earlier.

---

## Onboarding Assessment

Pulse 43 produces a testable API endpoint with 6 L0 tests, 3 L1 tests, 1 L2 E2E test, and 2 L3 acceptance tests. This is thorough API testing. The secret scanner, size limits, and injection defense are well-specified.

What is NOT testable after pulse 43 is the first-run experience: "I have no workspace. I paste a conversation. The system generates my agent." The generated files need to flow through chunk assembly (pulse 23, already done), produce valid chunks in the serve API, and render correctly in the TUI. Per F-04, this end-to-end chain is not tested until pulse 55.

The onboarding API is a solid foundation but the user journey validation comes too late. A malformed SOUL.md generator could ship through 12 pulses before anyone renders its output.

---

## Overall Assessment

The Ra wave pulse sequence is well-structured at the macro level: internals -> API -> UI -> IDE is the right order. The dependency graph is sound — no pulse depends on something that has not been built. The checkpoint gates are meaningful quality milestones.

The three HC-BLOCK findings (F-01, F-02, F-03) represent coherence gaps that should be addressed before implementation begins:

1. **Partner handoff signal** (F-01): Partners need an artifact, not a comment in a gate pulse.
2. **Error UX co-design** (F-02): Human-readable messages should be designed alongside error codes, not 19 pulses later.
3. **VS Code LSP timing** (F-03): Governance diagnostics should be available during API development, not after it.

All three are addressable by moving or adding deliverables to existing pulses — none require new pulses or structural changes to the wave.
