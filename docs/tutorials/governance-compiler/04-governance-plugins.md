# Lesson 4: Governance Plugins

<!-- atoms: governance-plugin -->

Write custom governance rules that extend claws's built-in checks. Plugins run inside the governance engine alongside the 29 built-in rules.

## What You'll Learn

- How governance plugins work in the claws plugin system
- How to write a custom governance rule with pass/fail logic
- How to test and register plugins for your workspace

## Prerequisites

- A workspace with governance from [Lesson 1](01-init-and-first-check.md)

## Step by Step

### 1. Plugin architecture

claws governance plugins are TypeScript modules that receive the GovernanceIR and return findings. They run inside the governance engine (the second of the three engines):

```
  Parse Engine → GovernanceIR → [built-in rules + plugins] → findings → Report Engine
```

Each plugin registers one or more rules. Rules have a name (e.g., `G-CUSTOM-NAMING`), a severity, and an evaluation function.

### 2. Create a plugin directory

```bash
mkdir -p plugins/my-governance/
```

Create the plugin entry point at `plugins/my-governance/index.ts`:

```typescript
import type { GovernanceIR, Finding, Plugin } from '@claws/sdk';

const plugin: Plugin = {
  name: 'my-governance',
  version: '1.0.0',
  rules: [
    {
      id: 'G-CUSTOM-NAMING',
      description: 'Agent names must use kebab-case',
      severity: 'medium',
      evaluate(ir: GovernanceIR): Finding[] {
        const findings: Finding[] = [];

        for (const agent of ir.agents) {
          if (agent.name !== agent.name.toLowerCase().replace(/\s+/g, '-')) {
            findings.push({
              rule: 'G-CUSTOM-NAMING',
              severity: 'medium',
              file: 'AGENTS.md',
              line: agent.location.line,
              message: `Agent "${agent.name}" is not kebab-case`,
              fix: `Rename to "${agent.name.toLowerCase().replace(/\s+/g, '-')}"`
            });
          }
        }

        return findings;
      }
    }
  ]
};

export default plugin;
```

The plugin exports a `Plugin` object with a name, version, and array of rules. Each rule has an `evaluate` function that receives the parsed GovernanceIR and returns an array of findings (empty array = pass).

### 3. Register the plugin

Add your plugin to `claws.json`:

```json
{
  "plugins": [
    {
      "path": "./plugins/my-governance",
      "enabled": true
    }
  ]
}
```

### 4. Test the plugin

Create an agent with a non-kebab-case name in `AGENTS.md`:

```markdown
## Data Processor
- **Role**: data processing
- **Trust**: T1
```

Run the check:

```bash
claws check
```

```
  G-CLASS          Tool risk classification          PASS
  G-ELICIT         OBO elicitation gates             PASS
  G-A2A-TRUST      Inter-agent trust boundaries      PASS
  G-INPUT          Input sanitization                PASS
  G-BUDGET         Token budget enforcement          PASS
  G-CUSTOM-NAMING  Agent names must use kebab-case   FAIL  [MEDIUM]
      AGENTS.md:1 -- Agent "Data Processor" is not kebab-case
      Fix: Rename to "data-processor"

  5/6 rules passed, 1 failure (1 medium)
```

Your custom rule runs alongside the built-in rules and produces findings in the same format.

### 5. Plugin lifecycle hooks

Plugins can also hook into the enforcement lifecycle:

```typescript
const plugin: Plugin = {
  name: 'my-governance',
  version: '1.0.0',
  rules: [/* ... */],

  hooks: {
    onInit(workspace: WorkspaceInfo): void {
      // Called when claws init runs -- add custom scaffolding
      console.log(`Initializing governance for ${workspace.name}`);
    },
    onPreCheck(ir: GovernanceIR): GovernanceIR {
      // Called before rule evaluation -- can enrich the IR
      return ir;
    },
    onPostCheck(findings: Finding[]): Finding[] {
      // Called after rule evaluation -- can filter or annotate findings
      return findings;
    }
  }
};
```

Hooks let plugins participate in the full governance lifecycle, not just rule evaluation. The `onPreCheck` hook can enrich the GovernanceIR with additional data (e.g., fetching team ownership from an external system). The `onPostCheck` hook can filter findings (e.g., suppressing known false positives).

### 6. Plugin ordering

When multiple plugins are registered, they run in configuration order. Each plugin sees the same GovernanceIR. Findings from all plugins are merged and deduplicated before reporting:

```json
{
  "plugins": [
    { "path": "./plugins/naming-conventions", "enabled": true },
    { "path": "./plugins/security-policies", "enabled": true },
    { "path": "./plugins/team-standards", "enabled": false }
  ]
}
```

Disabled plugins are skipped. The `enabled` flag lets you toggle plugins without removing them from configuration.

## What You Learned

- Governance plugins are TypeScript modules that evaluate GovernanceIR and return findings
- Custom rules run alongside the 29 built-in rules in the governance engine
- Each rule produces findings with file, line, message, and fix suggestion
- Lifecycle hooks (onInit, onPreCheck, onPostCheck) extend the full governance pipeline
- Plugins are registered in `claws.json` and can be enabled/disabled individually

## Next

[Lesson 5: Lossless Roundtrip](05-lossless-roundtrip.md) explains how claws guarantees your workspace files are never modified.
