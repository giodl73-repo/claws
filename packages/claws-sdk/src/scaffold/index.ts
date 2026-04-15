/**
 * Scaffold module — skill scaffolding orchestration.
 *
 * @module claws-sdk/scaffold
 */

export { scaffoldSkill, SkillAlreadyExistsError, RiskCapExceededError, validateSkillName } from './scaffold.js';
export type { ScaffoldOptions, ScaffoldResult } from './scaffold.js';
export { maxRiskForTier, isRiskPermitted, defaultRiskForTemplateTier } from './defaults.js';
export type { TrustTier, RiskLevel, SkillTemplateTier } from './defaults.js';
export { checkSkillKitDependency, extractMajor } from './dependency.js';
export type { DependencyCheckResult } from './dependency.js';
export { generateTemplate, declaredTemplate, typedTemplate, verifiedTemplate, skillClassName } from './templates/index.js';
export type { SkillTemplateFile, TemplateContext } from './templates/index.js';
export { detectOboFromName } from './obo-suggest.js';
export type { OboSuggestionResult } from './obo-suggest.js';
