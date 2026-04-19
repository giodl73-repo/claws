/**
 * Governance validator — enforces GovernanceIR deny intents on edits
 * (P-276), with provenance tagging on each denial (P-277).
 *
 * Deny detection uses the GovernanceIR `intents` registry, not regex. A
 * "deny rule" is a mechanical `DenyIntent` whose `target` glob matches
 * the edit's tool/section. Provenance (`compiler-injected` vs
 * `user-authored`) is resolved through an injected `denyProvenance`
 * registry — the IR doesn't carry provenance today, so the validator
 * accepts it as a side-channel contract with the compiler.
 *
 * @module claws-sdk/workspace-edit/validators/governance-validator
 */

import type { GovernanceIR } from '../../ir/governance-ir.js';
import type { DenyIntent } from '../../ir/mechanical-intent.js';
import type { DenyRuleProvenance, GovernanceDeniedError, ProvenanceChain } from '../errors.js';
import { buildPatchError } from '../error-messages.js';
import type { EditOperation } from '../types.js';
import type { Validator, ValidationWarning, ValidatorResult } from './validator.js';

/**
 * Provenance registry — maps deny intent IDs to their provenance chain.
 *
 * Compiler supplies this alongside the GovernanceIR. Absent entries
 * default to `user-authored` (the conservative side: a deny we cannot
 * classify is treated as a warning, not an immutable block).
 */
export type DenyProvenanceRegistry = ReadonlyMap<string, ProvenanceChain>;

export interface GovernanceValidatorOptions {
  readonly ir: GovernanceIR;
  /** Provenance lookup per deny intent id. Empty map = all user-authored. */
  readonly denyProvenance?: DenyProvenanceRegistry;
  /** Absolute governance file path used as a fallback provenance tag. */
  readonly governanceFile: string;
}

function denyIntentsOf(ir: GovernanceIR): readonly DenyIntent[] {
  return ir.intents.filter((i): i is DenyIntent => i.kind === 'deny');
}

/**
 * Match a deny glob target against the edit section. Supports exact match
 * and trailing `*` glob (e.g. `TOOLS.send-email`, `TOOLS.*`).
 */
function denyMatchesEdit(target: string, op: EditOperation): boolean {
  const editKey = `${op.file.replace(/\.md$/, '')}.${op.section}`;
  if (target === editKey) return true;
  if (target === op.section) return true;
  if (target.endsWith('.*')) {
    const prefix = target.slice(0, -2);
    return editKey.startsWith(`${prefix}.`) || op.file.startsWith(prefix);
  }
  if (target === '*') return true;
  return false;
}

function fallbackProvenance(
  intent: DenyIntent,
  governanceFile: string,
  origin: DenyRuleProvenance,
): ProvenanceChain {
  return {
    policySource: `rule:${intent.ruleId}`,
    ruleId: intent.ruleId,
    governanceFile,
    origin,
  };
}

export function createGovernanceValidator(options: GovernanceValidatorOptions): Validator {
  const denies = denyIntentsOf(options.ir);
  const provenance = options.denyProvenance ?? new Map<string, ProvenanceChain>();

  return {
    name: 'governance',
    validate(op: EditOperation): ValidatorResult {
      const warnings: ValidationWarning[] = [];
      for (const intent of denies) {
        if (!denyMatchesEdit(intent.target, op)) continue;

        const chain =
          provenance.get(intent.id) ?? fallbackProvenance(intent, options.governanceFile, 'user-authored');

        const ocPath = `oc://${op.file}/${op.section}${(op.kind === 'toggle' || op.kind === 'set') ? `/${op.field}` : ''}`;

        // Only compiler-injected denies block through this validator.
        // User-authored denies still emit a visible warning so audit logs
        // can record the match (prior behaviour silently dropped the
        // signal, leaving auditors blind to legitimate governance hits).
        if (chain.origin !== 'compiler-injected') {
          warnings.push({
            code: 'USER_DENY_RULE_MATCHED',
            ocPath,
            message: `Edit matched user-authored deny rule ${chain.ruleId} in ${chain.governanceFile}; write permitted with warning`,
          });
          continue;
        }

        const error = buildPatchError<GovernanceDeniedError>({
          code: 'GOVERNANCE_DENIED',
          ocPath,
          provenance: chain,
          lockSource: 'governance',
        });
        return { ok: false, error, warnings };
      }
      return { ok: true, warnings };
    },
  };
}
