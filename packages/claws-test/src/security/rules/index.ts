/**
 * All 16 security rules, grouped by category.
 *
 * @module @bic/claws-test/security/rules
 */

import type { SecurityRule } from '../scanner.js';
import { injectionRules } from './injection.js';
import { secretsRules } from './secrets.js';
import { inputRules } from './input.js';
import { outputRules } from './output.js';

export { injectionRules } from './injection.js';
export { secretsRules } from './secrets.js';
export { inputRules } from './input.js';
export { outputRules } from './output.js';

/**
 * All 16 security rules in standard order.
 */
export function getAllRules(): readonly SecurityRule[] {
  return [
    ...injectionRules,
    ...secretsRules,
    ...inputRules,
    ...outputRules,
  ];
}
