#!/usr/bin/env node
/**
 * gen-adversarial.mjs — generate fixtures designed to BREAK the substrate train.
 *
 * Each fixture is a small, targeted "what if this happened" scenario. The
 * substrate should ideally produce a clear, non-crashing diagnostic; if it
 * crashes / hangs / silently swallows / produces a misleading message, that's
 * a finding worth pinning.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const FIX_DIR = join(root, 'fixtures', 'synthetic');

const SENTINEL = '__OPENCLAW_REDACTED__';

/**
 * Each entry: [slug, files-mapping]. files-mapping is { 'AGENTS.md': '...', 'TOOLS.md': '...' }.
 * Empty values produce empty files. Buffer values write bytes verbatim.
 */
const RECIPES = [
  // -- manifest shape attacks ---------------------------------------------
  [
    'adversarial-manifest-malformed-json',
    {
      'AGENTS.md': '# Agent\n\nBroken manifest JSON below.\n',
      'manifest.json': '{ "name": "broken-plugin", "version": "0.1.0", "contributes": { tools: [unquoted, missing-quotes }',
    },
    'Manifest JSON is intentionally malformed; substrate should not crash on parse.',
  ],
  [
    'adversarial-manifest-references-missing-skill',
    {
      'AGENTS.md': '# Agent\n\nManifest claims a skill that does not exist on disk.\n',
      'manifest.json': '{\n  "name": "ghost-plugin",\n  "version": "0.1.0",\n  "contributes": {\n    "skills": ["ghost-plugin/this-skill-doesnt-exist"]\n  }\n}\n',
      'TOOLS.md': '# Tools\n\n## Tools\n\n### ghost-plugin/foo # R1, READ\nA tool.\n',
    },
    'Manifest references a skills/<name>/SKILL.md path that does not exist; cross-reference check should flag.',
  ],

  // -- tool-shape attacks -------------------------------------------------
  [
    'adversarial-tools-sentinel-injection',
    {
      'AGENTS.md': '# Agent\n\nA TOOLS.md value contains the redaction sentinel literal.\n',
      'TOOLS.md': `# Tools\n\n## Tools\n\n### sentinel-tool # R3, WRITE, sensitivity:internal\nDescription contains ${SENTINEL} literal — emit-time guard MUST refuse to write back.\n`,
    },
    'Bytes contain __OPENCLAW_REDACTED__ literal; emit-time guard should refuse to write back / round-trip should fail.',
  ],
  [
    'adversarial-tools-shell-metacharacter-id',
    {
      'AGENTS.md': '# Agent\n\nTool ID contains shell metacharacters.\n',
      'TOOLS.md': '# Tools\n\n## Tools\n\n### `; rm -rf /` # R5, IRREVERSIBLE_EXTERNAL\nTool ID contains shell injection. Substrate should reject or sanitize.\n',
    },
    'Tool ID has `; rm -rf /` — anything that pipes the ID into a shell pipeline is at risk. Substrate should reject the ID.',
  ],
  [
    'adversarial-tools-emoji-id',
    {
      'AGENTS.md': '# Agent\n\nTool ID contains emoji.\n',
      'TOOLS.md': '# Tools\n\n## Tools\n\n### 🚀rocket-tool # R3, WRITE, sensitivity:internal\nUnicode in tool ID — should round-trip without mojibake.\n',
    },
    'Tool ID contains emoji codepoint; round-trip should preserve UTF-8.',
  ],
  [
    'adversarial-tools-very-long-id',
    {
      'AGENTS.md': '# Agent\n\nTool ID is 512 chars long.\n',
      'TOOLS.md': `# Tools\n\n## Tools\n\n### ${'a'.repeat(512)} # R1, READ\nVery long ID; should not OOM or hang.\n`,
    },
    'Tool ID is 512 characters; should not crash parser or hang regex matching.',
  ],
  [
    'adversarial-tools-duplicate-id',
    {
      'AGENTS.md': '# Agent\n\nDuplicate tool IDs.\n',
      'TOOLS.md': '# Tools\n\n## Tools\n\n### dup-tool # R1, READ\nFirst declaration.\n\n### dup-tool # R5, IRREVERSIBLE_EXTERNAL\nSecond declaration with conflicting risk. Substrate should flag the collision.\n',
    },
    'Same tool id declared twice with different risk — second silently overrides; lint should flag.',
  ],
  [
    'adversarial-tools-r1-with-irreversible',
    {
      'AGENTS.md': '# Agent\n\nMismatched risk/cap combo.\n',
      'TOOLS.md': '# Tools\n\n## Tools\n\n### dangerous-but-marked-low # R1, IRREVERSIBLE_EXTERNAL, sensitivity:public\nR1 (low) marked with IRREVERSIBLE_EXTERNAL — semantically wrong; lint should flag the mismatch.\n',
    },
    'R1 risk + IRREVERSIBLE_EXTERNAL cap is semantically inconsistent; policy lint should catch.',
  ],
  [
    'adversarial-tools-bogus-sensitivity',
    {
      'AGENTS.md': '# Agent\n\nUnknown sensitivity value.\n',
      'TOOLS.md': '# Tools\n\n## Tools\n\n### tool-with-bad-sensitivity # R3, WRITE, sensitivity:bogus-tier-7\nUnknown sensitivity token; should fall back to default + lint should flag.\n',
    },
    'sensitivity:bogus-tier-7 is not in the allowed set (public/internal/confidential/restricted).',
  ],

  // -- frontmatter attacks ------------------------------------------------
  [
    'adversarial-frontmatter-malformed-yaml',
    {
      'AGENTS.md': '---\nname: malformed\ntrust: [ unclosed\nlist: yes,\n   indentation: way too random\n---\n\n# Agent\n\nBroken YAML frontmatter; parse should not crash workspace walk.\n',
      'TOOLS.md': '# Tools\n\n## Tools\n\n### tool # R1, READ\n',
    },
    'YAML frontmatter is malformed; AGENTS.md parse should produce a graceful error not crash the manifest walker.',
  ],
  [
    'adversarial-skill-tier-out-of-range',
    {
      'AGENTS.md': '# Agent\n\nSkill with tier:T99.\n',
      'skills/bad-skill/SKILL.md': '---\nname: bad-skill\ndescription: out-of-range tier\ntier: T99\n---\n\n# Bad skill\n\nT99 is not in the allowed set (T1/T2/T3); lint should flag.\n',
    },
    'SKILL.md frontmatter has tier:T99 — outside allowed T1/T2/T3 range.',
  ],
  [
    'adversarial-memory-bogus-scope',
    {
      'AGENTS.md': '# Agent\n',
      'MEMORY.md': '---\nscope: bogus-scope-name\n---\n\n# Memory\n\nscope:bogus is not in the allowed set (default/global/project/session).\n',
    },
    'Already covered by memory-invalid-scope but pinned in adversarial set as a baseline.',
  ],

  // -- jsonc attacks ------------------------------------------------------
  [
    'adversarial-jsonc-utf8-bom',
    {
      'AGENTS.md': '# Agent\n\nGateway.jsonc has UTF-8 BOM.\n',
      'gateway.jsonc': '﻿{ "version": "0.1.0", "plugins": { "entries": {} } }\n',
    },
    'gateway.jsonc starts with UTF-8 BOM (\\uFEFF); parser should handle gracefully.',
  ],
  [
    'adversarial-jsonc-circular-deep',
    {
      'AGENTS.md': '# Agent\n',
      'gateway.jsonc': '{\n  "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": { "a": "stop here" } } } } } } } } } } } } } } } }\n}\n',
    },
    'Deep nesting; should not blow stack or hang.',
  ],
  [
    'adversarial-jsonc-secret-zero-hash',
    {
      'AGENTS.md': '# Agent\n\nPolicy.jsonc has zero-filled placeholder hashes that LOOK like hex secrets.\n',
      'policy.jsonc': '{\n  "version": "0.1.0",\n  "tools": [],\n  "denyRules": [],\n  "generatedFrom": {\n    "hash": "0000000000000000000000000000000000000000000000000000000000000000",\n    "bytes": 0,\n    "observedAt": "2026-01-01T00:00:00.000Z"\n  },\n  "policyId": "0000000000000000000000000000000000000000000000000000000000000000",\n  "generatedAt": "2026-01-01T00:00:00.000Z"\n}\n',
    },
    'F-005: secret-as-literal rule false-positives on all-zero hashes. Pin it.',
  ],

  // -- session.jsonl attacks ----------------------------------------------
  [
    'adversarial-session-malformed-line',
    {
      'AGENTS.md': '# Agent\n',
      'sessions/session-broken.jsonl': '{"event":"start","ts":"2026-05-05T10:00:00Z"}\nthis is not valid JSON\n{"event":"end","ts":"2026-05-05T10:00:01Z"}\n',
    },
    'Session log has a non-JSON line; jsonl-starter rule should flag malformed-line.',
  ],
  [
    'adversarial-session-empty',
    {
      'AGENTS.md': '# Agent\n',
      'sessions/session-empty.jsonl': '',
    },
    'Session log is empty (0 bytes); jsonl-starter empty-log rule should flag.',
  ],

  // -- lobster workflow attacks -------------------------------------------
  [
    'adversarial-lobster-mutually-exclusive-body',
    {
      'AGENTS.md': '# Agent\n',
      'pipeline.lobster': 'name: bad-flow\nsteps:\n  - id: step1\n    command: echo hello\n    pipeline: llm.invoke\n    out: result\n',
    },
    'Step has both `command:` and `pipeline:` — mutually exclusive; lint should flag.',
  ],
  [
    'adversarial-lobster-undefined-stdin-ref',
    {
      'AGENTS.md': '# Agent\n',
      'pipeline.lobster': 'name: bad-flow\nsteps:\n  - id: step1\n    command: cat\n    in: nonexistent-step.stdout\n    out: result\n',
    },
    '`in:` references a step or output that does not exist in this workflow.',
  ],

  // -- file system / encoding edges ---------------------------------------
  [
    'adversarial-empty-canonical-files',
    {
      'AGENTS.md': '',
      'TOOLS.md': '',
      'SOUL.md': '',
      'IDENTITY.md': '',
      'MEMORY.md': '',
    },
    'All canonical files are 0 bytes; substrate should not crash on empty inputs.',
  ],

  // -- LKG attacks --------------------------------------------------------
  [
    'adversarial-lkg-state-malformed',
    {
      'AGENTS.md': '# Agent\n',
      '.openclaw/lkg-health.json': '{ this is not valid JSON [',
    },
    'lkg-health.json is invalid JSON; cage should produce LKG_STATE_FILE_CORRUPT error not crash.',
  ],
  [
    'adversarial-lkg-state-future-version',
    {
      'AGENTS.md': '# Agent\n',
      '.openclaw/lkg-health.json': '{\n  "version": "9.9.9",\n  "entries": {}\n}\n',
    },
    'lkg-health.json declares a future schema version; cage should produce LKG_STATE_FILE_VERSION_MISMATCH.',
  ],

  // -- workspace.json attacks ---------------------------------------------
  [
    'adversarial-workspace-json-malformed',
    {
      'AGENTS.md': '# Agent\n',
      'workspace.json': '{ "lint": { "skip": missing-quotes ] }',
    },
    'workspace.json is invalid; substrate should fall back to defaults rather than crash.',
  ],
  [
    'adversarial-workspace-json-skip-everything',
    {
      'AGENTS.md': '# Agent\n',
      'workspace.json': '{\n  "lint": { "skip": ["*"], "skipPaths": ["**"] },\n  "lkg": { "skip": ["*"] },\n  "policy": { "generators": [] }\n}\n',
    },
    'workspace.json skips literally everything via wildcards; substrate behavior should be observable (zero work) not silent.',
  ],
];

async function generateAll() {
  let generated = 0;
  let skipped = 0;
  const manifestEntries = [];
  for (const [slug, files, notes] of RECIPES) {
    const fixtureDir = join(FIX_DIR, slug);
    if (existsSync(fixtureDir)) {
      skipped++;
      continue;
    }
    await mkdir(fixtureDir, { recursive: true });
    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = join(fixtureDir, relPath);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content);
    }
    manifestEntries.push({ slug, kind: 'synthetic', shapeFiles: Object.keys(files), notes: `adversarial: ${notes}` });
    generated++;
  }
  // append manifest
  const manifestPath = join(root, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const existing = new Set(manifest.fixtures.map((f) => f.slug));
  for (const entry of manifestEntries) {
    if (!existing.has(entry.slug)) manifest.fixtures.push(entry);
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`adversarial fixtures: generated=${generated}, skipped=${skipped}, manifest size=${manifest.fixtures.length}`);
}

await generateAll();
