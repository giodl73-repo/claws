/**
 * Emit module -- claws compiler emit layer.
 *
 * Free tier targets: oc, claude-code.
 *
 * @module claws-sdk/compiler/emit
 */

export type {
  EmitTarget,
  EmitDiagnostic,
  EmitDiagnosticSeverity,
  EmittedFile,
  EmitResult,
  EmitterOptions,
} from './types.js';

export { BaseEmitter } from './base-emitter.js';
export { OCEmitter, verifyNoCraftworksRefs } from './oc-emitter.js';
export { ClaudeCodeEmitter } from './cc-emitter.js';
export {
  formatClaudeMd,
  formatSettingsJson,
  formatCommandStub,
  formatSkillStubs,
  slugifySkillName,
  trustToPermission,
} from './cc-templates.js';
export type { CCPermission, CCSettings } from './cc-templates.js';
export {
  EmitterRegistry,
  UnsupportedEmitTargetError,
  FREE_TIER_TARGETS,
  createDefaultRegistry,
} from './registry.js';
