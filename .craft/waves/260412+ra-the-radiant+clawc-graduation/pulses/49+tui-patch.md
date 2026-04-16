---
pulse: 49
slug: tui-patch
plan: claws-tui
depends_on: [46, 48]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S03, S05]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 4
  L2_e2e: 1
  L3_accept: 0
heavy: true
test_scope:
  run:
    - "cd claws-cli && npx vitest run --project unit --coverage"
    - "cd claws-cli && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 9
checkpoint_gate: false
---

# Pulse 49: PATCH Integration (HEAVY)

## Objective

Wire PATCH operations across all editable TUI screens. This is the write-time validation layer: every edit the user makes (toggle a tool, edit the prompt, "Allow all") sends a `PATCH /api/chunks/{tab}/{section}` request and renders the result inline. Success updates the screen state. Failure renders human-readable error guidance via `<PatchResult>` and `<GovernanceBanner>`.

Error rendering is critical UX. Every PatchError includes a human-readable sentence:
- R5_NON_NEGOTIABLE: "This tool acts on your behalf (R5). Approval is required on every call and cannot be disabled."
- FLEET_LOCK_VIOLATION: "This setting is controlled by your organization's fleet policy. Contact your fleet admin to change it."
- R5_EXCLUDED_FROM_ALLOW_ALL: "Allow All approved 3 tools. send-email is R5 and still requires individual approval."
- GOVERNANCE_VIOLATION: "This edit would create a governance violation: {details}. Review the governance warnings."
- COMPILATION_FAILED: "Your edit was rolled back because it caused a compilation error: {details}."

ANSI sanitization: all chunk string fields are sanitized before rendering to prevent terminal injection from user-provided text.

Validates scenarios S03 (tool toggle flow) and S05 (error feedback).

## Deliverables

- [ ] `claws-cli/src/tui/components/patch-result.tsx` — `<PatchResult>` component: success (green check + summary), rejection (red X + human message), loading spinner during PATCH
- [ ] `claws-cli/src/tui/patch-handler.ts` — Centralized PATCH dispatcher: sends PATCH to serve, maps error codes to human-readable messages, triggers screen state refresh on success, renders `<PatchResult>` on failure
- [ ] `claws-cli/src/tui/sanitize.ts` — ANSI escape sequence sanitizer: strips all ANSI codes from chunk string fields before rendering, prevents terminal injection
- [ ] `claws-cli/src/tui/screens/connections-detail.tsx` (EDIT) — Wire tool toggle to PATCH handler, show `<PatchResult>` inline after toggle
- [ ] `claws-cli/src/tui/screens/connections.tsx` (EDIT) — Wire "Allow all" to PATCH handler, show R5 `still_gated` result
- [ ] `claws-cli/src/tui/screens/preferences.tsx` (EDIT) — Wire prompt edit save to PATCH handler, show governance result
- [ ] `claws-cli/src/tui/screens/general.tsx` (EDIT) — Wire editable field saves to PATCH handler
- [ ] `claws-cli/tests/tui/patch-handler.unit.test.ts` — L0: maps R5_NON_NEGOTIABLE to human message (1), maps FLEET_LOCK_VIOLATION to human message (1), maps R5_EXCLUDED_FROM_ALLOW_ALL to human message (1), success PATCH updates screen state (1), ANSI sanitizer strips escape sequences (1), loading spinner renders during PATCH (1)
- [ ] `claws-cli/tests/tui/patch-handler.integration.test.ts` — L1: tool toggle PATCH round-trips through serve (1), R5 toggle PATCH returns rejection (1), "Allow all" PATCH returns R5 still_gated (1), prompt edit PATCH round-trips through serve (1)
- [ ] `claws-cli/tests/tui/patch-handler.e2e.test.ts` — L2: full PATCH flow from keypress through screen update (1)

## Acceptance Criteria

- [ ] Tool toggle sends PATCH and shows success/failure inline
- [ ] R5 toggle attempt shows human-readable rejection with guidance
- [ ] Fleet-locked toggle attempt shows "contact fleet admin" message
- [ ] "Allow all" shows count of approved tools and R5 `still_gated` list
- [ ] Prompt edit save sends PATCH with governance result
- [ ] All error codes map to human-readable sentences
- [ ] ANSI escape sequences stripped from all rendered chunk data
- [ ] Loading spinner shows during PATCH request
- [ ] Scenario S03 acceptance: tool toggle flow works end-to-end
- [ ] Scenario S05 acceptance: error feedback is human-readable
- [ ] All 6 L0 unit tests pass
- [ ] All 4 L1 integration tests pass
- [ ] All 1 L2 e2e tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — error handling patterns, UX feedback conventions
- `.craft/roles/claws/platform-eng.md` — PATCH integration, write-time validation, ANSI sanitization

## Dependencies

- Pulse 46 (General + Preferences screens) — editable fields to wire PATCH to
- Pulse 48 (Connections L2) — tool toggles to wire PATCH to

## Test Gates

- [ ] L0 unit (6 tests): R5_NON_NEGOTIABLE human message, FLEET_LOCK_VIOLATION human message, R5_EXCLUDED_FROM_ALLOW_ALL human message, success PATCH updates state, ANSI sanitizer strips escapes, loading spinner renders
- [ ] L1 integration (4 tests): tool toggle PATCH round-trips, R5 toggle returns rejection, "Allow all" returns R5 still_gated, prompt edit PATCH round-trips
- [ ] L2 e2e (1 test): full PATCH flow from keypress through screen update
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
