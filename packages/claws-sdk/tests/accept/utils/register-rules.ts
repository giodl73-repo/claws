/**
 * Shared rule registration — extracts the registerAllRules() function
 * that was copy-pasted across 4 runners.
 *
 * Derives A2A, ELICIT, and DATA configs from the parsed manifest so rules
 * evaluate against actual workspace content rather than empty defaults.
 *
 * @module claws-sdk/tests/accept/utils/register-rules
 */

import { createGClassRules } from '@bic/claws-sdk/governance/rules/g-class.js';
import { createGPermRules } from '@bic/claws-sdk/governance/rules/g-perm.js';
import { createGA2ARules } from '@bic/claws-sdk/governance/rules/g-a2a.js';
import { createGDataRules } from '@bic/claws-sdk/governance/rules/g-data.js';
import { createGElicitRules } from '@bic/claws-sdk/governance/rules/g-elicit.js';
import { createGInputRules } from '@bic/claws-sdk/governance/rules/g-input.js';
import { createGContextRules } from '@bic/claws-sdk/governance/rules/g-context.js';
import { createGOutputRules } from '@bic/claws-sdk/governance/rules/g-output.js';
import { createGBoundRules } from '@bic/claws-sdk/governance/rules/g-bound.js';
import { createGSupplyRules } from '@bic/claws-sdk/governance/rules/g-supply.js';
import { createRegistry } from '@bic/claws-sdk/governance/rule-registry.js';
import type { ParsedManifest } from '@bic/claws-sdk/compile/types.js';
import { extractA2AConfig, extractElicitConfig, extractDataConfig } from './rule-config.js';

/**
 * Register all governance rules into a registry.
 *
 * Derives A2A, ELICIT, and DATA configs from the parsed manifest so rules
 * evaluate against actual workspace content rather than empty defaults.
 */
export function registerAllRules(
  registry: ReturnType<typeof createRegistry>,
  manifest: ParsedManifest,
): void {
  for (const rule of createGClassRules()) registry.register(rule);
  for (const rule of createGPermRules()) registry.register(rule);
  for (const rule of createGA2ARules(extractA2AConfig(manifest))) registry.register(rule);
  for (const rule of createGDataRules(extractDataConfig(manifest))) registry.register(rule);
  for (const rule of createGElicitRules(extractElicitConfig(manifest))) registry.register(rule);
  for (const rule of createGInputRules()) registry.register(rule);
  for (const rule of createGContextRules()) registry.register(rule);
  for (const rule of createGOutputRules()) registry.register(rule);
  for (const rule of createGBoundRules()) registry.register(rule);
  for (const rule of createGSupplyRules()) registry.register(rule);
}
