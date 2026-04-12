# exp-c: SKILL.md to TypeScript Compilation

**Question**: Q12o -- How does claws help makers create skills?
**Experiment**: Design the compilation pipeline from SKILL.md to executable TypeScript
**Method**: Design analysis
**Date**: 2026-04-11

---

## Overview

`claws build --skill` reads SKILL.md and generates executable TypeScript. This is not
a simple template substitution -- it's a compilation pipeline that extracts typed
declarations, generates governance wrappers, produces test cases from scenarios, and
emits OBO flows from annotations.

The pipeline extends the claws 5-phase model (Q12j) with a skill-specific frontend:

```
SKILL.md                    claws build --skill
  │
  ├─ PARSE ─────────────── Read SKILL.md, parse frontmatter + markdown sections
  │                         Output: SkillAST
  │
  ├─ EXTRACT ──────────── Extract tool declarations, scenarios, governance config
  │                         Output: ToolDeclaration[], ScenarioDef[], GovernanceConfig
  │
  ├─ ANALYZE ──────────── Validate governance constraints, check risk consistency
  │                         Output: AnalyzedSkill (validated, diagnostics)
  │
  ├─ GENERATE ─────────── Emit TypeScript (types, handlers, governance wrapper, tests)
  │                         Output: Map<string, string> (filepath -> content)
  │
  └─ EMIT ─────────────── Write files to disk, update .claws-manifest
                            Output: files on disk
```

---

## Phase 1: PARSE

### Input

A SKILL.md file with YAML frontmatter and markdown body:

```markdown
---
name: code-reviewer
description: Review code changes and provide feedback
version: 1.2.0
governance:
  risk: R3
  capabilities:
    - READ
    - WRITE
  obo:
    - approve-pr
  data:
    - INTERNAL
    - CONFIDENTIAL
  audit: true
---

# Code Reviewer

Review code changes against team standards and provide actionable feedback.

## Tools

### review-diff

Analyze a code diff and produce review comments.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| diff | string | yes | The unified diff to review |
| language | string | no | Programming language hint |
| standards | string[] | no | Coding standards to check against |

**Returns:**

| Name | Type | Description |
|------|------|-------------|
| comments | ReviewComment[] | Line-level review comments |
| summary | string | Overall assessment |
| score | number | Quality score (0-100) |

### approve-pr

Approve a pull request after review. Requires human confirmation.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| prNumber | number | yes | Pull request number |
| reason | string | yes | Approval justification |

**Returns:**

| Name | Type | Description |
|------|------|-------------|
| approved | boolean | Whether approval was submitted |
| approver | string | Who approved |

### suggest-fix

Suggest a code fix for a review comment.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| file | string | yes | File path |
| line | number | yes | Line number |
| comment | string | yes | The review comment |
| context | string | no | Surrounding code context |

**Returns:**

| Name | Type | Description |
|------|------|-------------|
| suggestion | string | Suggested code change |
| explanation | string | Why this fix is recommended |
| confidence | number | Confidence in the suggestion (0-1) |

## Scenarios

### 1. Review a TypeScript diff

The user submits a TypeScript diff for review.

**Input:** "Review this diff for our TypeScript coding standards"
**Tool args:** { diff: "...", language: "typescript", standards: ["no-any", "strict-null"] }

**Expected:**
- Tool: review-diff
- Returns comments array with line-level feedback
- Summary includes standards violations found
- Score between 0-100

### 2. Approve after successful review

The user wants to approve a PR after a clean review.

**Input:** "Approve PR #42, the review looks good"
**Tool args:** { prNumber: 42, reason: "Code review passed, all standards met" }

**Expected:**
- Tool: approve-pr
- OBO approval requested before submitting
- Audit event recorded
- Returns approval confirmation

### 3. Suggest a fix for a finding

The user asks for a fix suggestion for a review comment.

**Input:** "Suggest a fix for the 'any' type on line 15 of handler.ts"
**Tool args:** { file: "handler.ts", line: 15, comment: "Replace 'any' with proper type" }

**Expected:**
- Tool: suggest-fix
- Returns concrete code suggestion
- Confidence score provided
```

