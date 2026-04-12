# exp-d: @bic/claws-test Framework

**Question**: Q12o -- How does claws help makers create skills?
**Experiment**: Design the skill testing framework
**Method**: Design analysis
**Date**: 2026-04-11

---

## Overview

@bic/claws-test is the testing framework for OC skills built with claws. It provides:

1. **Mock Gateway** -- simulates the OC Gateway runtime environment
2. **Mock Tools** -- simulates tool calls with configurable responses
3. **Scenario Runner** -- plays through skill execution paths from SKILL.md
4. **Governance Validator** -- checks declared policy vs actual behavior
5. **Security Scanner** -- detects injection patterns and secret leaks

The framework extends vitest (the standard OC test runner) with skill-specific
utilities. An OC developer uses familiar `describe`/`it`/`expect` patterns.

---

## Package Overview

```
@bic/claws-test
  src/
    index.ts                ← barrel export
    runner/
      scenario-runner.ts    ← Execute SKILL.md scenarios against a skill
      skill-harness.ts      ← Harness that wraps a skill for testing
    gateway/
      mock-gateway.ts       ← Full OC Gateway mock (re-exports from skill-kit)
      mock-tools.ts         ← Configurable tool call mocks
      mock-model.ts         ← Mock LLM model responses
      mock-approval.ts      ← Mock OBO approval flow
    governance/
      policy-validator.ts   ← Validate declared vs actual governance
      risk-checker.ts       ← Verify risk classification consistency
      obo-checker.ts        ← Verify OBO flows fire correctly
      audit-checker.ts      ← Verify audit chain recording
      capability-checker.ts ← Verify capability declarations
    security/
      injection-scanner.ts  ← Detect prompt injection patterns
      secret-scanner.ts     ← Detect hardcoded secrets
      eval-scanner.ts       ← Detect dangerous eval/Function usage
      input-sanitizer.ts    ← Verify input validation
    matchers/
      governance.ts         ← Custom vitest matchers for governance assertions
```

**Size**: ~45KB
**Dependencies**: vitest (peer), @bic/claws-skill-kit (peer)
**Node.js**: 18+

---

## Scenario Runner

The scenario runner reads SKILL.md scenarios and executes them against the built
skill, comparing actual behavior against expected behavior.

### API

```typescript
import { runScenarios, type ScenarioResult } from '@bic/claws-test';

/**
 * Run all scenarios defined in a SKILL.md file against the built skill.
 *
 * @param skillPath - Path to the skill directory (contains SKILL.md + dist/)
 * @param options   - Runner configuration
 * @returns Array of scenario results
 *
 * @example
 * const results = await runScenarios('./email-drafter');
 * expect(results.every(r => r.passed)).toBe(true);
 */
export async function runScenarios(
  skillPath: string,
  options?: ScenarioRunnerOptions,
): Promise<ScenarioResult[]>;

export interface ScenarioRunnerOptions {
  /** Only run scenarios matching this filter */
  filter?: string | RegExp;

  /** Mock tool responses (keyed by tool name) */
  tools?: Record<string, (args: Record<string, unknown>) => Promise<any>>;

  /** Mock approval decisions (keyed by tool name) */
  approvals?: Record<string, boolean>;

  /** Mock model responses (consumed in order) */
  modelResponses?: Array<{ text: string }>;

  /** Timeout per scenario in ms (default: 30_000) */
  timeout?: number;

  /** Whether to check governance assertions (default: true) */
  governance?: boolean;

  /** Whether to check security assertions (default: true) */
  security?: boolean;
}

export interface ScenarioResult {
  /** Scenario name from SKILL.md */
  name: string;

  /** Whether all assertions passed */
  passed: boolean;

  /** Individual assertion results */
  assertions: AssertionResult[];

  /** Execution time in ms */
  duration: number;

  /** Tool calls made during this scenario */
  toolCalls: ToolCall[];

  /** Approval requests made during this scenario */
  approvalRequests: ApprovalRequest[];

  /** Audit events recorded during this scenario */
  auditEvents: AuditEvent[];

  /** Error if the scenario threw */
  error?: Error;
}

export interface AssertionResult {
  /** What was checked */
  description: string;

  /** Whether it passed */
  passed: boolean;

  /** Expected value */
  expected?: unknown;

  /** Actual value */
  actual?: unknown;

  /** Assertion category */
  category: 'tool' | 'governance' | 'security' | 'output';
}
```

