---
pulse: 33
slug: allow-all
plan: claws-cap-integration
depends_on: [31]
governing_roles: [craft:architect, claws:platform-eng, claws:ciso]
scenario_codes: [cap-integration/S05]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-serve && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 6
checkpoint_gate: false
---

# Pulse 33: Allow-All Handler

## Objective

Implement the PATCH /api/chunks/connections/allow-all endpoint (business logic in claws-sdk/src/workspace-edit/, route is thin HTTP adapter) — a bulk action that enables all tools in the connections chunk EXCEPT R5 tools. This is the "allow all" button in the CAP settings UI: the admin clicks it to enable every tool at once, but R5 tools are explicitly excluded per P-282 (R5 exclusion applied to tools).

The handler routes through the same validation pipeline as individual PATCHes. For each non-R5 tool, it generates a ToggleEdit(enabled: true) operation and batches them through the ValidationPipeline. R5 tools are silently skipped — they are not included in the batch, not flagged as errors. The response includes a summary: how many tools were enabled, how many were already enabled, and how many were skipped (R5).

Audit trail integration: every allow-all action is logged with the full list of tools enabled and tools skipped (with skip reason). The audit entry includes timestamp, actor identity (from request context), and the before/after state of each tool.

Key edge case: an all-R5 workspace (every tool is R5) → allow-all approves 0 tools, returns 200 with summary showing 0 enabled, 0 already enabled, N skipped. This is not an error — it is correct behavior.

## Deliverables

- [ ] `claws-serve/src/routes/allow-all.ts` — PATCH /api/chunks/connections/allow-all route handler: enumerate all tools from connections chunk, filter out R5 tools (P-282), generate ToggleEdit(enabled: true) for each remaining tool, batch through ValidationPipeline, apply via StructuredEditor, trigger incremental recompile, return summary response (enabled count, already-enabled count, skipped count with reasons)
- [ ] `claws-serve/src/routes/allow-all.ts` (audit) — Audit trail entry on every allow-all: timestamp, actor identity, tools enabled (list), tools skipped (list with skip reason: 'r5'), before/after tool states. Writes to audit log via existing audit chain integration.
- [ ] `claws-serve/tests/routes/allow-all.unit.test.ts` — L0: allow-all enables all non-R5 tools and returns correct summary (1), all-R5 workspace returns 200 with 0 enabled (1), already-enabled tools counted correctly in summary (1), audit entry includes full tool lists (1)
- [ ] `claws-serve/tests/routes/allow-all.integration.test.ts` — L1: allow-all on mixed workspace (R1-R5 tools) → only R1-R4 enabled, R5 skipped, audit logged (1), allow-all → GET /api/chunks/connections reflects all non-R5 tools enabled (1)
- [ ] `claws-serve/tests/routes/allow-all.e2e.test.ts` — L2: end-to-end allow-all on mixed workspace with R5 enforcement (1)
- [ ] `claws-serve/tests/routes/allow-all.accept.test.ts` — L3: S05 acceptance — all-R5 workspace → allow-all approves 0 tools (1)
- [ ] `claws-serve/tests/fixtures/all-r5-workspace/` — fixture workspace where every tool is classified R5
- [ ] `claws-serve/tests/fixtures/mixed-risk-workspace/` — fixture workspace with tools at R1, R2, R3, R4, R5

## Acceptance Criteria

- [ ] PATCH /api/chunks/connections/allow-all enables all non-R5 tools
- [ ] R5 tools are silently excluded — not errors, not included in batch (P-282)
- [ ] All-R5 workspace → allow-all approves 0 tools, returns 200 with correct summary (S05 key test)
- [ ] Summary response includes enabled count, already-enabled count, skipped count with reasons
- [ ] Audit trail entry logged with full tool lists, actor identity, and before/after states
- [ ] Subsequent GET /api/chunks/connections reflects the allow-all changes
- [ ] Route handler delegates to claws-sdk — no business logic in claws-serve
- [ ] Allow-all is rejected (503) in ERROR state. In DEGRADED states, allow-all excludes tools with `lock.source: 'violation'` or `'unclassified'` in addition to R5 and fleet-locked.
- [ ] `npx vitest run --project unit --coverage` passes coverage thresholds
- [ ] `npx vitest run --project integration --coverage` passes coverage thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — SDK-owns-logic rule, batch operation patterns
- `.craft/roles/claws/platform-eng.md` — route handler patterns, audit trail integration
- `.craft/roles/claws/ciso.md` — R5 exclusion enforcement, audit trail requirements

## Dependencies

- Pulse 31 (patch-routes) — PATCH route infrastructure, validation middleware, PatchError response mapping

## Test Gates

- [ ] L0 unit (4 tests): allow-all enables non-R5 tools with correct summary (1), all-R5 workspace returns 200 with 0 enabled (1), already-enabled counted correctly (1), audit entry includes full tool lists (1)
- [ ] L1 integration (2 tests): mixed workspace allow-all with audit (1), allow-all → GET consistency (1)
- [ ] L2 e2e (1 test): end-to-end allow-all on mixed workspace (1)
- [ ] L3 accept (1 test): S05 all-R5 workspace acceptance (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
