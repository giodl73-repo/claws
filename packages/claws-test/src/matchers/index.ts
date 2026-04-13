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

export {
  toPassGovernance,
  toHaveRiskLevel,
  toRequireElicitation,
  toPassSecurityScan,
} from './governance.js';
export type { ScanInput } from './governance.js';

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
  }
}
