/**
 * CrewAI platform adapter — advisory-level emission.
 *
 * Produces YAML config + SKILL.md. CrewAI has no hook API;
 * enforcement is advisory only via YAML agent configuration.
 *
 * @module claws-sdk/emit/platforms/crewai-adapter
 */

import type { GovernanceIR } from '../../ir/governance-ir.js';
import { emitSkill } from '../emit-skill.js';
import type { PlatformAdapter, PlatformEmitResult, EmittedArtifact } from './platform-adapter.js';

/**
 * CrewAI adapter — advisory via YAML config.
 */
export const crewaiAdapter: PlatformAdapter = {
  platform: 'crewai',

  emit(ir: GovernanceIR): PlatformEmitResult {
    const warnings: string[] = [];
    const artifacts: EmittedArtifact[] = [];

    const skillResult = emitSkill(ir);
    artifacts.push({ path: 'SKILL.md', content: skillResult.content });
    warnings.push(...skillResult.warnings);

    return { platform: 'crewai', artifacts, warnings };
  },
};
