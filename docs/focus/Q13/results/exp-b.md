# exp-b: OperationIR -> TypeScript Emitter

**Question**: Q12m — How does claws-sdk compose on top of compiler-sdk + agent-sdk?
**Experiment**: Design the new emitter that takes OperationIR and produces executable TypeScript
**Method**: Design analysis (complete example: SkillIR -> OperationIR -> TypeScript -> OC skill)
**Date**: 2026-04-11

---

## Concept Mapping

OperationIR has 16 AST node types. Each maps to a TypeScript code pattern:

| OperationNode type | TypeScript pattern | Notes |
|--------------------|-------------------|-------|
| `sequence` | Sequential `await` chain | Steps run in order |
| `parallel` | `Promise.all([...])` | Branches run concurrently |
| `conditional` | `if (...) { ... } else { ... }` | Condition evaluated at runtime |
| `loop` | `for (const x of ...) { ... }` | With maxIterations guard |
| `confirmation` | `await elicit(message)` | **G-ELICIT gate** |
| `llm-call` | `await openclaw.ai.generate(...)` | Uses OC's AI API |
| `bash` | `await openclaw.tools.exec(...)` | Sandboxed execution |
| `mcp-call` | `await openclaw.tools.mcp(...)` | MCP tool call |
| `read-file` | `await openclaw.tools.readFile(...)` | Workspace file access |
| `write-file` | `await openclaw.tools.writeFile(...)` | Workspace file write |
| `edit-file` | `await openclaw.tools.editFile(...)` | Workspace file edit |
| `glob` | `await openclaw.tools.glob(...)` | File pattern matching |
| `grep` | `await openclaw.tools.grep(...)` | Content search |
| `assign` | `const name = value;` | Variable binding |
| `return` | `return value;` | Function return |
| `error` | `throw new SkillError(...)` | Error with code |

### Key Design Decisions

1. **ConfirmationStep -> G-ELICIT**: The existing T4 confirmation gate maps directly.
   claws extends the trigger: inject for ANY R5 tool (on-behalf-of), not just T4 skills.
   In generated code, this becomes `await openclaw.elicit(message)` which prompts the
   user before allowing the R5 action to proceed.

2. **Mechanical vs Reasoning -> sync vs async**: The `classifySkill()` function already
   distinguishes these. Mechanical operations (Read, Write, Edit, Glob, Grep, Bash)
   become sequential handlers. Reasoning operations (LLM calls, MCP calls) become
   async handlers with timeout guards.

3. **Dependency graphs -> import/await chains**: The `topologicalSort()` from bundler.ts
   determines the order skills are emitted. Import edges become `import` statements.
   Execution edges become `await` sequences.

4. **Effects -> audit chain appends**: The PassEffect system (effects.ts) tracks reads/writes
   per pass. In generated code, every side-effect appends to the OC audit log via
   `openclaw.audit.append()`.

---

## The Emitter Architecture

The TypeScript emitter is a new pass added to the Operation IR pipeline:

```
OP1-lower → OP2-dependency → OP3-bundle → ... → OP8-js-emit → OP9-ts-emit (NEW)
```

### Source location in claws-sdk

```
claws-sdk/
  src/
    emit/
      ts-emitter.ts          # Main emitter: OperationIR -> TypeScript AST -> string
      ts-codegen.ts           # Code generation helpers (indent, template, imports)
      ts-elicit-gate.ts       # ConfirmationStep -> elicitation gate generation
      ts-audit-chain.ts       # Effect -> audit append generation
      ts-oc-adapter.ts        # OC API adapter (maps Craftworks tool types to OC APIs)
```

### Emitter function signature

```typescript
// claws-sdk/src/emit/ts-emitter.ts

import type { OperationIR } from '@craftworks/compiler-sdk/astro/types/operation-ir';
import type { BundledOutput } from '@craftworks/compiler-sdk/astro/ir/operation/bundler';

export interface TsEmitResult {
  /** Generated TypeScript files: relative path -> content */
  files: Map<string, string>;
  /** Diagnostics from emission */
  diagnostics: TsEmitDiagnostic[];
  /** Whether any operation was lossy (could not fully represent in TS) */
  lossy: boolean;
}

export interface TsEmitDiagnostic {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  skill?: string;
}

/**
 * Emit a bundled set of OperationIRs as executable TypeScript files.
 *
 * Each OperationIR becomes one .ts file in skills/.
 * The bundle's topological order determines import ordering.
 * ConfirmationStep nodes emit elicitation gates.
 * Side-effecting nodes emit audit chain appends.
 */
export function emitTypeScript(bundle: BundledOutput): TsEmitResult {
  // ...
}
```

