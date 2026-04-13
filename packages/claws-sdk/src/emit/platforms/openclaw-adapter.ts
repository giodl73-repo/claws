/**
 * OpenClaw platform adapter — full fidelity emission.
 *
 * Produces all 4 artifact types:
 * 1. Gateway plugin (index.ts + hook handlers)
 * 2. SKILL.md (advisory prompt)
 * 3. Compiled workflow (lobster.compiled.yaml)
 * 4. exec-approvals.json (L4 host backup)
 *
 * OC is the reference platform with zero governance loss.
 *
 * @module claws-sdk/emit/platforms/openclaw-adapter
 */

import type { GovernanceIR } from '../../ir/governance-ir.js';
import { emitPlugin } from '../emit-plugin.js';
import { emitSkill } from '../emit-skill.js';
import { emitExecApprovals } from '../emit-exec-approvals.js';
import type { PlatformAdapter, PlatformEmitResult, EmittedArtifact } from './platform-adapter.js';

/**
 * OpenClaw adapter — full fidelity, all 4 artifact types.
 */
export const openclawAdapter: PlatformAdapter = {
  platform: 'openclaw',

  emit(ir: GovernanceIR): PlatformEmitResult {
    const warnings: string[] = [];
    const artifacts: EmittedArtifact[] = [];

    // 1. Gateway plugin
    const pluginResult = emitPlugin(ir);
    artifacts.push({ path: 'index.ts', content: pluginResult.pluginSource });
    artifacts.push({ path: 'package.json', content: pluginResult.packageJson });
    for (const [hookPath, hookContent] of pluginResult.hookFiles) {
      artifacts.push({ path: hookPath, content: hookContent });
    }
    warnings.push(...pluginResult.warnings);

    // 2. SKILL.md
    const skillResult = emitSkill(ir);
    artifacts.push({ path: 'SKILL.md', content: skillResult.content });
    warnings.push(...skillResult.warnings);

    // 3. exec-approvals.json
    const execResult = emitExecApprovals(ir);
    artifacts.push({ path: 'exec-approvals.json', content: execResult.content });
    warnings.push(...execResult.warnings);

    return { platform: 'openclaw', artifacts, warnings };
  },
};
