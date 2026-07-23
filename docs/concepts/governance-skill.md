# Governance SKILL.md

L1 advisory governance skill -- a SKILL.md file that provides governance guidance to agents at runtime.

## Overview

A governance SKILL.md is a standard skill file that encodes governance rules as advisory guidance. Instead of compiling rules into hard enforcement gates, governance skills inject policy awareness into the agent's context as a skill it can consult. This is the lightest governance touch point -- L1 advisory, no blocking.

## How It Works

```
  .claws/skills/governance-advisor.md
       │
       ▼
  Agent context assembly
       │
       ▼
  Agent prompt: "When handling PII data, follow these rules: ..."
```

The governance skill is loaded like any other skill. The agent sees it as domain knowledge, not as an enforcement gate. The agent can follow the guidance or deviate -- L1 advisory does not enforce.

## When to Use

| Scenario                       | Level | Mechanism            |
| ------------------------------ | ----- | -------------------- |
| "Prefer encrypted connections" | L1    | Governance SKILL.md  |
| "Warn on PII without approval" | L2    | Guard gate (warning) |
| "Block tool calls without T2"  | L3    | Guard gate (error)   |

Governance skills are appropriate when you want to influence agent behavior without hard-blocking it. They complement, not replace, gate-based enforcement.

## Related

- [Enforcement Gradient](../../agent/concepts/governance/enforcement-gradient.md) -- advisory to blocking spectrum
- [Skill Kit](skill-kit.md) -- building governance skills
- `design/claws/ATOMS.md` -- C21 `atom:governance-skill`
