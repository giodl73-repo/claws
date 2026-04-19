#!/usr/bin/env node
// Generate src/ast/grammars.generated.ts from the 11 openclaw-*.peg files
// under design/astro/grammars/. The generated file embeds each grammar as a
// string constant so the package ships without filesystem reads at runtime.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
const grammarsDir = join(repoRoot, 'design/astro/grammars');

const OPENCLAW_KINDS = [
  'agents',
  'config',
  'entities',
  'governance',
  'memory',
  'roles',
  'skills',
  'soul',
  'tasks',
  'tools',
  'workflows',
];

const files = readdirSync(grammarsDir)
  .filter((f) => OPENCLAW_KINDS.includes(f.replace(/^openclaw-/, '').replace(/\.peg$/, '')))
  .sort();

if (files.length !== 11) {
  console.error(`Expected 11 openclaw-*.peg files, found ${files.length}`);
  process.exit(1);
}

const header = `// AUTO-GENERATED — do not edit by hand.
// Regenerate with: node scripts/generate-grammars.mjs
//
// Source: design/astro/grammars/openclaw-*.peg (11 files)
// Each grammar is embedded verbatim as a string constant.

`;

const parts = [header];
parts.push(`export type WorkspaceFileKind =\n`);
parts.push(OPENCLAW_KINDS.map((k) => `  | '${k}'`).join('\n'));
parts.push(';\n\n');
parts.push(`export const WORKSPACE_FILE_KINDS: readonly WorkspaceFileKind[] = [\n`);
for (const k of OPENCLAW_KINDS) parts.push(`  '${k}',\n`);
parts.push(`] as const;\n\n`);
parts.push(`export const grammars: Record<WorkspaceFileKind, string> = {\n`);

for (const kind of OPENCLAW_KINDS) {
  const file = `openclaw-${kind}.peg`;
  const abs = join(grammarsDir, file);
  const content = readFileSync(abs, 'utf8');
  const escaped = content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
  parts.push(`  ${kind}: \`${escaped}\`,\n`);
}

parts.push(`};\n`);

const outPath = join(here, '..', 'src/ast/grammars.generated.ts');
writeFileSync(outPath, parts.join(''), 'utf8');
console.log(`Wrote ${outPath}`);
