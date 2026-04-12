# exp-b: @bic/claws-skill-kit Library Design

**Question**: Q12o -- How does claws help makers create skills?
**Experiment**: Design the skill development framework library
**Method**: Design analysis
**Date**: 2026-04-11

---

## Design Principle

@bic/claws-skill-kit is the standard development framework for OC skills. Its APIs
must look OC-native. An OC developer reading skill-kit code should understand it
without knowing Craftworks exists. The library provides types, decorators, and
utilities that feel like a natural extension of the OC platform.

---

## Package Overview

```
@bic/claws-skill-kit
  src/
    index.ts               ← barrel export
    manifest.ts            ← SkillManifest type + validation
    skill.ts               ← skill() factory function
    decorators/
      obo.ts               ← @obo decorator (on-behalf-of approval)
      audit.ts             ← @audit decorator (audit chain recording)
      classify.ts          ← @classify decorator (risk classification)
      validate.ts          ← @validate decorator (input/output validation)
      budget.ts            ← @budget decorator (cost tracking)
      timeout.ts           ← @timeout decorator (execution time limit)
    gateway/
      mock.ts              ← MockGateway for testing
      types.ts             ← Gateway API types (OC-native)
    governance/
      schema.ts            ← Governance annotation schema (Zod)
      risk.ts              ← Risk level constants and utilities
      capabilities.ts      ← Capability type definitions
    testing/
      runner.ts            ← Scenario test runner (re-exported from @bic/claws-test)
```

**Size**: ~35KB (types + decorators + mock Gateway)
**Dependencies**: none (peer dependency on @bic/claws-test for testing)
**Node.js**: 18+
**Module**: ESM with CJS fallback

---

## Core Types

### SkillManifest

The typed representation of a SKILL.md frontmatter. This is the contract between
the skill author and the claws toolchain.

```typescript
/**
 * Typed manifest for an OC skill. Corresponds to SKILL.md frontmatter.
 * Use defineManifest() for type-safe construction with validation.
 */
export interface SkillManifest {
  /** Skill name (kebab-case, unique within workspace) */
  name: string;

  /** Human-readable description */
  description: string;

  /** Semantic version */
  version: string;

  /** Tool declarations */
  tools: ToolDeclaration[];

  /** Governance annotations */
  governance: GovernanceConfig;

  /** Scenario definitions (for testing) */
  scenarios?: ScenarioDefinition[];
}

export interface ToolDeclaration {
  /** Tool name (kebab-case) */
  name: string;

  /** Human-readable description */
  description: string;

  /** Input parameters */
  inputs: ParameterDeclaration[];

  /** Output fields */
  outputs: ParameterDeclaration[];

  /** Per-tool governance overrides */
  governance?: ToolGovernance;
}

export interface ParameterDeclaration {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'string[]' | 'object';
  required: boolean;
  description: string;
  default?: unknown;
}

export interface GovernanceConfig {
  /** Risk classification (R1-R5) */
  risk: RiskLevel;

  /** Declared capabilities */
  capabilities: Capability[];

  /** Actions requiring on-behalf-of approval */
  obo: string[];

  /** Data classification labels */
  data: DataLabel[];

  /** Enable audit chain recording */
  audit: boolean;
}

export interface ToolGovernance {
  /** Per-tool risk override (must be >= skill-level risk) */
  risk?: RiskLevel;

  /** Whether this tool requires OBO approval */
  obo?: boolean;

  /** Maximum execution time in ms */
  timeout?: number;
}

export type RiskLevel = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
export type Capability = 'READ' | 'WRITE' | 'COMMUNICATE' | 'EXECUTE' | 'NETWORK' | 'ADMIN';
export type DataLabel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export interface ScenarioDefinition {
  /** Scenario name */
  name: string;

  /** User input that triggers this scenario */
  input: string;

  /** Expected tool invocations */
  expectedTools: string[];

  /** Whether OBO approval is expected */
  expectObo: boolean;

  /** Expected audit events */
  expectAudit: boolean;
}
```

### defineManifest()

Type-safe manifest construction with runtime validation:

```typescript
import { z } from 'zod';

const ManifestSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  description: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  tools: z.array(ToolDeclarationSchema).min(1),
  governance: GovernanceConfigSchema,
  scenarios: z.array(ScenarioSchema).optional(),
});

/**
 * Define a skill manifest with type checking and validation.
 *
 * @example
 * const manifest = defineManifest({
 *   name: 'email-drafter',
 *   description: 'Draft and send emails',
 *   version: '1.0.0',
 *   tools: [{ name: 'send-email', ... }],
 *   governance: { risk: 'R3', capabilities: ['COMMUNICATE'], ... },
 * });
 */
export function defineManifest(input: SkillManifest): SkillManifest {
  return ManifestSchema.parse(input);
}
```

---

## The skill() Factory

The primary API for defining a skill. Returns an OC-compatible skill definition
object that can be registered with the Gateway.

```typescript
/**
 * Define an OC skill with typed handlers and governance annotations.
 *
 * The returned object is a standard OC skill definition. The governance
 * layer (OBO gates, audit recording, budget tracking) is wired in by
 * claws build -- you write the business logic, claws handles the plumbing.
 *
 * @param name - Skill name (must match SKILL.md)
 * @param config - Skill configuration with tools and governance
 * @returns OC-compatible skill definition
 *
 * @example
 * export default skill('email-drafter', {
 *   governance: {
 *     risk: 'R3',
 *     capabilities: ['READ', 'COMMUNICATE'],
 *     obo: ['send-email'],
 *     data: ['INTERNAL'],
 *     audit: true,
 *   },
 *
 *   tools: {
 *     'send-email': {
 *       description: 'Send an email to a recipient',
 *       handler: async (input, ctx) => {
 *         return await ctx.tools.invoke('email-provider', input);
 *       },
 *     },
 *   },
 * });
 */
export function skill<T extends ToolHandlers>(
  name: string,
  config: SkillConfig<T>,
): SkillDefinition {
  // Validate governance config at construction time
  validateGovernance(config.governance);

  // Build tool handler map
  const handlers = new Map<string, ToolHandler>();
  for (const [toolName, toolConfig] of Object.entries(config.tools)) {
    handlers.set(toolName, toolConfig.handler);
  }

  return {
    name,
    version: config.version ?? '1.0.0',
    description: config.description ?? '',
    governance: config.governance,
    handlers,

    // OC-native lifecycle hooks
    async onToolCall(tool, context) {
      const handler = handlers.get(tool.name);
      if (!handler) {
        return { error: `Unknown tool: ${tool.name}` };
      }
      return handler(tool.args, context);
    },
  };
}

export interface SkillConfig<T extends ToolHandlers> {
  version?: string;
  description?: string;
  governance: GovernanceConfig;
  tools: T;
}

export type ToolHandlers = Record<string, {
  description: string;
  handler: ToolHandler;
}>;

export type ToolHandler = (
  input: Record<string, unknown>,
  ctx: SkillContext,
) => Promise<Record<string, unknown>>;

export interface SkillContext {
  user: { id: string };
  tools: { invoke: (name: string, args: Record<string, unknown>) => Promise<any> };
  audit?: { append: (event: AuditEntry) => Promise<void> };
  model?: { complete: (opts: { prompt: string; max_tokens: number }) => Promise<{ text: string }> };
}

export interface AuditEntry {
  action: string;
  target: string;
  outcome: string;
  reason?: string;
}
```

---

## Decorators

Decorators annotate tool handlers with governance behavior. They are resolved
at build time by `claws build` -- the decorator metadata drives code generation.

The decorators use TypeScript 5.0 stage 3 decorator syntax. They work as
standard method decorators AND as build-time annotations that claws reads.

### @obo -- On-Behalf-Of Approval