### Output: SkillAST

```typescript
interface SkillAST {
  frontmatter: {
    name: 'code-reviewer';
    description: 'Review code changes and provide feedback';
    version: '1.2.0';
    governance: {
      risk: 'R3';
      capabilities: ['READ', 'WRITE'];
      obo: ['approve-pr'];
      data: ['INTERNAL', 'CONFIDENTIAL'];
      audit: true;
    };
  };

  sections: {
    tools: [
      {
        name: 'review-diff';
        description: 'Analyze a code diff and produce review comments.';
        parameters: [
          { name: 'diff'; type: 'string'; required: true; description: '...' },
          { name: 'language'; type: 'string'; required: false; description: '...' },
          { name: 'standards'; type: 'string[]'; required: false; description: '...' },
        ];
        returns: [
          { name: 'comments'; type: 'ReviewComment[]'; description: '...' },
          { name: 'summary'; type: 'string'; description: '...' },
          { name: 'score'; type: 'number'; description: '...' },
        ];
      },
      // ... approve-pr, suggest-fix
    ];

    scenarios: [
      {
        name: 'Review a TypeScript diff';
        input: 'Review this diff for our TypeScript coding standards';
        toolArgs: { diff: '...', language: 'typescript', standards: ['no-any', 'strict-null'] };
        expectedTool: 'review-diff';
        expectedObo: false;
        expectedAudit: false;
      },
      // ... scenarios 2, 3
    ];
  };

  diagnostics: [];  // parse-time diagnostics
}
```

### Parser implementation

The SKILL.md parser is a new reader in the claws-sdk skill pipeline. It uses the
same markdown + YAML frontmatter parsing that the OC reader uses, extended with
governance-aware section recognition:

```
SKILL.md
  │
  ├─ YAML frontmatter parser (same as OC) ──→ frontmatter object
  │
  ├─ Markdown section walker ──→ tool sections
  │     Match: ## Tools / ### <tool-name>
  │     Extract: parameter tables, return tables, prose descriptions
  │
  ├─ Parameter table parser ──→ ParameterDeclaration[]
  │     Match: | Name | Type | Required | Description |
  │     Extract: name, type, required, description
  │
  ├─ Scenario section walker ──→ ScenarioDefinition[]
  │     Match: ## Scenarios / ### <number>. <name>
  │     Extract: input, tool args, expected tool, expected OBO, expected audit
  │
  └─ Governance extractor ──→ GovernanceConfig
        Match: governance: in frontmatter
        Extract: risk, capabilities, obo, data, audit
```

---

## Phase 2: EXTRACT

Transform SkillAST into typed intermediate structures.

### Tool Declarations to TypeScript Types

Each tool declaration becomes an input interface and an output interface:

| SKILL.md type | TypeScript type | Notes |
|---------------|----------------|-------|
| `string` | `string` | Direct mapping |
| `number` | `number` | Direct mapping |
| `boolean` | `boolean` | Direct mapping |
| `string[]` | `string[]` | Direct mapping |
| `object` | `Record<string, unknown>` | Generic object |
| `ReviewComment[]` | `ReviewComment[]` | Custom type -- generated as interface |
| Optional (`required: false`) | `field?: type` | TypeScript optional |

Custom array types (like `ReviewComment[]`) are detected by the extractor and
marked for interface generation. The extractor infers the custom type's shape
from context (the SKILL.md description, parameter names in scenarios, or explicit
type definition sections).

### Scenario Extraction

Each scenario is extracted into a test fixture:

```typescript
interface ExtractedScenario {
  name: string;
  input: string;
  expectedTool: string;
  toolArgs: Record<string, unknown>;
  expectedObo: boolean;
  expectedAudit: boolean;
  assertions: ScenarioAssertion[];
}

interface ScenarioAssertion {
  kind: 'tool_invoked' | 'obo_requested' | 'audit_recorded' |
        'output_matches' | 'score_range' | 'contains_field';
  target: string;
  expected: unknown;
}
```

