#!/usr/bin/env node
/**
 * diff-runs.mjs — compare two suite runs, report what changed per fixture.
 *
 * Usage:
 *   node scripts/diff-runs.mjs                         # diff results-openclaw/ vs .snapshots/last/
 *   node scripts/diff-runs.mjs <a> <b>                 # diff two arbitrary results dirs
 *   node scripts/diff-runs.mjs --save-snapshot         # copy results-openclaw/ → .snapshots/last/
 *
 * Daily-use loop:
 *   node scripts/run-suite-openclaw.mjs --all
 *   node scripts/diff-runs.mjs                         # what changed since last snapshot?
 *   node scripts/diff-runs.mjs --save-snapshot         # accept the new state as baseline
 */
import { readdir, readFile, mkdir, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const CURRENT = join(root, 'results-openclaw');
const SNAPSHOT = join(root, '.snapshots', 'last');

async function readJsonOrNull(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function summarize(payload) {
  if (!payload) return null;
  if (payload.skipped) return `skipped(${payload.skipped})`;
  const p = payload.parsed;
  if (!p) return `exit=${payload.exitCode}`;
  if ('walkedFiles' in p) return `walked=${p.walkedFiles} tracked=${p.tracked} observed=${p.observed}`;
  if ('filesLinted' in p) return `linted=${p.filesLinted} findings=${p.diagnostics?.length ?? 0}`;
  if ('filesProcessed' in p) return `processed=${p.filesProcessed} tools=${p.tools ?? 0} deny=${p.denyRules ?? 0}`;
  if ('drift' in p) {
    const d = p.drift;
    return d.drifted ? `drift ${d.onDiskShape?.slice(0, 8)}->${d.regeneratedShape?.slice(0, 8)}` : 'in-sync';
  }
  if ('valid' in p) return p.valid ? 'valid' : `invalid:${p.error ?? '?'}`;
  return 'present';
}

async function diffOne(a, b) {
  const out = [];
  const fixtures = new Set();
  if (existsSync(a)) for (const f of await readdir(a)) fixtures.add(f);
  if (existsSync(b)) for (const f of await readdir(b)) fixtures.add(f);
  for (const slug of [...fixtures].sort()) {
    const aDir = join(a, slug);
    const bDir = join(b, slug);
    const tools = new Set();
    if (existsSync(aDir)) for (const f of await readdir(aDir)) if (f.endsWith('.json')) tools.add(f.slice(0, -5));
    if (existsSync(bDir)) for (const f of await readdir(bDir)) if (f.endsWith('.json')) tools.add(f.slice(0, -5));
    const changes = [];
    for (const tool of [...tools].sort()) {
      const ax = await readJsonOrNull(join(aDir, `${tool}.json`));
      const bx = await readJsonOrNull(join(bDir, `${tool}.json`));
      const aSum = summarize(ax);
      const bSum = summarize(bx);
      if (aSum !== bSum) {
        changes.push(`    ${tool}: ${aSum ?? '(missing)'} → ${bSum ?? '(missing)'}`);
      }
    }
    if (changes.length > 0) {
      out.push(`  ${slug}:`);
      out.push(...changes);
    }
  }
  return out;
}

const args = process.argv.slice(2);

if (args.includes('--save-snapshot')) {
  if (!existsSync(CURRENT)) {
    console.error(`no current run to snapshot at ${CURRENT}`);
    process.exit(2);
  }
  await rm(SNAPSHOT, { recursive: true, force: true });
  await mkdir(dirname(SNAPSHOT), { recursive: true });
  await cp(CURRENT, SNAPSHOT, { recursive: true });
  console.log(`snapshot saved: ${SNAPSHOT}`);
  process.exit(0);
}

const positional = args.filter((a) => !a.startsWith('-'));
const a = positional[0] ?? SNAPSHOT;
const b = positional[1] ?? CURRENT;

if (!existsSync(a)) {
  console.error(`no snapshot at ${a} — run with --save-snapshot first to establish a baseline`);
  process.exit(2);
}
if (!existsSync(b)) {
  console.error(`no current results at ${b} — run scripts/run-suite-openclaw.mjs first`);
  process.exit(2);
}

const lines = await diffOne(a, b);
if (lines.length === 0) {
  console.log('no changes since last snapshot');
} else {
  console.log(`changes since last snapshot (${lines.filter((l) => !l.startsWith(' ')).length} fixture(s)):`);
  console.log(lines.join('\n'));
}