```typescript
/**
 * Mark a tool handler as requiring human approval before execution.
 *
 * When claws build processes this decorator, it generates an elicitation
 * gate that wraps the handler. At runtime, the OC Gateway's exec-approvals
 * API is called before the handler executes.
 *
 * @param options - Approval configuration
 *
 * @example
 * class EmailDrafter {
 *   @obo({ mode: 'inline', timeout: 60_000 })
 *   async sendEmail(input: SendEmailInput, ctx: SkillContext) {
 *     return await ctx.tools.invoke('email-provider', input);
 *   }
 * }
 */
export function obo(options?: OboOptions) {
  return function (
    target: any,
    context: ClassMethodDecoratorContext,
  ) {
    // Store metadata for claws build to read
    setMetadata(context.metadata, 'claws:obo', {
      mode: options?.mode ?? 'inline',
      timeout: options?.timeout ?? 60_000,
      fallback: options?.fallback ?? 'deny',
    });
  };
}

export interface OboOptions {
  /**
   * Approval mode:
   * - 'inline': Show approval prompt in the current conversation
   * - 'async': Send approval request to a channel (Slack, Teams)
   * - 'batch': Collect multiple approvals into a single prompt
   */
  mode?: 'inline' | 'async' | 'batch';

  /** Timeout in ms before fallback behavior triggers */
  timeout?: number;

  /** Behavior when approval times out */
  fallback?: 'deny' | 'allow';

  /** Custom approval message template */
  message?: string;
}
```

### @audit -- Audit Chain Recording

```typescript
/**
 * Record tool invocations to the governance audit chain.
 *
 * When claws build processes this decorator, it generates pre/post audit
 * recording around the handler. Every invocation is recorded with the
 * tool name, arguments hash, outcome, and operator identity.
 *
 * @example
 * class EmailDrafter {
 *   @audit()
 *   async sendEmail(input: SendEmailInput, ctx: SkillContext) {
 *     return await ctx.tools.invoke('email-provider', input);
 *   }
 * }
 */
export function audit(options?: AuditOptions) {
  return function (
    target: any,
    context: ClassMethodDecoratorContext,
  ) {
    setMetadata(context.metadata, 'claws:audit', {
      includeArgs: options?.includeArgs ?? false,
      includeOutput: options?.includeOutput ?? false,
      redactPatterns: options?.redactPatterns ?? [],
    });
  };
}

export interface AuditOptions {
  /** Include tool arguments in audit record (default: false for privacy) */
  includeArgs?: boolean;

  /** Include tool output in audit record (default: false for size) */
  includeOutput?: boolean;

  /** Regex patterns to redact from audit records */
  redactPatterns?: string[];
}
```

### @classify -- Risk Classification

```typescript
/**
 * Declare the risk classification for a specific tool handler.
 *
 * When the tool-level risk differs from the skill-level risk, use @classify
 * to override. The risk level must be >= the skill-level risk (you can
 * escalate, not de-escalate).
 *
 * @param toolName - The tool being classified
 * @param config - Risk and OBO configuration for this tool
 *
 * @example
 * class EmailDrafter {
 *   @classify('send-email', { risk: 'R5', obo: true })
 *   async sendEmail(input: SendEmailInput, ctx: SkillContext) {
 *     return await ctx.tools.invoke('email-provider', input);
 *   }
 * }
 */
export function classify(toolName: string, config: ClassifyConfig) {
  return function (
    target: any,
    context: ClassMethodDecoratorContext,
  ) {
    setMetadata(context.metadata, 'claws:classify', {
      tool: toolName,
      risk: config.risk,
      obo: config.obo ?? false,
      justification: config.justification,
    });
  };
}

export interface ClassifyConfig {
  /** Risk level for this specific tool */
  risk: RiskLevel;

  /** Whether this tool requires OBO approval */
  obo?: boolean;

  /** Why this risk level was assigned */
  justification?: string;
}
```

### @validate -- Input/Output Validation

```typescript
/**
 * Validate tool inputs and outputs at runtime.
 *
 * Uses the type information from SKILL.md tool declarations to generate
 * runtime validation. When claws build processes this decorator, it generates
 * Zod schemas from the parameter declarations.
 *
 * @example
 * class EmailDrafter {
 *   @validate()
 *   async sendEmail(input: SendEmailInput, ctx: SkillContext) {
 *     // input is guaranteed to match SendEmailInput shape
 *     return await ctx.tools.invoke('email-provider', input);
 *   }
 * }
 */
export function validate(options?: ValidateOptions) {
  return function (
    target: any,
    context: ClassMethodDecoratorContext,
  ) {
    setMetadata(context.metadata, 'claws:validate', {
      input: options?.input ?? true,
      output: options?.output ?? true,
      strict: options?.strict ?? false,
    });
  };
}

export interface ValidateOptions {
  /** Validate input parameters (default: true) */
  input?: boolean;

  /** Validate output shape (default: true) */
  output?: boolean;

  /** Reject unknown fields (default: false -- allows extra fields) */
  strict?: boolean;
}
```

