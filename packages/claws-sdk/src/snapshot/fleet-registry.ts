/**
 * Fleet registry — fleet-scoped storage for promoted snapshots.
 *
 * Promoted snapshots live in `.claws/fleet-registry/{name}/v{n}/` with:
 * - manifest.json — the SnapshotManifest
 * - provenance.json — PromoteProvenance attestation
 * - files/ — snapshot file contents
 *
 * Each promotion creates a new version directory (v1, v2, ...) so
 * promoting to an existing name never overwrites previous versions.
 *
 * @module claws-sdk/snapshot/fleet-registry
 */

import { readFile, writeFile, mkdir, readdir, cp, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { SnapshotManifest } from './manifest.js';
import type { PromoteProvenance } from './provenance.js';

/** Base directory for the fleet registry within a fleet root. */
const FLEET_REGISTRY_DIR = '.claws/fleet-registry';

/**
 * Info about a promoted snapshot version in the registry.
 */
export interface RegistryEntry {
  /** Snapshot name. */
  readonly name: string;
  /** Version number (1-based). */
  readonly version: number;
  /** ISO 8601 timestamp from provenance. */
  readonly timestamp: string;
  /** Signer from provenance. */
  readonly signer: string;
  /** Bundle hash from provenance. */
  readonly bundleHash: string;
}

/**
 * Resolve the absolute path to a fleet registry name directory.
 */
export function registryNameDir(fleetRoot: string, name: string): string {
  return join(fleetRoot, FLEET_REGISTRY_DIR, name);
}

/**
 * Resolve the absolute path to a specific version directory.
 */
export function registryVersionDir(fleetRoot: string, name: string, version: number): string {
  return join(fleetRoot, FLEET_REGISTRY_DIR, name, `v${version}`);
}

/**
 * Determine the next version number for a named snapshot in the registry.
 */
export async function nextVersion(fleetRoot: string, name: string): Promise<number> {
  const nameDir = registryNameDir(fleetRoot, name);
  let entries: string[];
  try {
    entries = await readdir(nameDir);
  } catch {
    return 1;
  }

  const versions = entries
    .filter((e) => /^v\d+$/.test(e))
    .map((e) => parseInt(e.slice(1), 10))
    .filter((n) => !isNaN(n));

  if (versions.length === 0) return 1;
  return Math.max(...versions) + 1;
}

/**
 * Store a promoted snapshot in the fleet registry.
 *
 * Copies snapshot files, manifest, and provenance into:
 * `{fleetRoot}/.claws/fleet-registry/{name}/v{version}/`
 *
 * @param fleetRoot - Absolute path to the fleet root directory
 * @param name - Snapshot name
 * @param snapshotSourceDir - Absolute path to the source snapshot directory
 * @param manifest - The snapshot manifest
 * @param provenance - The promotion provenance
 * @returns The version number assigned
 */
export async function storePromoted(
  fleetRoot: string,
  name: string,
  snapshotSourceDir: string,
  manifest: SnapshotManifest,
  provenance: PromoteProvenance,
): Promise<number> {
  const version = await nextVersion(fleetRoot, name);
  const versionDir = registryVersionDir(fleetRoot, name, version);

  await mkdir(versionDir, { recursive: true });

  // Copy files directory
  const sourceFilesDir = join(snapshotSourceDir, 'files');
  const destFilesDir = join(versionDir, 'files');
  try {
    await stat(sourceFilesDir);
    await cp(sourceFilesDir, destFilesDir, { recursive: true });
  } catch {
    // No files directory — create an empty one
    await mkdir(destFilesDir, { recursive: true });
  }

  // Write manifest.json
  await writeFile(
    join(versionDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  // Write provenance.json
  await writeFile(
    join(versionDir, 'provenance.json'),
    JSON.stringify(provenance, null, 2),
    'utf-8',
  );

  return version;
}

/**
 * Read provenance.json from a registry version directory.
 */
export async function readProvenance(
  fleetRoot: string,
  name: string,
  version: number,
): Promise<PromoteProvenance> {
  const provenancePath = join(registryVersionDir(fleetRoot, name, version), 'provenance.json');
  const content = await readFile(provenancePath, 'utf-8');
  return JSON.parse(content) as PromoteProvenance;
}

/**
 * Read manifest.json from a registry version directory.
 */
export async function readRegistryManifest(
  fleetRoot: string,
  name: string,
  version: number,
): Promise<SnapshotManifest> {
  const manifestPath = join(registryVersionDir(fleetRoot, name, version), 'manifest.json');
  const content = await readFile(manifestPath, 'utf-8');
  return JSON.parse(content) as SnapshotManifest;
}

/**
 * List all promoted versions of a named snapshot, sorted by timestamp (newest first).
 */
export async function listVersions(
  fleetRoot: string,
  name: string,
): Promise<readonly RegistryEntry[]> {
  const nameDir = registryNameDir(fleetRoot, name);
  let entries: string[];
  try {
    entries = await readdir(nameDir);
  } catch {
    return [];
  }

  const versions = entries
    .filter((e) => /^v\d+$/.test(e))
    .map((e) => parseInt(e.slice(1), 10))
    .filter((n) => !isNaN(n));

  const results: RegistryEntry[] = [];
  for (const version of versions) {
    try {
      const provenance = await readProvenance(fleetRoot, name, version);
      results.push({
        name,
        version,
        timestamp: provenance.timestamp,
        signer: provenance.signer,
        bundleHash: provenance.bundleHash,
      });
    } catch {
      // Skip versions without valid provenance
    }
  }

  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return results;
}

/**
 * List all snapshot names in the fleet registry.
 */
export async function listNames(fleetRoot: string): Promise<readonly string[]> {
  const registryDir = join(fleetRoot, FLEET_REGISTRY_DIR);
  try {
    const entries = await readdir(registryDir);
    const names: string[] = [];
    for (const entry of entries) {
      const s = await stat(join(registryDir, entry));
      if (s.isDirectory()) {
        names.push(entry);
      }
    }
    return names;
  } catch {
    return [];
  }
}

/**
 * Verify provenance chain integrity for a specific version.
 *
 * Recomputes the bundleHash from the files in the version directory
 * and compares against the recorded provenance.bundleHash.
 *
 * @returns true if the bundle hash matches, false if tampered
 */
export async function verifyProvenance(
  fleetRoot: string,
  name: string,
  version: number,
): Promise<boolean> {
  const { computeBundleHash } = await import('./promote.js');
  const provenance = await readProvenance(fleetRoot, name, version);
  const versionDir = registryVersionDir(fleetRoot, name, version);
  const actualHash = await computeBundleHash(join(versionDir, 'files'));
  return actualHash === provenance.bundleHash;
}