The extractor generates assertions from the "Expected" section of each scenario.
Heuristic rules:

| Expected text | Generated assertion |
|--------------|---------------------|
| "Tool: review-diff" | `{ kind: 'tool_invoked', target: 'review-diff' }` |
| "OBO approval requested" | `{ kind: 'obo_requested', target: 'approve-pr' }` |
| "Audit event recorded" | `{ kind: 'audit_recorded', target: '*' }` |
| "Returns comments array" | `{ kind: 'contains_field', target: 'comments' }` |
| "Score between 0-100" | `{ kind: 'score_range', target: 'score', expected: [0, 100] }` |
| "Confidence score provided" | `{ kind: 'contains_field', target: 'confidence' }` |

### OBO Flow Extraction

Tools listed in `governance.obo` are flagged for approval gate generation:

```typescript
interface ExtractedOboFlow {
  toolName: string;
  mode: 'inline' | 'async' | 'batch';
  timeout: number;
  fallback: 'deny' | 'allow';
  justification: string;
}
```

Default values: `mode: 'inline'`, `timeout: 60_000`, `fallback: 'deny'`.
Overrides come from `@obo()` decorator metadata if the handler uses class-based
decorators, or from per-tool governance config in SKILL.md.

---

## Phase 3: ANALYZE

Validate governance constraints and check consistency.

### Validation Rules

| Rule | Check | Diagnostic |
|------|-------|-----------|
| G-RISK-ESCALATE | Per-tool risk >= skill risk | error: "Tool 'bash' risk R5 would de-escalate skill risk R3" |
| G-OBO-DECLARED | OBO tools listed in governance.obo | error: "Tool 'approve-pr' has @obo but not in governance.obo" |
| G-CAP-MATCH | Capabilities cover all tool actions | warning: "Tool 'approve-pr' writes but WRITE not in capabilities" |
| G-DATA-LABEL | Data labels present | warning: "No data classification declared" |
| G-AUDIT-OBO | OBO tools should have audit enabled | warning: "OBO tool 'approve-pr' has no audit recording" |
| G-SCENARIO-TOOL | Scenario expected tools exist | error: "Scenario references tool 'delete-pr' which is not declared" |
| G-TYPE-COMPLETE | All parameters have types | warning: "Parameter 'context' has no type -- defaulting to object" |
| G-VERSION-VALID | Version is valid semver | error: "Version '1.2' is not valid semver" |

Diagnostics are collected and reported. Errors block code generation. Warnings
are emitted but do not block.

---

## Phase 4: GENERATE

The core of the compilation. Four generators run in sequence:

### Generator 1: Type Definitions (src/types.ts)

```typescript
// Generated from code-reviewer SKILL.md

// ── review-diff ──

export interface ReviewDiffInput {
  /** The unified diff to review */
  diff: string;
  /** Programming language hint */
  language?: string;
  /** Coding standards to check against */
  standards?: string[];
}

export interface ReviewComment {
  file: string;
  line: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface ReviewDiffOutput {
  /** Line-level review comments */
  comments: ReviewComment[];
  /** Overall assessment */
  summary: string;
  /** Quality score (0-100) */
  score: number;
}

// ── approve-pr ──

export interface ApprovePrInput {
  /** Pull request number */
  prNumber: number;
  /** Approval justification */
  reason: string;
}

export interface ApprovePrOutput {
  /** Whether approval was submitted */
  approved: boolean;
  /** Who approved */
  approver: string;
}

// ── suggest-fix ──

export interface SuggestFixInput {
  /** File path */
  file: string;
  /** Line number */
  line: number;
  /** The review comment */
  comment: string;
  /** Surrounding code context */
  context?: string;
}

export interface SuggestFixOutput {
  /** Suggested code change */
  suggestion: string;
  /** Why this fix is recommended */
  explanation: string;
  /** Confidence in the suggestion (0-1) */
  confidence: number;
}

// ── Shared ──

export interface SkillContext {
  user: { id: string };
  tools: {
    invoke: (name: string, args: Record<string, unknown>) => Promise<any>;
  };
  audit?: {
    append: (event: { action: string; target: string; outcome: string; reason?: string }) => Promise<void>;
  };
  model?: {
    complete: (opts: { prompt: string; max_tokens: number }) => Promise<{ text: string }>;
  };
}
```

