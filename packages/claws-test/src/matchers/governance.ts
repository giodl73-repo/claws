/**
 * Custom vitest matchers for governance assertions.
 *
 * 4 matchers:
 * - `toPassGovernance()` — all 13 governance checks pass
 * - `toHaveRiskLevel(level)` — skill declares specified risk level
 * - `toRequireElicitation()` — R5 tools have elicitation gates
 * - `toPassSecurityScan()` — zero security scanner findings
 *
 * @module @bic/claws-test/matchers/governance
 */

import type { GovernanceCheckInput, ValidationResult } from '../types.js';
import { validate } from '../governance/validator.js';
import { scan, getAllRules } from '../security/scanner.js';
import type { SecurityFinding, ScanResult } from '../security/scanner.js';

/**
 * Input shape for security scan matchers.
 */
export interface ScanInput {
  readonly sources: readonly { filePath: string; content: string }[];
}

/**
 * Format failing governance checks into a readable message.
 */
function formatGovernanceFailures(result: ValidationResult): string {
  const failing = result.checks.filter(c => !c.pass);
  const lines = failing.map(c => {
    const findingMsgs = c.findings.map(f =>
      `    - [${f.severity}] ${f.message} (target: ${f.target})`,
    );
    return `  ${c.name}: FAIL\n${findingMsgs.join('\n')}`;
  });
  return [
    `Expected all 13 governance checks to pass, but ${result.failedChecks} failed:`,
    ...lines,
  ].join('\n');
}

/**
 * Format security findings into a readable message.
 */
function formatSecurityFindings(scanResult: ScanResult): string {
  const lines = scanResult.findings.map(f =>
    `  [${f.severity}] ${f.rule} at ${f.file}:${f.line} — ${f.remediation}`,
  );
  return [
    `Expected zero security findings, but found ${scanResult.findings.length}:`,
    ...lines,
  ].join('\n');
}

/**
 * Extract risk level number from risk code string (e.g. 'R5' -> 5).
 */
function riskNumber(riskCode: string): number {
  const match = riskCode.match(/R(\d)/);
  return match ? parseInt(match[1]!, 10) : 0;
}

/**
 * toPassGovernance() — asserts all 13 governance checks pass.
 */
export function toPassGovernance(received: GovernanceCheckInput) {
  const result = validate(received);

  if (result.pass) {
    return {
      pass: true,
      message: () =>
        `Expected governance validation to fail, but all ${result.totalChecks} checks passed`,
    };
  }

  return {
    pass: false,
    message: () => formatGovernanceFailures(result),
  };
}

/**
 * toHaveRiskLevel(level) — asserts skill declares specified risk level.
 */
export function toHaveRiskLevel(
  received: GovernanceCheckInput,
  expectedLevel: string,
) {
  const actual = received.declaredRiskLevel ?? 'undefined';
  const pass = actual === expectedLevel;

  return {
    pass,
    message: () =>
      pass
        ? `Expected risk level NOT to be ${expectedLevel}, but it was`
        : `Expected risk level ${expectedLevel}, but got ${actual}`,
  };
}

/**
 * toRequireElicitation() — asserts R5 tools have elicitation gates.
 */
export function toRequireElicitation(received: GovernanceCheckInput) {
  const r5Tools = received.tools.filter(t => riskNumber(t.riskLevel) >= 5);

  if (r5Tools.length === 0) {
    return {
      pass: true,
      message: () =>
        'Expected elicitation requirement to fail, but no R5 tools were found',
    };
  }

  if (received.hasElicitationGate) {
    return {
      pass: true,
      message: () =>
        `Expected elicitation gate NOT to be configured for R5 tools [${r5Tools.map(t => t.name).join(', ')}], but it was`,
    };
  }

  return {
    pass: false,
    message: () =>
      `Expected R5 tools to have elicitation gates, but hasElicitationGate is false. R5 tools: [${r5Tools.map(t => t.name).join(', ')}]`,
  };
}

/**
 * toPassSecurityScan() — asserts zero security scanner findings.
 */
export function toPassSecurityScan(received: ScanInput) {
  const rules = getAllRules();
  const result = scan(received.sources, rules);

  if (result.findings.length === 0) {
    return {
      pass: true,
      message: () =>
        `Expected security scan to find issues, but all ${result.rulesApplied} rules passed across ${result.filesScanned} files`,
    };
  }

  return {
    pass: false,
    message: () => formatSecurityFindings(result),
  };
}