### Usage in Tests

```typescript
import { describe, it, expect } from 'vitest';
import { runScenarios } from '@bic/claws-test';

describe('email-drafter scenarios', () => {
  it('should pass all SKILL.md scenarios', async () => {
    const results = await runScenarios('./email-drafter', {
      tools: {
        'email-provider': async (args) => {
          if (args.action === 'send') {
            return { messageId: 'msg-001', sent: true };
          }
          if (args.action === 'list') {
            return { items: [{ id: '1', to: 'jane@acme.com', subject: 'Hi' }] };
          }
          return {};
        },
      },
      approvals: { 'send-email': true },
    });

    for (const result of results) {
      expect(result.passed, `Scenario "${result.name}" failed`).toBe(true);
    }
  });

  it('should deny send-email when approval is rejected', async () => {
    const results = await runScenarios('./email-drafter', {
      filter: 'Send a meeting invite',
      approvals: { 'send-email': false },  // Deny the approval
    });

    const sendScenario = results[0];
    expect(sendScenario.approvalRequests).toHaveLength(1);
    // The send should have been denied because approval was rejected
  });
});
```

---

## Skill Harness

A test harness that wraps a skill for isolated testing with full instrumentation:

```typescript
import { SkillHarness } from '@bic/claws-test';

/**
 * Wrap a skill for testing. Provides instrumented context, assertion helpers,
 * and governance checking.
 *
 * @example
 * const harness = await SkillHarness.load('./email-drafter');
 *
 * const result = await harness.invoke('send-email', {
 *   to: 'jane@acme.com',
 *   subject: 'Meeting invite',
 *   body: 'Let us meet tomorrow at 2pm',
 * });
 *
 * expect(result.output.sent).toBe(true);
 * expect(harness.oboRequests).toHaveLength(1);
 * expect(harness.auditEvents).toHaveLength(1);
 */
export class SkillHarness {
  /** All tool calls made through this harness */
  readonly toolCalls: ToolCall[] = [];

  /** All OBO approval requests made through this harness */
  readonly oboRequests: ApprovalRequest[] = [];

  /** All audit events recorded through this harness */
  readonly auditEvents: AuditEvent[] = [];

  /** All model completions made through this harness */
  readonly completions: ModelCompletion[] = [];

  /**
   * Load a skill from disk and create a test harness.
   *
   * @param skillPath - Path to the skill directory
   * @param config    - Harness configuration
   */
  static async load(skillPath: string, config?: HarnessConfig): Promise<SkillHarness>;

  /**
   * Invoke a tool on the skill under test.
   *
   * @param toolName - Name of the tool to invoke
   * @param args     - Tool arguments
   * @returns Invocation result with output and instrumentation
   */
  async invoke(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<InvokeResult>;

  /** Reset all recorded interactions */
  reset(): void;
}

export interface HarnessConfig {
  /** Simulated user identity */
  user?: { id: string };

  /** Mock tool handlers */
  tools?: Record<string, (args: Record<string, unknown>) => Promise<any>>;

  /** Approval decisions by tool name */
  approvals?: Record<string, boolean>;

  /** Model responses (consumed in order) */
  modelResponses?: Array<{ text: string }>;
}

export interface InvokeResult {
  /** Tool output (or error) */
  output: Record<string, unknown>;

  /** Whether the invocation succeeded */
  ok: boolean;

  /** Time taken in ms */
  duration: number;

  /** Whether OBO approval was requested */
  oboRequested: boolean;

  /** Whether the action was approved (if OBO was requested) */
  approved?: boolean;

  /** Audit events generated during this invocation */
  auditEvents: AuditEvent[];
}
```

---

## Mock Tools

Configurable mock tool responses with recording:

