/**
 * Emitter registry -- lightweight lookup by EmitTarget.
 *
 * The free tier registers exactly two emitters: `oc` and `claude-code`.
 * Additional targets (cursor, copilot, crewai, langgraph, bedrock) are
 * paid-tier extensions and MUST NOT be registered here.
 *
 * @module claws-sdk/compiler/emit/registry
 */

import type { BaseEmitter } from './base-emitter.js';
import type { EmitTarget, EmitterOptions } from './types.js';
import { FREE_TIER_TARGETS, isFreeTierTarget } from '../targets/constants.js';
import { OCEmitter } from './oc-emitter.js';
import { ClaudeCodeEmitter } from './cc-emitter.js';

/**
 * Re-export canonical free-tier target list from `compiler/targets/`
 * so existing `@bic/claws-sdk/compiler/emit` consumers keep
 * working. The underlying constant is shared with validate/ to close
 * the freemium-gate drift (CM-3).
 */
export { FREE_TIER_TARGETS };

/**
 * Thrown when register/get is called with an unsupported target.
 */
export class UnsupportedEmitTargetError extends Error {
  readonly target: string;
  constructor(target: string) {
    super(
      `Unsupported emit target "${target}". Free tier supports: ${FREE_TIER_TARGETS.join(', ')}`,
    );
    this.name = 'UnsupportedEmitTargetError';
    this.target = target;
  }
}

/**
 * Simple map-backed emitter registry. Not a singleton -- callers construct
 * a registry per compile pipeline invocation to avoid hidden global state.
 */
export class EmitterRegistry {
  private readonly emitters = new Map<EmitTarget, BaseEmitter>();

  register(target: EmitTarget, emitter: BaseEmitter): void {
    if (!isFreeTierTarget(target)) {
      throw new UnsupportedEmitTargetError(target);
    }
    this.emitters.set(target, emitter);
  }

  get(target: string): BaseEmitter | undefined {
    if (!isFreeTierTarget(target)) {
      throw new UnsupportedEmitTargetError(target);
    }
    return this.emitters.get(target);
  }

  list(): readonly EmitTarget[] {
    return Array.from(this.emitters.keys());
  }

  has(target: EmitTarget): boolean {
    return this.emitters.has(target);
  }
}

/**
 * Build a registry pre-populated with every free-tier emitter.
 *
 * Shared emitter options (outputDir, dryRun, verbose) are forwarded to
 * each constructor. Callers that need per-target options should register
 * emitters directly instead of using this helper.
 */
export function createDefaultRegistry(options: EmitterOptions): EmitterRegistry {
  const registry = new EmitterRegistry();
  registry.register('oc', new OCEmitter(options));
  registry.register('claude-code', new ClaudeCodeEmitter(options));
  return registry;
}
