# Experiment b: The claws-runtime Library (Three-Tier Package Model)

**Question**: Q12k -- What Craftworks runtime powers claws-generated skills?
**Method**: Design analysis
**Date**: 2026-04-11

---

## Design Principle

Generated code must look like something an OC developer would write themselves. Craftworks
internals power the libraries, but the developer never sees WorkAgentSupervisor, TaskFsm,
RELAX, or DataFrames. The test: "would an OC developer reading this generated code
understand it without knowing Craftworks exists?"

---

## Three-Tier Package Architecture

```
Generated skill (OC-idiomatic TypeScript)
  |
  |-- imports from @openclaw/* (Tier 1)     ← OC-native libraries, contributed upstream
  |     @openclaw/audit-chain
  |     @openclaw/budget-meter
  |     @openclaw/identity-bridge
  |     @openclaw/siem-emitter
  |     @openclaw/secret-scanner
  |
  |-- imports from @claws/runtime (Tier 2)  ← Thin governance helpers
  |     classify(), elicit(), audit()
  |     checkA2A(), checkBudget()
  |     evaluatePolicy()
  |
  v
claws compiler (@craftworks/*, Tier 3)      ← NEVER appears in generated output
  WorkAgentSupervisor, RELAX, DataFrames
  CREST parser, format readers/emitters
  Full SDK pipeline
```

---

## Tier 1: @openclaw/* Packages (Contributed Upstream)

These are the packages Craftworks contributes to OpenClaw (Q12b). They are standalone
npm packages with OC-native APIs. Internally they are powered by Craftworks SDK modules,
but the API surface is designed for OC developers.

### 1.1 @openclaw/audit-chain

**Powered by**: agent-sdk/suite/audit (hash-chain, WAL, verify, prune, query, export)

```typescript
// API surface -- what OC developers see
import { AuditChain, type AuditEvent } from '@openclaw/audit-chain';

// Create chain from workspace .glint/audit/ directory
const chain = AuditChain.open('.glint/audit/chain.jsonl');

// Append event (auto-computes SHA-256 hash chain)
await chain.append({
  action: 'tool.invoke',
  target: 'bash',
  scope: 'workspace:my-agent',
  outcome: 'success',
  reason: 'Policy G2 passed',
});

// Verify chain integrity
const result = await chain.verify();
// → { valid: true, length: 1247, breaks: [] }

// Query events
const events = await chain.query({
  after: '2026-04-01',
  action: 'tool.deny',
});

// Export for SIEM
const sarif = await chain.export('sarif');
```

**Internal implementation**: The `AuditChain` class wraps `createWALStore()`, `computeHash()`,
`verifyChain()`, `queryEvents()`, and `exportSarif()` from agent-sdk/suite/audit. The
WAL provides crash recovery. The hash chain provides tamper detection. None of these
internal names are visible to the consumer.

**Size**: ~20KB (hash chain + WAL + verify + prune + query + export)

### 1.2 @openclaw/budget-meter

**Powered by**: agent-sdk/govern/GovernanceManager

```typescript
import { BudgetMeter } from '@openclaw/budget-meter';

const meter = BudgetMeter.create({
  maxTokens: 100_000,
  maxCalls: 500,
  maxDuration: 300_000, // 5 minutes
});

// Check before tool call
const check = meter.check({ tokens: 1500, calls: 1 });
if (!check.ok) {
  // check.code: 'budget_exceeded' | 'throttled' | 'warning'
  // check.usage: { tokens: 85000, calls: 340, elapsed: 180000 }
  // check.message: 'Token budget at 86.5% -- approaching limit'
}

// Record actual usage after tool call
meter.record({ tokens: 1200, calls: 1, duration: 350 });

// Get current snapshot
const snap = meter.snapshot();
// → { tokensUsed: 1200, callsMade: 1, elapsed: 350, ... }
```

**Internal implementation**: Wraps `GovernanceManager` from agent-sdk/govern. Maps
GovernanceManager's Result<void> error codes (BUDGET_REJECT, BUDGET_THROTTLE) to
OC-friendly response objects. The 80%/95%/100% thresholds are preserved but presented
as `warning`/`throttled`/`budget_exceeded`.

**Size**: ~8KB

### 1.3 @openclaw/identity-bridge

**Powered by**: agent-sdk/suite/permission, agent-sdk/suite/entity-id

```typescript
import { IdentityBridge, type Operator } from '@openclaw/identity-bridge';

// Resolve operator identity from OC Gateway context
const operator: Operator = IdentityBridge.resolve(ctx);
// → { id: 'user:jane@acme.com', source: 'sso', tier: 'admin' }

// Generate entity IDs for audit attribution
const eventId = IdentityBridge.generateId();
// → UUID v4
```