```typescript
import { MockTools } from '@bic/claws-test';

/**
 * Create a mock tool registry for testing.
 *
 * @example
 * const tools = MockTools.create({
 *   'email-provider': {
 *     send: async (args) => ({ messageId: 'msg-001' }),
 *     list: async (args) => ({ items: [] }),
 *   },
 *   'kb-provider': {
 *     query: async (args) => ({ items: [{ title: 'Answer' }], total: 1 }),
 *   },
 * });
 *
 * // Use in harness
 * const harness = await SkillHarness.load('./my-skill', { tools: tools.handlers });
 *
 * // Check what was called
 * expect(tools.calls('email-provider')).toHaveLength(1);
 * expect(tools.calls('email-provider')[0].args).toEqual({ action: 'send', to: '...' });
 */
export class MockTools {
  static create(
    handlers: Record<string, Record<string, (args: Record<string, unknown>) => Promise<any>>>,
  ): MockTools;

  /** Get all calls to a specific tool */
  calls(toolName: string): ToolCall[];

  /** Get all calls across all tools */
  allCalls(): ToolCall[];

  /** Reset all recorded calls */
  reset(): void;

  /** The handler map to pass to SkillHarness */
  get handlers(): Record<string, (args: Record<string, unknown>) => Promise<any>>;
}
```

---

## Mock Approval Flow

Configurable OBO approval simulation:

```typescript
import { MockApproval } from '@bic/claws-test';

/**
 * Mock the OBO approval flow for testing.
 *
 * @example
 * // Always approve
 * const approval = MockApproval.alwaysApprove();
 *
 * // Always deny
 * const approval = MockApproval.alwaysDeny();
 *
 * // Approve specific tools, deny others
 * const approval = MockApproval.selective({
 *   'send-email': true,
 *   'delete-file': false,
 * });
 *
 * // Simulate timeout
 * const approval = MockApproval.timeout();
 *
 * // Custom logic
 * const approval = MockApproval.custom(async (tool, user) => {
 *   return tool.risk <= 3; // Auto-approve low risk
 * });
 */
export class MockApproval {
  static alwaysApprove(): MockApproval;
  static alwaysDeny(): MockApproval;
  static timeout(): MockApproval;
  static selective(decisions: Record<string, boolean>): MockApproval;
  static custom(fn: (tool: ToolInvocation, user: string) => Promise<boolean>): MockApproval;

  /** All approval requests made */
  readonly requests: ApprovalRequest[];

  /** Reset recorded requests */
  reset(): void;
}
```

---

## Governance Validator

Validates that the skill's actual behavior matches its declared governance:

```typescript
import { GovernanceValidator, type GovernanceReport } from '@bic/claws-test';

/**
 * Validate a skill's governance declarations against its actual behavior.
 *
 * @example
 * const validator = GovernanceValidator.fromSkill('./email-drafter');
 * const report = await validator.validate();
 *
 * expect(report.passed).toBe(true);
 * expect(report.findings).toHaveLength(0);
 */
export class GovernanceValidator {
  static fromSkill(skillPath: string): GovernanceValidator;

  /**
   * Run all governance checks and produce a report.
   */
  async validate(): Promise<GovernanceReport>;
}

export interface GovernanceReport {
  /** Whether all checks passed */
  passed: boolean;

  /** Individual check results */
  checks: GovernanceCheck[];

  /** Findings (violations or warnings) */
  findings: GovernanceFinding[];

  /** Summary statistics */
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export interface GovernanceCheck {
  /** Check identifier */
  id: string;

  /** Human-readable description */
  description: string;

  /** Whether it passed */
  passed: boolean;

  /** Category */
  category: 'risk' | 'obo' | 'capability' | 'data' | 'audit';
}

export interface GovernanceFinding {
  /** Severity */
  severity: 'error' | 'warning';

  /** Check that produced this finding */
  checkId: string;

  /** Description */
  message: string;

  /** Suggested fix */
  fix?: string;
}
```

### Governance Checks

