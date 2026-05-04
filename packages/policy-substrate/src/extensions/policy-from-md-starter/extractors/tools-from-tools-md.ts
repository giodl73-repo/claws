/**
 * Extract tool specs from `oc://TOOLS.md/Tools`.
 *
 * Each `### name` sub-heading under `## Tools` becomes one
 * `ToolSpec`. The convention used by claws's authoring layer is
 * `### name # R<n>, CAP1, CAP2, ...` where:
 *   - `R<n>` is the numeric risk level (R0..R5) → mapped to the
 *     upstream string union `'low' | 'medium' | 'high' | 'critical'`
 *   - `CAP1, CAP2, ...` are capability tokens (READ, WRITE, etc.)
 *
 * The pattern IS the contract: the policy generator considers
 * `### name # ...` lines under `## Tools` the canonical tool
 * declaration. Other shapes (e.g., a `## Tool Guidance` table) are
 * narrative; tools come from this section.
 *
 * @module @bic/policy-substrate/extractors/tools-from-tools-md
 */

import { parseOcPath, resolveOcPath } from '@bic/oc-paths-substrate';
import type {
  RiskLevel,
  Sensitivity,
  ToolSpec,
} from '../../../plugin-sdk/policy/types.js';
import type { PolicyExtractorSpec } from '../../../plugin-sdk/policy/api.js';

const TOOLS_PATH = parseOcPath('oc://TOOLS.md/Tools');

const KNOWN_CAPABILITIES = new Set([
  'READ',
  'WRITE',
  'COMMUNICATE',
  'IRREVERSIBLE_EXTERNAL',
  'FLEET_PRIVILEGED',
  'IDENTITY',
]);

/**
 * Map the legacy R<n> numeric risk level (R0..R5) to the upstream
 * `RiskLevel` string union.
 */
function riskLevelFor(meta: string): RiskLevel {
  const m = /R([0-5])/.exec(meta);
  const n = m && m[1] ? Number(m[1]) : 1;
  if (n >= 5) return 'critical';
  if (n >= 4) return 'high';
  if (n >= 2) return 'medium';
  return 'low';
}

function capabilitiesFrom(meta: string): readonly string[] {
  const tokens = meta.split(/[,\s]+/).map((t) => t.trim().toUpperCase());
  return [...KNOWN_CAPABILITIES].filter((c) => tokens.includes(c));
}

/**
 * Sensitivity follows the capability story: any tool carrying
 * `IRREVERSIBLE_EXTERNAL` defaults to `restricted`; any
 * `FLEET_PRIVILEGED` or `IDENTITY` to `confidential`. Otherwise
 * `internal`. Operators override per-tool by declaring an explicit
 * sensitivity in the meta line (`### t # R3, READ, public`).
 */
function sensitivityFor(meta: string, capabilities: readonly string[]): Sensitivity {
  const lower = meta.toLowerCase();
  if (lower.includes('restricted')) return 'restricted';
  if (lower.includes('confidential')) return 'confidential';
  if (lower.includes('public')) return 'public';
  if (lower.includes('internal')) return 'internal';
  if (capabilities.includes('IRREVERSIBLE_EXTERNAL')) return 'restricted';
  if (capabilities.includes('FLEET_PRIVILEGED')) return 'confidential';
  if (capabilities.includes('IDENTITY')) return 'confidential';
  return 'internal';
}

export const toolsFromToolsMd: PolicyExtractorSpec<ToolSpec> = {
  id: 'starter-v0/tools/from-tools-md',
  description:
    'Extract ToolSpec entries from each `### name # R<n>, ...` sub-heading under TOOLS.md ## Tools',
  appliesTo: 'TOOLS.md',
  requires: { sdkVersion: '0.1.0' },
  extract(ctx) {
    if (ctx.file.ast.kind !== 'md') return [];
    const match = resolveOcPath(ctx.file.ast, TOOLS_PATH);
    if (match === null) return [];
    const block = ctx.file.ast.blocks.find((b) => b.line === match.line);
    if (block === undefined) return [];
    const tools: ToolSpec[] = [];
    // Walk the block's bodyText scanning for `### name [# meta]`
    // sub-headings. The substrate's MdAst doesn't (yet) split
    // sub-headings into typed nodes inside a block, so we scan the
    // raw text. Each `###` line declares one tool.
    const bodyLines = block.bodyText.split('\n');
    for (const line of bodyLines) {
      if (!line.startsWith('### ')) continue;
      const tool = parseToolHeader(line);
      if (tool !== null) tools.push(tool);
    }
    return tools;
  },
};

function parseToolHeader(line: string): ToolSpec | null {
  // `### name [# meta]` — name is `[\w-]+`, meta is everything after
  // the `#`.
  const tail = line.slice(4); // drop '### '
  let i = 0;
  while (i < tail.length) {
    const ch = tail[i]!;
    const code = ch.charCodeAt(0);
    const isNameChar =
      (code >= 0x30 && code <= 0x39) || // 0-9
      (code >= 0x41 && code <= 0x5a) || // A-Z
      (code >= 0x61 && code <= 0x7a) || // a-z
      code === 0x5f || // _
      code === 0x2d; // -
    if (!isNameChar) break;
    i++;
  }
  const name = tail.slice(0, i);
  if (name.length === 0) return null;
  let meta = '';
  while (i < tail.length && (tail[i] === ' ' || tail[i] === '\t')) i++;
  if (tail[i] === '#') {
    meta = tail.slice(i + 1).trim();
  }
  const capabilities = capabilitiesFrom(meta);
  return {
    id: name,
    capabilities,
    risk: riskLevelFor(meta),
    sensitivity: sensitivityFor(meta, capabilities),
  };
}