**Size**: ~3KB

### 1.4 @openclaw/siem-emitter

**Powered by**: agent-sdk/suite/audit/export

```typescript
import { SiemEmitter } from '@openclaw/siem-emitter';

const emitter = SiemEmitter.create({
  format: 'cef',        // 'cef' | 'json' | 'syslog' | 'sarif'
  destination: 'stdout', // 'stdout' | 'file' | 'webhook'
});

await emitter.emit({
  action: 'tool.deny',
  target: 'bash',
  severity: 'high',
  reason: 'Policy G2: production tools require T3+',
});
```

**Size**: ~5KB

### 1.5 @openclaw/secret-scanner

**Powered by**: agent-sdk/hashing/computeHash, pattern detection

```typescript
import { SecretScanner } from '@openclaw/secret-scanner';

const scanner = SecretScanner.create({
  patterns: ['aws_key', 'github_token', 'private_key', 'password'],
});

const findings = scanner.scan(toolOutput);
// → [{ type: 'aws_key', offset: 145, redacted: 'AKIA***' }]

const safe = scanner.redact(toolOutput);
// → output with secrets replaced by [REDACTED]
```

**Size**: ~4KB

---

## Tier 2: @claws/runtime (Governance Helpers)

Thin utility functions that compose Tier 1 packages into governance-specific workflows.
NOT a framework. Exported as plain functions. An OC developer could write these
themselves -- claws generates them for consistency and correctness.

### 2.1 Module Inventory

```
@claws/runtime
  ├── classify.ts      ← Tool risk classification
  ├── elicit.ts        ← HITL approval flow
  ├── audit.ts         ← Governance event recording
  ├── a2a.ts           ← A2A delegation depth checking
  ├── budget.ts        ← Budget enforcement
  ├── policy.ts        ← Pre-compiled policy evaluation
  ├── drift.ts         ← Configuration drift detection
  └── index.ts         ← Barrel export
```

### 2.2 classify() -- Tool Risk Classification

```typescript
/**
 * Classify a tool call's risk level based on pre-compiled policy rules.
 *
 * @param toolName - The tool being invoked
 * @param context  - Runtime context (workspace tier, user identity, etc.)
 * @param rules    - Pre-compiled classification rules (from claws build)
 * @returns Classification result with risk tier and matched rule
 */
export function classify(
  toolName: string,
  context: ClassifyContext,
  rules: CompiledRule[],
): ClassifyResult {
  // ...
}

export interface ClassifyContext {
  workspaceTier: number;       // 1-5
  operatorTier?: string;       // 'admin' | 'developer' | 'viewer'
  tags?: string[];             // workspace tags
}

export interface CompiledRule {
  pattern: string;             // glob pattern for tool name
  risk: 1 | 2 | 3 | 4 | 5;   // risk tier
  obo: boolean;                // requires on-behalf-of approval
  justification?: string;      // why this risk level
}

export interface ClassifyResult {
  risk: number;
  obo: boolean;
  matchedRule: CompiledRule | null;
  justification: string;
}
```

**Internal**: The `CompiledRule[]` array is emitted by the claws compiler from RELAX
expressions. At compile time, `claws build` evaluates RELAX policy expressions against
the workspace schema and emits a static rule table. At runtime, `classify()` does a
simple glob-match against the table -- no RELAX evaluator needed in the generated code.

This is the key insight: **RELAX powers the compiler, glob-match powers the runtime.**
The compiler does the heavy lifting (type-checking, scope resolution, expression evaluation),
and the runtime does a fast O(n) pattern match.

For dynamic policies that cannot be pre-compiled to static rules, the compiler emits
a small evaluator function inline:

```typescript
// Static rule (common case, <0.1ms)
{ pattern: 'bash', risk: 5, obo: true }

// Dynamic rule (rare, <2ms) -- evaluator compiled from RELAX expression
{
  pattern: '*',
  risk: (tool, ctx) => ctx.workspaceTier < 3 && tool.name.startsWith('prod-') ? 5 : 2,
  obo: (tool, ctx) => ctx.workspaceTier < 3,
}
```

### 2.3 elicit() -- HITL Approval Flow