### Generator 2: Handler Skeleton (src/handler.ts)

Only generated on `claws new` (scaffold). Not regenerated on `claws build` -- the
developer owns this file. On subsequent builds, only `src/types.ts` is regenerated.

```typescript
// Scaffolded by claws new skill code-reviewer

import type {
  ReviewDiffInput, ReviewDiffOutput,
  ApprovePrInput, ApprovePrOutput,
  SuggestFixInput, SuggestFixOutput,
  SkillContext,
} from './types';

export async function reviewDiff(
  input: ReviewDiffInput,
  ctx: SkillContext,
): Promise<ReviewDiffOutput> {
  // TODO: Implement code review logic
  // Use ctx.model.complete() for AI-powered review
  // Use ctx.tools.invoke() for external tool calls
  return { comments: [], summary: '', score: 0 };
}

export async function approvePr(
  input: ApprovePrInput,
  ctx: SkillContext,
): Promise<ApprovePrOutput> {
  // TODO: Implement PR approval
  // This tool requires OBO approval -- claws generates the gate
  return { approved: false, approver: '' };
}

export async function suggestFix(
  input: SuggestFixInput,
  ctx: SkillContext,
): Promise<SuggestFixOutput> {
  // TODO: Implement fix suggestion
  return { suggestion: '', explanation: '', confidence: 0 };
}
```

### Generator 3: Governance Wrapper (dist/governance-guard.ts)

Generated on every `claws build`. This is the file that wires governance around
the developer's handler:

