/**
 * Migration: v1 → v2 schema for claws.json.
 *
 * v1 schema used flat field names that were renamed in v2:
 *   - `trust` → `trustTier`
 *   - `suppress` → `suppressions`
 *   - `output` → `format`
 *   - `policy` → `policySet`
 *   - `audit` → `auditLevel`
 *
 * v2 also adds `failMode` and `fleet` with sensible defaults.
 * Unknown fields are preserved for forward compatibility.
 *
 * @module claws-sdk/doctor/migrate/v1-to-v2
 */

import type { Migration } from './runner.js';

/**
 * Field renames from v1 to v2.
 */
const FIELD_RENAMES: ReadonlyArray<readonly [string, string]> = [
  ['trust', 'trustTier'],
  ['suppress', 'suppressions'],
  ['output', 'format'],
  ['policy', 'policySet'],
  ['audit', 'auditLevel'],
];

/**
 * Default values added in v2.
 */
const V2_DEFAULTS: Record<string, unknown> = {
  failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
  fleet: { allowBypass: false },
};

/**
 * v1-to-v2 migration transform.
 */
export const v1ToV2: Migration = {
  fromVersion: 1,
  toVersion: 2,
  description: 'Rename deprecated fields and add failMode/fleet defaults',

  apply(config: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...config };

    // Rename deprecated fields
    for (const [oldName, newName] of FIELD_RENAMES) {
      if (oldName in result && !(newName in result)) {
        result[newName] = result[oldName];
        delete result[oldName];
      }
    }

    // Add new required fields with defaults if not present
    for (const [key, defaultValue] of Object.entries(V2_DEFAULTS)) {
      if (!(key in result)) {
        result[key] = defaultValue;
      }
    }

    // Stamp version
    result['schemaVersion'] = 2;

    return result;
  },
};
