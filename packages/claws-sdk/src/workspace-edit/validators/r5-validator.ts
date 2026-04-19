/**
 * R5 validator — blocks any edit to a tool classified R5 (critical).
 *
 * Reads risk classification from the compiled GovernanceIR's capability
 * manifest. Never re-derives risk. If the edit targets an R5 tool's
 * `enabled` field or attempts any structural change that would disable
 * the tool, the validator rejects with `R5_LOCKED`.
 *
 * Ciso contract: R5 fail-closed is non-negotiable. There is no admin
 * override, no flag, no bypass. An R5 tool cannot be disabled through
 * the write-time validation layer.
 *
 * @module claws-sdk/workspace-edit/validators/r5-validator
 */

import type { GovernanceIR } from '../../ir/governance-ir.js';
import type { ToolCapability } from '../../ir/capability-manifest.js';
import type { R5LockedError } from '../errors.js';
import { buildPatchError } from '../error-messages.js';
import type { EditOperation } from '../types.js';
import type { Validator, ValidatorResult } from './validator.js';

/**
 * R5 is anchored to `riskLevel: 'critical'` in the capability manifest.
 * The chunk-assembler maps `critical` → numeric level 5 (`RISK_LEVEL_MAP`);
 * this validator stays on the string form to avoid depending on the
 * chunk-assembler's presentation layer.
 */
const R5_RISK: ToolCapability['riskLevel'] = 'critical';

/**
 * Edit fields that would effectively disable or weaken a tool. Only edits
 * to these fields on an R5 tool trip the lock. Pure metadata edits
 * (description, display_name) pass through — see S21 "unlocked_field_edit".
 */
const R5_GUARDED_FIELDS: ReadonlySet<string> = new Set(['enabled', 'risk', 'obo', 'oboFlag']);

/**
 * Create an R5 lock validator bound to a compiled GovernanceIR.
 *
 * The validator only fires for edits against TOOLS.md. Edits to other
 * files pass through — R5 protection applies at the tool level.
 */
export function createR5Validator(ir: GovernanceIR): Validator {
  const toolsByName = new Map<string, ToolCapability>();
  for (const tool of ir.capabilities.tools) {
    toolsByName.set(tool.name, tool);
  }

  return {
    name: 'r5',
    validate(op: EditOperation): ValidatorResult {
      if (op.file !== 'TOOLS.md') return { ok: true };
      const tool = toolsByName.get(op.section);
      if (tool === undefined) return { ok: true };
      if (tool.riskLevel !== R5_RISK) return { ok: true };

      const targetField = (op.kind === 'toggle' || op.kind === 'set') ? op.field : undefined;
      if (targetField !== undefined && !R5_GUARDED_FIELDS.has(targetField)) {
        return { ok: true };
      }
      // Append / remove on an R5 tool section is also considered a guarded edit.
      const ocPath = `oc://TOOLS.md/${op.section}${targetField !== undefined ? `/${targetField}` : ''}`;
      const error = buildPatchError<R5LockedError>({
        code: 'R5_LOCKED',
        ocPath,
        tool: tool.name,
        lockSource: 'r5',
      });
      return { ok: false, error };
    },
  };
}
