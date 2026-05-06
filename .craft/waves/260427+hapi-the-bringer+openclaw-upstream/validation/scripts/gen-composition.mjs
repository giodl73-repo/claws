#!/usr/bin/env node
/**
 * gen-composition.mjs — generate "composition" fixtures: workspaces that
 * contain 2-3 plugin subdirectories side-by-side.
 *
 * Why: every other fixture is a single-plugin or single-workspace shape.
 * In real life, an openclaw-enabled project pulls in MULTIPLE 3rd-party
 * plugins; each contributes tools, skills, lint rules, doctor checks.
 * Bugs surface at the seams: tool ID collisions across plugins, manifest
 * cross-references, lint pack ordering, conflicting skill tiers.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const FIX_DIR = join(root, 'fixtures', 'synthetic');

/**
 * Each composition is [slug, [plugin-dirs], description]. plugin-dirs is
 * a list of [name, contributing-tools, contributing-skills?] tuples.
 */
const COMPOSITIONS = [
  // -- benign multi-plugin happy paths ---------------------------------
  ['compo-comm-plus-productivity', [
    ['slack', [['post', 2, ['COMMUNICATE']]], ['post']],
    ['notion', [['read', 1, ['READ']]], ['read']],
  ], 'Slack + Notion: typical "tell standup, then write doc" duo.'],
  ['compo-three-plugin-workspace', [
    ['github', [['create-issue', 3, ['WRITE', 'COMMUNICATE']]], ['create-issue']],
    ['linear', [['create-issue', 3, ['WRITE', 'COMMUNICATE']]], ['create-issue']],
    ['slack', [['post', 2, ['COMMUNICATE']]], ['post']],
  ], 'Three plugins, two with same tool-name (create-issue) but different namespaces — must NOT collide.'],
  ['compo-shell-plus-fs', [
    ['shell', [['exec', 5, ['IRREVERSIBLE_EXTERNAL']]]],
    ['filesystem', [['read', 1, ['READ']], ['write', 3, ['WRITE']]]],
  ], 'shell + filesystem: classic powerful pair; aggregate risk should surface.'],
  ['compo-search-stack', [
    ['google-search', [['web-search', 1, ['READ', 'COMMUNICATE']]]],
    ['brave-search', [['web-search', 1, ['READ', 'COMMUNICATE']]]],
    ['semantic-search', [['query', 1, ['READ']]]],
  ], 'Three search plugins competing for the same role; routing/dedupe.'],
  ['compo-monitoring-stack', [
    ['snyk', [['scan', 1, ['READ', 'COMMUNICATE']]]],
    ['trivy', [['scan-image', 1, ['READ']]]],
    ['gitleaks', [['scan', 1, ['READ']]]],
  ], 'Three security scanners; aggregate findings should not double-count.'],
  ['compo-data-stack', [
    ['postgres', [['query', 2, ['READ']], ['exec', 4, ['WRITE']]]],
    ['redis', [['get', 1, ['READ']], ['set', 2, ['WRITE']]]],
  ], 'Postgres + Redis: typical app data tier.'],
  ['compo-ai-providers', [
    ['openai', [['chat', 2, ['COMMUNICATE']]]],
    ['anthropic', [['chat', 2, ['COMMUNICATE']]]],
    ['ollama', [['generate', 2, ['COMMUNICATE']]]],
  ], 'Three LLM providers — fallback / multi-provider routing scenario.'],
  ['compo-mobile-build', [
    ['xcode-build', [['build', 2, ['WRITE']]]],
    ['gradle-android', [['build', 2, ['WRITE']]]],
    ['fastlane', [['screenshot', 1, ['READ']]]],
  ], 'iOS + Android + fastlane — typical mobile CI.'],
  ['compo-infra-pipeline', [
    ['terraform', [['plan', 1, ['READ']], ['apply', 5, ['IRREVERSIBLE_EXTERNAL', 'FLEET_PRIVILEGED']]]],
    ['kubernetes', [['list-pods', 1, ['READ']], ['apply-manifest', 5, ['WRITE', 'FLEET_PRIVILEGED']]]],
    ['helm', [['list', 1, ['READ']]]],
  ], 'IaC pipeline: terraform + kubernetes + helm.'],
  ['compo-test-stack', [
    ['playwright', [['screenshot', 1, ['READ']], ['run-test', 2, ['WRITE']]]],
    ['vitest', [['run', 1, ['READ', 'WRITE']]]],
    ['storybook', [['build', 2, ['WRITE']]]],
  ], 'Frontend testing trio.'],
  ['compo-comm-cascade', [
    ['email', [['send-email', 5, ['COMMUNICATE', 'IRREVERSIBLE_EXTERNAL']]]],
    ['sms', [['send-sms', 5, ['COMMUNICATE', 'IRREVERSIBLE_EXTERNAL']]]],
    ['voice-call', [['initiate-call', 5, ['COMMUNICATE', 'IRREVERSIBLE_EXTERNAL']]]],
  ], 'Three high-risk irreversible-external comm channels co-existing.'],
  ['compo-finance-stack', [
    ['stripe', [['create-charge', 5, ['IRREVERSIBLE_EXTERNAL', 'COMMUNICATE']]]],
    ['ordercli', [['place-order', 5, ['IRREVERSIBLE_EXTERNAL']]]],
  ], 'Two financial-action plugins; aggregate risk surface.'],
  ['compo-ide-trio', [
    ['github', [['create-issue', 3, ['WRITE', 'COMMUNICATE']]]],
    ['gitlab', [['create-mr', 3, ['WRITE', 'COMMUNICATE']]]],
    ['jira', [['create-ticket', 3, ['WRITE', 'COMMUNICATE']]]],
  ], 'Three issue/PR trackers — interesting routing decisions for the agent.'],
  ['compo-knowledge-base', [
    ['notion', [['read-page', 1, ['READ']], ['write-page', 3, ['WRITE']]]],
    ['confluence', [['read-page', 1, ['READ']], ['write-page', 3, ['WRITE']]]],
    ['obsidian', [['read-note', 1, ['READ']], ['write-note', 3, ['WRITE']]]],
  ], 'Three knowledge-base plugins; cross-platform note coordination.'],
  ['compo-music-controls', [
    ['spotify', [['play-track', 2, ['COMMUNICATE']]]],
    ['sonos', [['play', 2, ['COMMUNICATE']]]],
  ], 'Music-control plugins; "where does play go" routing.'],
  ['compo-secrets-stack', [
    ['hashicorp-vault', [['read-secret', 4, ['READ', 'IDENTITY']]]],
    ['1password', [['get-secret', 4, ['READ', 'IDENTITY']]]],
  ], 'Two secret-store plugins side-by-side; identity/credential ownership.'],
  ['compo-camera-trio', [
    ['screenshot', [['capture', 1, ['READ']]]],
    ['camsnap', [['take-photo', 2, ['READ']]]],
    ['video-frames', [['extract', 2, ['READ', 'WRITE']]]],
  ], 'Three image-capture plugins.'],
  ['compo-pdf-stack', [
    ['nano-pdf', [['extract-text', 1, ['READ']], ['split-pages', 2, ['READ', 'WRITE']]]],
    ['whisper', [['transcribe', 2, ['READ', 'WRITE']]]],
  ], 'Document-processing pair: PDF + audio transcript.'],
  ['compo-home-stack', [
    ['openhue', [['set-light', 2, ['COMMUNICATE']]]],
    ['homekit', [['set-state', 2, ['COMMUNICATE']]]],
  ], 'Two smart-home control plugins; overlapping device sets.'],
  ['compo-todo-trio', [
    ['todoist', [['create-task', 3, ['WRITE']]]],
    ['things', [['create-todo', 3, ['WRITE']]]],
    ['apple-reminders', [['create-reminder', 3, ['WRITE']]]],
  ], 'Three "make a TODO" plugins — routing problem.'],

  // -- collision / conflict scenarios ----------------------------------
  ['compo-tool-id-collision', [
    ['plug-a', [['exec', 5, ['IRREVERSIBLE_EXTERNAL']]]],
    ['plug-b', [['exec', 1, ['READ']]]],
  ], 'Two plugins both contribute "exec" tool; namespacing must keep them distinct (plug-a/exec vs plug-b/exec).'],
  ['compo-conflicting-risk-same-name', [
    ['safe-shell', [['run', 1, ['READ']]]],
    ['unsafe-shell', [['run', 5, ['IRREVERSIBLE_EXTERNAL']]]],
  ], 'Two plugins, both have "run" tool, wildly different risk classes; aggregator should not flatten.'],
  ['compo-skill-name-collision', [
    ['plug-x', [['summarize', 2, ['COMMUNICATE']]], ['summarize']],
    ['plug-y', [['summarize', 2, ['COMMUNICATE']]], ['summarize']],
  ], 'Two plugins ship same-named skill; namespace must keep them distinct.'],
  ['compo-cross-plugin-skill-ref', [
    ['provider', [['fetch', 1, ['READ']]], ['fetch']],
    ['consumer', [['use', 2, ['COMMUNICATE']]]],
  ], 'consumer plugin manifest references provider/fetch as a dependency; cross-plugin binding.'],
  ['compo-mismatched-tool-versions', [
    ['svc-v1', [['call', 2, ['COMMUNICATE']]]],
    ['svc-v2', [['call', 2, ['COMMUNICATE']]]],
  ], 'Same plugin author, two version directories — typical migration-in-progress shape.'],

  // -- mixed maturity ---------------------------------------------------
  ['compo-alpha-plus-rich', [
    ['old-stable', [['do', 2, ['COMMUNICATE']]], ['do']],
    ['new-alpha', [['try', 1, ['READ']]]],
  ], 'One mature plugin (skills + workflows + doctor) alongside an alpha (manifest only).'],
  ['compo-three-maturity-tiers', [
    ['minimal', [['ping', 1, ['READ']]]],
    ['typical', [['act', 2, ['COMMUNICATE']]], ['act']],
    ['rich', [['orchestrate', 3, ['WRITE']]], ['orchestrate']],
  ], 'Three plugins at different maturity levels; gateway should treat each per its own contract.'],

  // -- mid-action / lifecycle states -----------------------------------
  ['compo-one-plugin-half-installed', [
    ['installed', [['act', 2, ['COMMUNICATE']]], ['act']],
    ['partial', []],  // no tools — manifest only, not yet contributing
  ], 'One fully-installed plugin + one mid-install (manifest declared, tools dir empty).'],
  ['compo-removed-plugin-stale-refs', [
    ['active', [['act', 2, ['COMMUNICATE']]]],
  ], 'Workspace.AGENTS.md references a plugin that was uninstalled; stale doc reference.'],
];

