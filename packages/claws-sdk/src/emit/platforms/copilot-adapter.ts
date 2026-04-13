/**
 * GitHub Copilot platform adapter — advisory-level emission.
 *
 * Produces .github/copilot-instructions.md governance advisory.
 * Copilot has no hook API; enforcement is advisory only.
 *
 * @module claws-sdk/emit/platforms/copilot-adapter
 */

import type { GovernanceIR } from '../../ir/governance-ir.js';
import { emitSkill } from '../emit-skill.js';
import type { PlatformAdapter, PlatformEmitResult, EmittedArtifact } from './platform-adapter.js';

/**
 * GitHub Copilot adapter — advisory via copilot-instructions.md.
 */
export const copilotAdapter: PlatformAdapter = {
  platform: 'github-copilot',

  emit(ir: GovernanceIR): PlatformEmitResult {
    const warnings: string[] = [];
    const artifacts: EmittedArtifact[] = [];

    const skillResult = emitSkill(ir);
    artifacts.push({
      path: '.github/copilot-instructions.md',
      content: skillResult.content,
    });
    artifacts.push({ path: 'SKILL.md', content: skillResult.content });
    warnings.push(...skillResult.warnings);

    return { platform: 'github-copilot', artifacts, warnings };
  },
};
