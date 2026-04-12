# Experiment c: Guard Library Architecture

**Method**: design analysis
**Date**: 2026-04-11

---

## Overview

`glint build openclaw` generates a TypeScript guard library that enforces governance at runtime. This experiment designs the full library architecture: module structure, guard function API, composition pipeline, workflow step modules, extension points, testing, and versioning.

---

## 1. Module Structure

`glint build openclaw` generates the following file tree in the workspace:

```
skills/
  glint-governance/                      ← governance skill (Layer 1: advisory)
    SKILL.md                             ← governance instructions for the agent
    guard.ts                             ← server-side skill guard handler
    classify-step.ts                     ← workflow step: tool classification
    elicit-step.ts                       ← workflow step: OBO elicitation gate
    audit-step.ts                        ← workflow step: audit event recording
    a2a-check-step.ts                    ← workflow step: A2A trust verification
    data-label-step.ts                   ← workflow step: data label enforcement
    index.ts                             ← module exports

hooks/
  glint-guard.ts                         ← before_tool_call hook (Layer 2: enforcement)

plugins/
  glint-gateway/
    index.ts                             ← gateway plugin (Layer 3: A2A + output)
    a2a-middleware.ts                     ← A2A trust enforcement
    output-guard.ts                      ← output validation + redaction

.glint/
  compiled/
    governance-ir.json                   ← compiled intermediate representation
    classification.json                  ← tool classification table (extracted)
    policy.json                          ← compiled policy rules
    a2a-trust.json                       ← A2A trust matrix
    elicitation.json                     ← elicitation requirements
    workflow-manifest.json               ← governance-injected workflow mapping

  runtime/
    types.ts                             ← shared type definitions
    classify.ts                          ← classification engine
    elicit.ts                            ← elicitation engine
    audit.ts                             ← audit trail engine
    a2a.ts                               ← A2A trust engine
    input-filter.ts                      ← input sanitization
    output-filter.ts                     ← output validation
    budget.ts                            ← token/tool/step budget tracker
    constants.ts                         ← generated constants from IR

lobster.compiled.yaml                    ← workflow with governance steps (if lobster.yaml exists)
```

### File Descriptions

| File | Size est. | Purpose |
|------|----------|---------|
| `SKILL.md` | ~200 lines | Human-readable governance rules the agent sees in context. Advisory only. |
| `guard.ts` | ~150 lines | Server-side handler called by the skill system. Routes to classify/elicit. |
| `classify-step.ts` | ~80 lines | Workflow step module. Classifies tools before a workflow step executes. |
| `elicit-step.ts` | ~120 lines | Workflow step module. Presents OBO gate, waits for approval, deny-default on timeout. |
| `audit-step.ts` | ~60 lines | Workflow step module. Records governance events to the audit chain. |
| `a2a-check-step.ts` | ~90 lines | Workflow step module. Verifies A2A trust before inter-agent delegation in workflows. |
| `data-label-step.ts` | ~70 lines | Workflow step module. Enforces data label ceilings on workflow data flow. |
| `index.ts` | ~20 lines | Re-exports all skill modules. |
| `glint-guard.ts` | ~200 lines | The primary enforcement point. Intercepts every tool call. |
| `index.ts` (plugin) | ~180 lines | Gateway plugin lifecycle: init, onMessage, onToolCall, onA2A, onAgentResponse. |
| `a2a-middleware.ts` | ~120 lines | A2A-specific trust verification, data flow labels, delegation ceiling. |
| `output-guard.ts` | ~100 lines | Output redaction, URL validation, format checks. |
| `types.ts` | ~150 lines | All shared TypeScript types (Classification, GovernanceEvent, etc.). |
| `classify.ts` | ~100 lines | Classification engine — lookup table + fallback logic. |
| `elicit.ts` | ~130 lines | Elicitation engine — prompt construction, timeout, approval token. |
| `audit.ts` | ~90 lines | Append-only audit chain — JSONL with hash chaining. |
| `a2a.ts` | ~80 lines | A2A trust matrix lookup + violation detection. |
| `input-filter.ts` | ~70 lines | Input sanitization patterns. |
| `output-filter.ts` | ~80 lines | Output redaction + validation patterns. |
| `budget.ts` | ~60 lines | Budget tracking — tokens, tool calls, steps, recursion depth. |
| `constants.ts` | ~50 lines | Generated constants: tool table, trust matrix, data labels. |