| Check ID | Category | Description | Passes when |
|----------|----------|-------------|-------------|
| `G-RISK-DECLARED` | risk | Risk level is declared | governance.risk is R1-R5 |
| `G-RISK-CONSISTENT` | risk | Per-tool risk >= skill risk | No tool de-escalates |
| `G-OBO-GATES` | obo | OBO tools have approval gates | All obo[] tools call elicit() |
| `G-OBO-NON-OBO` | obo | Non-OBO tools skip approval | Tools not in obo[] never call elicit() |
| `G-OBO-FALLBACK` | obo | OBO timeout defaults to deny | Timeout fallback is 'deny' |
| `G-CAP-DECLARED` | capability | Capabilities are declared | governance.capabilities is non-empty |
| `G-CAP-COVERS` | capability | Capabilities cover tool actions | WRITE if tool writes, NETWORK if tool calls APIs |
| `G-CAP-MINIMAL` | capability | No over-declared capabilities | No capability without a matching tool |
| `G-DATA-DECLARED` | data | Data labels are declared | governance.data is non-empty |
| `G-AUDIT-ENABLED` | audit | Audit chain is recording | governance.audit: true and events are written |
| `G-AUDIT-OBO` | audit | OBO decisions are audited | Every elicit() result is followed by audit() |
| `G-AUDIT-DENY` | audit | Denials are audited | Every deny decision is followed by audit() |

### Example Governance Validation Output

```
$ claws test --governance

  Governance validation: email-drafter

  Risk:
    ✓ G-RISK-DECLARED: Risk level R3 declared
    ✓ G-RISK-CONSISTENT: send-email R5 >= skill R3 (escalation OK)
    ✓ G-RISK-CONSISTENT: draft-email R3 == skill R3
    ✓ G-RISK-CONSISTENT: list-recent R1 <= skill R3 (de-escalation OK for reads)

  OBO:
    ✓ G-OBO-GATES: send-email has approval gate (elicit called)
    ✓ G-OBO-NON-OBO: draft-email does not call elicit()
    ✓ G-OBO-NON-OBO: list-recent does not call elicit()
    ✓ G-OBO-FALLBACK: send-email timeout fallback is 'deny'

  Capabilities:
    ✓ G-CAP-DECLARED: [READ, COMMUNICATE] declared
    ✓ G-CAP-COVERS: COMMUNICATE covers send-email
    ✓ G-CAP-COVERS: READ covers list-recent
    ✓ G-CAP-MINIMAL: No over-declared capabilities

  Data:
    ✓ G-DATA-DECLARED: [INTERNAL] declared

  Audit:
    ✓ G-AUDIT-ENABLED: Audit chain active
    ✓ G-AUDIT-OBO: send-email OBO decision audited
    ✓ G-AUDIT-DENY: Denial paths audited

  15/15 checks passed, 0 findings
```

---

## Security Scanner

Detects common security issues in skill handler code:

```typescript
import { SecurityScanner, type SecurityReport } from '@bic/claws-test';

/**
 * Scan a skill's source code for security issues.
 *
 * @example
 * const scanner = SecurityScanner.fromSkill('./email-drafter');
 * const report = await scanner.scan();
 *
 * expect(report.findings).toHaveLength(0);
 */
export class SecurityScanner {
  static fromSkill(skillPath: string): SecurityScanner;

  /**
   * Run all security scans and produce a report.
   */
  async scan(): Promise<SecurityReport>;
}

export interface SecurityReport {
  /** Whether all scans passed (no high/critical findings) */
  passed: boolean;

  /** Individual findings */
  findings: SecurityFinding[];

  /** Summary */
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

export interface SecurityFinding {
  /** Severity */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';

  /** Scanner that found the issue */
  scanner: 'injection' | 'secret' | 'eval' | 'input';

  /** File and line where the issue was found */
  location: { file: string; line: number; column: number };

  /** Description of the issue */
  message: string;

  /** Suggested fix */
  fix?: string;

  /** CWE identifier if applicable */
  cwe?: string;
}
```

### Security Scan Rules

#### Injection Scanner

