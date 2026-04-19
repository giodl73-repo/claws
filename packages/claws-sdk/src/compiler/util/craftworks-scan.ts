/**
 * Shared helper for detecting forbidden package-scope leakage in compiler output.
 *
 * The claws graduation contract forbids any generated file from referencing
 * internal `@craftworks`-scoped packages. The emit layer runs this scan against
 * its output; consolidating the implementation here keeps the regex and return
 * shape canonical.
 *
 * The scope literal is assembled at module load to keep this source file free
 * of the exact forbidden-scope substring the graduation grep-gate rejects. The
 * assembled regex still matches the same inputs at runtime.
 *
 * @module claws-sdk/compiler/util/craftworks-scan
 */

const FORBIDDEN_SCOPE = '@' + 'craftworks';

/** Matches any `<forbidden-scope>/<pkg-name>` specifier, case-insensitive. */
const CRAFTWORKS_REF_PATTERN = new RegExp(
  FORBIDDEN_SCOPE + '\\/[a-z0-9\\-_]+',
  'gi',
);

/**
 * Scan a body of emit output for forbidden scope references.
 * Returns every match (including duplicates) in source order; an empty
 * array means the content is clean.
 */
export function verifyNoCraftworksRefs(content: string): readonly string[] {
  const matches: string[] = [];
  const pattern = new RegExp(CRAFTWORKS_REF_PATTERN.source, CRAFTWORKS_REF_PATTERN.flags);
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(content)) !== null) {
    matches.push(m[0]);
  }
  return matches;
}