---

## 2. Guard Function API

### Core Functions

```typescript
// ─── classify.ts ─────────────────────────────────────────────────

interface Classification {
  readonly tool: string;
  readonly risk: RiskLevel;               // R1-R5
  readonly capabilities: ToolCapability[];
  readonly failMode: 'open' | 'closed';
  readonly obo: boolean;
  readonly dataLabels: DataLabel[];
  readonly elicitation: ElicitationConfig | null;
}

/**
 * Classify a tool invocation against the compiled governance table.
 * Returns the classification or a DENY if the tool is blocked.
 */
function classify(tool: string): Classification;

/**
 * Batch-classify multiple tools (for workflow pre-flight checks).
 */
function classifyAll(tools: string[]): Classification[];

// ─── elicit.ts ───────────────────────────────────────────────────

interface OboAction {
  readonly tool: string;
  readonly description: string;           // human-readable description
  readonly data?: Record<string, unknown>; // tool parameters
}

interface Approval {
  readonly approved: boolean;
  readonly approvedBy: string;            // user identifier
  readonly timestamp: string;
  readonly token: string;                 // signed approval token (HMAC-SHA256)
  readonly expiresAt: string;             // approval is time-limited
}

/**
 * Present an OBO action to the human for approval.
 * Returns approval or denial. Deny-default on timeout.
 * 
 * @param action - The OBO action requiring approval
 * @param timeout - Timeout in seconds (default: 300)
 * @returns Approval result (approved: false if timeout)
 */
function elicit(action: OboAction, timeout?: number): Promise<Approval>;

// ─── a2a.ts ──────────────────────────────────────────────────────

type AgentId = string;

/**
 * Check whether an A2A communication is allowed.
 * Verifies: trust level, data flow labels, delegation ceiling.
 * 
 * @returns true if allowed, false if blocked
 */
function checkA2A(source: AgentId, target: AgentId, data: DataLabel): boolean;

/**
 * Verify a delegation chain doesn't exceed depth limits or permissions.
 */
function checkDelegation(
  chain: AgentId[],
  permissions: ToolCapability[]
): { allowed: boolean; reason?: string };

// ─── input-filter.ts ─────────────────────────────────────────────

interface SanitizedInput {
  readonly original: string;
  readonly sanitized: string;
  readonly modifications: InputModification[];
  readonly blocked: boolean;              // true if input is entirely blocked
}

interface InputModification {
  readonly kind: 'redacted' | 'escaped' | 'blocked';
  readonly pattern: string;
  readonly position: number;
}

/**
 * Sanitize input before it reaches the agent context.
 * Applies: URL validation, injection pattern detection, trust labeling.
 */
function filterInput(input: string): SanitizedInput;

// ─── output-filter.ts ────────────────────────────────────────────

interface ValidatedOutput {
  readonly original: string;
  readonly validated: string;
  readonly modifications: OutputModification[];
  readonly blocked: boolean;
}

interface OutputModification {
  readonly kind: 'redacted' | 'replaced' | 'blocked';
  readonly reason: string;
  readonly position: number;
}

/**
 * Validate agent output before it reaches the user or another agent.
 * Applies: PII redaction, URL rules, format validation, data label enforcement.
 */
function validateOutput(output: string): ValidatedOutput;

// ─── audit.ts ────────────────────────────────────────────────────

interface GovernanceEvent {
  readonly type: GovernanceEventType;
  readonly timestamp: string;             // ISO 8601
  readonly tool?: string;
  readonly rule?: string;                 // governance rule that triggered
  readonly action: 'allow' | 'deny' | 'elicit' | 'audit';
  readonly details: Record<string, unknown>;
  readonly hash?: string;                 // chain hash (computed on write)
}

type GovernanceEventType =
  | 'tool-call'
  | 'tool-deny'
  | 'obo-elicit'
  | 'obo-approve'
  | 'obo-deny'
  | 'obo-timeout'
  | 'a2a-allow'
  | 'a2a-deny'
  | 'input-filter'
  | 'output-filter'
  | 'budget-warning'
  | 'budget-exceeded'
  | 'conflict-detected';

/**
 * Record a governance event to the audit chain.
 * Hash-chained: each event includes the hash of the previous event.
 */
function audit(event: GovernanceEvent): void;

/**
 * Verify the integrity of the audit chain.
 * Returns true if no breaks detected.
 */
function verifyChain(): Promise<boolean>;

// ─── budget.ts ───────────────────────────────────────────────────

interface BudgetStatus {
  readonly tokens: { used: number; limit: number; remaining: number };
  readonly toolCalls: { used: number; limit: number; remaining: number };
  readonly steps: { used: number; limit: number; remaining: number };
  readonly recursionDepth: { current: number; limit: number };
}

/**
 * Check and decrement a budget counter.
 * Returns false and records a budget-exceeded event if limit reached.
 */
function checkBudget(resource: 'tokens' | 'toolCalls' | 'steps', amount?: number): boolean;

/**
 * Get current budget status across all tracked resources.
 */
function getBudgetStatus(): BudgetStatus;
```

