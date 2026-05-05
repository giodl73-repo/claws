#!/usr/bin/env node
/**
 * report.mjs — aggregate results/<slug>/*.json into REPORT.md
 *
 * Reads every result file under results/, collapses per-fixture outcomes
 * into a row, and emits a markdown rollup. Run after run-suite.mjs.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const RESULTS = join(root, 'results');
const MANIFEST = join(root, 'manifest.json');

async function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function summarizeLint(r) {
  if (!r || r.skipped) return r?.skipped ? `skipped(${r.skipped})` : 'missing';
  const p = r.parsed;
  if (!p) return `exit=${r.exitCode}, no-json`;
  const n = p.diagnostics?.length ?? 0;
  return `${p.filesLinted ?? 0} files / ${n} findings`;
}

function summarizePolicyGen(r) {
  if (!r || r.skipped) return r?.skipped ? `skipped(${r.skipped})` : 'missing';
  const p = r.parsed;
  if (!p) return `exit=${r.exitCode}, no-json`;
  return `${p.filesProcessed ?? 0} files → ${p.tools ?? 0} tools / ${p.denyRules ?? 0} deny`;
}

function summarizePolicyCheck(r) {
  if (!r || r.skipped) return r?.skipped ? `skipped(${r.skipped})` : 'missing';
  const p = r.parsed;
  if (!p) return `exit=${r.exitCode}, no-json`;
  return p.drift ? `DRIFT (${p.drift})` : 'in sync';
}

function summarizeLkg(r) {
  if (!r || r.skipped) return r?.skipped ? `skipped(${r.skipped})` : 'missing';
  const p = r.parsed;
  if (!p) return `exit=${r.exitCode}, no-json`;
  const o = p.byOutcome ?? {};
  return `${p.tracked ?? 0} tracked / ${o.promoted ?? 0} promoted / ${o.recovered ?? 0} recovered / ${o.failed ?? 0} failed`;
}

function summarizePath(r) {
  if (!r || r.skipped) return r?.skipped ? `skipped(${r.skipped})` : 'missing';
  const p = r.parsed;
  if (!p) return `exit=${r.exitCode}, no-json`;
  return p.valid ? 'valid' : `invalid: ${p.error ?? '?'}`;
}

const manifest = await readJson(MANIFEST);
const slugs = manifest?.fixtures?.map((f) => f.slug) ?? [];
if (slugs.length === 0) {
  console.error('manifest.json has no fixtures');
  process.exit(2);
}

const slugToEntry = new Map(manifest.fixtures.map((f) => [f.slug, f]));
const rows = [];

for (const slug of slugs) {
  const dir = join(RESULTS, slug);
  if (!existsSync(dir)) {
    rows.push({ slug, missing: true });
    continue;
  }
  const [path, lint, doctor, gen, check, lkg] = await Promise.all([
    readJson(join(dir, 'path.json')),
    readJson(join(dir, 'lint.json')),
    readJson(join(dir, 'doctor.json')),
    readJson(join(dir, 'policy-generate.json')),
    readJson(join(dir, 'policy-check.json')),
    readJson(join(dir, 'lkg.json')),
  ]);
  rows.push({
    slug,
    kind: slugToEntry.get(slug)?.kind ?? '?',
    path: summarizePath(path),
    lint: summarizeLint(lint),
    doctor: doctor?.skipped ? `skipped(${doctor.skipped})` : 'see results',
    policyGen: summarizePolicyGen(gen),
    policyCheck: summarizePolicyCheck(check),
    lkg: summarizeLkg(lkg),
  });
}

const lines = [];
lines.push('# Validation suite — cross-fixture rollup');
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push(`Fixtures: ${rows.length} (${rows.filter((r) => r.kind === 'real').length} real, ${rows.filter((r) => r.kind === 'synthetic').length} synthetic)`);
lines.push('');
lines.push('| slug | kind | path | lint | doctor | policy-gen | policy-check | lkg |');
lines.push('|------|------|------|------|--------|-----------|--------------|-----|');
for (const r of rows) {
  if (r.missing) {
    lines.push(`| ${r.slug} | — | _no results — run \`run-suite.mjs ${r.slug}\`_ | | | | | |`);
    continue;
  }
  lines.push(
    `| \`${r.slug}\` | ${r.kind} | ${r.path} | ${r.lint} | ${r.doctor} | ${r.policyGen} | ${r.policyCheck} | ${r.lkg} |`,
  );
}
lines.push('');
lines.push('## Findings of interest');
lines.push('');
lines.push('Per-fixture detail in `results/<slug>/`. The interesting cases are usually:');
lines.push('- lint > 0 findings (real or false-positive — both worth investigating)');
lines.push('- policy-gen `0 tools` despite MD source files present (extractor coverage gap)');
lines.push('- lkg `failed > 0` (parse/validate threw on real-world content)');
lines.push('- path `invalid` (workspace shape outside the substrate\'s recognized roles)');
lines.push('- exit codes ≠ 0 with no-json output (CLI threw — see stderr in the result)');
lines.push('');
lines.push('### Findings log');
lines.push('');
lines.push('Curated rolling list of bugs / coverage gaps surfaced by the suite.');
lines.push('Move items to fixed/ once the underlying issue is resolved.');
lines.push('');
lines.push('| ID | Fixture | Finding | Status |');
lines.push('|----|---------|---------|--------|');
lines.push('| F-001 | `policy-jsonc-rich-syntax` | `openclaw-policy check` parses `.jsonc` with `JSON.parse` instead of `parseJsonc`; chokes on comments + trailing commas. | open |');
lines.push('| F-002 | `lobster-shell-collision` | Three of four lint starter packs (jsonc, jsonl, lobster-yaml) were unreachable: jsonl + lobster-yaml lacked self-registration loops, and the CLI bootstrap only imported the md pack. | **fixed** (added imports + self-register loops; 23/23 rules now register) |');
lines.push('| F-003 | `only-claude-md` | `openclaw-lint run` ignores `CLAUDE.md` — not in canonical roles. AGENTS.md-equivalent format is the broadly-adopted public norm; coverage gap. | open |');
lines.push('| F-004 | `kitchen-sink` | `openclaw-policy generate` extracts 0 tools from a `## Tools` table (markdown). Extractor expects `### name # R<n>, CAPS` headings — the table is treated as narrative. Either fixture should match the convention or the extractor should also recognize tables. | open |');
lines.push('| F-005 | `policy-jsonc-rich-syntax` | `jsonc-starter-v0/config/secret-as-literal` false-positives on zero-filled placeholder hashes (`"0000...0000"` matches `/^[a-fA-F0-9]{40,}$/`). Should exclude all-zero / single-digit-repeat sequences from the hex-secret detection. | open |');

await writeFile(join(root, 'REPORT.md'), lines.join('\n') + '\n');
console.log(`wrote REPORT.md (${rows.length} fixtures)`);