```typescript
/**
 * Request human approval for a tool invocation via OC's exec-approvals API.
 *
 * @param user    - The user to request approval from
 * @param tool    - The tool invocation details
 * @param options - Timeout, fallback behavior
 * @returns Whether the user approved
 */
export async function elicit(
  user: OperatorRef,
  tool: ToolInvocation,
  options?: ElicitOptions,
): Promise<ElicitResult> {
  // ...
}

export interface OperatorRef {
  id: string;
  channel: 'oc-gateway' | 'slack' | 'teams';
}

export interface ToolInvocation {
  name: string;
  args: Record<string, unknown>;
  risk: number;
  justification: string;
}

export interface ElicitOptions {
  timeoutMs?: number;          // default: 60_000
  fallback?: 'deny' | 'allow'; // default: 'deny' (fail-closed)
  reason?: string;             // presented to the approver
}

export interface ElicitResult {
  approved: boolean;
  approver?: string;
  timestamp: string;
  timeout: boolean;
}
```

**Internal**: Wraps the OC Gateway's exec-approvals API. The approval flow uses OC-native
mechanisms. The timeout and fallback behavior are powered by agent-sdk intervention ladder
concepts (fail-closed default, escalation) but presented as simple config options.

### 2.4 audit() -- Governance Event Recording

```typescript
/**
 * Record a governance decision to the audit chain.
 * Composes @openclaw/audit-chain with governance-specific event shapes.
 *
 * @param chain  - AuditChain instance
 * @param event  - Governance event to record
 */
export async function audit(
  chain: AuditChain,
  event: GovernanceEvent,
): Promise<void> {
  // ...
}

export interface GovernanceEvent {
  tool: string;
  risk: number;
  decision: 'allow' | 'deny' | 'escalate';
  operator?: string;
  reason?: string;
  policyRule?: string;
  a2aDepth?: number;
}
```

**Internal**: Maps `GovernanceEvent` to `AuditEvent` format and calls `chain.append()`.
Adds governance-specific fields (risk, decision, policyRule) as structured metadata.

### 2.5 checkA2A() -- A2A Delegation Depth

```typescript
/**
 * Check whether an agent-to-agent delegation is allowed at the current depth.
 *
 * @param currentDepth - How deep we are in the delegation chain
 * @param maxDepth     - Maximum allowed depth (from policy)
 * @returns Whether delegation is allowed
 */
export function checkA2A(
  currentDepth: number,
  maxDepth: number,
): A2ACheckResult {
  // ...
}

export interface A2ACheckResult {
  allowed: boolean;
  currentDepth: number;
  maxDepth: number;
  remaining: number;
}
```

**Internal**: Wraps `createDelegationContext()` and `assertCanDelegate()` from agent-sdk.
But the API is a simple function that returns a plain object -- no DelegationContext
class exposed to the consumer.

### 2.6 checkBudget() -- Budget Enforcement

```typescript
/**
 * Check whether a proposed operation fits within the budget.
 *
 * @param meter - BudgetMeter instance
 * @param cost  - Proposed cost
 * @returns Budget check result
 */
export function checkBudget(
  meter: BudgetMeter,
  cost: { tokens?: number; calls?: number },
): BudgetCheckResult {
  // ...
}

export interface BudgetCheckResult {
  ok: boolean;
  code: 'ok' | 'warning' | 'throttled' | 'exceeded';
  usage: { tokens: number; calls: number; elapsed: number };
  message?: string;
}
```

**Internal**: Composes `@openclaw/budget-meter` check + record into a governance-oriented
result. The three thresholds (80% warning, 95% throttle, 100% reject) are preserved
from GovernanceManager.

### 2.7 evaluatePolicy() -- Pre-compiled Policy Evaluation

```typescript
/**
 * Evaluate a pre-compiled policy against runtime context.
 * For static policies, this is a simple lookup.
 * For dynamic policies, this executes the compiled evaluator function.
 *
 * @param policy  - Pre-compiled policy (from claws build output)
 * @param context - Runtime context
 * @returns Policy evaluation result
 */
export function evaluatePolicy(
  policy: CompiledPolicy,
  context: PolicyContext,
): PolicyResult {
  // ...
}

export interface CompiledPolicy {
  rules: CompiledRule[];
  version: string;
  compiledAt: string;
}

export interface PolicyContext {
  tool: { name: string; args: Record<string, unknown> };
  workspace: { tier: number; tags: string[] };
  operator: { id: string; tier: string };
  a2a?: { depth: number; maxDepth: number };
}

export interface PolicyResult {
  decision: 'allow' | 'deny' | 'escalate';
  matchedRules: CompiledRule[];
  diagnostics: PolicyDiagnostic[];
}

export interface PolicyDiagnostic {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}
```

