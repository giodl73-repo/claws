# R1 Navigator Review -- CL-10: CAP Integration & Serve API

**Reviewer**: craft/navigator (user journey coherence)
**Review type**: spec
**Round**: 1
**Date**: 2026-04-15
**Scope**: CL-10 spec -- tab-by-tab mapping, gap analysis, Chunk API, `claws serve` surface

---

## Findings

### Major (M)

| ID | Section | Finding |
|----|---------|---------|
| M-01 | Chunk API -- write-back error journey | **PATCH failure path is undocumented.** The spec shows a happy-path PATCH response (`status: "ok"`, `recompiled: true`) but never describes what happens when a write-back fails. A partner dev building a settings tab needs to know: what HTTP status codes can the PATCH return? What does a validation rejection look like (e.g., trying to disable R5 approval)? What does a recompilation failure look like? The spec mentions "Validates the edit (rejects disabling R5 approval)" at line 618 but never shows the rejection response shape. Without this, every partner team will invent their own error handling, and no two tabs will show errors consistently. The Chunk API promises that "partners build UI components" -- but error states are 30-40% of the UI surface. A `Chunk<T>` that only specifies the success shape is half a contract. |
| M-02 | Chunk API -- two API surfaces | **The spec defines two overlapping write APIs without clarifying which one partners use.** Section "Proposed API Surface" defines `PATCH /api/workspace/:file` (low-level, file-oriented). Section "Chunk API" defines `PATCH /api/chunks/{tab}/{section}` (high-level, component-oriented). The "Edit operations by tab" table at line 374 maps every edit to the `/api/workspace/` endpoints, while the Chunk section maps edits to `/api/chunks/` endpoints. A partner dev reading both sections will ask: "Which do I call?" The spec needs an explicit progressive disclosure statement: chunks are the partner-facing API; workspace endpoints are the internal/advanced API. Without this, the `server -> tool[]` grouping layer (line 72) gets rebuilt differently by each consumer. |
| M-03 | Chunk API -- `editable` schema for nested objects | **The `editable` field uses inconsistent key formats that would confuse a frontend developer.** In the general chunk (line 495-499), editable keys are flat field names (`"name"`, `"description"`, `"managedBy"`). In the connections chunk (line 554-555), editable keys use path syntax (`"tools[*].enabled"`, `"tools[send-email].enabled"`). In the memory chunk (line 592), it uses `"knowledgeSources[*].enabled"`. A frontend dev building a generic chunk renderer must now parse three different key formats: bare names, bracket-star wildcards, and bracket-value lookups. This breaks progressive disclosure -- the Chunk API promises "self-contained JSON blobs" but delivers a mini query language that requires documentation of its own. Define one format and use it everywhere, or provide a `fields[]` array with explicit paths. |
| M-04 | Gap summary tables -- prioritization missing | **The "missing from UX" and "missing from OC" tables list gaps without severity, effort, or priority.** A PM reading the "Things in OC files that the CAP UX DOESN'T surface" table (line 142) sees 10 items of wildly different importance: "Deny rules" (security-critical, users cannot see what the agent is forbidden from doing) is listed next to "Workflow DAG" (developer-only, low urgency). Without a priority column, a PM cannot sequence the work. The table format is scannable for "what" but not for "so what." Add a column: `Priority: P0/P1/P2` or `Impact: blocks-compliance / improves-UX / nice-to-have`. |

### Warning (W)

| ID | Section | Finding |
|----|---------|---------|
| W-01 | Tab-by-tab mapping -- Connections tab | **The `server -> tool[]` grouping gap is identified but not resolved.** Line 72 says "The mapping needs a `server -> tool[]` grouping layer" but the Chunk API later delivers exactly this grouping (the connections chunk returns tools nested under servers). The gap analysis should cross-reference the resolution. As written, a reader encounters the gap on page 1 and doesn't know it's resolved on page 4. This makes the spec feel unfinished when it is actually more complete than it appears. |
| W-02 | API naming -- `/api/chunks/connections/outlook` | **Endpoint naming leaks implementation detail into the partner surface.** The URL path uses the MCP server name (`outlook`) as the resource identifier. But the Chunk API's value proposition is that partners don't need to know about MCP servers. If the CAP UX calls `/api/chunks/connections/outlook`, the partner must know the server name, not just the display name. What if the server is `msgraph-outlook-v2`? The URL becomes ugly and couples the partner to backend naming. Consider `/api/chunks/connections/{connectionId}` where the chunk itself carries the display name. |
| W-03 | Chunk format -- `governance` field is optional | **Optional `governance` field breaks consistent rendering.** The `Chunk<T>` interface marks `governance?` as optional. This means some chunks will have governance context and some won't. A partner dev building a chunk renderer must now handle two code paths: with and without governance badges. The whole point of the Chunk API is that governance is always present and visible. Make `governance` required with a default `{ warnings: [] }` for chunks with no governance concerns. Absent governance should mean "clean" -- not "maybe we forgot to include it." |
| W-04 | Chunk format -- `writeBack` for read-only chunks | **Every chunk has a `writeBack` field, but Entitlements is read-only.** Line 388 says Entitlements is "read-only -- managed in Azure/M365." But the `Chunk<T>` interface makes `writeBack` a required field. What does a partner dev render for the Entitlements tab? A disabled save button? The `writeBack` field should be optional, or the spec should define a `writeBack: null` sentinel that means "this chunk is informational." Without this, a dev will wire up a save button, call the endpoint, get a 405, and file a bug. |
| W-05 | Tab-by-tab mapping -- traceability | **A new team member cannot trace "where does agent language come from?" in under 30 seconds.** The General tab mapping (line 44) shows `Agent language | -- | No OC file`. The gap summary (line 134) proposes `IDENTITY.md locale field`. The Chunk API example (line 497) shows `"language": "enum"` in `editable`. Three locations, three different representations of the same gap. The spec needs a single row that connects the UX element -> current source -> proposed source -> chunk field. The mapping tables are scannable individually but not traceable end-to-end. |
| W-06 | Steven's Enterprise Hardening integration | **The integration section (lines 413-428) assumes Steven's WS-4 design is known.** A reader encountering `tenant.tools.policy.get/set` and `GuardrailProvider` and `ProviderRegistry` has no cross-reference to follow. This section is only useful if you already know what it says. Add a one-line summary of WS-4 or a link to the spec. The navigator lens asks: "if a reader is confused, we are wrong." |
| W-07 | Implementation path -- no partner onboarding milestone | **The implementation path (lines 649-665) is engineering-sequenced, not partner-sequenced.** It goes: serve command -> read APIs -> SSE -> edit APIs -> CAP integration. But from the partner's perspective, the critical milestone is "when can I build a tab?" That happens at step 2 (read APIs) for display and step 4 (edit APIs) for interactivity. The implementation path should call out the partner-facing milestones explicitly: "After step 2, partners can build read-only tabs. After step 4, partners can ship interactive settings." Without this, a PM planning partner onboarding has to reverse-engineer the timeline. |
| W-08 | Chunk API -- `locked` semantics are ambiguous | **The `locked: true` flag conflates two different concepts.** In the connections chunk (line 554), `locked: true` on `tools[send-email].enabled` means "R5 tool, governance prevents this toggle." In the general chunk, `locked: false` on `managedBy` implies it could be locked by fleet policy. But the `lockReason` strings ("R5 non-negotiable" vs. "Fleet policy") are the only way to distinguish these cases. A frontend dev rendering a lock icon cannot distinguish "locked by security rule, never unlockable" from "locked by admin policy, contact your admin to unlock." Consider a `lockSource: 'governance' | 'fleet' | 'platform'` enum instead of a freetext reason. |

