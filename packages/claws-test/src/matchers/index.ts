/**
 * Vitest matcher registration — extends expect() with governance matchers.
 *
 * Usage:
 * ```ts
 * import { registerMatchers } from '@bic/claws-test/matchers';
 * registerMatchers();
 *
 * expect(skillInput).toPassGovernance();
 * expect(skillInput).toHaveRiskLevel('R3');
 * expect(skillInput).toRequireElicitation();
 * expect(scanInput).toPassSecurityScan();
 * ```
 *
 * @module @bic/claws-test/matchers
 */

import { expect } from 'vitest';
import {
  toPassGovernance,
  toHaveRiskLevel,
  toRequireElicitation,
  toPassSecurityScan,
} from './governance.js';
import {
  toBlock,
  toAllow,
  toElicit,
  toHaveAuditEntries,
  toEnforceWithin,
  toHaveValidAuditChain,
} from './gateway.js';

export {
  toPassGovernance,
  toHaveRiskLevel,
  toRequireElicitation,
  toPassSecurityScan,
} from './governance.js';
export type { ScanInput } from './governance.js';

export {
  toBlock,
  toAllow,
  toElicit,
  toHaveAuditEntries,
  toEnforceWithin,
  toHaveValidAuditChain,
} from './gateway.js';

/**
 * Register all governance matchers with vitest's expect.
 *
 * Call this once in a setup file or at the top of your test file.
 */
export function registerMatchers(): void {
  expect.extend({
    toPassGovernance,
    toHaveRiskLevel,
    toRequireElicitation,
    toPassSecurityScan,
    toBlock,
    toAllow,
    toElicit,
    toHaveAuditEntries,
    toEnforceWithin,
    toHaveValidAuditChain,
  });
}

/**
 * Type augmentation for vitest's expect — enables IntelliSense
 * for the governance matchers.
 */
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Assertion<T> {
    toPassGovernance(): void;
    toHaveRiskLevel(level: string): void;
    toRequireElicitation(): void;
    toPassSecurityScan(): void;
    toBlock(toolName: string): void;
    toAllow(toolName: string): void;
    toElicit(toolName: string): void;
    toHaveAuditEntries(count: number): void;
    toEnforceWithin(toolName: string, maxMs: number): void;
    toHaveValidAuditChain(): void;
  }
}
