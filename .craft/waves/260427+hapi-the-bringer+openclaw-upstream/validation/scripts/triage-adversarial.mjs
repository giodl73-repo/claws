#!/usr/bin/env node
/**
 * triage-adversarial.mjs — classify adversarial-* fixture outcomes per tool.
 *
 * For each adversarial fixture × tool, decide:
 *   - crashed:        exit !== 0 AND stdout has no parseable JSON (no error code we can act on)
 *   - clean-error:    exit !== 0 AND stdout JSON has an error code (structured failure — good)
 *   - silent-accept:  exit === 0 AND parsed.diagnostics is 0 / no error surfaced
 *                     (bug if the input was supposed to be flagged)
 *   - flagged:        exit === 0 AND lint produced findings (substrate caught it)
 *
 * Reads results-openclaw/<slug>/*.json. Writes triage-adversarial.md.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const RESULTS = join(root, 'results-openclaw');

async function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function tryParseStderr(stderr) {
  if (!stderr) return null;
  // Substrates may print one JSON error line on stderr; try to parse the first {…}.
  const trimmed = stderr.trim();
  if (!trimmed.startsWith('{')) return null;
  try { return JSON.parse(trimmed); } catch { return null; }
}

function classify(r, toolLabel) {
  if (!r) return { class: 'missing', detail: '' };
  if (r.skipped) return { class: 'skipped', detail: r.skipped };
  const exit = r.exitCode;
  const p = r.parsed;
  const stderrJson = tryParseStderr(r.stderr);
  const stderrSnip = (r.stderr || '').slice(0, 160).replace(/\s+/g, ' ').trim();

  if (exit !== 0 && !p && stderrJson?.error?.code) {
    // Structured error on stderr — clean failure, not a crash.
    return { class: 'clean-error', detail: `${stderrJson.error.code}: ${stderrJson.error.message ?? ''}`.slice(0, 120) };
  }
  if (exit !== 0 && !p) {
    return { class: 'crashed', detail: `exit=${exit} stderr="${stderrSnip}"` };
  }
  if (exit !== 0 && p) {
    return { class: 'clean-error', detail: p.error ?? p.code ?? p.message ?? 'no-error-field' };
  }
  // exit === 0
  if (toolLabel === 'lint') {
    const n = p?.diagnostics?.length ?? 0;
    if (n > 0) return { class: 'flagged', detail: `${n} finding(s)` };
    // F-014 fix: substrate now reports rulesRun=0 + rulesDisabledByConfig
    // when workspace.json wildcards-skipped everything. That's the
    // visible-silence we wanted, not a substrate bug.
    if (p?.rulesRun === 0 && (p?.rulesDisabledByConfig ?? 0) > 0) {
      return { class: 'flagged', detail: `0 rules ran (${p.rulesDisabledByConfig} disabled by config)` };
    }
    return { class: 'silent-accept', detail: 'lint=0 findings' };
  }
  if (toolLabel === 'policy-generate') {
    return { class: 'flagged', detail: `tools=${p?.tools ?? 0} deny=${p?.denyRules ?? 0}` };
  }
  if (toolLabel === 'policy-check') {
    if (p?.drift?.drifted === true) return { class: 'flagged', detail: 'drift' };
    return { class: 'silent-accept', detail: 'in-sync' };
  }
  if (toolLabel === 'lkg') {
    const o = p?.byOutcome ?? {};
    return { class: 'flagged', detail: `tracked=${p?.tracked ?? 0} failed=${o.failed ?? 0}` };
  }
  if (toolLabel === 'path') {
    return { class: p?.valid ? 'flagged' : 'silent-accept', detail: p?.valid ? 'valid' : 'invalid' };
  }
  return { class: 'unknown', detail: JSON.stringify(p).slice(0, 100) };
}

const TOOLS = ['path', 'lint', 'policy-generate', 'policy-check', 'lkg'];

const slugs = (await readdir(RESULTS)).filter((s) => s.startsWith('adversarial-')).sort();
if (slugs.length === 0) {
  console.error(`no adversarial-* fixture results found under ${RESULTS}`);
  process.exit(2);
}

const lines = [];
lines.push('# Adversarial fixture triage');
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push(`Adversarial fixtures: ${slugs.length}`);
lines.push('');
lines.push('Classification legend:');
lines.push('- `crashed` — exit≠0, no structured JSON output (BAD — substrate threw without a usable error)');
lines.push('- `clean-error` — exit≠0 + structured error code (GOOD — failure mode that operator can act on)');
lines.push('- `flagged` — exit=0, substrate produced findings or detected the issue');
lines.push('- `silent-accept` — exit=0, substrate produced no findings (BAD if input was supposed to be flagged)');
lines.push('');
lines.push('| slug | path | lint | policy-gen | policy-check | lkg |');
lines.push('|------|------|------|-----------|--------------|-----|');

const counters = { crashed: 0, 'clean-error': 0, 'silent-accept': 0, flagged: 0, skipped: 0, missing: 0, unknown: 0 };
const interesting = [];

for (const slug of slugs) {
  const dir = join(RESULTS, slug);
  const cells = [];
  for (const tool of TOOLS) {
    const r = await readJson(join(dir, `${tool}.json`));
    const { class: cls, detail } = classify(r, tool);
    counters[cls] = (counters[cls] ?? 0) + 1;
    cells.push(`\`${cls}\``);
    if (cls === 'crashed' || (cls === 'silent-accept' && tool === 'lint')) {
      interesting.push(`  - **${slug}** / ${tool}: ${cls} — ${detail}`);
    }
    // Generic error codes are interesting on adversarial inputs — they indicate
    // the substrate noticed a problem but didn't tag it with a meaningful code.
    if (cls === 'clean-error' && /ERR_INTERNAL\b/.test(detail)) {
      interesting.push(`  - **${slug}** / ${tool}: clean-error but generic — ${detail}`);
    }
  }
  lines.push(`| \`${slug}\` | ${cells.join(' | ')} |`);
}

lines.push('');
lines.push('## Counters (across all adversarial × tool cells)');
lines.push('');
for (const [k, v] of Object.entries(counters)) {
  if (v > 0) lines.push(`- ${k}: ${v}`);
}

if (interesting.length > 0) {
  lines.push('');
  lines.push('## Cells worth a closer look');
  lines.push('');
  lines.push(...interesting);
}

await writeFile(join(root, 'TRIAGE-ADVERSARIAL.md'), lines.join('\n') + '\n');
console.log(`wrote TRIAGE-ADVERSARIAL.md — ${slugs.length} adversarial fixtures, counters:`, counters);