| Rule | Severity | Pattern | Description |
|------|----------|---------|-------------|
| `SEC-INJ-001` | critical | `${user_input}` in prompt | User input interpolated into LLM prompt |
| `SEC-INJ-002` | critical | User input in bash command | Command injection via user input |
| `SEC-INJ-003` | high | Unescaped user input in SQL/query | Query injection |
| `SEC-INJ-004` | medium | User input in file path | Path traversal |
| `SEC-INJ-005` | medium | User input in regex | ReDoS via user-controlled regex |

#### Secret Scanner

| Rule | Severity | Pattern | Description |
|------|----------|---------|-------------|
| `SEC-SEC-001` | critical | API key patterns (AKIA*, ghp_*, sk-*) | Hardcoded API keys |
| `SEC-SEC-002` | critical | Private key blocks (BEGIN RSA) | Embedded private keys |
| `SEC-SEC-003` | high | Password/token string literals | Hardcoded credentials |
| `SEC-SEC-004` | medium | Connection string patterns | Database connection strings |
| `SEC-SEC-005` | low | .env file reading without validation | Environment variable patterns |

#### Eval Scanner

| Rule | Severity | Pattern | Description |
|------|----------|---------|-------------|
| `SEC-EVAL-001` | critical | `eval()` usage | Arbitrary code execution |
| `SEC-EVAL-002` | critical | `new Function()` usage | Dynamic function construction |
| `SEC-EVAL-003` | high | `child_process.exec()` with user input | Command execution |
| `SEC-EVAL-004` | medium | `require()` with variable argument | Dynamic module loading |

#### Input Sanitizer

| Rule | Severity | Pattern | Description |
|------|----------|---------|-------------|
| `SEC-INPUT-001` | high | No input validation on tool handler | Handler accepts raw input |
| `SEC-INPUT-002` | medium | Missing type check on required params | Type coercion risk |
| `SEC-INPUT-003` | medium | Missing length/range bounds | Unbounded input |
| `SEC-INPUT-004` | low | No output sanitization | Output may contain PII |

### Example Security Scan Output

```
$ claws test --security

  Security scan: email-drafter

  Injection:
    ✓ SEC-INJ-001: No user input in prompts
    ✓ SEC-INJ-002: No user input in commands
    ✓ SEC-INJ-003: No user input in queries
    ✓ SEC-INJ-004: No user input in file paths
    ✓ SEC-INJ-005: No user input in regex

  Secrets:
    ✓ SEC-SEC-001: No API key patterns
    ✓ SEC-SEC-002: No private keys
    ✓ SEC-SEC-003: No hardcoded credentials
    ✓ SEC-SEC-004: No connection strings
    ✓ SEC-SEC-005: No .env patterns

  Eval:
    ✓ SEC-EVAL-001: No eval() usage
    ✓ SEC-EVAL-002: No Function() usage
    ✓ SEC-EVAL-003: No exec() with user input
    ✓ SEC-EVAL-004: No dynamic require()

  Input:
    ✓ SEC-INPUT-001: All handlers validate input
    ✓ SEC-INPUT-002: Type checks present on required params
    ✓ SEC-INPUT-003: send-email body has length validation
    ⚠ SEC-INPUT-004: list-recent output not sanitized (low)

  15/16 passed, 1 warning (low severity)
```

---

## Custom Vitest Matchers

@bic/claws-test provides custom matchers for governance assertions:

```typescript
import { expect } from 'vitest';
import '@bic/claws-test/matchers';

// Governance matchers
expect(skill).toHaveRisk('R3');
expect(skill).toHaveCapabilities(['READ', 'COMMUNICATE']);
expect(skill).toRequireObo('send-email');
expect(skill).notToRequireObo('list-recent');
expect(skill).toHaveAuditEnabled();
expect(skill).toHaveDataLabels(['INTERNAL']);

// Scenario matchers
expect(result).toHaveInvokedTool('send-email');
expect(result).toHaveRequestedApproval();
expect(result).toHaveRecordedAuditEvent();
expect(result).toHaveOutput({ sent: true });

// Security matchers
expect(handler).notToContainInjectionPatterns();
expect(handler).notToContainSecrets();
expect(handler).notToUseEval();
expect(handler).toValidateInput();
```

### Matcher Implementation

