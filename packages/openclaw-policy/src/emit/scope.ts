/**
 * Scope-prefix argv parsing (P57).
 *
 * `claws policy generate --scope <prefix>` controls the emitted gateway-plugin.ts
 * import names. Default is `@bic/openclaw` (flat hyphen-form package names that
 * match the shipped @bic scope); `--scope @openclaw` emits the upstream slash-
 * form subpath imports used in pre-submission builds.
 *
 * The parser is deliberately tiny: two accepted values, one default, strict
 * rejection of anything else. policy-ir.json + audit-manifest.json are
 * byte-identical across scopes — only import lines in gateway-plugin.ts differ.
 */

import { DEFAULT_SCOPE_PREFIX } from './emit-plugin.js';
import type { ScopePrefix } from '../generator.js';

export const SCOPE_CHOICES: readonly ScopePrefix[] = [
  '@bic/openclaw',
  '@openclaw',
] as const;

export function parseScopeArg(args: readonly string[]): ScopePrefix {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--scope') {
      const v = args[i + 1];
      if (v === undefined) {
        throw new Error('--scope requires a value (@bic/openclaw or @openclaw)');
      }
      return asScope(v);
    }
    if (a !== undefined && a.startsWith('--scope=')) {
      return asScope(a.slice('--scope='.length));
    }
  }
  return DEFAULT_SCOPE_PREFIX;
}

function asScope(v: string): ScopePrefix {
  if (v === '@bic/openclaw' || v === '@openclaw') return v;
  throw new Error(
    `--scope must be one of ${SCOPE_CHOICES.join(', ')} (got ${JSON.stringify(v)})`,
  );
}