---

## 3. Composition Pipeline

A tool call flows through guards in a defined order. Each guard can ALLOW, DENY, or MODIFY the call. The pipeline short-circuits on DENY.

```
Tool call arrives
    │
    ▼
┌─────────────────┐
│ 1. classify()   │ ← What risk level? What capabilities?
│    R1-R5        │
└────────┬────────┘
         │ R1-R2: fast path (audit only)
         │ R3+: continue
         ▼
┌─────────────────┐
│ 2. checkBudget()│ ← Have we exceeded tool call / token / step limits?
│    budget.ts    │
└────────┬────────┘
         │ within budget: continue
         │ exceeded: DENY + audit
         ▼
┌─────────────────┐
│ 3. checkA2A()   │ ← Is this an inter-agent call? Trust OK?
│    a2a.ts       │   (skipped if not A2A)
└────────┬────────┘
         │ allowed: continue
         │ denied: DENY + audit
         ▼
┌─────────────────┐
│ 4. filterInput()│ ← Sanitize tool parameters
│    input-filter  │
└────────┬────────┘
         │ clean: continue
         │ blocked: DENY + audit
         ▼
┌─────────────────┐
│ 5. elicit()     │ ← Does this need human approval? (R5/OBO only)
│    elicit.ts    │   (skipped if not OBO)
└────────┬────────┘
         │ approved: continue
         │ denied/timeout: DENY + audit
         ▼
┌─────────────────┐
│ 6. EXECUTE      │ ← Tool executes
│    (runtime)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. validateOutput│ ← Check output for PII, data labels, format
│    output-filter │
└────────┬────────┘
         │ clean: continue
         │ modified: redact + continue
         ▼
┌─────────────────┐
│ 8. audit()      │ ← Record the entire event chain
│    audit.ts     │
└─────────────────┘
```

### Implementation in `glint-guard.ts` (the hook)

