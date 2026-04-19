/**
 * Util module -- shared helpers used across the claws compiler layers.
 *
 * Everything here is cheap, pure, and side-effect free. Layer-specific
 * logic belongs with its layer; util/ is reserved for pieces that would
 * otherwise be duplicated verbatim.
 *
 * @module claws-sdk/compiler/util
 */

export { verifyNoCraftworksRefs } from './craftworks-scan.js';
