/**
 * LangGraph platform adapter — partial enforcement emission.
 *
 * Produces Python decorator config + SKILL.md. LangGraph supports
 * tool deny via decorators and audit via callbacks, but lacks
 * trust-tier enforcement.
 *
 * @module claws-sdk/emit/platforms/langgraph-adapter
 */

import type { GovernanceIR } from '../../ir/governance-ir.js';
import { emitSkill } from '../emit-skill.js';
import type { PlatformAdapter, PlatformEmitResult, EmittedArtifact } from './platform-adapter.js';

/**
 * LangGraph adapter — decorator config + SKILL.md.
 */
export const langgraphAdapter: PlatformAdapter = {
  platform: 'langgraph',

  emit(ir: GovernanceIR): PlatformEmitResult {
    const warnings: string[] = [];
    const artifacts: EmittedArtifact[] = [];

    const skillResult = emitSkill(ir);
    artifacts.push({ path: 'SKILL.md', content: skillResult.content });
    warnings.push(...skillResult.warnings);

    return { platform: 'langgraph', artifacts, warnings };
  },
};
