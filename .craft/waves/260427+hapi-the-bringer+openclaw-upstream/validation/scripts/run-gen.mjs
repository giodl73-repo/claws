#!/usr/bin/env node
/**
 * run-gen.mjs — feed plugin-specs.mjs through gen-plugin-fixture.mjs.
 *
 * usage: node scripts/run-gen.mjs [--limit N]
 */
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ALL_SPECS } from './plugin-specs.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : ALL_SPECS.length;

const specs = ALL_SPECS.slice(0, limit);
const tmpPath = join(here, '..', '.specs-tmp.json');
writeFileSync(tmpPath, JSON.stringify(specs));
console.log(`generating ${specs.length} plugin fixtures...`);

const result = spawnSync('node', [join(here, 'gen-plugin-fixture.mjs'), '--batch', tmpPath], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