### @budget -- Cost Tracking

```typescript
/**
 * Track execution cost for budget enforcement.
 *
 * Records token usage, call count, and elapsed time against the workspace
 * budget. When the budget is exhausted, subsequent calls are denied.
 *
 * @example
 * class EmailDrafter {
 *   @budget({ maxTokens: 5000 })
 *   async sendEmail(input: SendEmailInput, ctx: SkillContext) {
 *     return await ctx.tools.invoke('email-provider', input);
 *   }
 * }
 */
export function budget(options?: BudgetOptions) {
  return function (
    target: any,
    context: ClassMethodDecoratorContext,
  ) {
    setMetadata(context.metadata, 'claws:budget', {
      maxTokens: options?.maxTokens,
      maxCalls: options?.maxCalls,
      maxDuration: options?.maxDuration,
    });
  };
}

export interface BudgetOptions {
  /** Maximum token budget for this tool */
  maxTokens?: number;

  /** Maximum invocation count */
  maxCalls?: number;

  /** Maximum execution time in ms */
  maxDuration?: number;
}
```

### @timeout -- Execution Time Limit

```typescript
/**
 * Set a maximum execution time for a tool handler.
 *
 * @example
 * class EmailDrafter {
 *   @timeout(30_000)
 *   async sendEmail(input: SendEmailInput, ctx: SkillContext) {
 *     return await ctx.tools.invoke('email-provider', input);
 *   }
 * }
 */
export function timeout(ms: number) {
  return function (
    target: any,
    context: ClassMethodDecoratorContext,
  ) {
    setMetadata(context.metadata, 'claws:timeout', { ms });
  };
}
```

---

## Mock Gateway

For testing skills locally without a real OC Gateway:

```typescript
import { MockGateway } from '@bic/claws-skill-kit/gateway/mock';

/**
 * Mock OC Gateway for local skill testing.
 *
 * Simulates the Gateway's tool invocation API, approval flow, model API,
 * and audit chain. Records all interactions for assertion.
 *
 * @example
 * const gateway = MockGateway.create({
 *   user: { id: 'test-user' },
 *   approvals: { 'send-email': true },
 *   tools: {
 *     'email-provider': async (args) => ({ messageId: 'msg-001' }),
 *   },
 * });
 *
 * const result = await mySkill.onToolCall(
 *   { name: 'send-email', args: { to: 'jane@acme.com', subject: 'Hi' } },
 *   gateway.context,
 * );
 *
 * expect(gateway.calls).toHaveLength(1);
 * expect(gateway.approvals).toHaveLength(1);
 * expect(gateway.auditEvents).toHaveLength(1);
 */
export class MockGateway {
  /** All tool invocations recorded during test */
  readonly calls: ToolCall[] = [];

  /** All approval requests recorded during test */
  readonly approvals: ApprovalRequest[] = [];

  /** All audit events recorded during test */
  readonly auditEvents: AuditEvent[] = [];

  /** All model completions recorded during test */
  readonly completions: ModelCompletion[] = [];

  /** The SkillContext to pass to handlers */
  readonly context: SkillContext;

  static create(config: MockGatewayConfig): MockGateway {
    return new MockGateway(config);
  }

  private constructor(private config: MockGatewayConfig) {
    this.context = this.buildContext();
  }

  private buildContext(): SkillContext {
    return {
      user: this.config.user ?? { id: 'test-user' },
      tools: {
        invoke: async (name, args) => {
          this.calls.push({ name, args, timestamp: new Date().toISOString() });
          const handler = this.config.tools?.[name];
          if (!handler) {
            throw new Error(`MockGateway: no handler for tool '${name}'`);
          }
          return handler(args);
        },
      },
      audit: {
        append: async (event) => {
          this.auditEvents.push({
            ...event,
            timestamp: new Date().toISOString(),
          });
        },
      },
      model: {
        complete: async (opts) => {
          const response = this.config.modelResponses?.shift() ?? { text: 'mock response' };
          this.completions.push({
            prompt: opts.prompt,
            response: response.text,
            timestamp: new Date().toISOString(),
          });
          return response;
        },
      },
    };
  }

  /** Reset all recorded interactions */
  reset(): void {
    this.calls.length = 0;
    this.approvals.length = 0;
    this.auditEvents.length = 0;
    this.completions.length = 0;
  }
}

export interface MockGatewayConfig {
  /** Simulated user identity */
  user?: { id: string };

  /** Approval decisions by tool name (true = approve, false = deny) */
  approvals?: Record<string, boolean>;

  /** Mock tool handlers by name */
  tools?: Record<string, (args: Record<string, unknown>) => Promise<any>>;

  /** Queued model completion responses (consumed in order) */
  modelResponses?: Array<{ text: string }>;
}

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  timestamp: string;
}

interface ApprovalRequest {
  tool: string;
  user: string;
  approved: boolean;
  timestamp: string;
}

interface AuditEvent {
  action: string;
  target: string;
  outcome: string;
  reason?: string;
  timestamp: string;
}

interface ModelCompletion {
  prompt: string;
  response: string;
  timestamp: string;
}
```