const SENSITIVITY_BY_CAP = (caps) => {
  if (caps.includes('IRREVERSIBLE_EXTERNAL')) return 'restricted';
  if (caps.includes('FLEET_PRIVILEGED') || caps.includes('IDENTITY')) return 'confidential';
  if (caps.includes('COMMUNICATE')) return 'internal';
  return 'public';
};

function renderRootAgents(slug, pluginNames) {
  return `---
name: ${slug}
trust: composition
---

# ${slug}

Composition workspace bringing together ${pluginNames.length} plugin(s):
${pluginNames.map((n) => `- \`plugins/${n}/\``).join('\n')}

Each plugin contributes its own AGENTS.md, TOOLS.md, manifest.json under
its subdirectory. The substrate train walks the whole tree.

## Boundaries

- Each plugin's tools live in its own namespace (\`<plugin-name>/<tool>\`).
- Cross-plugin tool calls go through the gateway, not direct.
`;
}

function renderPluginAgents(name) {
  return `---
name: ${name}-agent
trust: external-plugin
plugin: ${name}
---

# ${name}

Plugin in a composition workspace.
`;
}

function renderPluginTools(name, tools) {
  if (tools.length === 0) {
    return `# Tools\n\nNo tools yet — plugin manifest declared but contributions empty.\n`;
  }
  const lines = ['# Tools', '', `Tools contributed by \`${name}\`.`, '', '## Tools', ''];
  for (const [id, risk, caps] of tools) {
    const sens = SENSITIVITY_BY_CAP(caps);
    lines.push(`### ${name}/${id} # R${risk}, ${caps.join(', ')}, sensitivity:${sens}`);
    lines.push(`${id} — ${caps.join('+')}.`);
    lines.push('');
  }
  return lines.join('\n');
}