**Internal**: This is where RELAX meets the runtime -- but RELAX itself never appears.
At compile time, `claws build` evaluates RELAX expressions and emits either:
- Static rule tables (for expressions that resolve at compile time)
- Inline evaluator functions (for expressions with runtime-only bindings)

At runtime, `evaluatePolicy()` iterates the compiled rules and applies them. The RELAX
evaluator, scope resolver, and type checker are all compile-time-only.

### 2.8 drift() -- Configuration Drift Detection

```typescript
/**
 * Detect drift between a workspace's current state and a baseline snapshot.
 *
 * @param current  - Current workspace configuration
 * @param baseline - Baseline snapshot (from last broadcast/build)
 * @returns Drift report
 */
export function drift(
  current: Record<string, unknown>,
  baseline: Record<string, unknown>,
): DriftReport {
  // ...
}

export interface DriftReport {
  drifted: boolean;
  changes: DriftChange[];
  hash: { current: string; baseline: string };
}

export interface DriftChange {
  path: string;
  type: 'added' | 'removed' | 'modified';
  before?: unknown;
  after?: unknown;
}
```

**Internal**: Wraps agent-sdk/diffgram `computeDiff()` and agent-sdk/hashing `computeHash()`.
Maps DiffGram's add/modify/delete/noop vocabulary to OC-friendly added/removed/modified.

---

## Tier 3: @craftworks/* (Compiler Internal -- Never in Generated Output)

The claws compiler uses the full Craftworks SDK internally:

| Compiler phase | Craftworks modules used |
|---------------|----------------------|
| **PARSE** | CREST parser, format readers, meta-format adapters |
| **EXTRACT** | WorkAgentSupervisor (orchestrates extraction pipeline), RELAX evaluator (parses policy expressions), DataFrames (provides workspace context) |
| **ANALYZE** | RELAX type-checker, scope resolver, gate evaluation, dependency map |
| **OPTIMIZE** | PRESS IR (token optimization), push-down optimizer, hash-join |
| **EMIT** | Format emitters (OC skill/hook/plugin templates), RELAX-to-static-rule compiler |

None of these appear in generated output. The compiler transforms RELAX expressions
into static rules or inline evaluator functions. The compiler uses DataFrames to
materialize workspace context during analysis. The compiler uses WorkAgentSupervisor
to orchestrate its own multi-phase pipeline. All internal.

---

## API Surface: @claws/runtime

### Public Exports

```typescript
// Classification
export { classify, type ClassifyContext, type ClassifyResult, type CompiledRule } from './classify';

// Elicitation (HITL)
export { elicit, type OperatorRef, type ToolInvocation, type ElicitOptions, type ElicitResult } from './elicit';

// Audit
export { audit, type GovernanceEvent } from './audit';

// A2A delegation
export { checkA2A, type A2ACheckResult } from './a2a';

// Budget
export { checkBudget, type BudgetCheckResult } from './budget';

// Policy evaluation
export { evaluatePolicy, type CompiledPolicy, type PolicyContext, type PolicyResult, type PolicyDiagnostic } from './policy';

// Drift detection
export { drift, type DriftReport, type DriftChange } from './drift';
```

### What is NOT Exported

- No classes (no `new GovernanceWorkflow()`, no `new WorkAgentSupervisor()`)
- No RELAX types (no `RelaxExpression`, no `ScopeType`, no `CoercionResult`)
- No DataFrame types (no `MaterializationRegistry`, no adapters)
- No FSM types (no `TaskFsm`, no `TaskState`)
- No Result<T> monad (use plain `{ ok: boolean }` objects)

---

## Packaging

### @claws/runtime

| Property | Value |
|----------|-------|
| npm name | `@claws/runtime` |
| Size budget | <50KB (functions only, no framework) |
| Dependencies | `@openclaw/audit-chain`, `@openclaw/budget-meter` |
| Node.js | 18+ |
| Module | ESM with CJS fallback |
| Tree-shakeable | Yes (each function is an independent export) |
| CLI dependencies | None |
| Browser APIs | None |

### @openclaw/* Packages (5 total)

| Package | Size | Dependencies |
|---------|------|-------------|
| `@openclaw/audit-chain` | ~20KB | node:crypto, node:fs/promises |
| `@openclaw/budget-meter` | ~8KB | none |
| `@openclaw/identity-bridge` | ~3KB | none |
| `@openclaw/siem-emitter` | ~5KB | none |
| `@openclaw/secret-scanner` | ~4KB | node:crypto |
| **Total** | **~40KB** | |

### Combined Size (installed in OC Gateway)