---

## Governance Schema

Zod schema for governance annotations, used for validation at build and runtime:

```typescript
import { z } from 'zod';

export const RiskLevelSchema = z.enum(['R1', 'R2', 'R3', 'R4', 'R5']);

export const CapabilitySchema = z.enum([
  'READ', 'WRITE', 'COMMUNICATE', 'EXECUTE', 'NETWORK', 'ADMIN',
]);

export const DataLabelSchema = z.enum([
  'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED',
]);

export const GovernanceConfigSchema = z.object({
  risk: RiskLevelSchema,
  capabilities: z.array(CapabilitySchema).min(1),
  obo: z.array(z.string()).default([]),
  data: z.array(DataLabelSchema).min(1),
  audit: z.boolean().default(false),
});

export const ToolGovernanceSchema = z.object({
  risk: RiskLevelSchema.optional(),
  obo: z.boolean().optional(),
  timeout: z.number().positive().optional(),
});
```

---

## Example 1: Simple Read-Only Skill

A knowledge-base search skill. Risk R1, no OBO, no audit chain. The simplest
possible governed skill.

```typescript
import { skill } from '@bic/claws-skill-kit';

export default skill('kb-search', {
  description: 'Search the knowledge base',
  version: '1.0.0',

  governance: {
    risk: 'R1',
    capabilities: ['READ'],
    obo: [],
    data: ['INTERNAL'],
    audit: false,
  },

  tools: {
    'search': {
      description: 'Search the knowledge base by query',
      handler: async (input, ctx) => {
        const results = await ctx.tools.invoke('kb-provider', {
          query: input.query,
          limit: input.limit ?? 10,
        });
        return { results: results.items, count: results.total };
      },
    },
  },
});
```

**What the developer writes**: 25 lines. Pure business logic.
**What claws generates at build**: input validation, type checking, governance
badge metadata. No OBO gate (not needed). No audit chain (not enabled).

---

## Example 2: OBO Communication Skill

An email-sending skill with approval gates. Risk R3, OBO on send actions,
full audit chain. Uses all governance decorators.

```typescript
import { skill, obo, audit, classify, validate, budget } from '@bic/claws-skill-kit';
import type { SendEmailInput, DraftEmailInput, ListRecentInput } from './types';

class EmailDrafter {
  @classify('send-email', { risk: 'R5', obo: true })
  @obo({ mode: 'inline', timeout: 60_000 })
  @audit({ includeArgs: false })
  @validate()
  @budget({ maxTokens: 5000 })
  async sendEmail(input: SendEmailInput, ctx: SkillContext) {
    // claws generates the approval flow around this handler.
    // The developer only writes the business logic.
    const result = await ctx.tools.invoke('email-provider', {
      action: 'send',
      to: input.to,
      subject: input.subject,
      body: input.body,
    });
    return { messageId: result.messageId, sent: true };
  }

  @audit()
  @validate()
  async draftEmail(input: DraftEmailInput, ctx: SkillContext) {
    // No OBO needed for drafts
    return {
      draftId: 'draft-' + Date.now(),
      preview: `To: ${input.to}\nSubject: ${input.subject}\n\n${input.body}`,
    };
  }

  @validate()
  async listRecent(input: ListRecentInput, ctx: SkillContext) {
    const emails = await ctx.tools.invoke('email-provider', {
      action: 'list',
      count: input.count ?? 10,
    });
    return { emails: emails.items };
  }
}

export default skill('email-drafter', {
  description: 'Draft and send emails on behalf of the user',
  version: '2.0.0',

  governance: {
    risk: 'R3',
    capabilities: ['READ', 'COMMUNICATE'],
    obo: ['send-email'],
    data: ['INTERNAL'],
    audit: true,
  },

  tools: {
    'send-email': {
      description: 'Send an email to a recipient (requires approval)',
      handler: new EmailDrafter().sendEmail.bind(new EmailDrafter()),
    },
    'draft-email': {
      description: 'Draft an email without sending',
      handler: new EmailDrafter().draftEmail.bind(new EmailDrafter()),
    },
    'list-recent': {
      description: 'List recent sent emails',
      handler: new EmailDrafter().listRecent.bind(new EmailDrafter()),
    },
  },
});
```

