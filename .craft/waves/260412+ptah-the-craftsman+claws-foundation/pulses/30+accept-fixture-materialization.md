---
pulse: 30
title: "Acceptance Fixture Materialization"
plan: claws-acceptance-harness
checkpoint: 5
governing_roles: [claws:gateway-eng, claws:platform-eng, craft:testing]
depends_on: [29]
---

# Pulse 30: Acceptance Fixture Materialization

## Objective

Materialize `00+workspace/` directories for all Ptah-scoped scenario series
(Phase 1 in manifest.yaml). Each workspace is a minimal OC directory that the
claws compiler can parse. Populate from the `problem:` description in each
scenario.yaml + reuse patterns from existing `claws-sdk/tests/fixtures/`.

## Scope

**Phase 1 (Ptah) series only** — 10 series, 74 scenarios (verified on-disk count):

| Series               | Scenarios | Runner                           | Spec        |
| -------------------- | --------- | -------------------------------- | ----------- |
| compile-pipeline     | 8         | compile-sim                      | CL-04       |
| governance-rules     | 12        | pinch-sim                        | CL-02       |
| fail-mode            | 6         | pinch-sim, security-sim          | CL-02       |
| emit-artifacts       | 8         | emit-sim                         | CL-04       |
| cross-file-conflicts | 7         | compile-sim                      | CL-04       |
| platform-detection   | 7         | compile-sim                      | CL-01       |
| lossless-roundtrip   | 5         | compile-sim                      | CL-04       |
| loss-aware-emission  | 5         | compile-sim                      | CL-04       |
| input-resolver       | 6         | compile-sim                      | CL-01/04/07 |
| pitfall-coverage-1   | 10        | compile-sim, pinch-sim, emit-sim | CL-02/04    |

**Multi-runner dispatch**: When a series lists multiple runners (e.g., fail-mode: pinch-sim + security-sim), each runner gets its own `describe()` block. Expect keys are dispatched by runner: pinch-sim reads `rules_applied`/`violations`/`pass`/`severity`; security-sim reads `attack_class`/`defense_layer`/`blocked`/`audit_event`. Keys not relevant to a runner are ignored.

Anubis/Thoth series (fleet-operations, obo-elicitation, a2a-governance, etc.)
are out of scope — their runners are stubs.

## Deliverables

### D1: Compile-Pipeline Fixtures (8 workspaces)

- `S01-minimal-workspace/00+workspace/` — SOUL.md (1 deny), TOOLS.md (1 R1 tool), claws.json
- `S02-full-workspace/00+workspace/` — All 9 OC files + skills/ directory
- `S03-missing-optional-files/00+workspace/` — Only SOUL.md + TOOLS.md (7 absent files)
- `S04-malformed-soul/00+workspace/` — SOUL.md with syntax errors
- `S05-empty-workspace/00+workspace/` — Empty directory (edge case)
- `S06-multi-tool-risk/00+workspace/` — TOOLS.md with R1-R5 tools
- `S07-subagent-delegation/00+workspace/` — AGENTS.md with delegation chains
- `S08-workflow-intent/00+workspace/` — lobster.yaml with governance-sensitive steps

### D2: Governance-Rules Fixtures (12 workspaces)

- One workspace per governance rule family (G-CLASS, G-PERM, G-DATA, G-A2A, G-INPUT, G-CONTEXT, G-OUTPUT, G-BOUND, G-ELICIT, G-SUPPLY, plus 2 multi-rule)
- Each workspace triggers exactly the rule under test
- TOOLS.md calibrated to produce expected risk levels
- SOUL.md contains deny/allow patterns that exercise the rule

### D3: Platform-Detection Fixtures (7 workspaces)

- One workspace per platform (OpenClaw, Cursor, Claude Code, GitHub Copilot, Bedrock, LangGraph, CrewAI)
- Each contains the platform's marker file(s) at the correct path
- Reuse patterns from `claws-sdk/tests/fixtures/platform-*/`

### D4: Cross-File-Conflicts Fixtures (7 workspaces)

- One workspace per conflict category (deny-vs-tool, trust-escalation, obo-without-elicit, data-label-mismatch, circular-delegation, skill-tool-ghost, schedule-no-approval)
- Reuse patterns from `claws-sdk/tests/fixtures/conflict-workspace/`
- Each workspace is isolated to a single conflict category

### D5: Remaining Series Fixtures

- fail-mode (6): R5 closed, R1-R2 configurable, crash scenarios
- emit-artifacts (8): gateway plugin, SKILL.md, exec-approvals, workflow, multi-platform
- lossless-roundtrip (5): parse → emit → parse round-trip fidelity
- loss-aware-emission (5): 7-platform loss matrix, strict-loss blocking
- input-resolver (6): 9-file default, BOM handling, provenance, S06 provenance audit trail
- pitfall-coverage-1 (10): P-051 through P-070 edge cases

### D6: Expect Block Population + Re-Baseline Strategy

- For each materialized workspace, populate the `expect:` block in scenario.yaml
- **Spec-first**: expects derive from spec requirements, NOT from recording compiler output (avoids circular "compiler is correct because it matches itself")
- Where spec is ambiguous, run compiler and **review** output before committing as expected
- Verify expect blocks are deterministic (run twice, compare)
- **Re-baseline mechanism**: add a `scripts/rebaseline-accepts.ts` script that re-runs all scenarios and shows diffs. Developer reviews diffs before accepting. Never auto-overwrite expects.

## Workspace Template

Each `00+workspace/` follows this minimal structure:

```
00+workspace/
├── SOUL.md           # Governance intent declarations
├── TOOLS.md          # Tool manifest with risk levels
├── claws.json        # Configuration (trust tier, platform)
├── AGENTS.md         # (optional) Delegation graph
├── IDENTITY.md       # (optional) Auth config
├── USER.md           # (optional) OBO scope
├── MEMORY.md         # (optional) Data labels
├── HEARTBEAT.md      # (optional) Schedule config
├── lobster.yaml      # (optional) Workflow DAG
└── skills/           # (optional) SKILL.md files
    └── {name}/
        └── SKILL.md
```

## Verification Gate

```bash
# All fixtures exist and are parseable
cd claws-sdk && vitest run --project accept
# Expect: 74 Ptah scenarios discovered, ~60+ passing (some may need expect tuning)
```

## Notes

- Reuse content from existing fixtures where applicable (don't reinvent)
- Each workspace must be self-contained (no symlinks, no relative refs)
- `problem:` text in scenario.yaml describes what the workspace should contain
- Run compiler once per workspace to generate authoritative expect values
