---
checkpoint: 4
name: "CLI + Test Framework"
pulse_range: [20, 28]
depends_on_cp: 3
review_panel:
  [
    claws:skill-author,
    claws:new-hire,
    claws:power-user,
    claws:ciso,
    claws:compliance,
    claws:gateway-eng,
    craft:architect,
    craft:navigator,
  ]
---

# CP-4: CLI + Test Framework

## Scope

Plans claws-cli-foundation + claws-test-framework. Commander.js CLI binary with
3 core commands (compile, pinch, build), colored terminal output with error
contract (WHAT + HOW + WHERE), platform auto-detection, hash-based cache.
@bic/claws-test package with ScenarioRunner, GovernanceValidator (12 checks),
SecurityScanner (16 AST rules), and custom vitest matchers.

## Dispatch Plan

### Batch 1

- Pulse 20: claws-cli-foundation -- Commander.js setup + `claws compile`

### Batch 2 (depends on batch 1)

- Pulse 21: claws-cli-foundation -- `claws pinch` colored output + error contract

### Batch 3 (depends on batch 2)

- Pulse 22: claws-cli-foundation -- `claws build` + platform auto-detect + cache

### Batch 4 (depends on batch 3)

- Pulse 26: claws-test-framework -- ScenarioRunner + GovernanceValidator (12 checks)

### Batch 5 (depends on batch 4)

- Pulse 27: claws-test-framework -- SecurityScanner (16 AST rules)

### Batch 6 (depends on batch 5)

- Pulse 28: claws-test-framework -- vitest matchers + standalone packaging

## Dispatch Protocol (MANDATORY)

When dispatching pulse agents, the agent MUST:

1. **Read the pulse plan file directly** -- the pulse file at `pulses/{NN}+{slug}.md` is the AUTHORITATIVE specification. The agent reads it in full before writing any code.
2. **Never work from a summary** -- the dispatch message points the agent to the file path. It does NOT inline the pulse content or summarize it. The agent must read the file itself.
3. **Read governing role definitions** -- each pulse's frontmatter lists `governing_roles`. The agent reads each role file from `.craft/roles/claws/{name}.md` or `.craft/roles/craft/{name}.md` before implementation.
4. **Follow /craft-pulse protocol** -- TDD (tests first), verification gate (vitest + tsc + npm run build), gate checkoff in the pulse file, commit with `feat(claws):` prefix.

Dispatch message template:

```
Execute pulse {NN} using /craft-pulse protocol.
Pulse plan: {absolute path to pulses/{NN}+{slug}.md}
Role definitions: .craft/roles/claws/ and .craft/roles/craft/
Read the pulse plan completely before writing any code.
```

Do NOT summarize, paraphrase, or inline the pulse content in the dispatch message. The pulse file IS the specification.

## Review Panel

| Role                   | Focus                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **claws:skill-author** | Test matcher clarity, ScenarioRunner usability, CLI first-run experience                                           |
| **claws:new-hire**     | CLI discoverability, error message helpfulness, progressive disclosure, first-run experience, getting-started path |
| **claws:power-user**   | --json flag, cache behavior, force flag, bypass mode, advanced workflow integration                                |
| **claws:ciso**         | SecurityScanner rule coverage, trust tier enforcement, governance check completeness                               |
| **claws:compliance**   | GovernanceValidator check accuracy, audit trail fidelity, compliance artifact correctness                          |
| **claws:gateway-eng**  | Governance check correctness, AST rule accuracy, test framework integration                                        |
| **craft:architect**    | Package boundaries (test zero compiler deps), SDK-owns-logic, thin CLI adapter                                     |
| **craft:navigator**    | CLI command flow (compile -> pinch -> build), pipeline threading, progress reporting, timing                       |

## Exit Criteria

- [ ] `claws pinch` runs from terminal with colored pass/fail
- [ ] `claws build openclaw` emits 4 governance artifacts
- [ ] `claws compile` caches GovernanceIR to .claws/compiled/
- [ ] 12 governance checks + 16 security rules pass on clean skill
- [ ] SecurityScanner: zero false positives on clean skills
- [ ] `cd claws-cli && npx vitest run` -- full package green
- [ ] `cd claws-test && npx vitest run` -- full package green
- [ ] `cd claws-sdk && npx tsc --noEmit` -- zero type errors
- [ ] `npm run build` -- monorepo build succeeds
- [ ] No HC-BLOCK findings unresolved from CP-4 scenarios
- [ ] Review panel approval (8 roles)

## Risk Items

- Commander.js integration with existing monorepo bin entry patterns: must align with craft-cli conventions
- SecurityScanner AST parsing: TypeScript compiler API is heavy (~2MB); tree-shaking for standalone package size budget
- Zero false positive calibration: 16 security rules against 322 browser skills + 111 R5 TRANSACT skills requires extensive fixture coverage
- GovernanceValidator 12 checks depend on GovernanceIR types from CP-1 -- any schema changes propagate

## Pulse Summary

| Pulse | Title                        | Plan                 | Test Count       |
| ----- | ---------------------------- | -------------------- | ---------------- |
| 20    | Commander.js + Compile       | claws-cli-foundation | 5 L0, 2 L1, 1 L2 |
| 21    | Pinch + Colored Output       | claws-cli-foundation | 5 L0, 2 L1, 1 L2 |
| 22    | Build + Auto-Detect + Cache  | claws-cli-foundation | 4 L0, 2 L1, 1 L2 |
| 26    | ScenarioRunner + Governance  | claws-test-framework | 12 L0, 3 L1      |
| 27    | SecurityScanner              | claws-test-framework | 16 L0, 2 L1      |
| 28    | Vitest Matchers + Standalone | claws-test-framework | 4 L0, 2 L1, 1 L2 |