function renderPluginManifest(name, tools, skill) {
  return JSON.stringify(
    {
      name,
      version: '0.1.0',
      description: `${name} plugin (composition fixture)`,
      contributes: {
        tools: tools.map(([id]) => `${name}/${id}`),
        ...(skill ? { skills: [`${name}/${skill}`] } : {}),
      },
    },
    null,
    2,
  ) + '\n';
}

function renderSkill(name, skillName) {
  return `---
name: ${name}/${skillName}
description: ${skillName} skill
tier: T1
---

# ${skillName}

${skillName} skill in plugin ${name}.
`;
}

async function generateOne(slug, pluginSpecs, notes) {
  const fixtureDir = join(FIX_DIR, slug);
  if (existsSync(fixtureDir)) return { slug, skipped: 'exists' };
  await mkdir(fixtureDir, { recursive: true });

  const pluginNames = pluginSpecs.map(([n]) => n);
  await writeFile(join(fixtureDir, 'AGENTS.md'), renderRootAgents(slug, pluginNames));

  const shapeFiles = ['AGENTS.md'];
  for (const spec of pluginSpecs) {
    const [name, tools, skills] = spec;
    const skillsList = Array.isArray(skills) ? skills : skills ? [skills] : [];
    const primarySkill = skillsList[0];
    const dir = join(fixtureDir, 'plugins', name);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'AGENTS.md'), renderPluginAgents(name));
    await writeFile(join(dir, 'TOOLS.md'), renderPluginTools(name, tools));
    await writeFile(join(dir, 'manifest.json'), renderPluginManifest(name, tools, primarySkill));
    for (const sk of skillsList) {
      const skillDir = join(dir, 'skills', sk);
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'SKILL.md'), renderSkill(name, sk));
    }
    shapeFiles.push(`plugins/${name}/`);
  }
  return { slug, fixtureDir, shapeFiles, notes };
}

async function main() {
  let generated = 0;
  let skipped = 0;
  const newEntries = [];
  for (const [slug, plugins, notes] of COMPOSITIONS) {
    const r = await generateOne(slug, plugins, notes);
    if (r.skipped) {
      skipped++;
    } else {
      generated++;
      newEntries.push({
        slug,
        kind: 'synthetic',
        shapeFiles: r.shapeFiles,
        notes: `composition: ${notes}`,
      });
    }
  }
  const manifestPath = join(root, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const existing = new Set(manifest.fixtures.map((f) => f.slug));
  for (const e of newEntries) {
    if (!existing.has(e.slug)) manifest.fixtures.push(e);
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`composition fixtures: generated=${generated}, skipped=${skipped}, manifest size=${manifest.fixtures.length}`);
}

await main();
