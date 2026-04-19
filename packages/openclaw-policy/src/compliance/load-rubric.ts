/**
 * Rubric loader — resolves built-in rubric ids or loads user-supplied YAML.
 *
 * Built-ins ship as `.yaml` under `src/compliance/rubrics/`. Custom rubrics
 * come in as a path to a YAML file or a pre-parsed `Rubric` object.
 *
 * @module @bic/openclaw-policy/compliance/load-rubric
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import type { Rubric, RubricCheckKind, RubricRequirement } from '../ops/types.js';

const BUILT_INS = ['soc2', 'hipaa', 'eu-ai-act', 'nist-ai-rmf'] as const;

export type BuiltInRubricId = (typeof BUILT_INS)[number];

export function isBuiltInRubricId(id: string): id is BuiltInRubricId {
  return (BUILT_INS as readonly string[]).includes(id);
}

function rubricsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, 'rubrics');
}

export function parseRubricYaml(yaml: string): Rubric {
  const lines = yaml.split('\n');
  let id = '';
  let version = '';
  let framework = '';
  const requirements: RubricRequirement[] = [];
  let current: RubricMutable | null = null;
  let inRequirements = false;

  for (const raw of lines) {
    if (raw.trim() === '' || raw.trim().startsWith('#')) continue;
    if (!inRequirements) {
      const kv = parseKeyValue(raw);
      if (kv === null) continue;
      const { key, val } = kv;
      if (key === 'id') id = val;
      else if (key === 'version') version = val;
      else if (key === 'framework') framework = val;
      else if (key === 'requirements') inRequirements = true;
      continue;
    }
    const trimmed = raw.trim();
    if (trimmed.startsWith('- ')) {
      if (current !== null) requirements.push(finalise(current));
      current = {};
      const rest = trimmed.slice(2);
      assignField(current, rest);
    } else if (current !== null) {
      assignField(current, trimmed);
    }
  }
  if (current !== null) requirements.push(finalise(current));

  return { id, version, framework, requirements };
}

/**
 * Parse a YAML-ish `key: value` line into its two parts without using
 * regex patterns that CodeQL flags as polynomial-backtrack risks.
 * Returns null on non-matching input.
 *
 * - Key must match `[a-zA-Z_][\w-]*` (bounded, anchored via slice)
 * - Whitespace between `:` and value is consumed deterministically
 * - Value is the rest of the line (trimmed by caller via unquote)
 */
function parseKeyValue(line: string): { key: string; val: string } | null {
  const colonIdx = line.indexOf(':');
  if (colonIdx <= 0) return null;
  const keyPart = line.slice(0, colonIdx);
  // Validate key shape: `[a-zA-Z_][\w-]*` — anchored, bounded.
  if (keyPart.length === 0) return null;
  const first = keyPart.charCodeAt(0);
  const firstOk =
    (first >= 0x41 && first <= 0x5a) || // A-Z
    (first >= 0x61 && first <= 0x7a) || // a-z
    first === 0x5f;                      // _
  if (!firstOk) return null;
  for (let i = 1; i < keyPart.length; i++) {
    const c = keyPart.charCodeAt(i);
    const ok =
      (c >= 0x30 && c <= 0x39) || // 0-9
      (c >= 0x41 && c <= 0x5a) ||
      (c >= 0x61 && c <= 0x7a) ||
      c === 0x5f ||
      c === 0x2d;                  // -
    if (!ok) return null;
  }
  // Skip whitespace after `:` deterministically.
  let j = colonIdx + 1;
  while (j < line.length && (line[j] === ' ' || line[j] === '\t')) j++;
  return { key: keyPart, val: unquote(line.slice(j).trim()) };
}

function assignField(target: RubricMutable, line: string): void {
  const kv = parseKeyValue(line);
  if (kv === null) return;
  const { key, val } = kv;
  if (key === 'id') target.id = val;
  else if (key === 'title') target.title = val;
  else if (key === 'kind') target.kind = val as RubricCheckKind;
  else if (key === 'predicate') target.predicate = val;
  else if (key === 'description') target.description = val;
}

interface RubricMutable {
  id?: string;
  title?: string;
  kind?: RubricCheckKind;
  predicate?: string;
  description?: string;
}

function finalise(p: RubricMutable): RubricRequirement {
  const base = {
    id: p.id ?? '',
    title: p.title ?? '',
    kind: p.kind ?? 'static',
    predicate: p.predicate ?? '',
  };
  return p.description !== undefined ? { ...base, description: p.description } : base;
}

function unquote(v: string): string {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

export async function loadRubric(source: BuiltInRubricId | { path: string } | Rubric): Promise<Rubric> {
  if (typeof source === 'object' && 'requirements' in source) {
    return source;
  }
  if (typeof source === 'string') {
    if (!isBuiltInRubricId(source)) {
      throw new Error(`unknown built-in rubric: ${source}`);
    }
    const path = resolve(rubricsDir(), `${source}.yaml`);
    const yaml = await readFile(path, 'utf8');
    return parseRubricYaml(yaml);
  }
  const yaml = await readFile(source.path, 'utf8');
  return parseRubricYaml(yaml);
}

export const BUILT_IN_RUBRIC_IDS = BUILT_INS;
