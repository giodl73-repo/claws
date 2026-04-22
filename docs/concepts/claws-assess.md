# claws assess

Regulatory risk classification for AI agent workspaces.

## Overview

`claws assess` evaluates a workspace against regulatory risk frameworks and produces a risk classification. It reads the workspace's capability manifest, tool grants, data classification ceilings, and agent scope to determine which regulatory frameworks apply and at what risk level.

## Assessment Process

```
  Workspace state
       │
       ▼
  [Capability scan]     → what tools, data, agents are present
       │
       ▼
  [Framework matching]  → which regulations apply
       │
       ▼
  [Risk classification] → low / medium / high / critical
       │
       ▼
  Assessment report
```

## Risk Levels

| Level | Meaning | Action Required |
|-------|---------|----------------|
| Low | No regulated data, no external tools | Advisory only |
| Medium | Internal data, limited tool access | Standard governance |
| High | PII, external APIs, multi-agent coordination | Enhanced governance + audit |
| Critical | PHI, financial data, autonomous decisions | Full compliance suite required |

## Framework Coverage

The assessment checks applicability for:
- **SOC2 Type II** -- triggered by external data access or multi-tenant deployment
- **HIPAA** -- triggered by PHI entity types or healthcare domain markers
- **EU AI Act** -- triggered by autonomous decision-making capabilities

## Related

- [fleet comply](fleet-comply.md) -- fleet-wide compliance checking
- [Compliance: EU AI Act](compliance-eu-ai-act.md) -- EU AI Act specifics
- `design/claws/ATOMS.md` -- C73 `atom:claws-assess`
