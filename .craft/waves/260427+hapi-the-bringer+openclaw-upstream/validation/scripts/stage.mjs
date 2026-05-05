#!/usr/bin/env node
/**
 * stage.mjs — copy fixtures/<kind>/<slug>/ → scratch/<slug>/
 *
 * Idempotent: removes scratch/<slug>/ before copying.
 *
 * Usage:
 *   node scripts/stage.mjs <slug>
 *   node scripts/stage.mjs --all
 */
import { readFile, rm, mkdir, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

async function loadManifest() {
  const raw = await readFile(join(root, 'manifest.json'), 'utf8');
  return JSON.parse(raw);
}

function findFixture(manifest, slug) {
  const entry = manifest.fixtures.find((f) => f.slug === slug);
  if (!entry) throw new Error(`fixture not found in manifest: ${slug}`);
  return entry;
}

async function stageOne(entry) {
  const src = join(root, 'fixtures', entry.kind, entry.slug);
  const dst = join(root, 'scratch', entry.slug);
  if (!existsSync(src)) {
    throw new Error(`fixture clean copy missing: ${src}`);
  }
  await rm(dst, { recursive: true, force: true });
  await mkdir(dst, { recursive: true });
  await cp(src, dst, { recursive: true });
  return { slug: entry.slug, src, dst };
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node scripts/stage.mjs <slug> | --all');
  process.exit(2);
}

const manifest = await loadManifest();
const targets =
  args[0] === '--all' ? manifest.fixtures : [findFixture(manifest, args[0])];

for (const entry of targets) {
  const result = await stageOne(entry);
  process.stdout.write(JSON.stringify({ staged: result.slug, dst: result.dst }) + '\n');
}
