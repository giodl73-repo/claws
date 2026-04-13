/**
 * Cursor platform adapter — advisory-level emission.
 *
 * Produces .cursorrules governance advisory (SKILL.md equivalent).
 * Cursor has no hook API, so enforcement is advisory only.
 *
 * @module claws-sdk/emit/platforms/cursor-adapter
 */

import type { GovernanceIR } from '../../ir/governance-ir.js';
import { emitSkill } from '../emit-skill.js';
import type { PlatformAdapter, PlatformEmitResult, EmittedArtifact } from './platform-adapter.js';

/**
 * Cursor adapter — advisory via .cursorrules file.
 */
export const cursorAdapter: PlatformAdapter = {
  platform: 'cursor',

  emit(ir: GovernanceIR): PlatformEmitResult {
    const warnings: string[] = [];
    const artifacts: EmittedArtifact[] = [];

    const skillResult = emitSkill(ir);
    artifacts.push({ path: '.cursorrules', content: skillResult.content });
    artifacts.push({ path: 'SKILL.md', content: skillResult.content });
    warnings.push(...skillResult.warnings);

    return { platform: 'cursor', artifacts, warnings };
  },
};
