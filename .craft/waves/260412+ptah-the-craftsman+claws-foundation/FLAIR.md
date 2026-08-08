# FLAIR — Ptah the Craftsman (XC)

## Wave Identity

| Field       | Value                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------- |
| **Deity**   | Ptah                                                                                          |
| **Epithet** | the Craftsman                                                                                 |
| **Number**  | XC                                                                                            |
| **Branch**  | feature/ptah-the-craftsman                                                                    |
| **PR**      | #628                                                                                          |
| **Started** | 2026-04-12                                                                                    |
| **Theme**   | claws foundation — packages, GovernanceIR, parse, rules, emit, CLI, skill-kit, test framework |

## What Shipped

### New Packages (4)

- **@bic/claws-sdk** — governance compiler SDK (detect, parse, extract, analyze, emit, conflict detection)
- **@bic/claws-cli** — CLI binary with 4 commands (compile, check, build, init)
- **@bic/claws-skill-kit** — skill decorators, mock gateway, annotation propagation
- **@bic/claws-test** — ScenarioRunner, GovernanceValidator (12 checks), SecurityScanner (16 AST rules), vitest matchers

### CI Infrastructure

- `.github/workflows/claws-test.yml` — 3-OS matrix (Linux/Windows/macOS) with unit/integration/e2e/coverage/accept tiers
- claws packages added to auto-release and manual release workflows
- 7 missing craft-cli accept sections added to PR gate (closed auto-release blind spot)

### Key Capabilities

- **7-platform detection**: OpenClaw, Cursor, Claude Code, GitHub Copilot, Bedrock, LangGraph, CrewAI
- **GovernanceIR**: full intermediate representation with capability manifest, conflict report, audit events
- **10 governance rules**: classification, permissions, A2A trust, data labels, elicitation, input, output, bounded reasoning, supply chain, context
- **6 conflict detectors**: trust escalation, OBO boundary, policy contradiction, approval deadlock, risk ceiling breach, skill-tool ghost
- **4 emit targets**: plugin, skill, exec-approvals, workflow (multi-platform loss-aware routing)
- **Hash-based compilation cache**: composite key (file hashes + SDK version + config + rule registry)

## Stats

| Metric          | Count                                  |
| --------------- | -------------------------------------- |
| Plans           | 10 (+ 1 acceptance harness)            |
| Checkpoints     | 5 (CP-1 through CP-5)                  |
| Pulses          | 31                                     |
| Tests           | 541 (470 unit, 60 integration, 11 e2e) |
| Commits         | ~130                                   |
| Review findings | 12M fixed (CP-4 panel)                 |
| Copilot threads | 79 resolved                            |
| CI jobs         | 47 (43 ClawC Test + 4 accept)          |

## Review Panels

- **CP-3**: 7 roles (claws:ciso, claws:compliance, claws:gateway-eng, craft:architect, craft:navigator, craft:dragon)
- **CP-4**: 8 roles (claws:skill-author, claws:new-hire, claws:power-user, claws:ciso, claws:compliance, claws:gateway-eng, craft:architect, craft:navigator)

## Dependencies Resolved

- CP-1 → CP-2 → CP-3 → CP-4 → CP-5 (strict sequential)
- SDK barrels properly export all public API
- CLI imports only from declared subpaths
- claws-test has zero compiler dependencies (standalone)