---

## Complete Example: Email-Drafting Skill with send-email (R5/OBO)

### Step 1: Input — SkillIR

The input is an OC skill definition for email drafting with a send-email tool
classified as R5 (on-behalf-of — sends email AS the user):

```yaml
# skills/draft-email/SKILL.md frontmatter
name: draft-email
description: Draft and send emails on behalf of the user
tier: T3
tools:
  - tool: AskUserQuestion
  - tool: Edit
  - tool: send-email    # R5: sends email as the user (OBO)
dependencies: []
refs: []
sections:
  - heading: Purpose
    content: "Draft professional emails based on user instructions"
  - heading: Algorithm
    content: |
      1. Gather email parameters (recipient, subject, body outline)
      2. Draft the email content
      3. Review with user before sending
      4. Send the email via send-email tool
  - heading: Parameters
    content: |
      - recipient: string (email address)
      - subject: string
      - body_outline: string (optional)
```

### Step 2: OperationIR after lowering

The lowering pass (`lowerSkillToOperationIR`) produces:

```typescript
// OperationIR for draft-email
{
  version: 1,
  skill: 'draft-email',
  tier: 'T3',
  root: {
    type: 'confirmation',                    // Injected for R5 tool!
    handle: 'op-1',
    message: 'This skill will send email on your behalf: draft-email',
    action: 'draft-email',
    onApprove: {
      type: 'sequence',
      handle: 'op-2',
      steps: [
        // From Algorithm section — one node per tool grant
        {
          type: 'llm-call',                  // AskUserQuestion -> reasoning
          handle: 'op-3',
          prompt: 'Gather email parameters (recipient, subject, body outline)',
        },
        {
          type: 'edit-file',                 // Edit tool -> mechanical
          handle: 'op-4',
          path: '*',
          edits: [],
        },
        {
          type: 'mcp-call',                  // send-email -> MCP call (R5)
          handle: 'op-5',
          server: 'send-email',
          tool: 'send-email',
        },
      ],
    },
    onReject: undefined,
  },
  entityRefs: undefined,
  sourceSection: { uri: 'skills/draft-email/SKILL.md' },
}
```

**Key**: The ConfirmationStep is injected because `send-email` is classified as R5 (OBO).
In the original Craftworks lowering, only T4 skills get confirmation. claws extends the
trigger condition to include any skill using R5 tools.

### Step 3: Generated TypeScript

The OP9-ts-emit pass takes the OperationIR above and generates:

```typescript
// Generated by claws compile — do not edit
// Skill: draft-email | Tier: T3 | Risk: R5 (send-email is OBO)

import type { SkillContext, SkillResult } from '@openclaw/sdk';

/** Parameters for the draft-email skill. */
export interface DraftEmailParams {
  recipient: string;
  subject: string;
  bodyOutline?: string;
}

/**
 * Draft and send emails on behalf of the user.
 *
 * This skill requires explicit user approval before sending because
 * send-email is an R5 (on-behalf-of) tool — it acts AS the user.
 */
export async function draftEmail(
  ctx: SkillContext,
  params: DraftEmailParams,
): Promise<SkillResult> {
  // ── G-ELICIT: Require user approval for R5 tool usage ──
  const approved = await ctx.elicit({
    message: 'This skill will send email on your behalf: draft-email',
    action: 'draft-email',
    risk: 'R5',
    tools: ['send-email'],
  });

  if (!approved) {
    await ctx.audit.append({
      action: 'draft-email',
      outcome: 'rejected',
      reason: 'User declined R5 elicitation gate',
    });
    return { status: 'cancelled', reason: 'User declined approval' };
  }

  await ctx.audit.append({
    action: 'draft-email',
    outcome: 'approved',
    reason: 'User approved R5 elicitation gate',
  });

  // ── Step 1: Gather email parameters ──
  const emailDetails = await ctx.ai.generate({
    prompt: `Gather email parameters from the user.
