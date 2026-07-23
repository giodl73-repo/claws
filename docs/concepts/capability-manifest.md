# Capability Manifest

A typed declaration of what an AI agent workspace can do -- tools, data access, model capabilities, and external integrations.

## Overview

The capability manifest is a structured inventory of a workspace's runtime capabilities. It is produced during `claws build` by scanning the workspace's compiled artifacts and recording every tool grant, data source, model binding, and external integration. The manifest enables governance rules to make decisions based on what a workspace _can_ do, not just what it _should_ do.

## Manifest Contents

```yaml
# .claws/compiled/capability-manifest.yaml
workspace: lead-scoring
version: "1.0.0"
tools:
  - name: Dataverse MCP
    type: mcp
    classification: confidential
    operations: [read, write]
  - name: Email Send
    type: api
    classification: internal
    operations: [write]
models:
  - provider: anthropic
    model: claude-opus-4-6
    capabilities: [tool_calling, structured_output, vision]
data_sources:
  - entity: Contact
    classification: confidential
  - entity: Lead
    classification: internal
agents:
  - role: Sales Rep
    skills: [enrich-lead, qualify-lead]
  - role: Analyst
    skills: [score-lead]
```

## Governance Use

Governance rules reference the capability manifest to make enforcement decisions:

- "Workspaces with Confidential data sources must use encrypted connections"
- "Workspaces with write access to external APIs require T2+ permission tier"
- "Workspaces with autonomous agents require human oversight gate"

## Related

- [GovernanceIR](governance-ir.md) -- the compiled governance representation
- [Tool Classification](tool-classification.md) -- how tools are classified
- `design/claws/ATOMS.md` -- C03 `atom:capability-manifest`