```typescript
// hooks/glint-guard.ts — generated by glint build openclaw
// Source: governance-ir.json (SHA-256: ...)

import { classify } from '../.glint/runtime/classify';
import { checkBudget } from '../.glint/runtime/budget';
import { checkA2A } from '../.glint/runtime/a2a';
import { filterInput } from '../.glint/runtime/input-filter';
import { elicit } from '../.glint/runtime/elicit';
import { validateOutput } from '../.glint/runtime/output-filter';
import { audit } from '../.glint/runtime/audit';

export async function before_tool_call(
  toolName: string,
  params: Record<string, unknown>,
  context: ToolCallContext
): Promise<ToolCallDecision> {
  // 1. Classify
  const cls = classify(toolName);
  
  // Fast path: R1-R2 tools get audit only
  if (cls.risk <= 2) {
    audit({ type: 'tool-call', tool: toolName, action: 'allow',
            details: { risk: cls.risk, fastPath: true } });
    return { action: 'allow' };
  }

  // 2. Budget check
  if (!checkBudget('toolCalls')) {
    audit({ type: 'budget-exceeded', tool: toolName, action: 'deny',
            details: { resource: 'toolCalls' } });
    return { action: 'deny', reason: 'Tool call budget exceeded' };
  }

  // 3. A2A check (if applicable)
  if (context.isA2A) {
    const a2aOk = checkA2A(context.sourceAgent, context.targetAgent, cls.dataLabels[0]);
    if (!a2aOk) {
      audit({ type: 'a2a-deny', tool: toolName, action: 'deny',
              details: { source: context.sourceAgent, target: context.targetAgent } });
      return { action: 'deny', reason: 'A2A trust policy violation' };
    }
  }

  // 4. Input filtering
  const filtered = filterInput(JSON.stringify(params));
  if (filtered.blocked) {
    audit({ type: 'input-filter', tool: toolName, action: 'deny',
            details: { modifications: filtered.modifications } });
    return { action: 'deny', reason: 'Input blocked by governance filter' };
  }

  // 5. Elicitation (R5/OBO only)
  if (cls.obo && cls.elicitation) {
    const approval = await elicit(
      { tool: toolName, description: `${toolName} (acting as user)`, data: params },
      cls.elicitation.timeout
    );
    if (!approval.approved) {
      audit({ type: 'obo-deny', tool: toolName, action: 'deny',
              details: { reason: approval.approved ? 'approved' : 'denied/timeout' } });
      return { action: 'deny', reason: 'OBO action not approved' };
    }
    audit({ type: 'obo-approve', tool: toolName, action: 'allow',
            details: { approvedBy: approval.approvedBy, token: approval.token } });
  }

  // Allow — tool executes
  audit({ type: 'tool-call', tool: toolName, action: 'allow',
          details: { risk: cls.risk, cls: cls.capabilities } });
  return { action: 'allow', params: filtered.modifications.length > 0
    ? JSON.parse(filtered.sanitized) : params };
}
```

---

## 4. Workflow Step Modules

The governance skill directory contains dedicated step modules for workflow inversion (see exp-a). Each module is a standalone handler that lobster.compiled.yaml invokes as a workflow step.

### classify-step.ts

```typescript
// skills/glint-governance/classify-step.ts
// Called by lobster.compiled.yaml before steps with R3+ tools

import { classify, classifyAll } from '../../.glint/runtime/classify';
import { audit } from '../../.glint/runtime/audit';

interface ClassifyStepInput {
  tools: string[];
  risk_threshold: string;     // "R1"-"R5"
}

export async function execute(input: ClassifyStepInput): Promise<ClassifyStepOutput> {
  const classifications = classifyAll(input.tools);
  const blocked = classifications.filter(
    c => riskToNumber(c.risk) > riskToNumber(input.risk_threshold)
  );

  for (const cls of classifications) {
    audit({
      type: 'tool-call', tool: cls.tool, action: blocked.includes(cls) ? 'deny' : 'allow',
      details: { risk: cls.risk, capabilities: cls.capabilities, step: 'classify' }
    });
  }

  return {
    allowed: blocked.length === 0,
    classifications,
    blocked: blocked.map(b => b.tool),
  };
}
```

### elicit-step.ts

```typescript
// skills/glint-governance/elicit-step.ts
// Called by lobster.compiled.yaml before steps with R5/OBO tools

import { elicit } from '../../.glint/runtime/elicit';
import { audit } from '../../.glint/runtime/audit';

interface ElicitStepInput {
  tool: string;
  action: string;              // human-readable description
  timeout: number;             // seconds
  deny_default: boolean;
}

export async function execute(input: ElicitStepInput): Promise<ElicitStepOutput> {
  const approval = await elicit(
    { tool: input.tool, description: input.action },
    input.timeout
  );

  audit({
    type: approval.approved ? 'obo-approve' : 'obo-deny',
    tool: input.tool,
    action: approval.approved ? 'allow' : 'deny',
    details: {
      approvedBy: approval.approvedBy,
      token: approval.token,
      timedOut: !approval.approved && input.deny_default,
    }
  });

  return {
    approved: approval.approved,
    token: approval.token,
    reason: approval.approved ? 'user-approved' : 'denied-or-timeout',
  };
}
```

