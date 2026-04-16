# R1 Architect Review -- CL-10: CAP Integration & Serve API

**Reviewer**: craft/architect (structural clarity)
**Review type**: spec
**Round**: 1
**Date**: 2026-04-15
**Scope**: CL-10 spec -- tab-to-file mapping, `claws serve` API surface, Chunk API, SSE events, gap analysis

---

## Findings

### Major (M)

| ID | Section | Finding |
|----|---------|---------|
| M-01 | Chunk API -- package ownership | **Chunk assembly logic has no stated package home.** The spec defines a `Chunk<T>` interface and chunk-per-tab assembly (merging parsed OC files + compiled governance + editable schema + write-back URLs). This is non-trivial business logic: it reads workspace files, joins compiled governance context, resolves fleet overrides, and computes `locked`/`lockReason` fields. The spec says "claws serve handles the governance plumbing" but `claws-serve` is an HTTP adapter (routes, middleware, WebSocket). Chunk assembly belongs in `claws-sdk` -- the SDK already has `compile/`, `governance/`, `emit/`, and `context/` modules. Without an explicit SDK-side `chunks/` module (or equivalent), implementers will put this logic in route handlers, violating SDK-owns-logic. |
| M-02 | Write API -- PATCH /api/workspace/:file | **Write operations bypass the compilation pipeline's ownership boundary.** The PATCH endpoint accepts structured edit operations (`set_tool_enabled`, `set_name`, `add_reviewer`) and writes OC workspace files directly. Today, `claws-sdk` compiles workspace files but does not own writing them -- it reads from disk, compiles, and emits artifacts. Adding structured OC-file mutation is a new SDK responsibility that needs explicit architectural placement. The spec places the write path inside `claws serve` ("The server validates the edit, writes it, and triggers recompilation"), which means an HTTP route handler would be parsing operations, mutating markdown, and preserving formatting. That is SDK-level business logic masquerading as a route handler. Needs a `claws-sdk/workspace-writer` or `claws-sdk/amend/` module (note: `amend/` already exists in claws-sdk -- clarify if it covers this). |
| M-03 | Tab-by-Tab Mapping -- Memory & Knowledge | **MEMORY.md is overloaded with dual-file ownership.** In the Memory & Knowledge tab (section 4), knowledge sources map to "MEMORY.md + TOOLS.md" for 5 of 9 rows. When two OC files jointly own a UI element, the PATCH write path has ambiguous targets. The spec's edit operations table (line 386) says `PATCH /api/workspace/MEMORY.md { op: 'set_source_enabled' }` for "Toggle knowledge source," but if the knowledge source is also declared in TOOLS.md (as the mapping shows for Email, Files, Channels, SharePoint, Tables), a single PATCH to MEMORY.md is incomplete. Either: (a) knowledge source config lives entirely in MEMORY.md and TOOLS.md only has tool declarations, or (b) the write path must coordinate edits across two files. The spec must pick one and be explicit. |
| M-04 | Chunk API -- editable field schema | **The `editable` record uses JSONPath-style keys (`tools[*].enabled`, `tools[send-email].enabled`) without defining the grammar.** Partners need to know the exact path syntax to render inputs and map them back to write payloads. Is it JSONPath? jq path? A custom syntax? The connection chunk example mixes wildcard keys (`tools[*].enabled`) with named keys (`tools[send-email].enabled`) in the same record, which means the consumer must implement a path resolver to determine which `editable` entry governs which data field. This is an API contract that needs a formal definition, or it becomes a leaky abstraction where partners must reverse-engineer the mapping. A simpler approach: embed `editable` annotations inline on each data field rather than as a parallel path-keyed record. |

### Warning (W)