### Note (N)

| ID | Section | Finding |
|----|---------|---------|
| N-01 | Chunk API -- "Why Chunks Work" table | The comparison table at line 635 is excellent. It answers the partner's real question ("what do I not have to do?") rather than explaining what the API does. This is the right framing for partner documentation. Consider promoting this table earlier in the spec -- a reader who sees this before the Chunk format definition will have the right mental model. |
| N-02 | Tab-by-tab mapping -- coverage | The tab-by-tab section is thorough and well-structured. Every UI element from the Figma deck has a row. The `claws Governance Role` column (e.g., `G-A2A-IDENTITY`, `G-CLASS`, `G-ELICIT`) gives governance-aware readers a fast lookup path. This is the right level of detail for a mapping spec. |
| N-03 | API response examples | The JSON examples throughout the spec are concrete and realistic (real tool names like `send-email`, real risk levels, real governance warnings). This is much more useful than abstract schemas. Partners can copy-paste these into mock data files and start building immediately. |

---

## Navigator Lens Checklist

| Check | Status | Notes |
|-------|--------|-------|
| First-5-minutes path for a partner dev? | PARTIAL | The Chunk API section is well-motivated and the "Why Chunks Work" table is strong, but the two overlapping API surfaces (workspace vs. chunks) will confuse a dev who reads top-to-bottom. The spec needs a clear "start here" pointer to chunks. (M-02) |
| Error messages actionable from user perspective? | FAIL | No error response shapes are documented. A partner dev has no contract for what to show users when a PATCH fails, when governance rejects an edit, or when recompilation produces warnings. (M-01) |
| Progressive disclosure holds? | PARTIAL | Chunks are "simple by default" for rendering, but the `editable` key format introduces unnecessary complexity (M-03). The `governance?` optional field means governance context is "powerful on demand" but also "maybe absent" -- the wrong kind of progressive disclosure. (W-03) |
| Mental model matches spec? | PARTIAL | Tab-by-tab mapping is clear. But tracing a single field (e.g., "agent language") across the gap analysis, chunk API, and implementation path requires reading 3+ sections. (W-05) |
| Coherent journeys? | PARTIAL | The partner journey for building a read-only tab is coherent. The partner journey for building an interactive tab hits M-01 (no error contract), M-02 (which API?), and M-03 (editable key formats). |

---

## Summary

CL-10 is a strong mapping spec with thorough UI-to-source tracing and a well-motivated Chunk API abstraction. The tab-by-tab tables are scannable, the JSON examples are concrete, and the "Why Chunks Work" comparison table is the best partner-facing framing in the spec.

The 4 Major findings center on the partner developer's write path:

1. **No error contract** -- the PATCH response shape for failures is undefined, which means every partner team invents their own error UX. (M-01)
2. **Two overlapping APIs** -- workspace endpoints and chunk endpoints coexist without a clear "use this one" directive. (M-02)
3. **Inconsistent editable keys** -- flat names vs. bracket-path syntax forces partners to build a key parser. (M-03)
4. **Gap tables lack priority** -- PMs cannot sequence work from the gap summary without severity signals. (M-04)

The 8 Warning findings address naming, optional fields, cross-referencing gaps, and partner onboarding milestones.

**Recommendation**: Before advancing to scenarios, resolve M-01 (add error response shapes for validation rejection, governance block, recompilation failure), M-02 (declare chunks as the partner API and workspace as the internal API), and M-03 (standardize the editable key format). M-04 can be addressed in a follow-up pass with PM input.
