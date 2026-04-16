/**
 * Config types and Zod schema for claws.json.
 *
 * @module claws-sdk/config/types
 */

import { z } from 'zod';
import type { Platform } from '../types/platform.js';

/**
 * Valid fail-mode values for governance rule tiers.
 */
export type FailModeValue = 'open' | 'gated' | 'closed';

/**
 * Per-tier fail-mode configuration (R1–R5).
 */
export interface FailModeConfig {
  readonly R1: FailModeValue;
  readonly R2: FailModeValue;
  readonly R3: FailModeValue;
  readonly R4: FailModeValue;
  readonly R5: FailModeValue;
}

/**
 * Fleet publish policy — controls which skill tiers can be published.
 */
export interface FleetPublishPolicyConfig {
  /** Whether only verified skills can be published. Default: false. */
  readonly requireVerifiedPublish: boolean;
  /** Allow DECLARED-tier dry-run for feedback. Default: true. */
  readonly allowDeclaredDryRun: boolean;
}

/**
 * Fleet policy configuration — organizational constraints
 * applied to all workspaces in the fleet.
 */
export interface FleetPolicy {
  /** Whether bypass mode is permitted. Default: false. */
  readonly allowBypass: boolean;
  /** Publish policy for skill tiers. Defaults applied by Zod schema. */
  readonly publish?: FleetPublishPolicyConfig | undefined;
}

/**
 * Zod schema for claws.json validation.
 *
 * Optional fields receive defaults:
 * - trustTier: 2
 * - suppressions: []
 * - format: "terminal"
 * - policySet: "default"
 * - auditLevel: "full"
 * - failMode: R1-R2 open, R3-R4 gated, R5 closed
 * - fleet: { allowBypass: false }
 */
export const ClawsConfigSchema = z.object({
  trustTier: z.number().int().min(1).max(5).default(2),
  suppressions: z.array(z.string()).default([]),
  platform: z.string().optional(),
  format: z.enum(['terminal', 'json', 'sarif', 'csv']).default('terminal'),
  policySet: z.string().default('default'),
  auditLevel: z.enum(['full', 'summary', 'none']).default('full'),
  failMode: z.object({
    R1: z.enum(['open', 'gated', 'closed']),
    R2: z.enum(['open', 'gated', 'closed']),
    R3: z.enum(['open', 'gated', 'closed']),
    R4: z.enum(['open', 'gated', 'closed']),
    R5: z.enum(['open', 'gated', 'closed']),
  }).default({ R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' }),
  fleet: z.object({
    allowBypass: z.boolean(),
    publish: z.object({
      requireVerifiedPublish: z.boolean(),
      allowDeclaredDryRun: z.boolean(),
    }).default({ requireVerifiedPublish: false, allowDeclaredDryRun: true }),
  }).default({ allowBypass: false, publish: { requireVerifiedPublish: false, allowDeclaredDryRun: true } }),
  security: z.object({
    /** PBKDF2 iteration count for passphrase-derived keys. Default 600,000 (OWASP 2023 minimum). */
    pbkdf2Iterations: z.number().int().min(100_000).max(10_000_000).default(600_000),
    /** Allowed RFC 3161 TSA URLs. Empty array = no restriction. */
    tsaAllowlist: z.array(z.string().url()).default([]),
  }).default({ pbkdf2Iterations: 600_000, tsaAllowlist: [] }),
});

/**
 * Validated claws.json configuration — all fields present after Zod parse.
 */
export type ClawsConfig = z.infer<typeof ClawsConfigSchema>;

/**
 * Result of bypass evaluation.
 */
export type BypassOutcome = 'activated' | 'denied' | 'inactive';

/**
 * State returned by bypass evaluation.
 */
export interface BypassState {
  /** Whether CLAWS_BYPASS=1 was detected in the environment. */
  readonly envDetected: boolean;
  /** Whether fleet policy permits bypass. */
  readonly policyAllows: boolean;
  /** Final bypass outcome. */
  readonly outcome: BypassOutcome;
}

/**
 * Audit event recorded when bypass is activated or denied.
 */
export interface BypassAuditEvent {
  readonly timestamp: string;
  readonly eventType: 'bypass';
  readonly outcome: BypassOutcome;
  readonly actor: string;
  readonly reason: string;
}
