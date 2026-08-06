# Plan Review · claws-openclaw-upstream · R1

**Reviewer**: claws:gateway-eng
**Date**: 2026-04-27
**Verdict**: APPROVE-WITH-WARNINGS

## Summary

The plan's scope, pacing, and adapter audit strategy are sound for gateway engineering. OC-7 merger fix is correctly identified (bugs at hooks.ts:889–893) and scoped to 5 lines. However, three discrepancies between plan wording and current upstream reality require clarification before PR authoring: (1) requireApproval field is already object-only, not `boolean | object` union; (2) OC-1/2/6 workaround via `before_agent_start` is viable but cannot prevent file writes at ingest time; (3) CLI registration adapter audit lacks upstream precedent citations.

## Findings

### HC-WARN (3)

1. **OC-7 plan wording vs implementation contract** — Plan H5 states the change will widen `requireApproval` from `boolean → boolean | ApprovalDescriptor | ApprovalDescriptor[]`. However, current upstream has requireApproval as object-only. In `hook-types.ts:402–410`, the field is `{ title, description, severity?, ... }` (object shape, never boolean). The real bug is at `hooks.ts:889–893`: the merger uses `??` (nullish coalesce), absorbing all downstream approvals—the downgradable pattern OC-7 fixes by adopting conjunctive (array) semantics. **Consequence**: Migration codemod (PR-4) will break if framed as "boolean narrowing" instead of "single-to-array upgrade." **Citations**: `hook-types.ts:402–410` (object-only shape), `hooks.ts:876–894` (current downgradable merger). **Suggested fix**: Reword plan H5 from "field-widening from boolean" to "adoption of conjunctive merging (approvalDescriptor → ApprovalDescriptor[])" with codemod targeting array-coercion.

2. **OC-1/2/6 workaround governance gap** — Plan says workspace-file-ingest hooks won't land; workaround via `before_agent_start` + plugin. However, `before_agent_start` fires _after_ files load (hook-before-agent-start.types.ts:59–68 shows event receives full `messages[]` array post-bootstrap). Original OC-1/2/6 governed _file writes_ (catch edits to SOUL.md, TOOLS.md before persist). The `before_agent_start` hook cannot prevent writes, only audit+block agent execution. **Consequence**: If spec required write-time prevention (reject edits to protected files), this workaround fails; enforcement becomes runtime-only (agent-execution gates). **Citations**: `workspace.ts:54–86` (file read guards happen at startup), `hook-before-agent-start.types.ts:59–68` (hook post-load). **Suggested fix**: Clarify in plan notes that OC-1/2/6 enforcement shifts to `before_agent_start` + generated-policy runtime checks; if write-time blocking is critical, flag as residual gap.

3. **CLI subcommand registration precedent missing** — Plan H3+H4 add `openclaw policy` (9 verbs) and `openclaw snap` (11 verbs) subcommand groups to existing CLI. Plan states this is "added to existing `openclaw` CLI" but provides no citation to current CLI entry point, handler convention, or subcommand precedent. Risk: Upstream CLI may use yargs, oclif, Commander.js, or custom dispatcher; emitted plugin must match exactly. **Consequence**: Adapter registration fails in upstream CI if handler shape doesn't align. **Citations**: None provided—upstream CLI structure not cited in plan. **Suggested fix**: H6 adapter audit (docs/upstream/guides/adapter-audits.md) must include: (a) sample CLI handler registration code for `openclaw policy` subcommand, (b) file:line citations to upstream CLI entry point + subcommand factory, (c) precedent example (existing subcommand from OpenClaw codebase).

### HC-NOTE (2)

1. **requireApproval merger semantics now well-defined** — Current code (hooks.ts:889–893) uses `??` to keep first approval, dropping all others. OC-7 correctly identifies this as downgradable bug: when plugin-A returns `requireApproval: { title: "A" }` and plugin-B returns `requireApproval: { title: "B" }`, result should be both (conjunctive AND), not just A. Fix is surgical: ~5 lines replacing `??` with array accumulation + type update to `ApprovalDescriptor[]`. Existing tests (merger tests asserting single approval survives) will break; new tests will verify conjunctive merging. Clear test contract and migration semantics.

2. **Upstream HEAD snapshot baseline is stable** — Plan pins baseline at `5e8cc1d9c` (2026-04-27 pull). Hook-types.ts, hooks.ts, workspace.ts, and registry APIs are stable; no API drift detected that would invalidate adapter audits.

## Strengths

- Two-adapter-audit approach (emitted-plugin registration + audit-stream wire shape) front-loads validation before dependent PRs open, reducing upstream review friction on critical-path governance.
- Seven-day-per-wave pacing respects upstream's 10-PR-per-author cap and 2-concurrent-open culture; maximizes merge velocity.
- OC-7 conjunctive merger correctly scoped, well-motivated, and has clear test contract.
