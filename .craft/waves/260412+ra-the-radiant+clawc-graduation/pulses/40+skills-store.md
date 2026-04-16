---
pulse: 40
slug: skills-store
plan: claws-cap-integration
depends_on: [31, 32]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S25]
stage: implementation
test_tiers:
  L0_unit: 6
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

# Pulse 40: Skills Store

## Objective

Implement GET /api/skills and POST /api/skills/install endpoints for skill discovery and installation through the Companion App (business logic in claws-sdk/src/workspace/, route is thin HTTP adapter). GET /api/skills scans the workspace skills/ directory and returns a typed SkillManifest[] with name, version, description, capabilities, and installation status. POST /api/skills/install accepts a skill identifier, copies the skill into the workspace, and triggers a full recompile so the new skill is immediately available in the compiled output.

R5 tools that are auto-locked by governance policy are surfaced in the skills list with a locked indicator and cannot be installed or uninstalled via the API. The lock source is always attributed (r5, fleet, or governance) so the Companion App can render appropriate UI.

## Deliverables

- [ ] `claws-serve/src/routes/skills.ts` — GET /api/skills: scan skills/ directory, return SkillManifest[] with name, version, description, capabilities, installed boolean, lockSource (r5|fleet|governance|none). POST /api/skills/install: accepts { skillId, source? }, validates skill exists, copies to workspace skills/, triggers recompile. Returns 403 for R5-locked skills, 404 for unknown skills, 409 if already installed.
- [ ] `claws-serve/tests/routes/skills.unit.test.ts` — L0: GET returns skill manifests from directory (1), R5 tools marked as locked (1), POST installs skill and triggers recompile (1), POST rejects R5-locked skill with 403 (1), POST rejects unknown skill with 404 (1), POST rejects already-installed with 409 (1)
- [ ] `claws-serve/tests/routes/skills.integration.test.ts` — L1: GET scans real skills directory (1), POST install + recompile cycle (1), lock source attribution correct across R5/fleet/governance (1)
- [ ] L3 acceptance: S25 (skill discovery and install with R5 lock enforcement) (1)

## Acceptance Criteria

- [ ] GET /api/skills returns typed SkillManifest[] from workspace skills/ directory
- [ ] Each skill includes lock source attribution (r5, fleet, governance, none)
- [ ] R5-locked skills cannot be installed or uninstalled via API (403 Forbidden)
- [ ] POST /api/skills/install copies skill to workspace and triggers recompile
- [ ] Unknown skill returns 404, already-installed returns 409
- [ ] Recompile completes and new skill appears in subsequent GET
- [ ] S25 acceptance: skill discovery and install with R5 lock enforcement
- [ ] All 6 L0 unit tests pass
- [ ] All 3 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, SDK-owns-logic rule
- `.craft/roles/claws/platform-eng.md` — skill directory conventions, recompile triggering

## Dependencies

- Pulse 31 (PATCH /api/chunks/*) — route pattern and validation middleware
- Pulse 32 (incremental-cache) — recompile after skill install

## Test Gates

- [ ] L0 unit (6 tests): GET returns manifests, R5 locked, POST installs + recompile, POST rejects R5 403, POST rejects unknown 404, POST rejects duplicate 409
- [ ] L1 integration (3 tests): GET scans real directory, POST install + recompile, lock source attribution
- [ ] L3 acceptance (1 test): S25 skill discovery and install with R5 enforcement
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
