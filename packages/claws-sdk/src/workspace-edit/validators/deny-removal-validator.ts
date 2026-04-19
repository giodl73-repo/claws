/**
 * Deny-removal validator — detects SOUL.md edits that remove deny rule
 * text. Compiler-injected rules: BLOCK with GOVERNANCE_DENIED. User-
 * authored rules: ALLOW with a governance warning (P-277).
 *
 * The validator recognises `RemoveEdit` against SOUL.md deny sections.
 * Classification (`compiler-injected` vs `user-authored`) is looked up
 * in the same DenyProvenanceRegistry the governance-validator uses —
 * a single source of truth for deny rule origin.
 *
 * @module claws-sdk/workspace-edit/validators/deny-removal-validator
 */

import type { GovernanceDeniedError, ProvenanceChain } from '../errors.js';
import { buildPatchError } from '../error-messages.js';
import type { EditOperation } from '../types.js';
import type { Validator, ValidationWarning, ValidatorResult } from './validator.js';
import type { DenyProvenanceRegistry } from './governance-validator.js';

/**
 * SOUL.md section names that carry deny rules. Edits to other sections
 * pass through this validator unaffected.
 */
const DENY_SECTIONS: ReadonlySet<string> = new Set(['Boundaries', 'Deny Rules', 'Restrictions']);

export interface DenyRemovalValidatorOptions {
  /** Provenance registry — same one governance-validator reads. */
  readonly denyProvenance: DenyProvenanceRegistry;
  /** Absolute path of the governance file (SOUL.md fallback). */
  readonly governanceFile: string;
  /** Optional function to classify raw deny text → provenance chain. */
  readonly classifyRule?: (text: string) => ProvenanceChain | undefined;
  /**
   * If true, a remove whose provenance cannot be resolved is treated as
   * user-authored and permitted with a warning (historical behaviour).
   * Default is `false` (fail-closed): unresolved provenance is treated as
   * compiler-injected and the remove is blocked with GOVERNANCE_DENIED.
   * Operators who must remove an unclassifiable rule should escalate
   * through a signed-off path, not through the automated API.
   */
  readonly allowUnclassifiedRemoval?: boolean;
}

/**
 * Loop-sync edit shape — deny-removal can be triggered for SOUL.md via
 * pulses 35-36 endpoints, which use a different edit type than the
 * chunk-editable RemoveEdit. We normalise on the minimal shape the
 * validator actually needs.
 */
export interface DenyRemovalEdit {
  readonly kind: 'remove';
  readonly file: string;
  readonly section: string;
  readonly item: string;
}

function isRemoveEdit(op: EditOperation | DenyRemovalEdit): op is DenyRemovalEdit {
  return op.kind === 'remove';
}

export function createDenyRemovalValidator(options: DenyRemovalValidatorOptions): Validator {
  const { denyProvenance, governanceFile, classifyRule } = options;
  const allowUnclassifiedRemoval = options.allowUnclassifiedRemoval ?? false;

  return {
    name: 'deny-removal',
    validate(op: EditOperation): ValidatorResult {
      if (!isRemoveEdit(op)) return { ok: true };
      // Widen the file check to handle Loop-sync SOUL.md edits which arrive
      // as `DenyRemovalEdit` through separate endpoints.
      if ((op as DenyRemovalEdit).file !== 'SOUL.md') return { ok: true };
      if (!DENY_SECTIONS.has(op.section)) return { ok: true };

      const text = op.item.trim();

      // First check classifyRule (text → provenance) then the registry by
      // rule text / id. Missing classification is fail-closed by default.
      let chain: ProvenanceChain | undefined;
      if (classifyRule !== undefined) chain = classifyRule(text);
      if (chain === undefined) chain = denyProvenance.get(text);

      if (chain === undefined) {
        const ocPath = `oc://SOUL.md/${op.section}`;
        if (!allowUnclassifiedRemoval) {
          // Fail-closed: unresolved provenance is treated as
          // compiler-injected. A rule we cannot classify may have fallen
          // out of the provenance registry due to compiler version skew
          // or corruption — removing it could silently strip a
          // compiler-injected deny and be irreversible after recompile.
          const error = buildPatchError<GovernanceDeniedError>({
            code: 'GOVERNANCE_DENIED',
            ocPath,
            provenance: {
              policySource: 'unclassified',
              ruleId: 'UNKNOWN',
              governanceFile,
              origin: 'compiler-injected',
            },
            lockSource: 'governance',
          });
          return { ok: false, error };
        }
        const warning: ValidationWarning = {
          code: 'USER_DENY_RULE_REMOVED',
          ocPath,
          message: `Removed unclassified deny rule from SOUL.md#${op.section} (permitted via allowUnclassifiedRemoval): "${text.slice(0, 64)}"`,
        };
        return { ok: true, warnings: [warning] };
      }

      if (chain.origin === 'compiler-injected') {
        const ocPath = `oc://SOUL.md/${op.section}`;
        const error = buildPatchError<GovernanceDeniedError>({
          code: 'GOVERNANCE_DENIED',
          ocPath,
          provenance: { ...chain, governanceFile },
          lockSource: 'governance',
        });
        return { ok: false, error };
      }

      // user-authored → warning only, write proceeds.
      const warning: ValidationWarning = {
        code: 'USER_DENY_RULE_REMOVED',
        ocPath: `oc://SOUL.md/${op.section}`,
        message: `Removed user-authored deny rule (${chain.ruleId}) from SOUL.md#${op.section}`,
      };
      return { ok: true, warnings: [warning] };
    },
  };
}