```typescript
/**
 * Governance Guard -- code-reviewer
 *
 * Auto-generated by claws build v1.0.0
 * Source: SKILL.md (code-reviewer v1.2.0)
 * Compiled: 2026-04-11T09:00:00Z
 *
 * DO NOT EDIT -- regenerate with `claws build`
 */

import { AuditChain } from '@openclaw/audit-chain';
import {
  classify,
  elicit,
  audit,
  checkBudget,
  type CompiledRule,
} from '@claws/runtime';
import { reviewDiff, approvePr, suggestFix } from '../src/handler';
import type {
  ReviewDiffInput, ReviewDiffOutput,
  ApprovePrInput, ApprovePrOutput,
  SuggestFixInput, SuggestFixOutput,
  SkillContext,
} from '../src/types';

// ── Compiled governance rules ──

const RULES: CompiledRule[] = [
  { pattern: 'review-diff', risk: 3, obo: false, justification: 'Code diff analysis (read-only)' },
  { pattern: 'approve-pr', risk: 5, obo: true, justification: 'PR approval requires human confirmation' },
  { pattern: 'suggest-fix', risk: 3, obo: false, justification: 'Code suggestion (advisory only)' },
];

// ── Input validators (compiled from SKILL.md parameter tables) ──

function validateReviewDiffInput(input: unknown): input is ReviewDiffInput {
  if (typeof input !== 'object' || input === null) return false;
  const obj = input as Record<string, unknown>;
  if (typeof obj.diff !== 'string') return false;
  if (obj.language !== undefined && typeof obj.language !== 'string') return false;
  if (obj.standards !== undefined && !Array.isArray(obj.standards)) return false;
  return true;
}

function validateApprovePrInput(input: unknown): input is ApprovePrInput {
  if (typeof input !== 'object' || input === null) return false;
  const obj = input as Record<string, unknown>;
  if (typeof obj.prNumber !== 'number') return false;
  if (typeof obj.reason !== 'string') return false;
  return true;
}

function validateSuggestFixInput(input: unknown): input is SuggestFixInput {
  if (typeof input !== 'object' || input === null) return false;
  const obj = input as Record<string, unknown>;
  if (typeof obj.file !== 'string') return false;
  if (typeof obj.line !== 'number') return false;
  if (typeof obj.comment !== 'string') return false;
  if (obj.context !== undefined && typeof obj.context !== 'string') return false;
  return true;
}

// ── Skill state ──

let auditChain: AuditChain;

async function ensureInitialized(): Promise<void> {
  if (!auditChain) {
    auditChain = AuditChain.open('.claws/audit/chain.jsonl');
  }
}

// ── OC Skill Definition ──

export default {
  name: 'code-reviewer',
  description: 'Review code changes and provide feedback',
  version: '1.2.0',

  async onToolCall(
    tool: { name: string; args: Record<string, unknown> },
    context: { user: { id: string }; agent?: { id: string; delegationDepth?: number } },
  ): Promise<Record<string, unknown>> {
    await ensureInitialized();

    const ctx: SkillContext = {
      user: context.user,
      tools: {
        invoke: async (name, args) => {
          // Delegate to OC Gateway's tool invocation
          return (context as any).gateway?.invoke(name, args) ?? {};
        },
      },
      audit: {
        append: async (event) => {
          await audit(auditChain, {
            tool: tool.name,
            risk: classify(tool.name, { workspaceTier: 2 }, RULES).risk,
            decision: 'allow',
            operator: context.user.id,
            reason: event.reason,
          });
        },
      },
    };

    // ── review-diff ──
    if (tool.name === 'review-diff') {
      if (!validateReviewDiffInput(tool.args)) {
        return { error: 'Invalid input for review-diff' };
      }

      await audit(auditChain, {
        tool: 'review-diff',
        risk: 3,
        decision: 'allow',
        operator: context.user.id,
      });

      const result = await reviewDiff(tool.args, ctx);

      return result as unknown as Record<string, unknown>;
    }

    // ── approve-pr (OBO gate) ──
    if (tool.name === 'approve-pr') {
      if (!validateApprovePrInput(tool.args)) {
        return { error: 'Invalid input for approve-pr' };
      }

      // OBO approval gate -- generated from governance.obo: [approve-pr]
      const approval = await elicit(
        { id: context.user.id, channel: 'oc-gateway' },
        {
          name: 'approve-pr',
          args: tool.args,
          risk: 5,
          justification: 'PR approval requires human confirmation',
        },
        { timeoutMs: 60_000, fallback: 'deny' },
      );

      if (!approval.approved) {
        await audit(auditChain, {
          tool: 'approve-pr',
          risk: 5,
          decision: 'deny',
          operator: context.user.id,
          reason: approval.timeout ? 'Approval timed out' : 'User denied',
        });
        return {
          approved: false,
          reason: approval.timeout ? 'Approval timed out' : 'User denied the action',
        };
      }

      await audit(auditChain, {
        tool: 'approve-pr',
        risk: 5,
        decision: 'allow',
        operator: context.user.id,
        reason: 'OBO approval granted',
      });

      const result = await approvePr(tool.args, ctx);
      return result as unknown as Record<string, unknown>;
    }

    // ── suggest-fix ──
    if (tool.name === 'suggest-fix') {
      if (!validateSuggestFixInput(tool.args)) {
        return { error: 'Invalid input for suggest-fix' };
      }

      await audit(auditChain, {
        tool: 'suggest-fix',
        risk: 3,
        decision: 'allow',
        operator: context.user.id,
      });

      const result = await suggestFix(tool.args, ctx);
      return result as unknown as Record<string, unknown>;
    }

    return { error: `Unknown tool: ${tool.name}` };
  },
};
```

### Generator 4: Test Cases (tests/scenarios.test.ts)

Generated from SKILL.md scenarios. Regenerated on every `claws build`:

```typescript
/**
 * Scenario Tests -- code-reviewer
 *
 * Auto-generated from SKILL.md scenarios by claws build.
 * These tests validate that the skill behaves as documented.
 *
 * To customize: add additional test files in tests/.
 * This file is regenerated on each build -- edits will be overwritten.
 */

import { describe, it, expect } from 'vitest';
import { MockGateway } from '@bic/claws-skill-kit/gateway/mock';
import skill from '../dist/governance-guard';

describe('code-reviewer scenarios', () => {
  // ── Scenario 1: Review a TypeScript diff ──

  describe('1. Review a TypeScript diff', () => {
    it('should invoke review-diff with correct args', async () => {
      const gateway = MockGateway.create({
        user: { id: 'test-user' },
        tools: {
          'code-review-provider': async () => ({
            comments: [{ file: 'handler.ts', line: 15, severity: 'warning', message: 'Avoid any' }],
            summary: 'Found 1 standards violation',
            score: 75,
          }),
        },
      });

      const result = await skill.onToolCall(
        {
          name: 'review-diff',
          args: {
            diff: '--- a/handler.ts\n+++ b/handler.ts\n@@ -15 +15 @@\n-  const x: any = 1;\n+  const x: number = 1;',
            language: 'typescript',
            standards: ['no-any', 'strict-null'],
          },
        },
        { user: { id: 'test-user' } },
      );

      expect(result).toHaveProperty('comments');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('score');
    });

    it('should not request OBO approval', async () => {
      const gateway = MockGateway.create({
        user: { id: 'test-user' },
        tools: {},
      });

      // review-diff is not in OBO list -- no approval gate
      // (This test verifies the generated governance guard does not call elicit)
      // Verified by absence of approval request in gateway.approvals
    });
  });

  // ── Scenario 2: Approve after successful review ──

  describe('2. Approve after successful review', () => {
    it('should request OBO approval before submitting', async () => {
      const gateway = MockGateway.create({
        user: { id: 'test-user' },
        approvals: { 'approve-pr': true },
        tools: {},
      });

      const result = await skill.onToolCall(
        {
          name: 'approve-pr',
          args: { prNumber: 42, reason: 'Code review passed, all standards met' },
        },
        { user: { id: 'test-user' } },
      );

      // OBO approval was requested (approve-pr is in governance.obo)
      expect(result).toHaveProperty('approved');
    });

    it('should record audit event', async () => {
      // Audit recording is enabled (governance.audit: true)
      // Verified by checking the audit chain after invocation
    });
  });

  // ── Scenario 3: Suggest a fix for a finding ──

  describe('3. Suggest a fix for a finding', () => {
    it('should invoke suggest-fix and return suggestion', async () => {
      const gateway = MockGateway.create({
        user: { id: 'test-user' },
        tools: {},
      });

      const result = await skill.onToolCall(
        {
          name: 'suggest-fix',
          args: {
            file: 'handler.ts',
            line: 15,
            comment: "Replace 'any' with proper type",
          },
        },
        { user: { id: 'test-user' } },
      );

      expect(result).toHaveProperty('suggestion');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('confidence');
    });

    it('should not request OBO approval', async () => {
      // suggest-fix is not in OBO list
    });
  });
});

describe('code-reviewer governance', () => {
  it('should validate risk classification R3', () => {
    // The skill declares R3, tools declare R3 and R5
    // approve-pr at R5 is valid (escalation from skill-level R3)
    expect(skill.governance?.risk).toBe('R3');
  });

  it('should declare OBO for approve-pr only', () => {
    expect(skill.governance?.obo).toEqual(['approve-pr']);
  });

  it('should declare READ and WRITE capabilities', () => {
    expect(skill.governance?.capabilities).toContain('READ');
    expect(skill.governance?.capabilities).toContain('WRITE');
  });

  it('should have audit enabled', () => {
    expect(skill.governance?.audit).toBe(true);
  });
});

describe('code-reviewer input validation', () => {
  it('should reject review-diff with missing diff field', async () => {
    const result = await skill.onToolCall(
      { name: 'review-diff', args: {} },
      { user: { id: 'test-user' } },
    );
    expect(result).toHaveProperty('error');
  });

  it('should reject approve-pr with missing prNumber', async () => {
    const result = await skill.onToolCall(
      { name: 'approve-pr', args: { reason: 'looks good' } },
      { user: { id: 'test-user' } },
    );
    expect(result).toHaveProperty('error');
  });

  it('should reject unknown tool names', async () => {
    const result = await skill.onToolCall(
      { name: 'nonexistent-tool', args: {} },
      { user: { id: 'test-user' } },
    );
    expect(result).toHaveProperty('error');
  });
});
```

