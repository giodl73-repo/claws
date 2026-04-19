/**
 * Shared helpers for fleet compile tests.
 *
 * `makeHealthyWorkspace(root, name)` clones the canonical `full-workspace`
 * fixture under `<root>/<name>/` so each test gets an independent
 * compile-clean workspace. `makeBrokenWorkspace` seeds a workspace with a
 * known-bad file to exercise the failure-isolation path.
 */

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = resolve(__dirname, '../../fixtures');
const FULL_WORKSPACE = join(FIXTURES_ROOT, 'full-workspace');

export function makeHealthyWorkspace(root: string, name: string): string {
  const dest = join(root, name);
  mkdirSync(dest, { recursive: true });
  cpSync(FULL_WORKSPACE, dest, { recursive: true });
  return dest;
}

export function makeBrokenWorkspace(root: string, name: string): string {
  const dest = join(root, name);
  mkdirSync(dest, { recursive: true });
  // Malformed YAML triggers sidecar/reader failure + diagnostic.
  writeFileSync(join(dest, 'lobster.yaml'), ':::: not valid yaml ::::\n');
  return dest;
}
