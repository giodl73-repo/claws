/**
 * AWS Bedrock platform adapter — partial enforcement emission.
 *
 * Produces guardrails config + SKILL.md. Bedrock supports deny
 * via Guardrails API and audit via CloudWatch, but lacks workflow
 * inversion support.
 *
 * @module claws-sdk/emit/platforms/bedrock-adapter
 */

import type { GovernanceIR } from '../../ir/governance-ir.js';
import { emitSkill } from '../emit-skill.js';
import type { PlatformAdapter, PlatformEmitResult, EmittedArtifact } from './platform-adapter.js';

/**
 * Bedrock adapter — guardrails config + SKILL.md.
 */
export const bedrockAdapter: PlatformAdapter = {
  platform: 'bedrock',

  emit(ir: GovernanceIR): PlatformEmitResult {
    const warnings: string[] = [];
    const artifacts: EmittedArtifact[] = [];

    const skillResult = emitSkill(ir);
    artifacts.push({ path: 'SKILL.md', content: skillResult.content });
    warnings.push(...skillResult.warnings);

    return { platform: 'bedrock', artifacts, warnings };
  },
};