| ID | Section | Finding |
|----|---------|---------|
| W-01 | SSE events vs. CL-11 Approval Events | **SSE event model does not reference or compose with CL-11's ApprovalRequestEvent/ApprovalResponseEvent.** CL-11 defines a complete approval event schema with `schemaVersion`, `type: 'approval_request'`, `requestId` correlation, risk context, and governance metadata. CL-10's SSE events (`file_changed`, `compilation_started`, `compilation_complete`, `governance_warning`) are a separate, unrelated event vocabulary. When a PATCH edit triggers recompilation and the new governance state changes approval requirements for a tool, the SSE stream should emit events that compose with the CL-11 schema -- e.g., an `approval_policy_changed` event that references the same `RiskClassification` type. Without this bridge, the CAP UX and the approval UX are two disconnected event worlds. |
| W-02 | Read API surface vs. existing routes | **CL-10 proposes 9 new GET endpoints that overlap with existing claws-serve routes.** The current `claws-serve` already has `/compile`, `/status`, `/ir`, `/diagnostics`, `/tensions`, `/classify`, `/snapshot`, and `/invalidate`. CL-10 proposes `/api/workspace`, `/api/governance`, `/api/tools`, `/api/memory`, `/api/identity`, `/api/schedule`, `/api/audit`, `/api/status`, plus the Chunk API. The `/api/status` endpoint overlaps with the existing `/status`. The `/api/governance` response includes `compilationStatus`, `lastCompiled`, `riskDistribution` -- data already partially served by `/status` and `/diagnostics`. The spec needs a reconciliation plan: are the existing routes deprecated? Do CL-10 routes replace them? Do they coexist under different prefixes? Without this, the API surface will have two ways to get the same data. |
| W-03 | Chunk API -- write-back URL structure | **Chunk write-back URLs and PATCH workspace URLs are two parallel write surfaces.** The spec defines `PATCH /api/workspace/:file` (line 348) and `PATCH /api/chunks/{tab}/{section}` (line 603). Both mutate OC files. They have different semantics: the workspace PATCH takes OC-file-level operations, the chunk PATCH takes UI-component-level data. But they both end up writing to TOOLS.md or MEMORY.md. Two write paths to the same underlying files is a concurrency hazard (race conditions, stale reads) and an API design smell. The spec should either: (a) make chunks the only write surface and remove workspace PATCH, or (b) make workspace PATCH the internal primitive and have chunk write-back delegate to it, making this explicit. |
| W-04 | Gap Summary | **Proposed additions to IDENTITY.md are substantial but the spec does not assess lossless round-trip impact.** The gap analysis proposes adding `visuals`, `locale`, `groups`, and structured `entitlements.core[]`/`entitlements.governance[]` to IDENTITY.md. The lossless guarantee (byte-for-byte round-trip, add-only) is a core claws design principle. Adding 4+ new sections to IDENTITY.md means the parser must handle them without disturbing existing content. The spec should explicitly state whether these additions are OC upstream proposals (requiring OpenClaw spec changes) or claws-extension sections (requiring a namespacing strategy to avoid collision with future OC fields). |
| W-05 | API Authentication | **No authentication or authorization model for the serve API.** The spec proposes PATCH endpoints that mutate workspace files and trigger recompilation. The existing `claws-serve` binds to `127.0.0.1` by default and has CORS deny-by-default, rate limiting, and a network exposure warning for `0.0.0.0`. But CL-10's CAP integration implies the API may be called by the CAP UI, which could be a remote client (sidecar scenario). The spec should at minimum state the trust model: is this localhost-only? Does CAP call it via a sidecar proxy? Is there a token/cookie scheme? Write APIs without auth are a governance tool writing governance files -- the irony should not be lost. |
| W-06 | Connections tab -- server-to-tool grouping | **The `server -> tool[]` grouping layer is identified as needed (line 72) but not specified.** The mapping notes that "The UX aggregates tools by server -- claws classifies per-tool. The mapping needs a `server -> tool[]` grouping layer." But neither the gap summary nor the API surface defines how this grouping is derived. TOOLS.md declares tools; does it declare which MCP server each tool belongs to? If yes, the grouping is a parse-time concern in SDK. If not, the server-tool association is external metadata that needs a source of truth. The Chunk API response assumes `server: "outlook"` with nested tools, but the spec never defines where this server name comes from. |

### Note (N)