Recipient: ${params.recipient}
Subject: ${params.subject}
Body outline: ${params.bodyOutline ?? 'none provided'}

Draft a professional email body.`,
  });

  await ctx.audit.append({
    action: 'draft-email.gather',
    outcome: 'success',
    detail: { recipient: params.recipient, subject: params.subject },
  });

  // ── Step 2: Draft and edit the email ──
  const draft = await ctx.workspace.editFile({
    path: `.claws/drafts/${params.subject.replace(/[^a-z0-9]/gi, '-')}.md`,
    content: emailDetails.text,
  });

  await ctx.audit.append({
    action: 'draft-email.edit',
    outcome: 'success',
    detail: { draftPath: draft.path },
  });

  // ── Step 3: Send via send-email tool (R5/OBO) ──
  const sendResult = await ctx.tools.call('send-email', {
    to: params.recipient,
    subject: params.subject,
    body: emailDetails.text,
  });

  await ctx.audit.append({
    action: 'draft-email.send',
    outcome: sendResult.ok ? 'success' : 'failed',
    detail: { messageId: sendResult.data?.messageId },
  });

  return {
    status: sendResult.ok ? 'completed' : 'failed',
    data: {
      recipient: params.recipient,
      subject: params.subject,
      messageId: sendResult.data?.messageId,
      draftPath: draft.path,
    },
  };
}

/** Skill metadata for OC registration. */
export const metadata = {
  name: 'draft-email',
  description: 'Draft and send emails on behalf of the user',
  tier: 'T3',
  riskLevel: 'R5',
  tools: ['send-email'],
  requiresElicitation: true,
  parameters: {
    recipient: { type: 'string', required: true },
    subject: { type: 'string', required: true },
    bodyOutline: { type: 'string', required: false },
  },
} as const;
```

### Step 4: OC Skill Installation

The generated TypeScript installs as a standard OC skill:

```typescript
// skills/draft-email/index.ts — also generated by claws
import { registerSkill } from '@openclaw/sdk';
import { draftEmail, metadata } from './draft-email.js';

registerSkill({
  ...metadata,
  handler: draftEmail,
});
```

The `registerSkill()` call is OC's standard skill registration API. The generated code
looks like something an OC developer would write manually — no Craftworks abstractions
are visible.

---

## Code Generation Patterns

### Pattern 1: ConfirmationStep -> Elicitation Gate

```typescript
// Template for any ConfirmationStep node
function emitConfirmation(node: ConfirmationStep): string {
  return `
  const approved = await ctx.elicit({
    message: ${JSON.stringify(node.message)},
    action: ${JSON.stringify(node.action)},
    risk: 'R5',
    tools: [/* extracted from downstream mcp-call nodes */],
  });

  if (!approved) {
    await ctx.audit.append({
      action: ${JSON.stringify(node.action)},
      outcome: 'rejected',
      reason: 'User declined elicitation gate',
    });
    return { status: 'cancelled', reason: 'User declined approval' };
  }
  `;
}
```

### Pattern 2: Sequence -> async/await Chain

```typescript
// Template for sequence nodes
function emitSequence(node: SequenceNode): string {
  return node.steps.map((step, i) => emitNode(step)).join('\n\n');
}
```

### Pattern 3: Parallel -> Promise.all

