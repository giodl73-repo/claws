# R1 — craft/architect Review: claws-tui Plan

**Reviewer**: craft/architect
**Tension**: Structural clarity > rapid delivery (Cluster D)
**Plan**: `claws-tui` (Draft)
**Date**: 2026-04-15

---

## Findings

### Major

**M1: CL-10 API surface does not exist yet -- TUI has no server to connect to**

The plan declares the TUI as a "consumer of `claws serve`" and lists 20+ endpoints (`/api/chunks/{tab}/{section}`, `/api/trust`, `/api/workqueue`, `/api/loop/soul`, `/api/events`, etc.). None of these endpoints exist. The current `claws-serve` package exposes only internal compiler routes: `/health`, `/status`, `/compile`, `/ir`, `/diagnostics`, `/tensions`, `/classify`, `/snapshot`, `/invalidate`. The entire Chunk API, Lobster API, Companion API, and SSE event stream from CL-10 are unimplemented. The plan names `claws-cap-integration` as a dependency in the Dependencies section but does not model this as a hard prerequisite in the pulse breakdown. Pulse 1 ("TUI scaffold ... `claws serve` client") cannot function without the server endpoints. This is a sequencing problem: either the TUI plan must be explicitly gated on a CL-10 implementation wave, or the TUI must develop against a mock server -- and the plan says neither.

**Recommendation**: Add a Pulse 0 that either (a) implements the chunk/lobster/companion routes in claws-serve (which is itself a multi-pulse effort), or (b) defines a mock server contract so the TUI can develop in parallel. State the gate explicitly.

**M2: `claws-tui` as a new monorepo package violates the thin-adapter pattern**

The plan proposes `claws-tui/` as a sibling package to `claws-cli/` and `claws-serve/`. The monorepo already has 7 claws packages. The TUI is a rendering adapter -- it reads HTTP responses and paints them on a terminal. That is exactly the job of a CLI package. The `claws-cli` package already owns the `claws` binary and has `@bic/claws-serve` as a dependency. The natural location for `claws tui` is as a subcommand inside `claws-cli`, with Ink components living under `claws-cli/src/tui/`. This avoids a new workspace entry, a new `package.json`, a new build target, a new CI pipeline, and a new dependency graph node.

The plan says "Dependencies: `ink` (React for CLI), `@bic/claws-sdk` (types only)." But `ink` is a heavy dependency (React runtime). If the concern is keeping `ink` out of `claws-cli`'s default install, a lazy `import()` behind the `claws tui` subcommand achieves the same isolation without a separate package.

**Recommendation**: Make `claws tui` a subcommand within `claws-cli`. Use dynamic `import()` to lazy-load Ink. If the dependency weight is truly unacceptable, justify the separate package with a clear architectural rationale, not just "sibling to."

**M3: Types referenced in Dependencies section do not exist in claws-sdk**

The plan lists `ChunkDataMap`, `FieldEditability`, `ItemLock`, `PatchResult` as imports from `claws-sdk`. These types are defined only in the CL-10 spec document (lines 590-856 of `CL-10-cap-integration.md`). They are not exported from `claws-sdk` -- grep returns zero matches across the SDK source. The plan assumes these types will materialize but does not track that dependency. If the TUI team starts coding against imagined types and the CL-10 implementation makes different choices (e.g., discriminated unions instead of `ChunkDataMap`, or the section parameter structure changes), the TUI will need rework.

**Recommendation**: Add a prerequisite task: "CL-10 types landed in `@bic/claws-sdk/types`." Until then, the TUI plan is building on a spec, not on code.

**M4: 8 pulses for 15 screens + 14 PATCH interactions + SSE is undersized**

Pulse 3 (Connections screen) and Pulse 4 (PATCH integration) are both marked "Heavy," but the plan assigns one pulse each. Pulse 3 alone covers: server list rendering, drill-in navigation (L1 -> L2), risk badge rendering with 5 levels, lock icon rendering with 3 sources, and the "Allow all" button. Pulse 4 covers 4 different PATCH interactions, each with distinct error shapes (`R5_NON_NEGOTIABLE`, `FLEET_LOCK_VIOLATION`, `GOVERNANCE_VIOLATION`, `COMPILATION_FAILED`), plus the `GovernanceBanner` component, plus the `PatchResult` component. Meanwhile, Pulse 6 bundles three entirely different screens (Trust Dashboard + Schedule + Work Queue) into a single "Medium" pulse. Historical pulse velocity in this monorepo averages 1-2 screens per pulse when interactions are involved.

**Recommendation**: Split Pulse 3 into 3a (server list + drill-in) and 3b (risk badges + lock icons + Allow All). Split Pulse 6 into 6a (Trust Dashboard) and 6b (Schedule + Work Queue). This brings the count to 10-11 pulses, which aligns with the actual complexity.

### Warning

**W1: Dependency on `@bic/claws-sdk` "types only" is architecturally ambiguous**

The plan says the TUI depends on `claws-sdk` for "types only." But `claws-sdk` is the governance compiler SDK -- it exports IR modules, compilation functions, emit pipelines, governance rules. A "types only" dependency on a package that also exports heavy runtime code is a boundary smell. If someone imports from `claws-sdk` instead of `claws-sdk/types`, the TUI suddenly bundles the compiler. The plan should declare the dependency as `@bic/claws-sdk/types` (subpath import), which claws-sdk already exports, and enforce that no other subpath is used.

**Recommendation**: Pin the dependency to `@bic/claws-sdk/types` subpath only. Add a lint rule or package.json `peerDependencies` note that prevents deep imports.

