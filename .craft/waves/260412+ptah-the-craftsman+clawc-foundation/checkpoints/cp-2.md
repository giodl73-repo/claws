---
checkpoint: 2
name: "Detection + Parse + Skill-Kit"
pulse_range: [6, 25]
depends_on_cp: 1
review_panel: [claws:gateway-eng, claws:platform-eng, claws:ciso, claws:skill-author, craft:dragon, craft:navigator]
---

# CP-2: Detection + Parse + Skill-Kit

## Scope

Plans claws-detect + claws-parse + claws-skill-kit. Platform detection identifies 7 target platforms
from marker files with structural validation; multi-platform resolution selects
highest-enforcement primary. Workspace parsing reads 9 OC files through
InputResolver, extracts keyword-anchored intents with confidence scoring,
constructs GovernanceAST + CapabilityManifest, and detects 7 cross-file conflict
categories.

## Dispatch Plan

### Batch 1 (parallel)
- Pulse 06: claws-detect — 7-platform marker detection + structural validation
- Pulse 09: claws-parse — 9-file workspace reading via InputResolver

### Batch 2 (depends on batch 1)
- Pulse 07: claws-detect — multi-platform resolution + ambiguity rejection
- Pulse 10: claws-parse — intent extraction (keyword-anchored, confidence)

### Batch 3 (depends on batch 2)
- Pulse 08: claws-detect — nested paths + forward-compat + loss matrix
- Pulse 11: claws-parse — GovernanceAST + CapabilityManifest extraction

### Batch 4 (depends on batch 3)
- Pulse 12: claws-parse — cross-file conflict detection (7 categories)

### Batch 5 (parallel with batches 1-4, depends only on CP-1 P03)
- Pulse 23: claws-skill-kit — skill() factory + 6 decorators
- Pulse 24: claws-skill-kit — MockGateway + SKILL.md frontmatter schema (depends on P23)
- Pulse 25: claws-skill-kit — standalone packaging (depends on P24)

## Dispatch Protocol (MANDATORY)

When dispatching pulse agents, the agent MUST:

1. **Read the pulse plan file directly** — the pulse file at `pulses/{NN}+{slug}.md` is the AUTHORITATIVE specification. The agent reads it in full before writing any code.
2. **Never work from a summary** — the dispatch message points the agent to the file path. It does NOT inline the pulse content or summarize it. The agent must read the file itself.
3. **Read governing role definitions** — each pulse's frontmatter lists `governing_roles`. The agent reads each role file from `.craft/roles/claws/{name}.md` or `.craft/roles/craft/{name}.md` before implementation.
4. **Follow /craft-pulse protocol** — TDD (tests first), verification gate (vitest + tsc + npm run build), gate checkoff in the pulse file, commit with `feat(claws):` prefix.

Dispatch message template:
```
Execute pulse {NN} using /craft-pulse protocol.
Pulse plan: {absolute path to pulses/{NN}+{slug}.md}
Role definitions: .craft/roles/claws/ and .craft/roles/craft/
Read the pulse plan completely before writing any code.
```

Do NOT summarize, paraphrase, or inline the pulse content in the dispatch message. The pulse file IS the specification.

## Review Panel

| Role | Focus |
|------|-------|
| **claws:gateway-eng** | Parse pipeline correctness, InputResolver integration, GovernanceAST fidelity, cross-file conflict coverage |
| **claws:platform-eng** | 7-platform marker detection accuracy, structural validation, false positive rejection, enforcement model correctness |
| **claws:ciso** | Trust tier defaults, cross-file conflict severity, DENY-vs-TOOL semantics, OBO-WITHOUT-ELICIT coverage |
| **craft:dragon** | SDK architecture, compiler-sdk import boundaries, type safety, two-pass parse design |
| **claws:skill-author** | Decorator ergonomics, skill() factory API, MockGateway usability, SKILL.md frontmatter schema |
| **craft:navigator** | Detection → parse pipeline threading, platform context propagation, zero-config mode |

## Exit Criteria

- [ ] 7 platforms detected from marker files with structural validation
- [ ] Multi-platform ambiguity rejected with actionable error
- [ ] 9 OC workspace files parsed via InputResolver
- [ ] GovernanceAST produced from workspace parsing
- [ ] All 7 cross-file conflict categories detected
- [ ] Intent extraction with confidence scoring works on SOUL.md
- [ ] `cd claws-sdk && npx vitest run` — full package green
- [ ] `cd claws-sdk && npx tsc --noEmit` — zero type errors
- [ ] `npm run build` — monorepo build succeeds
- [ ] @bic/claws-skill-kit installs with zero claws-cli dependency
- [ ] No HC-BLOCK findings unresolved from CP-2 scenarios
- [ ] Review panel approval (6 roles)

## Risk Items

- SOUL.md structural validation heuristics: governance keywords vs mission statement boundary may need tuning
- Cross-file conflict semantic matching: NL deny patterns vs tool names requires fuzzy matching threshold
- Two-pass parse ordering: must be proven stable under file addition (monotonic invariant)
- BOM handling across 9 file types: uniform stripping before any parsing (P-100)
- skill() factory TypeScript decorator stage: Stage 3 decorators require experimentalDecorators or TypeScript 5.0+ transform
- MockGateway event fidelity: must match OC Gateway api.on() event model exactly or tests are misleading

## Pulse Summary

| Pulse | Title | Plan | Test Count |
|-------|-------|------|------------|
| 06 | Platform Marker Detection | claws-detect | 10 L0, 3 L1 |
| 07 | Multi-Platform Resolution | claws-detect | 5 L0, 2 L1 |
| 08 | Nested Paths + Loss Matrix | claws-detect | 5 L0, 2 L1 |
| 09 | Workspace File Reading | claws-parse | 8 L0, 3 L1 |
| 10 | Intent Extraction | claws-parse | 8 L0, 2 L1 |
| 11 | GovernanceAST + Manifest | claws-parse | 6 L0, 2 L1 |
| 12 | Cross-File Conflicts | claws-parse | 8 L0, 3 L1, 1 L2 |
| 23 | Skill Factory + Decorators | claws-skill-kit | 8 L0 |
| 24 | MockGateway + Frontmatter | claws-skill-kit | 6 L0, 2 L1 |
| 25 | Standalone Packaging | claws-skill-kit | 3 L0, 2 L1, 1 L2 |