| ID | Section | Finding |
|----|---------|---------|
| N-01 | Architecture | **The existing claws-serve / claws-cli / claws-sdk layering is correctly maintained.** `claws-cli/src/commands/serve.ts` is a thin adapter that calls `startServer()` from `@bic/claws-serve`. The serve package owns HTTP/WS concerns. The SDK owns compilation. CL-10 should preserve this three-layer structure when adding workspace parsing and chunk assembly. |
| N-02 | Gap analysis | **The bidirectional gap analysis is thorough and actionable.** Both "CAP features missing from OC" and "OC features missing from CAP UX" are catalogued with specific file references. The 10-item "UX doesn't surface" table (deny rules, trust tiers, OBO, budgets, audit trail, fleet overrides, compilation status, workflow DAG) is particularly valuable for driving UX requirements. |
| N-03 | Chunk API design | **The Chunk abstraction is a sound partner-facing API concept.** Self-contained JSON blobs with data + schema + governance context + write-back URL is a clean contract for UX developers who should not need to understand OC file internals. The "Why Chunks Work" comparison table (line 636-643) makes the value proposition clear. The concerns in M-01 and M-04 are about implementation placement and field schema, not the abstraction itself. |
| N-04 | Steven's WS-4 integration | **The `tenant.tools.policy.get/set` mapping to claws serve endpoints is clean.** Steven's admin API becomes a thin wrapper around the same compiled governance data, which avoids duplicate policy engines. The composition model (claws owns baseline, admin API owns fleet overrides, ProviderRegistry composes) is architecturally sound. |
| N-05 | Implementation path | **Read-first, SSE-second, write-third is the correct ordering.** The implementation path (section at line 648) correctly sequences capabilities by risk: read APIs are safe and testable, SSE is additive, write APIs are the hardest (lossless mutation). This matches the natural dependency chain and avoids shipping a write API before the read API is proven. |

---

## Lens Checklist

| Check | Status | Notes |
|-------|--------|-------|
| SDK-owns-logic respected? | **FAIL** | Chunk assembly, edit validation, and OC file mutation are business logic described as living in `claws serve` (the HTTP adapter). Must be placed in claws-sdk. See M-01, M-02. |
| Dependency arrows inward (CLI -> serve -> SDK -> types)? | **PASS** | Existing `claws-cli -> claws-serve -> claws-sdk` layering is correct. CL-10 does not propose breaking it. The risk is in implementation drift (M-01, M-02). |
| New contributor can find module by location? | **WARN** | The Chunk API and workspace write path have no proposed SDK module location. A new contributor reading the spec cannot determine which package owns chunk assembly. See M-01. |
| One responsibility per module? | **WARN** | MEMORY.md has dual ownership with TOOLS.md for knowledge sources (M-03). The write API has two surfaces for the same files (W-03). |
| One direction per dependency? | **PASS** | No circular dependency proposed. Serve depends on SDK, CLI depends on serve. |
| Composes with adjacent specs? | **WARN** | SSE events and CL-11 approval events are disconnected vocabularies (W-01). No shared event types or correlation IDs. |

---

## Summary

CL-10 is a strong product spec. The tab-by-tab mapping is meticulous, the gap analysis is bidirectional and actionable, and the Chunk API is a genuinely good partner-facing abstraction. The implementation path is correctly sequenced.

The structural concerns are concentrated in two areas:

1. **Package ownership for new logic** (M-01, M-02). The spec describes chunk assembly and workspace mutation as things "claws serve handles," but these are SDK-level business logic. The existing three-package split (cli / serve / sdk) is clean -- CL-10 must not blur it by putting domain logic in route handlers. The fix is straightforward: declare that chunk assembly lives in `claws-sdk` (e.g., `claws-sdk/src/chunks/` or `claws-sdk/src/workspace/`) and that `claws-serve` routes are thin adapters over SDK functions.

2. **Dual write surfaces and dual file ownership** (M-03, W-03). Two PATCH APIs writing the same files, and knowledge sources spanning two OC files, create ambiguity that will compound at implementation time. The spec should pick a single write primitive and make the other delegate to it, and should resolve the MEMORY.md + TOOLS.md dual ownership before the write path is built.

No blocking issues for spec approval, but M-01 and M-02 must be resolved before implementation planning begins.
