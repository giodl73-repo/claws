# GovernanceIR: The Governance Intermediate Representation

GovernanceIR is the pivot type of the claws compiler. The analysis phase
produces it; the emission phase consumes it. All governance state passes
through this single interface.

## What is GovernanceIR?

GovernanceIR is a structured TypeScript type that captures everything the
compiler knows about an agent workspace's governance posture:

- **CapabilityManifest** -- every tool, skill, agent, and workflow declared
  in the workspace, with risk levels, OBO flags, classifications, and
  delegation maps.
- **GovAnalysis** -- violations, warnings, enforcement plan, reclassification
  table, and effective R5 counts produced by the analysis pass.
- **Mechanical Intents** -- the 5 concrete enforcement actions (deny, elicit,
  require, limit, label) that the emission phase translates to runtime hooks.
- **Delegation Map** -- which rules delegate to which enforcement mechanisms
  (hook, skill, approval, audit-only).
- **Compiler Metadata** -- version, timestamp, and schema version for
  forward/backward compatibility.

## What is FailMode\<R\>?

`FailMode<R>` is a parameterized type that enforces a critical invariant:
R5 (critical) rules **must** fail-closed. The type system makes it
structurally impossible to assign `'open'` to `FailMode<5>`:

```typescript
type FailMode<R extends RuleLevel> = R extends 5
  ? 'closed'
  : 'open' | 'closed';
```

- `FailMode<5>` resolves to `'closed'` only.
- `FailMode<1|2|3|4>` resolves to `'open' | 'closed'`.

If deserialized JSON contains an R5 rule with `failMode: 'open'`, the
runtime validator throws `OC-POLICY-E001`.

## Inspecting the IR

After compilation, the IR is serialized to
`.claws/compiled/governance-ir.json`. You can inspect it directly:

```bash
# View the full IR
cat .claws/compiled/governance-ir.json | jq .

# Check violations
cat .claws/compiled/governance-ir.json | jq '.analysis.violations'

# List all tools and their risk levels
cat .claws/compiled/governance-ir.json | jq '.capabilities.tools[] | {name, riskLevel, oboFlag}'

# Check for conflicts (via ConflictReport, produced separately)
cat .claws/compiled/conflict-report.json | jq '.oboConflicts'
```

The IR is deterministic: the same input policy and workspace always
produces the same IR (byte-for-byte, verified by SHA-256 hash).

## Key Types

| Type | Location | Purpose |
|------|----------|---------|
| `GovernanceIR` | `claws-sdk/src/ir/governance-ir.ts` | Top-level pivot type |
| `CapabilityManifest` | `claws-sdk/src/ir/capability-manifest.ts` | Declared capabilities |
| `GovAnalysis` | `claws-sdk/src/ir/gov-analysis.ts` | Analysis results |
| `ConflictReport` | `claws-sdk/src/ir/conflict-report.ts` | OBO + multi-constraint conflicts |
| `FailMode<R>` | `claws-sdk/src/ir/fail-mode.ts` | Parameterized fail mode |
| `MechanicalIntent` | `claws-sdk/src/ir/mechanical-intent.ts` | 5 enforcement actions |

All types are re-exported from `claws-sdk/src/ir/index.ts` for
convenient access:

```typescript
import type { GovernanceIR, ConflictReport } from '@bic/claws-sdk/ir';
```