```typescript
// Template for parallel nodes
function emitParallel(node: ParallelNode): string {
  const branches = node.branches.map((b, i) =>
    `async () => {\n${emitNode(b)}\n}`
  );
  const concurrency = node.maxConcurrency
    ? `// maxConcurrency: ${node.maxConcurrency}`
    : '';
  return `${concurrency}
  const results = await Promise.all([
    ${branches.join(',\n    ')}
  ].map(fn => fn()));`;
}
```

### Pattern 4: Loop -> for-of with Guard

```typescript
// Template for loop nodes
function emitLoop(node: LoopNode): string {
  const guard = node.maxIterations
    ? `let _iter = 0;\n`
    : '';
  const guardCheck = node.maxIterations
    ? `\n    if (++_iter > ${node.maxIterations}) break;`
    : '';
  return `${guard}
  for (const ${node.variable} of ${node.over}) {${guardCheck}
    ${node.body.map(b => emitNode(b)).join('\n    ')}
  }`;
}
```

### Pattern 5: MCP Call -> ctx.tools.call

```typescript
// Template for mcp-call nodes
function emitMcpCall(node: McpCallNode): string {
  return `
  const ${camelCase(node.tool)}Result = await ctx.tools.call(
    ${JSON.stringify(node.tool)},
    ${node.args ? JSON.stringify(node.args) : '{}'},
  );

  await ctx.audit.append({
    action: '${node.tool}',
    outcome: ${camelCase(node.tool)}Result.ok ? 'success' : 'failed',
  });`;
}
```

### Pattern 6: Effect -> Audit Chain Append

Every side-effecting node (write-file, edit-file, bash, mcp-call) automatically
gets an audit append after execution. This is derived from the PassEffect declarations
in effects.ts:

```typescript
// Applied to any node whose PassEffect.writes is non-empty
function emitAuditAppend(node: OperationNode, result: string): string {
  return `
  await ctx.audit.append({
    action: '${node.type}',
    outcome: ${result}.ok ? 'success' : 'failed',
    handle: '${node.handle}',
  });`;
}
```

---

## The OC-Native Test

The generated code must pass the "OC developer test": if you showed it to an OC developer
who has never heard of Craftworks, would they recognize it as normal OC code?

Checklist:
- [x] Uses `@openclaw/sdk` imports, not `@craftworks/*`
- [x] Uses `ctx.elicit()` for user approval (OC's native elicitation API)
- [x] Uses `ctx.tools.call()` for tool invocation (OC's tool API)
- [x] Uses `ctx.ai.generate()` for LLM calls (OC's AI API)
- [x] Uses `ctx.audit.append()` for audit trail (OC's audit API)
- [x] Uses `ctx.workspace.editFile()` for file operations (OC's workspace API)
- [x] Exports `metadata` object with standard OC skill metadata
- [x] Registers via `registerSkill()` (OC's standard registration)
- [x] No Craftworks-specific types, imports, or abstractions visible
- [x] TypeScript looks hand-written, not machine-generated

---

## claws Extension: R5 Trigger Condition

The existing lowering pass injects ConfirmationStep when `T4_TIERS.has(rawTier)`:

```typescript
// compiler-sdk/src/astro/ir/operation/lowering.ts line 270
if (T4_TIERS.has(rawTier)) {
  // inject confirmation...
}
```

claws-sdk extends this with a new condition:

```typescript
// claws-sdk/src/emit/ts-elicit-gate.ts
import { T4_TIERS } from '@craftworks/compiler-sdk/astro/ir/operation/lowering';

/** R5 tools that require elicitation gates. */
const R5_TRIGGER = new Set(['R5', 'obo', 'on-behalf-of']);

/**
 * Determine if a skill needs an elicitation gate.
 * Extends the base T4 check with R5 tool detection.
 */
export function needsElicitationGate(
  skill: { tier: string; tools: Array<{ tool: string; risk?: string }> },
): boolean {
  // Original T4 check
  if (T4_TIERS.has(skill.tier)) return true;

  // claws extension: any R5 tool triggers elicitation
  return skill.tools.some(t => t.risk && R5_TRIGGER.has(t.risk));
}
```

This is pure EXTENSION: claws-sdk imports the existing lowering types and adds a new
trigger condition. The base ConfirmationStep node type and IR structure are unchanged.

---

## Summary

The OperationIR -> TypeScript emitter is a natural extension of the existing Operation IR
pipeline. The 16 node types each have a clean mapping to TypeScript code patterns. The
ConfirmationStep (already used for T4 skills) maps directly to OC's elicitation API.
The effect system drives automatic audit chain appends. The generated code is OC-native --
no Craftworks abstractions leak through.

The emitter lives in claws-sdk (not compiler-sdk) because it's an OC-specific emission
target. compiler-sdk provides the IR, lowering, bundling, and type definitions. claws-sdk
adds the final OP9-ts-emit pass that produces OC-native TypeScript.
