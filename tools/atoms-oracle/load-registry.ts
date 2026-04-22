/**
 * tools/atoms-oracle/load-registry.ts — Horus CP-8 pulse 75.
 *
 * Walks docs/{package}/ATOMS.md files and builds a typed AtomsRegistry.
 * The per-package ATOMS.md file IS the authoritative atom registry
 * per CL-13 v1.8 oracle invariant §N.1: every atom row declares its
 * `Needs` field (spec, guide, pitfalls, scenarios, how-to, tutorial),
 * and the `devtools/repo-ops/src/check.ts` validator enforces that
 * each declared need is met by a matching doc file.
 *
 * This loader + bidirectional-sweep.ts together form the four-way
 * oracle: atom ↔ need-satisfying-file ↔ scenario-series.
 *
 * Design notes (CL-13 v1.8 §N.1 + P-08 mitigation):
 *   - Shared parsed cache keyed on docs root; identical cache across
 *     multiple `--check atoms` invocations in a single doctor run.
 *   - Precise line-number diagnostics on malformed entries.
 *   - Duplicate atom id detection across all package ATOMS.md files.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface AtomRow {
  readonly id: string;
  readonly name: string;
  readonly parent: string | null;
  readonly needs: readonly string[];
  readonly packageDir: string;     // e.g., "workspace" or "guardrails"
  readonly sourceFile: string;     // absolute path
  readonly sourceLine: number;     // 1-indexed
}

export interface AtomsRegistry {
  readonly atoms: readonly AtomRow[];
  readonly byId: ReadonlyMap<string, AtomRow>;
  readonly byPackage: ReadonlyMap<string, readonly AtomRow[]>;
  readonly parseErrors: readonly RegistryParseError[];
}

export interface RegistryParseError {
  readonly file: string;
  readonly line: number;
  readonly reason: string;
}

const PARENT_NONE = '—'; // em-dash U+2014

// ---------------------------------------------------------------------------
// Parser — parses a single ATOMS.md file and emits AtomRow[] + errors.
// ---------------------------------------------------------------------------

export function parseAtomsFile(
  content: string,
  sourceFile: string,
  packageDir: string,
): { rows: AtomRow[]; errors: RegistryParseError[] } {
  const rows: AtomRow[] = [];
  const errors: RegistryParseError[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim().startsWith('| atom:')) continue;

    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

    if (cells.length < 4) {
      errors.push({
        file: sourceFile,
        line: i + 1,
        reason: `expected 4 columns (id, name, parent, needs), got ${cells.length}`,
      });
      continue;
    }

    const [id, name, parentRaw, needsRaw] = cells as [string, string, string, string];

    if (!id.startsWith('atom:') || id.length < 6) {
      errors.push({
        file: sourceFile,
        line: i + 1,
        reason: `malformed atom id: ${id}`,
      });
      continue;
    }

    if (!name || name.length === 0) {
      errors.push({
        file: sourceFile,
        line: i + 1,
        reason: `atom ${id} has empty name column`,
      });
      continue;
    }

    const parent = parentRaw === PARENT_NONE ? null : parentRaw;
    const needs = needsRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    rows.push({
      id,
      name,
      parent,
      needs,
      packageDir,
      sourceFile,
      sourceLine: i + 1,
    });
  }

  return { rows, errors };
}

// ---------------------------------------------------------------------------
// Registry loader with AtomsRegistryCache (P-08 mitigation).
// ---------------------------------------------------------------------------

const registryCache = new Map<string, AtomsRegistry>();

export function clearRegistryCache(): void {
  registryCache.clear();
}

export function loadRegistry(docsRoot: string): AtomsRegistry {
  const cached = registryCache.get(docsRoot);
  if (cached !== undefined) return cached;

  const allRows: AtomRow[] = [];
  const allErrors: RegistryParseError[] = [];

  if (!existsSync(docsRoot)) {
    const empty: AtomsRegistry = {
      atoms: [],
      byId: new Map(),
      byPackage: new Map(),
      parseErrors: [],
    };
    registryCache.set(docsRoot, empty);
    return empty;
  }

  for (const pkg of readdirSync(docsRoot)) {
    const pkgDir = join(docsRoot, pkg);
    if (!statSync(pkgDir).isDirectory()) continue;

    const atomsPath = join(pkgDir, 'ATOMS.md');
    if (!existsSync(atomsPath)) continue;

    const content = readFileSync(atomsPath, 'utf8');
    const { rows, errors } = parseAtomsFile(content, atomsPath, pkg);
    allRows.push(...rows);
    allErrors.push(...errors);
  }

  // Duplicate-id detection
  const seenIds = new Map<string, AtomRow>();
  for (const row of allRows) {
    const prior = seenIds.get(row.id);
    if (prior !== undefined) {
      allErrors.push({
        file: row.sourceFile,
        line: row.sourceLine,
        reason: `duplicate atom id ${row.id} (first declared at ${relative(docsRoot, prior.sourceFile)}:${prior.sourceLine})`,
      });
    } else {
      seenIds.set(row.id, row);
    }
  }

  const byId = new Map<string, AtomRow>();
  for (const row of allRows) byId.set(row.id, row);

  const byPackage = new Map<string, AtomRow[]>();
  for (const row of allRows) {
    if (!byPackage.has(row.packageDir)) byPackage.set(row.packageDir, []);
    byPackage.get(row.packageDir)!.push(row);
  }

  const registry: AtomsRegistry = {
    atoms: allRows,
    byId,
    byPackage,
    parseErrors: allErrors,
  };

  registryCache.set(docsRoot, registry);
  return registry;
}
