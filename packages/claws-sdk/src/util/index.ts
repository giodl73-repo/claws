/**
 * Shared utility barrel for claws-sdk.
 *
 * @module claws-sdk/util
 */

export { normalizePath } from './path.js';
export { normalizeName } from './normalize.js';
export { levenshtein } from './levenshtein.js';
export { stripBOM, normalizeLF } from './text.js';
export { pathExists } from './fs.js';
export { canonicalJson } from './canonical-json.js';