| Layer | Size |
|-------|------|
| @openclaw/* (5 packages) | ~40KB |
| @claws/runtime | ~50KB |
| Generated skill code | ~5-20KB per skill |
| **Total** | **~95-110KB** | 

Well under the 500KB budget. Comparable to a typical OC plugin.

---

## How RELAX Powers Policy Evaluation (Compile-time to Runtime Bridge)

The key architectural insight: RELAX is the policy language. But the runtime never
evaluates RELAX directly.

### Compile Time (inside claws build)

```
RELAX expression:       tool.name matches "prod-*" and workspace.tier < 3
                                 ↓
RELAX type-checker:     Validates tool.name: string, workspace.tier: number
                                 ↓
RELAX evaluator:        Checks if expression can be statically resolved
                                 ↓
CASE A (static):        Emits rule { pattern: "prod-*", risk: 5, obo: true }
CASE B (dynamic):       Emits inline function:
                         (tool, ctx) => glob(tool.name, "prod-*") && ctx.workspace.tier < 3
```

### Runtime (inside generated skill)

```typescript
// Generated by claws build
const RULES: CompiledRule[] = [
  // Static rule (from RELAX: tool.name matches "prod-*" and workspace.tier < 3)
  { pattern: 'prod-*', risk: 5, obo: true, justification: 'Production tools require T3+' },

  // Dynamic rule (from RELAX: tool.risk > workspace.maxRisk)
  {
    pattern: '*',
    risk: (tool, ctx) => tool.risk > ctx.workspace.maxRisk ? 5 : 1,
    obo: (tool, ctx) => tool.risk > ctx.workspace.maxRisk,
  },
];

// In the skill handler:
const result = classify(tool.name, context, RULES);
```

No RELAX evaluator in the runtime. No scope resolver. No type checker. Just a pre-compiled
rule table and a fast pattern matcher.

---

## How DataFrames Provide Structured Data (Compile-time Materialization)

DataFrames are used at compile time to give the compiler rich workspace context.
At runtime, the materialized data is embedded in the generated code as static tables.

### Compile Time

```
claws build:
  1. MaterializationRegistry loads workspace DataFrames
  2. Tool classification DataFrame → materializes all tool names + risk levels
  3. A2A trust matrix DataFrame → materializes agent trust relationships
  4. Compiler embeds materialized data in generated skill as const tables
```

### Runtime (in generated code)

```typescript
// Generated by claws build -- materialized from DataFrames at compile time
const TOOL_CLASSIFICATIONS = {
  'bash': { risk: 5, category: 'system', obo: true },
  'read_file': { risk: 2, category: 'filesystem', obo: false },
  'web_search': { risk: 1, category: 'information', obo: false },
} as const;

const A2A_TRUST = {
  'agent-research': { maxDepth: 2, trustLevel: 'standard' },
  'agent-deploy': { maxDepth: 1, trustLevel: 'elevated' },
} as const;
```

No MaterializationRegistry at runtime. No adapter loading. No cache invalidation.
Just static data compiled from workspace context.

For workspaces that need runtime-dynamic data (e.g., fleet inventory that changes),
the generated skill reads from the workspace's `glint.json` at startup:

```typescript
import { readFile } from 'node:fs/promises';

// Dynamic data -- loaded at skill startup, not compile time
const config = JSON.parse(await readFile('.glint/config.json', 'utf-8'));
```

---

## How the Eval Framework Powers Quality Gates

The eval framework is used at two levels:

### Level 1: Compile-time test generation (claws test)

The claws compiler uses the full eval framework (L0 assertions, L1 structural checks,
L2 judge) to validate generated skills during `claws test`. This is Tier 3 -- compiler
internal.

### Level 2: Runtime quality checks in generated skills

For skills that need runtime quality validation (e.g., "does this output contain PII?"),
the generated code uses L0 assertion patterns directly:

```typescript
// Generated by claws build -- PII check
function checkForPII(output: string): boolean {
  const patterns = [
    /\b\d{3}-\d{2}-\d{4}\b/,  // SSN
    /\b\d{16}\b/,               // Credit card
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email
  ];
  return patterns.some(p => p.test(output));
}
```

These patterns are compiled from the eval rubric at build time. The runtime function
is a plain regex check -- no rubric loader, no judge, no eval client.

For complex quality gates that require LLM judgment, the generated skill delegates
to the Gateway's model and uses a structured prompt:

```typescript
// Complex quality gate -- uses Gateway's model, not a separate eval call
const check = await ctx.model.complete({
  prompt: `Does the following output contain any sensitive information? Answer yes/no.\n\n${output}`,
  max_tokens: 10,
});
```

This is an OC-native pattern (using the Gateway's model), not a Craftworks eval import.
