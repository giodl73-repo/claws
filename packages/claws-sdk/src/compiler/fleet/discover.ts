/**
 * Lexicographic workspace discovery for fleet compile (fleet/S01 AC-15/16).
 *
 * `discoverWorkspaces(fleetDir)` returns immediate child directories of
 * `fleetDir` that contain a `lobster.yaml`, sorted by a stable locale
 * `Intl.Collator`. Filesystem `readdir()` ordering never leaks into
 * the output — two operators on different filesystems see the same
 * compile-start order.
 *
 * Scope is deliberately shallow: only immediate children are considered;
 * a recursive walk is a separate feature.
 *
 * @module claws-sdk/compiler/fleet/discover
 */

import { readdir, access } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Stable locale for lex sort. Fixing the locale to `en` avoids
 * surprises when operators in different locales compile the same fleet
 * and observe different orderings (AC-15).
 */
const COLLATOR = new Intl.Collator('en', { sensitivity: 'variant' });

/**
 * A discovered workspace entry: absolute `path` plus the short
 * `basename` used as the identifier in per-workspace output lines.
 */
export interface DiscoveredWorkspace {
  readonly path: string;
  readonly basename: string;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Discover workspaces under `fleetDir`.
 *
 * Immediate child directories containing a `lobster.yaml` are returned.
 * Child files (non-directories) are skipped silently. Directories without
 * `lobster.yaml` are skipped silently — not reported as failure, so
 * a mixed directory (some lobster workspaces, some other content) stays
 * usable (AC-16).
 *
 * Surfaces the ENOENT / ENOTDIR on the root itself as a thrown error so
 * the caller can exit `1` per CL-01 v1.2 exit-code contract.
 */
export async function discoverWorkspaces(fleetDir: string): Promise<readonly DiscoveredWorkspace[]> {
  const entries = await readdir(fleetDir, { withFileTypes: true });
  const candidates: DiscoveredWorkspace[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const path = join(fleetDir, e.name);
    // eslint-disable-next-line no-await-in-loop -- shallow scan, 1 access per child
    const hasLobster = await fileExists(join(path, 'lobster.yaml'));
    if (!hasLobster) continue;
    candidates.push({ path, basename: e.name });
  }
  candidates.sort((a, b) => COLLATOR.compare(a.basename, b.basename));
  return candidates;
}
