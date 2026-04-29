/**
 * @bic/openclaw-workspace/ast/jsonc — JSON-with-comments parse + emit + lint
 *   substrate for OpenClaw config files.
 *
 * The parser is hand-written recursive descent, lossless on round-trip
 * (`emit(parseJsonc(s))` returns `s` byte-identically). The emit function
 * supports leaf-value mutation while preserving everything else.
 *
 * @module @bic/openclaw-workspace/ast/jsonc
 */

export { parseJsonc, locateOffset, buildLineStarts, locateOffsetWithStarts } from './parse.js';
export { emitJsonc, emitJsoncWithMutation, emitJsoncWithObject, OcEmitSentinelError } from './emit.js';
export { JSONC_GRAMMAR } from './grammar.js';
export type {
  JsoncArrayNode,
  JsoncBooleanNode,
  JsoncComment,
  JsoncCommentKind,
  JsoncDiagnostic,
  JsoncDocument,
  JsoncMember,
  JsoncNullNode,
  JsoncNumberNode,
  JsoncObjectNode,
  JsoncRange,
  JsoncStringNode,
  JsoncValue,
} from './ast-types.js';
