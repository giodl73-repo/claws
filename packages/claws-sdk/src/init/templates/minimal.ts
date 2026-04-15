/**
 * Minimal governance template — bare trust tier, no policies.
 *
 * @module claws-sdk/init/templates/minimal
 */

import type { GovernanceTemplate } from './index.js';

/**
 * Minimal template: trust tier only, zero policy files.
 * Suitable for getting started or projects with no regulatory requirements.
 */
export const minimalTemplate: GovernanceTemplate = {
  name: 'minimal',
  description: 'Bare governance with trust tier only — no policy files',
  configOverrides: {
    trustTier: 2,
  },
  policies: [],
};
