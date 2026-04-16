---
pulse: 41
slug: audit-query
plan: claws-cap-integration
depends_on: [21]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S14]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 3
  L2_e2e: 0
  L3_accept: 1
test_scope:
  run:
    - "cd claws-serve && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 8
checkpoint_gate: false
---

# Pulse 41: Audit Query

## Objective

Implement GET /api/audit with cursor-based pagination (P-281 requirement) backed by @openclaw/audit-chain. The endpoint exposes the audit trail as a queryable, filterable API for the Companion App. Supports filtering by category (compile, edit, trust, skill, onboard) and userId. Results are returned in reverse chronological order with cursor-based pagination for efficient traversal of large audit logs.

SARIF export is supported via Accept header (application/sarif+json) for integration with security tooling and compliance dashboards. Standard JSON response includes typed AuditEntry[] with timestamp, category, userId, action, details, and chain integrity verification status.

## Deliverables

- [ ] `claws-serve/src/routes/audit.ts` — GET /api/audit: cursor-based pagination via ?cursor=&limit= (default limit 50, max 200). Filterable via ?category=&userId=. Returns { entries: AuditEntry[], nextCursor: string|null, totalCount: number }. Accept: application/sarif+json triggers SARIF 2.1.0 export. Backed by @openclaw/audit-chain query and export APIs.
- [ ] `claws-serve/tests/routes/audit.unit.test.ts` — L0: cursor pagination returns correct page (1), category filter works (1), userId filter works (1), SARIF export via Accept header (1)
- [ ] `claws-serve/tests/routes/audit.integration.test.ts` — L1: GET returns entries from audit-chain (1), cursor traversal across multiple pages (1), combined category + userId filter (1)
- [ ] L3 acceptance: S14 (audit query with cursor pagination and SARIF export) (1)

## Acceptance Criteria

- [ ] GET /api/audit returns typed AuditEntry[] with cursor-based pagination (P-281)
- [ ] Default limit 50, max limit 200
- [ ] Category filter correctly scopes to compile/edit/trust/skill/onboard
- [ ] UserId filter scopes to specific user actions
- [ ] Combined filters (category + userId) work correctly
- [ ] SARIF 2.1.0 export via Accept: application/sarif+json header
- [ ] Entries are in reverse chronological order
- [ ] nextCursor is null on last page
- [ ] S14 acceptance: audit query with cursor pagination and SARIF export
- [ ] All 4 L0 unit tests pass
- [ ] All 3 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, SDK-owns-logic rule
- `.craft/roles/claws/platform-eng.md` — audit-chain integration, pagination patterns

## Dependencies

- Pulse 21 (serve-scaffold) — audit chain query and export APIs via serve infrastructure

## Test Gates

- [ ] L0 unit (4 tests): cursor pagination, category filter, userId filter, SARIF export
- [ ] L1 integration (3 tests): GET from audit-chain, cursor traversal multi-page, combined filters
- [ ] L3 acceptance (1 test): S14 audit query with pagination and SARIF
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
