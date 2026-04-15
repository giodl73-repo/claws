/**
 * Fleet baseline management — establish and load fleet baselines.
 *
 * A baseline is computed from a reference workspace's governance hash
 * and stored in the fleet manifest (.claws/fleet-manifest.json).
 *
 * @module claws-sdk/fleet/baseline
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

import type { FleetBaseline, FleetManifest } from './drift-types.js';
import { computeGovernanceHash } from './drift.js';

/** Default manifest file path relative to a fleet root. */
const FLEET_MANIFEST_FILE = '.claws/fleet-manifest.json';

/**
 * Establish a fleet baseline from a reference workspace.
 *
 * Computes the governance hash for the reference workspace and stores it
 * in the fleet manifest file.
 *
 * @param referenceWorkspacePath - Absolute path to the governed reference workspace
 * @param baselineName - Label for this baseline (e.g., "production", "q1-2026")
 * @param fleetRoot - Absolute path to the fleet root where the manifest is stored
 * @returns The newly created baseline
 */
export async function establishBaseline(
  referenceWorkspacePath: string,
  baselineName: string,
  fleetRoot: string,
): Promise<FleetBaseline> {
  const hash = await computeGovernanceHash(referenceWorkspacePath);

  const baseline: FleetBaseline = {
    name: baselineName,
    hash,
    referenceWorkspacePath,
    createdAt: new Date().toISOString(),
  };

  // Load existing manifest or create new
  const manifestPath = join(fleetRoot, FLEET_MANIFEST_FILE);
  const manifest = await loadManifest(manifestPath);

  const updated: FleetManifest = {
    baselines: { ...manifest.baselines, [baselineName]: baseline },
  };

  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(updated, null, 2), 'utf-8');

  return baseline;
}

/**
 * Load a fleet baseline by name from the fleet manifest.
 *
 * @param baselineName - Name of the baseline to load
 * @param fleetRoot - Absolute path to the fleet root
 * @returns The baseline, or null if not found
 */
export async function loadBaseline(
  baselineName: string,
  fleetRoot: string,
): Promise<FleetBaseline | null> {
  const manifestPath = join(fleetRoot, FLEET_MANIFEST_FILE);
  const manifest = await loadManifest(manifestPath);
  return manifest.baselines[baselineName] ?? null;
}

/**
 * Load all baselines from the fleet manifest.
 *
 * @param fleetRoot - Absolute path to the fleet root
 * @returns Record of baselines keyed by name
 */
export async function loadAllBaselines(
  fleetRoot: string,
): Promise<Record<string, FleetBaseline>> {
  const manifestPath = join(fleetRoot, FLEET_MANIFEST_FILE);
  const manifest = await loadManifest(manifestPath);
  return manifest.baselines;
}

/**
 * Load the fleet manifest from disk. Returns empty manifest if file doesn't exist.
 */
async function loadManifest(manifestPath: string): Promise<FleetManifest> {
  try {
    const raw = await readFile(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw) as FleetManifest;
    return { baselines: parsed.baselines ?? {} };
  } catch {
    return { baselines: {} };
  }
}