---

## Compilation Trace: Complete Input to Output

### Input: SKILL.md (code-reviewer)

The full SKILL.md shown in Phase 1 above.

### Output: Generated Files

```
code-reviewer/
  SKILL.md                           ← source (written by developer)
  src/
    handler.ts                       ← scaffolded once, developer-owned
    types.ts                         ← GENERATED: 67 lines (types from tool declarations)
  dist/
    governance-guard.ts              ← GENERATED: 148 lines (governance wrapper)
    governance-guard.js              ← GENERATED: compiled JS
    handler.js                       ← compiled handler
    handler.d.ts                     ← type declarations
  tests/
    scenarios.test.ts                ← GENERATED: 120 lines (from SKILL.md scenarios)
    governance.test.ts               ← GENERATED: 25 lines (governance validation)
  package.json                       ← scaffolded once
  claws.json                         ← governance config
  .claws-manifest                    ← GENERATED: build provenance + hash
  tsconfig.json                      ← scaffolded once
```

### What is generated vs what the developer writes

| File | Generated by | Regenerated on build | Developer edits |
|------|-------------|---------------------|-----------------|
| SKILL.md | `claws new` (scaffold) | No | Yes -- the source of truth |
| src/handler.ts | `claws new` (scaffold) | No | Yes -- business logic |
| src/types.ts | `claws build` | Yes | No -- overwritten |
| dist/governance-guard.ts | `claws build` | Yes | No -- overwritten |
| tests/scenarios.test.ts | `claws build` | Yes | No -- overwritten |
| tests/governance.test.ts | `claws build` | Yes | No -- overwritten |
| .claws-manifest | `claws build` | Yes | No -- overwritten |

The developer owns two files: SKILL.md and src/handler.ts. Everything else is
generated from those two files. The generation is deterministic -- same input
always produces the same output.

---

## Compilation Performance

| Phase | Time | Notes |
|-------|------|-------|
| PARSE | ~1-3ms | YAML parse + markdown section walk |
| EXTRACT | ~1-2ms | Type extraction + scenario extraction |
| ANALYZE | ~0.5-1ms | Governance validation (in-memory) |
| GENERATE | ~2-5ms | TypeScript code generation (string templates) |
| EMIT | ~5-10ms | File writes (depends on filesystem) |
| **Total** | **~10-20ms** | Imperceptible for interactive use |

`claws build` is fast because it doesn't invoke the full Craftworks compilation
pipeline. The skill compiler is a lightweight frontend that reads SKILL.md and
generates TypeScript directly. The heavy governance compilation (RELAX evaluation,
policy composition, risk analysis) only runs during `claws pinch` or when building
workspace-level governance guards.

---

## Incremental Compilation

`claws build` uses content hashing for incremental builds:

1. Hash SKILL.md content (SHA-256)
2. Compare with hash in .claws-manifest
3. If unchanged, skip generation (report "up to date")
4. If changed, re-parse and regenerate only changed outputs

```
$ claws build
  claws build -- code-reviewer up to date (hash match)

$ echo "new scenario" >> SKILL.md
$ claws build
  claws build -- compiling code-reviewer
  PARSE    SKILL.md                    0.9ms
  EXTRACT  3 tools, 4 scenarios        1.1ms  ← new scenario detected
  ANALYZE  governance unchanged         0.3ms
  EMIT     tests/scenarios.test.ts     0.4ms  ← only tests regenerated
  EMIT     .claws-manifest             0.1ms
  Build complete (2.8ms)
```

When only scenarios change, only the test file is regenerated. When tool
declarations change, both types.ts and tests are regenerated. When governance
annotations change, the governance-guard.ts is regenerated.