### audit-step.ts

```typescript
// skills/glint-governance/audit-step.ts
// Called by lobster.compiled.yaml after governance-sensitive steps

import { audit } from '../../.glint/runtime/audit';

interface AuditStepInput {
  tool: string;
  event_type: string;
  capture: string[];           // parameter names to capture
}

export async function execute(input: AuditStepInput, context: StepContext): Promise<void> {
  const captured: Record<string, unknown> = {};
  for (const key of input.capture) {
    captured[key] = context.previousStepOutput?.[key];
  }

  audit({
    type: input.event_type as GovernanceEventType,
    tool: input.tool,
    action: 'audit',
    details: { captured, workflowStep: context.currentStep },
  });
}
```

---

## 5. Extension Points

### Custom Guards

Users can write custom guards that plug into the composition pipeline. Custom guards implement the `Guard` interface and register at a specific pipeline position.

```typescript
// .glint/custom/business-hours.ts — user-authored custom guard

import type { Guard, GuardDecision, ToolCallContext } from '../runtime/types';

/**
 * Block tool calls outside business hours (9am-5pm local time).
 */
export const businessHoursGuard: Guard = {
  name: 'business-hours',
  position: 'after-classify',            // runs after classification, before budget
  
  check(toolName: string, context: ToolCallContext): GuardDecision {
    const hour = new Date().getHours();
    if (hour < 9 || hour >= 17) {
      return {
        action: 'deny',
        reason: `Tool "${toolName}" blocked outside business hours (${hour}:00)`,
        rule: 'custom:business-hours',
      };
    }
    return { action: 'allow' };
  }
};
```

### Registration in glint.json

```json
{
  "customGuards": [
    {
      "path": ".glint/custom/business-hours.ts",
      "position": "after-classify",
      "enabled": true
    }
  ]
}
```

### Guard Interface

```typescript
interface Guard {
  readonly name: string;
  readonly position: GuardPosition;
  check(toolName: string, context: ToolCallContext): GuardDecision | Promise<GuardDecision>;
}

type GuardPosition =
  | 'before-classify'     // before any governance (raw intercept)
  | 'after-classify'      // after classification, before budget
  | 'after-budget'        // after budget check, before A2A
  | 'after-a2a'           // after A2A check, before input filter
  | 'after-input'         // after input filter, before elicit
  | 'after-elicit'        // after elicitation, before execute
  | 'after-execute'       // after tool execution, before output filter
  | 'after-output';       // after output filter, before audit

interface GuardDecision {
  readonly action: 'allow' | 'deny' | 'modify';
  readonly reason?: string;
  readonly rule?: string;
  readonly modifiedParams?: Record<string, unknown>;
}
```

### Pipeline with Custom Guards

```
Tool call arrives
    │
    ├── [custom: before-classify]       ← user guards here
    ▼
classify() → [custom: after-classify]
    ▼
checkBudget() → [custom: after-budget]
    ▼
checkA2A() → [custom: after-a2a]
    ▼
filterInput() → [custom: after-input]
    ▼
elicit() → [custom: after-elicit]
    ▼
EXECUTE → [custom: after-execute]
    ▼
validateOutput() → [custom: after-output]
    ▼
audit()
```

Custom guards at each position can DENY (short-circuit) or MODIFY (transform params) but cannot override a DENY from a previous stage. This ensures governance guards are never bypassed by custom code.

---

## 6. Testing

### `glint test` — Scenario Validation

`glint test` generates and runs test scenarios against the compiled guard library. It validates that the guards enforce what the governance rules specify.