**What claws generates at build**:
- OBO gate wrapping sendEmail (calls `elicit()` from @claws/runtime)
- Audit chain recording for sendEmail and draftEmail
- Input validation schemas for all three tools
- Budget tracking for sendEmail
- Risk classification in the skill manifest

The decorator metadata tells claws WHAT to generate. The generated code uses
@claws/runtime functions. The developer never sees the generated governance layer.

---

## Example 3: Complex Multi-Tool Skill

A deployment orchestrator skill with A2A delegation, multi-step approval,
conditional execution, and comprehensive audit. Risk R4, multiple OBO actions.

```typescript
import {
  skill,
  obo,
  audit,
  classify,
  validate,
  budget,
  timeout,
} from '@bic/claws-skill-kit';

class DeployOrchestrator {
  @classify('deploy', { risk: 'R5', obo: true, justification: 'Production deployment' })
  @obo({ mode: 'batch', timeout: 300_000, fallback: 'deny' })
  @audit({ includeArgs: true })
  @validate({ strict: true })
  @budget({ maxTokens: 50_000, maxCalls: 100 })
  @timeout(600_000)
  async deploy(input: DeployInput, ctx: SkillContext) {
    // Step 1: Validate deployment target
    const target = await ctx.tools.invoke('infra-provider', {
      action: 'describe',
      environment: input.environment,
    });

    if (!target.healthy) {
      return { deployed: false, reason: 'Target environment unhealthy' };
    }

    // Step 2: Run pre-deploy checks
    const checks = await ctx.tools.invoke('test-runner', {
      suite: 'pre-deploy',
      environment: input.environment,
    });

    if (!checks.passed) {
      return { deployed: false, reason: `Pre-deploy checks failed: ${checks.summary}` };
    }

    // Step 3: Execute deployment
    const result = await ctx.tools.invoke('deploy-provider', {
      artifact: input.artifact,
      environment: input.environment,
      strategy: input.strategy ?? 'rolling',
    });

    return {
      deployed: true,
      deploymentId: result.id,
      url: result.url,
    };
  }

  @classify('rollback', { risk: 'R5', obo: true })
  @obo({ mode: 'inline', timeout: 120_000 })
  @audit({ includeArgs: true, includeOutput: true })
  @validate()
  async rollback(input: RollbackInput, ctx: SkillContext) {
    const result = await ctx.tools.invoke('deploy-provider', {
      action: 'rollback',
      deploymentId: input.deploymentId,
    });
    return { rolledBack: true, previousVersion: result.previousVersion };
  }

  @classify('status', { risk: 'R2' })
  @audit()
  @validate()
  async status(input: StatusInput, ctx: SkillContext) {
    const deployments = await ctx.tools.invoke('deploy-provider', {
      action: 'list',
      environment: input.environment,
      limit: input.limit ?? 5,
    });
    return { deployments: deployments.items };
  }

  @classify('delegate', { risk: 'R4', obo: true, justification: 'A2A sub-agent dispatch' })
  @obo({ mode: 'inline', timeout: 60_000 })
  @audit({ includeArgs: true })
  async delegateToAgent(input: DelegateInput, ctx: SkillContext) {
    // Delegate to a sub-agent for specialized tasks
    // claws generates A2A depth checking around this call
    const result = await ctx.tools.invoke('agent-dispatch', {
      agent: input.agentName,
      task: input.task,
      context: input.context,
    });
    return { delegated: true, agentResult: result };
  }
}

interface DeployInput {
  artifact: string;
  environment: 'staging' | 'production';
  strategy?: 'rolling' | 'blue-green' | 'canary';
}

interface RollbackInput {
  deploymentId: string;
}

interface StatusInput {
  environment?: string;
  limit?: number;
}

interface DelegateInput {
  agentName: string;
  task: string;
  context?: Record<string, unknown>;
}

const orchestrator = new DeployOrchestrator();

export default skill('deploy-orchestrator', {
  description: 'Orchestrate deployments with governance controls',
  version: '1.0.0',

  governance: {
    risk: 'R4',
    capabilities: ['READ', 'WRITE', 'EXECUTE', 'NETWORK'],
    obo: ['deploy', 'rollback', 'delegate'],
    data: ['INTERNAL', 'CONFIDENTIAL'],
    audit: true,
  },

  tools: {
    'deploy': {
      description: 'Deploy an artifact to an environment (requires approval)',
      handler: orchestrator.deploy.bind(orchestrator),
    },
    'rollback': {
      description: 'Rollback a deployment (requires approval)',
      handler: orchestrator.rollback.bind(orchestrator),
    },
    'status': {
      description: 'Check deployment status',
      handler: orchestrator.status.bind(orchestrator),
    },
    'delegate': {
      description: 'Delegate a task to a sub-agent (requires approval)',
      handler: orchestrator.delegateToAgent.bind(orchestrator),
    },
  },
});
```