**W2: Demo mode fixture workspace is described but not specified**

The plan describes the demo workspace: "3 MCP servers (Outlook, Planner, Asana) with mixed R1-R5 tools, Fleet policy locking Planner tools, R5 send-email with OBO, SOUL.md with deny rules, HEARTBEAT.md with 3 scheduled tasks, Trust tier at T2 with escalation history." This is a sentence, not a specification. Reproducibility requires the exact file contents (9 OC workspace files), the exact fleet policy YAML, and the exact expected TUI state for each screen. Without this, every developer who runs `claws tui --demo` gets a different experience, and snapshot tests are flaky.

**Recommendation**: Define the demo fixture as a checked-in directory (`claws-tui/fixtures/demo/` or `claws-cli/fixtures/demo/`) with all 9 OC files, fleet policy, and a `README.md` describing the expected screen state.

**W3: `<ChunkPanel>` "auto-layout from data + editable + governance" is under-specified**

The plan calls `<ChunkPanel>` "generic" and says it renders "any chunk." But the Chunk type from CL-10 is discriminated by tab -- `GeneralData`, `PreferencesData`, `ConnectionsData` all have completely different shapes. A truly generic auto-layout component would need a schema-driven renderer that inspects field types at runtime (string -> text input, boolean -> toggle, array -> list, etc.). This is a significant design decision that the plan hand-waves. Is `<ChunkPanel>` a generic renderer, or is it a container that delegates to tab-specific child components? The answer determines whether the component decomposition is one-responsibility or a god-component.

**Recommendation**: Clarify whether `<ChunkPanel>` is (a) a layout shell that delegates to `<GeneralPanel>`, `<PreferencesPanel>`, etc., or (b) a schema-driven generic renderer. Option (a) is simpler and follows one-responsibility. Option (b) is ambitious and needs its own design pulse.

**W4: No error boundary or offline-mode design**

The TUI connects to `claws serve` over HTTP. If the server is not running, crashes, or the compilation host takes 5+ seconds, the TUI has no defined behavior. The plan mentions SSE reconnection semantics from CL-10 (SSE is current-state-only, clients detect gaps via sequence numbers) but does not describe how the TUI handles: server not reachable on startup, server crash mid-session, PATCH timeout, SSE disconnect. An Ink app that hangs on a failed fetch is a bad developer experience.

**Recommendation**: Add a "Connection lifecycle" section covering startup check, retry with backoff, graceful degradation (show last-known state with a "disconnected" banner), and SSE reconnect with chunk refresh.

### Notes

**N1: Plan correctly separates read-only and read-write screens**

Pulse 5 (Memory + Groups + Entitlements) is read-only chunk rendering and marked "Light." This is the right decomposition -- read-only screens are commodity work, while PATCH-interactive screens carry the complexity. The pulse sequencing puts PATCH integration (Pulse 4) before read-only screens (Pulse 5), which means the PATCH machinery is proven before the simpler screens are built. Good ordering.

**N2: Component list is missing key components**

The plan lists 9 components but the 15 screens require more. Missing from the component table: `<SoulEditor>` (multiline section editor with immutable-rule highlighting), `<MemoryBrowser>` (knowledge source list with data labels), `<AuditTimeline>` (scrollable, filterable event list), `<ActivityFeed>` (SSE-driven live stream), `<SkillsStore>` (install action with governance impact preview). Each of these has distinct interaction patterns. The component table should be a complete manifest.

**N3: Test strategy is realistic but needs the mock server**

"Snapshot tests for component rendering" plus "integration tests: start `claws serve` with fixture workspace, start TUI, simulate keystrokes" is a sound two-tier approach. But the integration tier requires the CL-10 API to exist (see M1). The snapshot tier can proceed independently with mock data. The plan should explicitly separate these tiers and note which can start now vs. which are blocked.

---

## Lens Checklist

| Lens Question | Verdict | Evidence |
|---|---|---|
| Does this change respect the SDK-owns-logic boundary? | PASS | TUI is a pure rendering adapter; all logic stays in claws-serve. No SDK business logic in the TUI. |
| Are dependency arrows pointing inward (CLI -> SDK -> types)? | WARN | Plan declares `claws-sdk` dependency without pinning to `/types` subpath. Risk of importing compiler internals (W1). |
| Would a new contributor understand the module's responsibility from its location? | FAIL | A new `claws-tui/` package alongside `claws-cli/` raises the question: "why are there two CLI packages?" The TUI is a CLI subcommand, not a separate system (M2). |
| One responsibility per module, one direction per dependency? | WARN | `<ChunkPanel>` is described as generic but covers 9 different data shapes. Needs clarification (W3). |
| If you have to explain which package owns it, the boundary is wrong? | FAIL | "Is `claws tui` in claws-tui or claws-cli?" requires explanation. The answer should be obvious from the package name (M2). |

---

## Summary

The claws-tui plan has the right product instinct -- a TUI that exercises the real API is a powerful validation tool and demo surface. The problem is structural. The plan proposes a new package where a subcommand suffices (M2), builds on an API that does not yet exist without modeling the dependency (M1, M3), underestimates pulse count for the interaction complexity (M4), and leaves the generic component design ambiguous (W3). The demo fixture is described narratively but not specified reproducibly (W2).

The plan needs three changes before it is ready for wave execution:
1. Resolve the package boundary question (subcommand vs. separate package, with justification).
2. Model the CL-10 API implementation as an explicit prerequisite or parallel work stream with a mock server contract.
3. Expand the pulse breakdown to 10-11 pulses to match the actual screen and interaction count.

**Disposition**: Not ready for wave execution. Revise and re-review.