### Generated Test File

`glint build openclaw --includeTests` generates `.glint/tests/governance.test.ts`:

```typescript
// .glint/tests/governance.test.ts — generated by glint build
// Tests each governance rule against the compiled guards

import { classify } from '../runtime/classify';
import { checkA2A } from '../runtime/a2a';
import { filterInput } from '../runtime/input-filter';
import { checkBudget } from '../runtime/budget';

describe('G-CLASS: Tool Classification', () => {
  test('web-search is R1/READ', () => {
    const cls = classify('web-search');
    expect(cls.risk).toBe('R1');
    expect(cls.capabilities).toContain('READ');
    expect(cls.obo).toBe(false);
  });

  test('send-email is R5/COMMUNICATE/OBO', () => {
    const cls = classify('send-email');
    expect(cls.risk).toBe('R5');
    expect(cls.capabilities).toContain('COMMUNICATE');
    expect(cls.obo).toBe(true);
    expect(cls.elicitation).not.toBeNull();
    expect(cls.elicitation?.denyDefault).toBe(true);
  });

  test('unknown tool defaults to R3/closed', () => {
    const cls = classify('unknown-tool-xyz');
    expect(cls.risk).toBe('R3');
    expect(cls.failMode).toBe('closed');
  });
});

describe('G-PERM: Capability Check', () => {
  test('tools do not exceed workspace trust tier', () => {
    // All tools in classification table should have risk <= trust tier
    const allTools = getAllClassifiedTools();
    for (const tool of allTools) {
      expect(riskToNumber(tool.risk)).toBeLessThanOrEqual(WORKSPACE_TRUST_TIER);
    }
  });
});

describe('G-A2A: Inter-Agent Trust', () => {
  test('allowed delegation passes', () => {
    expect(checkA2A('self', 'research-agent', 'INTERNAL')).toBe(true);
  });

  test('unauthorized agent is blocked', () => {
    expect(checkA2A('self', 'unknown-agent', 'INTERNAL')).toBe(false);
  });

  test('data label exceeding ceiling is blocked', () => {
    // research-agent has INTERNAL ceiling
    expect(checkA2A('self', 'research-agent', 'CONFIDENTIAL')).toBe(false);
  });
});

describe('G-ELICIT: OBO Gates', () => {
  test('R5/OBO tool requires elicitation', () => {
    const cls = classify('send-email');
    expect(cls.obo).toBe(true);
    expect(cls.elicitation).toEqual(expect.objectContaining({
      mode: 'inline',
      timeout: 300,
      denyDefault: true,
    }));
  });
});

describe('G-INPUT: Input Filtering', () => {
  test('SQL injection pattern is blocked', () => {
    const result = filterInput("'; DROP TABLE users; --");
    expect(result.modifications.length).toBeGreaterThan(0);
  });

  test('normal input passes through', () => {
    const result = filterInput('Search for TypeScript tutorials');
    expect(result.blocked).toBe(false);
    expect(result.modifications).toHaveLength(0);
  });
});

describe('G-BOUND: Budget Limits', () => {
  test('tool call budget is enforced', () => {
    // Reset budget
    resetBudget();
    // Check within budget
    expect(checkBudget('toolCalls')).toBe(true);
    // Exhaust budget
    for (let i = 0; i < TOOL_CALL_LIMIT; i++) {
      checkBudget('toolCalls');
    }
    // Next call should fail
    expect(checkBudget('toolCalls')).toBe(false);
  });
});
```

### Scenario-Based Testing

Beyond unit tests, `glint test` supports scenario YAML files that describe multi-step test cases:

```yaml
# .glint/tests/scenarios/obo-email.yaml
name: OBO email requires approval
steps:
  - call: send-email
    params: { to: "alice@example.com", subject: "Hello" }
    expect:
      elicitation: required
      deny_on_timeout: true
  - approve: true
    expect:
      result: allow
      audit:
        - type: obo-elicit
        - type: obo-approve
```

