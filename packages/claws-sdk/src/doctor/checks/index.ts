/**
 * Doctor checks — registry of all built-in diagnostic checks.
 *
 * @module claws-sdk/doctor/checks
 */

import type { DoctorCheck, DoctorOptions } from '../orchestrator.js';
import { checkConfigSchema } from './config-schema.js';
import { checkArtifactCompat } from './artifact-compat.js';
import { checkDependencyAlignment } from './dependency-check.js';
import { checkPolicySyntax } from './policy-syntax.js';

export { checkConfigSchema } from './config-schema.js';
export { checkArtifactCompat } from './artifact-compat.js';
export { checkDependencyAlignment } from './dependency-check.js';
export { checkPolicySyntax } from './policy-syntax.js';

/**
 * Checks that are relevant after an upgrade (subset of all checks).
 */
const POST_UPGRADE_CHECKS: readonly DoctorCheck[] = [
  checkConfigSchema,
  checkArtifactCompat,
  checkDependencyAlignment,
];

/**
 * All built-in doctor checks.
 */
const ALL_CHECKS: readonly DoctorCheck[] = [
  checkConfigSchema,
  checkArtifactCompat,
  checkDependencyAlignment,
  checkPolicySyntax,
];

/**
 * Create the default set of doctor checks based on options.
 *
 * @param options - Doctor options (post-upgrade mode filters to upgrade-relevant checks)
 * @returns Array of check functions to run
 */
export function createDefaultChecks(options: DoctorOptions = {}): readonly DoctorCheck[] {
  if (options.postUpgrade) {
    return POST_UPGRADE_CHECKS;
  }
  return ALL_CHECKS;
}
