/**
 * Amendment preview — generate before/after diff showing governance impact.
 *
 * The preview step shows what a proposed amendment will change in the
 * GovernanceIR without actually applying it. This lets operators review
 * the governance impact before committing to the change.
 *
 * @module claws-sdk/amend/preview
 */

import type { GovernanceIR } from '../ir/governance-ir.js';
import type { SkillCapability } from '../ir/capability-manifest.js';
import type { Amendment } from './validate.js';

/**
 * A single diff entry in the preview — what changed and how.
 */
export interface PreviewDiff {
  /** Path within the GovernanceIR that changed (dot-separated). */
  readonly path: string;
  /** Type of change. */
  readonly change: 'add' | 'remove' | 'modify';
  /** Previous value (undefined for additions). */
  readonly before: unknown;
  /** New value (undefined for removals). */
  readonly after: unknown;
}

/**
 * Result of generating an amendment preview.
 */
export interface AmendPreviewResult {
  /** The amendment being previewed. */
  readonly amendment: Amendment;
  /** Diff entries showing what would change. */
  readonly diffs: readonly PreviewDiff[];
  /** Human-readable summary of changes. */
  readonly summary: string;
}

/**
 * Generate a preview showing before/after governance impact of an amendment.
 *
 * Does NOT modify any state — purely read-only analysis.
 *
 * @param amendment - The proposed amendment
 * @param ir - Current GovernanceIR state
 * @returns Preview result with diffs and summary
 */
export function previewAmendment(
  amendment: Amendment,
  ir: GovernanceIR,
): AmendPreviewResult {
  const diffs: PreviewDiff[] = [];

  switch (amendment.type) {
    case 'add-skill': {
      const existingSkill = ir.capabilities.skills.find(
        (s) => s.name.toLowerCase() === amendment.target.toLowerCase(),
      );

      if (existingSkill) {
        // Modifying existing skill
        const newSkill: SkillCapability = {
          ...existingSkill,
          description: typeof amendment.value['description'] === 'string'
            ? amendment.value['description']
            : existingSkill.description,
          requiredTools: Array.isArray(amendment.value['requiredTools'])
            ? amendment.value['requiredTools'] as readonly string[]
            : existingSkill.requiredTools,
        };
        diffs.push({
          path: `capabilities.skills[${amendment.target}]`,
          change: 'modify',
          before: existingSkill,
          after: newSkill,
        });
      } else {
        // Adding new skill
        const newSkill: SkillCapability = {
          name: amendment.target,
          description: typeof amendment.value['description'] === 'string'
            ? amendment.value['description']
            : '',
          requiredTools: Array.isArray(amendment.value['requiredTools'])
            ? amendment.value['requiredTools'] as readonly string[]
            : [],
          governanceLevel: typeof amendment.value['governanceLevel'] === 'number'
            ? amendment.value['governanceLevel'] as 1 | 2 | 3 | 4 | 5
            : 1,
        };
        diffs.push({
          path: `capabilities.skills[${amendment.target}]`,
          change: 'add',
          before: undefined,
          after: newSkill,
        });
      }
      break;
    }

    case 'remove-tool': {
      const existingTool = ir.capabilities.tools.find(
        (t) => t.name.toLowerCase() === amendment.target.toLowerCase(),
      );

      if (existingTool) {
        diffs.push({
          path: `capabilities.tools[${amendment.target}]`,
          change: 'remove',
          before: existingTool,
          after: undefined,
        });
      }
      break;
    }

    case 'update-policy': {
      const field = amendment.target;
      const newValue = amendment.value[field];

      // Diff against enforcement plan for recognized fields
      diffs.push({
        path: `config.${field}`,
        change: 'modify',
        before: `(current ${field})`,
        after: newValue,
      });
      break;
    }
  }

  const summary = diffs.length === 0
    ? 'No changes detected.'
    : diffs.map((d) => {
        switch (d.change) {
          case 'add': return `+ ${d.path}`;
          case 'remove': return `- ${d.path}`;
          case 'modify': return `~ ${d.path}`;
        }
      }).join('\n');

  return { amendment, diffs, summary };
}
