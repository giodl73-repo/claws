/**
 * @bic/openclaw-lkg/paths — companion-file path helpers.
 *
 * Mirrors upstream's `<config>.lkg` and `<config>.clobbered.<ts>`
 * naming convention from `openclaw-core/src/config/io.observe-recovery.ts`.
 *
 * @module @bic/openclaw-lkg/paths
 */

import * as path from 'node:path';

export function lkgPathFor(target: string): string {
  return `${target}.lkg`;
}

export function clobberedPathFor(target: string, observedAt: string): string {
  // Sanitize ISO timestamp to a filename-safe form.
  const safe = observedAt.replaceAll(':', '-').replaceAll('.', '-');
  return `${target}.clobbered.${safe}`;
}

export function isCompanionPath(p: string): boolean {
  const base = path.basename(p);
  return base.includes('.lkg') || base.includes('.clobbered.');
}