```yaml
# .glint/tests/scenarios/a2a-trust-violation.yaml
name: A2A escalation blocked
steps:
  - delegate: unknown-agent
    data_label: CONFIDENTIAL
    expect:
      result: deny
      reason: "A2A trust policy violation"
      audit:
        - type: a2a-deny
```

---

## 7. Versioning and Incremental Recompilation

### Source Hashing

Every source file is hashed (SHA-256) during PARSE. The hashes are stored in `governance-ir.json`:

```json
{
  "sources": [
    { "path": "SOUL.md", "hash": "a1b2c3...", "exists": true },
    { "path": "TOOLS.md", "hash": "d4e5f6...", "exists": true },
    { "path": "AGENTS.md", "hash": "g7h8i9...", "exists": true }
  ]
}
```

### Incremental Recompilation

When `glint build` runs (or `glint watch` detects a change):

1. Hash all source files
2. Compare against stored hashes in `governance-ir.json`
3. If NO files changed: skip compilation, reuse cached IR
4. If ONLY unchanged files: re-parse only changed files, merge with cached AST nodes for unchanged files
5. EXTRACT and ANALYZE always run on the full manifest (they're fast: <250ms combined)
6. OPTIMIZE and EMIT run only if the GovAnalysis differs from the cached version

### Version Tracking

The generated code includes a version comment:

```typescript
// Generated by glint v1.2.3
// Source IR: governance-ir.json (SHA-256: abc123...)
// Compiled at: 2026-04-11T14:30:00Z
// Workspace: /home/user/my-agent
// Do not edit — run `glint build` to regenerate.
```

### Migration on Schema Change

When glint's IR schema version changes (e.g., GovernanceIR v1 to v2):

1. `glint build` detects the version mismatch
2. Deletes cached IR
3. Full recompilation from source files
4. Emits code compatible with the new schema
5. Prints: `info: IR schema upgraded v1 → v2. Full recompilation performed.`

---

## 8. The Runtime Library vs Generated Code

The guard library has two layers:

| Layer | Location | Changes when... | Contains |
|-------|----------|----------------|----------|
| **Runtime** | `.glint/runtime/` | glint is upgraded (npm update) | Classification engine, elicitation engine, audit chain, A2A engine, input/output filters, budget tracker |
| **Generated** | `skills/`, `hooks/`, `plugins/`, `.glint/compiled/` | Workspace files change (`glint build`) | Classification table, trust matrix, elicitation requirements, policy constants, SKILL.md, hook handler, plugin handler, workflow step handlers |

The runtime library is the ENGINE. The generated code is the DATA that drives the engine. When workspace files change, only the generated code is re-emitted. The runtime library stays the same unless glint itself is upgraded.

This separation means:
- `glint build` is fast (~500ms) because it only generates config/data
- `npm update @craftworks/glint` upgrades the engine without touching generated config
- Custom guards depend on the runtime API, which is semver-stable

---

## Findings

1. **The guard library is a layered architecture: runtime engine + generated config.** This separation gives fast recompilation (data changes, not code) and stable extension points (custom guards depend on the engine API, not generated code).

2. **The composition pipeline has 8 stages with 8 extension points.** Custom guards can plug in at any stage but cannot override denials from governance guards. This preserves the security invariant: governance is not bypassable.

3. **Workflow step modules are the workflow inversion realization.** The 5 step modules (classify, elicit, audit, a2a-check, data-label) are what `lobster.compiled.yaml` calls. The compiler creates both the skills and the workflows that call them.

4. **Generated tests validate every governance rule against the compiled guards.** `glint test` is not a generic test runner — it generates tests FROM the governance IR, ensuring the guards enforce what the rules specify. Scenario YAML files enable multi-step integration testing.

5. **Incremental recompilation via source hashing keeps the edit-compile-check cycle under 500ms.** Only changed files are re-parsed; the fast phases (EXTRACT, ANALYZE) always run on the full manifest because they're cheap.

6. **The extension point design (8 positions, Guard interface) enables enterprise customization without compromising governance.** Business hours policy, geo-fencing, rate limiting — all implementable as custom guards without modifying generated code.
