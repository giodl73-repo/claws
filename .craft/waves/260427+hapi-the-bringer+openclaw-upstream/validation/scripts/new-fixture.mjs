#!/usr/bin/env node
/**
 * new-fixture.mjs — scaffold a new synthetic fixture.
 *
 * Usage:
 *   node scripts/new-fixture.mjs <slug>             # synthetic (default)
 *   node scripts/new-fixture.mjs <slug> --notes "what this fixture probes"
 *
 * Creates `fixtures/synthetic/<slug>/` with a starter README and adds a
 * manifest entry. Then you author the actual files (AGENTS.md / lobster.lobster /
 * whatever the fixture needs) into the directory and re-run the suite.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.error('usage: node scripts/new-fixture.mjs <slug> [--notes <text>]');
  process.exit(2);
}

const slug = args[0];
const notesIdx = args.indexOf('--notes');
const notes = notesIdx >= 0 ? args[notesIdx + 1] : 'TODO: what does this fixture probe?';

if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(`slug must be kebab-case (a-z, 0-9, -): "${slug}"`);
  process.exit(2);
}

const fixtureDir = join(root, 'fixtures', 'synthetic', slug);
if (existsSync(fixtureDir)) {
  console.error(`fixture already exists: ${fixtureDir}`);
  process.exit(2);
}

await mkdir(fixtureDir, { recursive: true });

const readme = `# ${slug}

${notes}

## Authoring

Drop fixture files into this directory (\`AGENTS.md\`, \`*.lobster\`, \`policy.jsonc\`, etc.).
Use file naming that matches the canonical roles in \`@openclaw/oc-path\`'s
\`OPENCLAW_WORKSPACE_ROLES\` so the substrate train sees them.

After authoring, run:

\`\`\`sh
node scripts/run-suite-openclaw.mjs ${slug}
# inspect results-openclaw/${slug}/
\`\`\`

If the fixture surfaces a behavior worth pinning permanently, add an entry to
\`findings.md\`. If it's a regression-prone edge case, write expectations
inline in this README so the next person knows what "right" looks like.
`;

await writeFile(join(fixtureDir, 'README.md'), readme);

// Append manifest entry
const manifestPath = join(root, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.fixtures.push({
  slug,
  kind: 'synthetic',
  shapeFiles: [],
  notes,
});
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`created fixture: ${fixtureDir}`);
console.log(`manifest entry appended (${manifest.fixtures.length} total)`);
console.log('next: drop fixture content into the directory, then run:');
console.log(`  node scripts/run-suite-openclaw.mjs ${slug}`);
