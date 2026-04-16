/**
 * @bic/openclaw-lsp — language server for governance compilation.
 *
 * @module claws-lsp
 */

export { CompilationHost, hashContent } from './compilation-host.js';
export type {
  GovernanceIRLike,
  CompileFn,
  CompileResult,
} from './compilation-host.js';

export { ClawsServer, attachToConnection } from './server.js';
export type { ServerOptions, PublishDiagnosticsFn } from './server.js';

export {
  CATEGORY_META,
  ALL_CATEGORIES,
  extractDiagnostics,
  toLspDiagnostics,
  computeTensions,
  classifyFile,
} from './providers/diagnostic.js';
export type {
  DiagnosticCategory,
  CategoryMeta,
  RawDiagnostic,
  GovernanceFileRole,
  TensionDiagnostic,
} from './providers/diagnostic.js';

export {
  provideCodeActions,
  generateEdit,
  fixTypeForDiagnostic,
} from './providers/code-action.js';
export type { FixType } from './providers/code-action.js';

export {
  buildTokenLegend,
  encodeTokens,
  extractSemanticTokens,
  provideSemanticTokens,
  TOKEN_TYPES,
  TOKEN_TYPE_INDEX,
  TOKEN_MODIFIERS,
  TOKEN_MODIFIER_MASK,
  RISK_LEVEL_TOKEN,
  RISK_LEVEL_COLORS,
} from './providers/semantic-tokens.js';
export type { RawSemanticToken } from './providers/semantic-tokens.js';

export {
  computeCompletions,
  detectContext,
  extractTools,
  RELAX_OPERATORS,
  RELAX_PREDICATES,
  RISK_LEVELS,
  POLICY_TEMPLATES,
  CompletionItemKind,
} from './providers/completion.js';
export type {
  CompletionItem,
  CompletionContext,
  PolicyTemplate,
} from './providers/completion.js';

export {
  computeHover,
  buildRiskCard,
  findTool,
  extractToolMeta,
  riskToNumeric,
  numericToRLabel,
  wordAt,
} from './providers/hover.js';
export type {
  HoverResult,
  ToolMeta,
} from './providers/hover.js';

export {
  parseSections,
  computeAggregates,
  formatRiskBreakdown,
  formatCodeLens,
  computeCodeLenses,
} from './providers/code-lens.js';
export type {
  Section,
  SectionAggregate,
  CodeLensItem,
} from './providers/code-lens.js';

export {
  detectAllClusters,
  detectCluster,
  ALL_CLUSTERS,
} from './tension/cross-file.js';
export type {
  ConflictCluster,
  ConflictFinding,
  WorkspaceFile,
} from './tension/cross-file.js';
