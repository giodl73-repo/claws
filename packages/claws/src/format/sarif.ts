/**
 * SARIF 2.1.0 formatter for claws check output.
 *
 * Produces a valid SARIF log with tool.driver metadata, rule definitions,
 * and results mapped from claws governance violations.
 *
 * Level mapping:
 *   critical/high (level >= 4) → "error"
 *   medium (level === 3)       → "warning"
 *   low/info (level <= 2)      → "note"
 *
 * All `uri` fields use `toSarifUri()` to ensure forward-slash POSIX paths.
 *
 * Currently emits `artifactLocation.uri` only. The `region` field
 * (startLine/startColumn) is populated when the violation carries
 * line/column data; otherwise it is omitted. Future enhancements to
 * the governance violation model may provide finer-grained locations.
 *
 * @module claws-cli/format/sarif
 */

import type { CheckResult } from '../output/format-default.js';
import { toSarifUri } from './sarif-uri.js';
import { CLI_VERSION } from '../version.js';

/**
 * SARIF 2.1.0 severity levels.
 */
type SarifLevel = 'error' | 'warning' | 'note' | 'none';

/**
 * Map a claws severity level to a SARIF level.
 */
function toSarifLevel(level: number): SarifLevel {
  if (level >= 4) return 'error';
  if (level === 3) return 'warning';
  return 'note';
}

/**
 * Build the SARIF rule descriptor for a violation.
 */
interface SarifRule {
  readonly id: string;
  readonly name: string;
  readonly shortDescription: { readonly text: string };
  readonly defaultConfiguration: { readonly level: SarifLevel };
}

/**
 * Build the SARIF result for a violation.
 */
interface SarifResult {
  readonly ruleId: string;
  readonly level: SarifLevel;
  readonly message: { readonly text: string };
  readonly locations: readonly SarifLocation[];
}

interface SarifLocation {
  readonly physicalLocation: {
    readonly artifactLocation: { readonly uri: string };
    readonly region?: {
      readonly startLine: number;
      readonly startColumn: number;
    };
  };
}

/**
 * Full SARIF 2.1.0 log structure.
 */
interface SarifLog {
  readonly $schema: string;
  readonly version: string;
  readonly runs: readonly SarifRun[];
}

interface SarifRun {
  readonly tool: {
    readonly driver: {
      readonly name: string;
      readonly version: string;
      readonly informationUri: string;
      readonly rules: readonly SarifRule[];
    };
  };
  readonly results: readonly SarifResult[];
}

/**
 * Render check result as a SARIF 2.1.0 JSON string.
 *
 * @param result - Check result with violations
 * @param workspaceRoot - Absolute path to workspace root (for URI normalization)
 * @returns Pretty-printed SARIF JSON string
 */
export function renderCheckSarif(result: CheckResult, workspaceRoot: string): string {
  // Deduplicate rules by ruleId — use a stable description derived from
  // the ruleId itself rather than the first encountered violation message,
  // which can vary per-result for the same rule.
  const ruleMap = new Map<string, SarifRule>();
  for (const v of result.violations) {
    if (!ruleMap.has(v.ruleId)) {
      ruleMap.set(v.ruleId, {
        id: v.ruleId,
        name: v.ruleId,
        shortDescription: { text: `Governance rule ${v.ruleId}` },
        defaultConfiguration: { level: toSarifLevel(v.level) },
      });
    }
  }
  const rules = [...ruleMap.values()];

  const results: SarifResult[] = result.violations.map((v) => ({
    ruleId: v.ruleId,
    level: toSarifLevel(v.level),
    message: { text: v.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: toSarifUri(v.target, workspaceRoot),
          },
        },
      },
    ],
  }));

  const sarifLog: SarifLog = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'claws',
            version: CLI_VERSION,
            informationUri: 'https://claws.dev',
            rules,
          },
        },
        results,
      },
    ],
  };

  return JSON.stringify(sarifLog, null, 2);
}