**What claws generates at build**:
- OBO gates on deploy, rollback, and delegate (batch mode for deploy, inline for others)
- A2A depth checking around delegateToAgent (uses `checkA2A()` from @claws/runtime)
- Full audit chain for all four tools
- Input validation with strict mode on deploy
- Budget tracking (50K tokens, 100 calls)
- 10-minute timeout on deploy
- Risk escalation (skill R4, but deploy/rollback are R5)

---

## Decorator Composition Model

Decorators compose vertically (multiple decorators on one handler) and the
execution order is deterministic:

```
Request arrives
  │
  ├─ @validate  ← Input validation (fail fast)
  ├─ @classify  ← Risk assessment
  ├─ @budget    ← Budget check (deny if exhausted)
  ├─ @obo       ← Approval gate (if needed)
  ├─ @timeout   ← Execution time limit starts
  │
  │  handler()  ← Business logic runs here
  │
  ├─ @timeout   ← Time limit ends
  ├─ @validate  ← Output validation
  ├─ @audit     ← Record to audit chain
  ├─ @budget    ← Record actual cost
  │
  v
Response returned
```

This is the same order that claws generates in the governance guard wrapper.
The decorators are metadata -- claws uses them to generate the wrapper code.

---

## Public Exports

```typescript
// @bic/claws-skill-kit/index.ts

// Core
export { skill, type SkillConfig, type SkillDefinition, type ToolHandler, type SkillContext } from './skill';
export { defineManifest, type SkillManifest, type ToolDeclaration, type GovernanceConfig } from './manifest';

// Decorators
export { obo, type OboOptions } from './decorators/obo';
export { audit, type AuditOptions } from './decorators/audit';
export { classify, type ClassifyConfig } from './decorators/classify';
export { validate, type ValidateOptions } from './decorators/validate';
export { budget, type BudgetOptions } from './decorators/budget';
export { timeout } from './decorators/timeout';

// Types
export type { RiskLevel, Capability, DataLabel, ScenarioDefinition } from './manifest';
export type { ParameterDeclaration, ToolGovernance } from './manifest';

// Governance schema (for validation)
export {
  GovernanceConfigSchema,
  RiskLevelSchema,
  CapabilitySchema,
  DataLabelSchema,
} from './governance/schema';

// Mock Gateway (for testing)
export { MockGateway, type MockGatewayConfig } from './gateway/mock';
```

### What is NOT Exported

- No Craftworks types (no RelaxExpression, no DataFrame, no WorkAgentSupervisor)
- No compiler internals (no IR types, no pass types, no emitter types)
- No @craftworks/* imports anywhere in the public API
- No Result<T> monads -- plain objects with boolean `ok` fields
- No FSM types -- governance state is handled internally

The entire @bic/claws-skill-kit public surface is expressible in terms an OC developer
already knows: tool handlers, skill definitions, governance labels, and approval flows.
