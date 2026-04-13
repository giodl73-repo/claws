/**
 * Name normalization for symbol table lookups.
 *
 * Per PF1-S21-F01: lowercase, replace whitespace runs with hyphens.
 *
 * @module claws-sdk/util/normalize
 */

/**
 * Normalize a name for symbol table lookup.
 *
 * Lowercases and replaces whitespace runs with hyphens.
 */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}