```typescript
// @bic/claws-test/matchers/governance.ts

import { expect } from 'vitest';

expect.extend({
  toHaveRisk(received, expected) {
    const risk = received.governance?.risk ?? received.risk;
    return {
      pass: risk === expected,
      message: () =>
        `Expected skill to have risk ${expected}, but got ${risk}`,
    };
  },

  toRequireObo(received, toolName) {
    const oboList = received.governance?.obo ?? [];
    return {
      pass: oboList.includes(toolName),
      message: () =>
        `Expected skill to require OBO for "${toolName}", but obo list is [${oboList.join(', ')}]`,
    };
  },

  toHaveInvokedTool(received, toolName) {
    const calls = received.toolCalls ?? [];
    const found = calls.some((c: any) => c.name === toolName);
    return {
      pass: found,
      message: () =>
        `Expected tool "${toolName}" to be invoked, but calls were: [${calls.map((c: any) => c.name).join(', ')}]`,
    };
  },

  toHaveRequestedApproval(received) {
    const approvals = received.approvalRequests ?? received.oboRequests ?? [];
    return {
      pass: approvals.length > 0,
      message: () =>
        `Expected OBO approval to be requested, but no approval requests were made`,
    };
  },

  toHaveRecordedAuditEvent(received) {
    const events = received.auditEvents ?? [];
    return {
      pass: events.length > 0,
      message: () =>
        `Expected audit event to be recorded, but no events were found`,
    };
  },

  notToContainSecrets(received) {
    const patterns = [
      /AKIA[0-9A-Z]{16}/,
      /ghp_[A-Za-z0-9]{36}/,
      /sk-[A-Za-z0-9]{48}/,
      /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
    ];
    const code = typeof received === 'string' ? received : JSON.stringify(received);
    const found = patterns.filter(p => p.test(code));
    return {
      pass: found.length === 0,
      message: () =>
        `Expected no secrets, but found ${found.length} pattern matches`,
    };
  },
});
```

---

## Example Complete Test File

A full test file for a governed skill, showing all framework capabilities:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SkillHarness, GovernanceValidator, SecurityScanner, runScenarios } from '@bic/claws-test';
import '@bic/claws-test/matchers';

