/**
 * Claude Code platform adapter — partial enforcement emission.
 *
 * Produces CLAUDE.md (governance instructions) + hooks config.
 * Claude Code supports hooks for partial enforcement but lacks
 * trust-tier enforcement and full A2A firewall.
 *
 * @module claws-sdk/emit/platforms/claude-code-adapter
 */

import type { GovernanceIR } from '../../ir/governance-ir.js';
import { emitSkill } from '../emit-skill.js';
import type { PlatformAdapter, PlatformEmitResult, EmittedArtifact } from './platform-adapter.js';

/**
 * Claude Code adapter — CLAUDE.md + hooks config.
 */
export const claudeCodeAdapter: PlatformAdapter = {
  platform: 'claude-code',

  emit(ir: GovernanceIR): PlatformEmitResult {
    const warnings: string[] = [];
    const artifacts: EmittedArtifact[] = [];

    const skillResult = emitSkill(ir);
    artifacts.push({ path: 'CLAUDE.md', content: skillResult.content });
    artifacts.push({ path: 'SKILL.md', content: skillResult.content });
    warnings.push(...skillResult.warnings);

    return { platform: 'claude-code', artifacts, warnings };
  },
};
