#!/usr/bin/env node
/**
 * fetch.mjs — clone a repo from catalog.json into fixtures/real/<slug>/,
 * pruned to OpenClaw-shape files only.
 *
 * The validation harness only needs the agent-workspace artifacts; we
 * don't ship the whole upstream repo. Pruning keeps each fixture small
 * (typically <1MB) and the suite hermetic (.git/ removed after extract).
 *
 * Usage:
 *   node scripts/fetch.mjs <slug>          # one repo
 *   node scripts/fetch.mjs --all           # everything in catalog.community
 *   node scripts/fetch.mjs --anchors       # everything in catalog.anchors
 *   node scripts/fetch.mjs --dry-run <slug>
 */
import { readFile, mkdir, rm, cp, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const FIXTURES_REAL = join(root, 'fixtures', 'real');
const CATALOG = join(root, 'catalog.json');

// Files / directories to retain from each cloned repo. Anything not
// matching these stays out of the fixture; the goal is a hermetic
// minimal slice of the workspace shape.
const KEEP_BASENAMES_CI = new Set([
  'AGENTS.MD',
  'CLAUDE.MD',
  'TOOLS.MD',
  'SOUL.MD',
  'IDENTITY.MD',
  'MEMORY.MD',
  'USER.MD',
  'HEARTBEAT.MD',
  'SKILL.MD',
  'VISION.MD',
  'DESIGN.MD',
  'POLICY.JSON',
  'POLICY.JSONC',
  'GATEWAY.JSONC',
  'OPENCLAW.JSONC',
  'CONFIG.JSONC',
  'README.MD',
  'LICENSE',
  'LICENSE.MD',
]);

const KEEP_DIRS = new Set([
  '.agents',
  '.claude',
  '.claude-plugin',
  '.agent', // singular variant (nix-openclaw)
  'skills',
  'sessions',
  'agents', // directory variant (multi-harness)
]);

function endsWithLobster(name) {
  return name.toLowerCase().endsWith('.lobster');
}

function shouldKeep(name) {
  const upper = name.toUpperCase();
  if (KEEP_BASENAMES_CI.has(upper)) return true;
  if (endsWithLobster(name)) return true;
  return false;
}

async function pruneRepo(repoDir, fixtureDir) {
  // Walk root entries; copy only KEEP_DIRS or KEEP_BASENAMES files.
  const entries = await readdir(repoDir, { withFileTypes: true });
  let copied = 0;
  for (const e of entries) {
    if (e.name === '.git') continue;
    const src = join(repoDir, e.name);
    const dst = join(fixtureDir, e.name);
    if (e.isDirectory()) {
      if (KEEP_DIRS.has(e.name)) {
        await cp(src, dst, { recursive: true });
        copied++;
      }
    } else if (e.isFile() || e.isSymbolicLink()) {
      if (shouldKeep(e.name)) {
        await cp(src, dst, { dereference: false });
        copied++;
      }
    }
  }
  return copied;
}

async function fetchOne(entry, dryRun = false) {
  const fixtureDir = join(FIXTURES_REAL, entry.slug);
  const tmp = join(tmpdir(), `openclaw-fetch-${entry.slug}-${Date.now()}`);

  if (dryRun) {
    return { slug: entry.slug, dryRun: true, planned: { url: entry.url, ref: entry.ref, fixtureDir } };
  }

  if (existsSync(fixtureDir)) {
    await rm(fixtureDir, { recursive: true, force: true });
  }
  await mkdir(fixtureDir, { recursive: true });

  // Shallow clone into tmp.
  const clone = spawnSync(
    'git',
    ['clone', '--depth', '1', '--branch', entry.ref, entry.url, tmp],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (clone.status !== 0) {
    return { slug: entry.slug, error: `clone failed: ${clone.stderr.slice(0, 200)}` };
  }

  let copied = 0;
  try {
    copied = await pruneRepo(tmp, fixtureDir);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }

  // Write a PROVENANCE.md inside the fixture so we always know where it came from.
  const provenance = [
    `# Provenance`,
    ``,
    `- Source: ${entry.url}`,
    `- Ref: ${entry.ref}`,
    `- License: ${entry.license ?? 'unknown'}`,
    `- Fetched: ${new Date().toISOString()}`,
    `- Pruned to OpenClaw-shape files only (see scripts/fetch.mjs).`,
  ].join('\n') + '\n';
  await import('node:fs/promises').then((fs) => fs.writeFile(join(fixtureDir, 'PROVENANCE.md'), provenance));

  return { slug: entry.slug, copied, fixtureDir };
}

const catalog = JSON.parse(await readFile(CATALOG, 'utf8'));
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const flags = args.filter((a) => a.startsWith('--'));
const positional = args.filter((a) => !a.startsWith('--'));

let targets;
if (flags.includes('--anchors')) {
  targets = catalog.anchors;
} else if (flags.includes('--all')) {
  targets = catalog.community;
} else if (positional.length === 1) {
  targets = [...catalog.community, ...catalog.anchors].filter((e) => e.slug === positional[0]);
  if (targets.length === 0) {
    console.error(`slug not found in catalog: ${positional[0]}`);
    process.exit(2);
  }
} else {
  console.error('usage: node scripts/fetch.mjs <slug> | --all | --anchors [--dry-run]');
  process.exit(2);
}

await mkdir(FIXTURES_REAL, { recursive: true });

for (const entry of targets) {
  const result = await fetchOne(entry, dryRun);
  process.stdout.write(JSON.stringify(result) + '\n');
}
