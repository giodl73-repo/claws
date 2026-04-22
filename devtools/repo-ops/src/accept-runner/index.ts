/**
 * devtools/repo-ops/src/accept-runner — Horus CP-8 pulse 73.8.
 *
 * Manifest-driven accept-scenario tracking: each package's
 * `scenarios/manifest.yaml` declares series (3-letter code) → runner + min.
 * Validators check every `scenarios/{CODE}/` dir has a manifest entry and
 * meets its declared min-count. Runner-registry is pluggable: a runner
 * name referenced but not yet registered emits a WARN, not a BLOCK, so
 * implementation pulses can land scenarios against future runners.
 *
 * The manifest is the stable contract. Runners are data-plane, swappable.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import type { Finding } from '../check.ts';

export interface SeriesEntry {
  readonly runner: string;
  readonly min: number;
  readonly description?: string;
}

export interface Manifest {
  readonly version: 1;
  readonly series: Readonly<Record<string, SeriesEntry>>;
}

export class ManifestParseError extends Error {
  constructor(message: string, public readonly path: string) {
    super(`${path}: ${message}`);
    this.name = 'ManifestParseError';
  }
}

// ---------------------------------------------------------------------------
// Manifest loader — tiny hand-parsed YAML subset sufficient for the schema.
// ---------------------------------------------------------------------------

export function parseManifest(raw: string, path: string): Manifest {
  // Very small YAML-subset parser: version: N, series: { KEY: { runner:..., min:..., description:...} }
  // Handles indentation-based flow + inline values. Rejects anything unexpected.
  const lines = raw.split(/\r?\n/);
  let version: number | null = null;
  const series: Record<string, SeriesEntry> = {};
  let currentKey: string | null = null;
  let currentEntry: { runner?: string; min?: number; description?: string } = {};

  const commit = (): void => {
    if (currentKey === null) return;
    if (currentEntry.runner === undefined || currentEntry.min === undefined) {
      throw new ManifestParseError(`series.${currentKey} missing runner or min`, path);
    }
    series[currentKey] = {
      runner: currentEntry.runner,
      min: currentEntry.min,
      ...(currentEntry.description !== undefined ? { description: currentEntry.description } : {}),
    };
    currentKey = null;
    currentEntry = {};
  };

  let inSeries = false;
  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (line.length === 0 || line.trim().startsWith('#')) continue;
    const mVersion = line.match(/^version:\s*(\d+)\s*$/);
    if (mVersion) {
      version = Number.parseInt(mVersion[1]!, 10);
      continue;
    }
    if (line.match(/^series:\s*$/)) {
      inSeries = true;
      continue;
    }
    if (!inSeries) continue;

    const mSeriesKey = line.match(/^  ([A-Z]{3}):\s*$/);
    if (mSeriesKey) {
      commit();
      currentKey = mSeriesKey[1]!;
      continue;
    }
    const mField = line.match(/^    (\w+):\s*(.+)$/);
    if (mField && currentKey !== null) {
      const field = mField[1]!;
      const value = mField[2]!.replace(/^["']|["']$/g, '');
      if (field === 'runner') {
        currentEntry.runner = value;
      } else if (field === 'min') {
        const n = Number.parseInt(value, 10);
        if (!Number.isInteger(n) || n < 1) {
          throw new ManifestParseError(`series.${currentKey}.min must be positive integer`, path);
        }
        currentEntry.min = n;
      } else if (field === 'description') {
        currentEntry.description = value;
      } else {
        throw new ManifestParseError(`unknown field ${field} in series.${currentKey}`, path);
      }
      continue;
    }
  }
  commit();

  if (version !== 1) {
    throw new ManifestParseError(`manifest version must be 1 (got ${version})`, path);
  }
  return { version: 1, series };
}

// ---------------------------------------------------------------------------
// Runner registry — pluggable; unregistered names WARN.
// ---------------------------------------------------------------------------

const registeredRunners = new Set<string>();

export function registerRunner(name: string): void {
  registeredRunners.add(name);
}

export function isRunnerRegistered(name: string): boolean {
  return registeredRunners.has(name);
}

export function knownRunners(): readonly string[] {
  return [...registeredRunners].sort();
}

// Pre-register the runner names the wave plan anticipates so scenarios using
// them don't WARN by default. Implementation pulses may register additional.
registerRunner('e2e-loop-sim');
registerRunner('approval-flow-sim');
registerRunner('host-shape-sim');
registerRunner('compile-sim');
registerRunner('security-sim');

// ---------------------------------------------------------------------------
// Validator: every scenarios/{CODE}/ has a manifest entry + meets min-count;
// every manifest entry references a registered runner (else WARN).
// ---------------------------------------------------------------------------

export function validateAcceptScenarios(docsRoot: string): Finding[] {
  const findings: Finding[] = [];
  if (!existsSync(docsRoot)) return findings;
  for (const pkg of readdirSync(docsRoot)) {
    const pkgDir = join(docsRoot, pkg);
    if (!statSync(pkgDir).isDirectory()) continue;
    const scenariosDir = join(pkgDir, 'scenarios');
    if (!existsSync(scenariosDir)) continue;

    const manifestPath = join(scenariosDir, 'manifest.yaml');
    const seriesDirs = readdirSync(scenariosDir)
      .filter((n) => statSync(join(scenariosDir, n)).isDirectory())
      .filter((n) => /^[A-Z]{3}$/.test(n));

    if (!existsSync(manifestPath)) {
      if (seriesDirs.length > 0) {
        findings.push({
          validator: 'accept-runner',
          severity: 'BLOCK',
          file: `${pkg}/scenarios/manifest.yaml`,
          rule: 'manifest-missing',
          message: `${pkg}/scenarios/ has ${seriesDirs.length} series dirs but no manifest.yaml`,
        });
      }
      continue;
    }

    let manifest: Manifest;
    try {
      manifest = parseManifest(readFileSync(manifestPath, 'utf8'), manifestPath);
    } catch (err) {
      findings.push({
        validator: 'accept-runner',
        severity: 'BLOCK',
        file: relative(docsRoot, manifestPath),
        rule: 'manifest-parse-error',
        message: (err as Error).message,
      });
      continue;
    }

    // Every series dir must have a manifest entry
    for (const code of seriesDirs) {
      if (manifest.series[code] === undefined) {
        findings.push({
          validator: 'accept-runner',
          severity: 'BLOCK',
          file: `${pkg}/scenarios/${code}/`,
          rule: 'undeclared-series',
          message: `${pkg}: scenarios/${code}/ has no entry in manifest.yaml`,
        });
      }
    }

    // Every manifest entry must meet its min-count
    for (const [code, entry] of Object.entries(manifest.series)) {
      const codeDir = join(scenariosDir, code);
      const fileCount = existsSync(codeDir)
        ? readdirSync(codeDir).filter((n) => !n.startsWith('.')).length
        : 0;
      if (fileCount < entry.min) {
        findings.push({
          validator: 'accept-runner',
          severity: 'BLOCK',
          atomId: `atom:${code}`,
          file: `${pkg}/scenarios/${code}/`,
          rule: 'under-min-count',
          message: `${pkg}/scenarios/${code}/ has ${fileCount} scenarios; manifest requires min ${entry.min}`,
        });
      }
      if (!isRunnerRegistered(entry.runner)) {
        findings.push({
          validator: 'accept-runner',
          severity: 'WARN',
          atomId: `atom:${code}`,
          rule: 'unknown-runner',
          message: `${pkg}/scenarios/${code}/: runner '${entry.runner}' not registered (implementation pulse may land later)`,
        });
      }
    }
  }
  return findings;
}
