/**
 * Fleet override types — re-exported from emit layer for governance-layer
 * consumption, preventing governance→emit reverse dependency (CM3).
 *
 * Canonical definitions live in `emit/host-approval-policy-types.ts`.
 * Governance modules import from HERE, not from emit.
 *
 * @module claws-sdk/governance/fleet-override-types
 */

export type { FleetOverride, FleetOverrideAuditEntry } from '../emit/host-approval-policy-types.js';