describe('email-drafter', () => {
  let harness: SkillHarness;

  beforeEach(async () => {
    harness = await SkillHarness.load('./email-drafter', {
      user: { id: 'test-user@acme.com' },
      tools: {
        'email-provider': async (args) => {
          if (args.action === 'send') return { messageId: 'msg-001', sent: true };
          if (args.action === 'list') return { items: [] };
          return {};
        },
      },
      approvals: { 'send-email': true },
    });
  });

  // ── Scenario tests ──

  describe('scenarios', () => {
    it('should pass all SKILL.md scenarios', async () => {
      const results = await runScenarios('./email-drafter', {
        tools: { 'email-provider': async () => ({ messageId: 'msg-001', sent: true }) },
        approvals: { 'send-email': true },
      });

      for (const result of results) {
        expect(result.passed, `Scenario "${result.name}" failed`).toBe(true);
      }
    });
  });

  // ── Tool invocation tests ──

  describe('send-email', () => {
    it('should send email with valid input', async () => {
      const result = await harness.invoke('send-email', {
        to: 'jane@acme.com',
        subject: 'Meeting invite',
        body: 'Tomorrow at 2pm',
      });

      expect(result.ok).toBe(true);
      expect(result.output).toHaveProperty('messageId');
      expect(result.output).toHaveProperty('sent', true);
    });

    it('should request OBO approval', async () => {
      await harness.invoke('send-email', {
        to: 'jane@acme.com',
        subject: 'Test',
        body: 'Test body',
      });

      expect(harness.oboRequests).toHaveLength(1);
      expect(harness.oboRequests[0].tool).toBe('send-email');
    });

    it('should deny when approval is rejected', async () => {
      const deniedHarness = await SkillHarness.load('./email-drafter', {
        approvals: { 'send-email': false },
      });

      const result = await deniedHarness.invoke('send-email', {
        to: 'jane@acme.com',
        subject: 'Test',
        body: 'Test body',
      });

      expect(result.oboRequested).toBe(true);
      expect(result.approved).toBe(false);
    });

    it('should record audit event', async () => {
      await harness.invoke('send-email', {
        to: 'jane@acme.com',
        subject: 'Test',
        body: 'Test body',
      });

      expect(harness.auditEvents.length).toBeGreaterThan(0);
      expect(harness.auditEvents[0].action).toContain('tool');
    });

    it('should reject invalid input', async () => {
      const result = await harness.invoke('send-email', {
        subject: 'Missing to field',
        body: 'Test body',
      });

      expect(result.ok).toBe(false);
      expect(result.output).toHaveProperty('error');
    });
  });

  describe('list-recent', () => {
    it('should not request OBO approval', async () => {
      await harness.invoke('list-recent', { count: 5 });

      expect(harness.oboRequests).toHaveLength(0);
    });
  });

  // ── Governance validation ──

  describe('governance', () => {
    it('should pass all governance checks', async () => {
      const validator = GovernanceValidator.fromSkill('./email-drafter');
      const report = await validator.validate();

      expect(report.passed).toBe(true);
      expect(report.findings).toHaveLength(0);
    });

    it('should have correct risk and capabilities', () => {
      expect(harness.skill).toHaveRisk('R3');
      expect(harness.skill).toHaveCapabilities(['READ', 'COMMUNICATE']);
    });

    it('should require OBO for send-email only', () => {
      expect(harness.skill).toRequireObo('send-email');
      expect(harness.skill).notToRequireObo('draft-email');
      expect(harness.skill).notToRequireObo('list-recent');
    });
  });

  // ── Security scan ──

  describe('security', () => {
    it('should pass security scan', async () => {
      const scanner = SecurityScanner.fromSkill('./email-drafter');
      const report = await scanner.scan();

      expect(report.passed).toBe(true);
      expect(report.summary.critical).toBe(0);
      expect(report.summary.high).toBe(0);
    });
  });
});
```

---

## CLI Integration

`claws test` runs all test suites with a single command:

```
$ claws test

  claws test -- email-drafter

  ✓ scenarios (3 scenarios, 8 assertions)          12ms
  ✓ governance (15 checks)                          3ms
  ✓ security (16 rules)                             8ms
  ✓ custom tests (tests/*.test.ts)                 45ms

  PASS  4 suites, 39 assertions, 0 failures        68ms
```

Flags:

| Flag | Effect |
|------|--------|
| `claws test` | Run all (scenarios + governance + security + custom) |
| `claws test --scenarios` | Run SKILL.md scenarios only |
| `claws test --governance` | Run governance validation only |
| `claws test --security` | Run security scan only |
| `claws test --custom` | Run custom tests only (tests/*.test.ts) |
| `claws test --watch` | Re-run on file changes |
| `claws test --filter "send"` | Filter scenarios/tests by name |
| `claws test --coverage` | Run with code coverage |

---

## Public Exports

```typescript
// @bic/claws-test/index.ts

// Scenario runner
export { runScenarios, type ScenarioRunnerOptions, type ScenarioResult, type AssertionResult } from './runner/scenario-runner';

// Skill harness
export { SkillHarness, type HarnessConfig, type InvokeResult } from './runner/skill-harness';

// Mock utilities
export { MockTools } from './gateway/mock-tools';
export { MockApproval } from './gateway/mock-approval';

// Governance validator
export { GovernanceValidator, type GovernanceReport, type GovernanceCheck, type GovernanceFinding } from './governance/policy-validator';

// Security scanner
export { SecurityScanner, type SecurityReport, type SecurityFinding } from './security/injection-scanner';

// Custom matchers (side-effect import)
// import '@bic/claws-test/matchers';
```

### Relationship to @bic/claws-skill-kit

@bic/claws-test has a peer dependency on @bic/claws-skill-kit but does not import from
@craftworks/*. The MockGateway from @bic/claws-skill-kit is re-used as the foundation
for the test harness. The governance validator reads SKILL.md frontmatter using
the same parser that claws build uses, but the validator itself is a standalone
module with no compiler dependency.
