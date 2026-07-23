#!/usr/bin/env node
/**
 * gen-plugin-fixture.mjs — generate a synthetic 3rd-party openclaw plugin
 * fixture from a spec.
 *
 * Spec format (one JS object passed in or read from a JSON file):
 *
 *   {
 *     slug: "plugin-weather-typical",
 *     pluginName: "weather",          // human-name; goes into AGENTS.md, package.json
 *     domain: "media",                // categorization for the generator
 *     maturity: "typical",            // alpha | typical | rich | enterprise
 *     tools: [
 *       { id: "get-weather", risk: 1, caps: ["READ", "COMMUNICATE"], sensitivity: "public" },
 *     ],
 *     skills: ["get-weather"],         // creates skills/<name>/SKILL.md
 *     workflows: ["forecast.lobster"], // optional
 *     hasDoctorContract: false,
 *     hasLintRules: false,
 *     hasManifest: true,               // include manifest.json with openclaw contribution metadata
 *   }
 *
 * Bulk usage:
 *
 *   node scripts/gen-plugin-fixture.mjs --batch <specs.json>
 *
 * Single usage (for ad-hoc):
 *
 *   node scripts/gen-plugin-fixture.mjs --slug plugin-foo --tools 5 --maturity typical
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const RISK_MAP = { 1: "low", 2: "medium", 3: "medium", 4: "high", 5: "critical" };
const SENSITIVITY_BY_CAP = (caps) => {
  if (caps.includes("IRREVERSIBLE_EXTERNAL")) return "restricted";
  if (caps.includes("FLEET_PRIVILEGED") || caps.includes("IDENTITY")) return "confidential";
  if (caps.includes("COMMUNICATE")) return "internal";
  return "public";
};

function renderAgentsMd(spec) {
  return `---
name: ${spec.pluginName}-agent
trust: external-plugin
plugin: ${spec.pluginName}
sdk-version: 0.1.0
---

# ${spec.pluginName} agent

3rd-party openclaw plugin in the \`${spec.domain}\` domain. Maturity: ${spec.maturity}.

This plugin contributes ${spec.tools.length} tool(s)${spec.skills?.length ? `, ${spec.skills.length} skill(s)` : ""}${spec.workflows?.length ? `, ${spec.workflows.length} workflow(s)` : ""}${spec.hasDoctorContract ? ", and a doctor contract" : ""}${spec.hasLintRules ? ", and lint rules" : ""} to an openclaw workspace.

## Boundaries

- Operate only on the resources this plugin owns.
- Don't escalate to R5 tools without explicit operator approval.
- See \`TOOLS.md\` for the canonical tool declarations.
`;
}

function renderToolsMd(spec) {
  const lines = [
    "# Tools",
    "",
    `Tools contributed by the \`${spec.pluginName}\` plugin.`,
    "",
    "## Tools",
    "",
  ];
  for (const t of spec.tools) {
    const sensitivity = t.sensitivity ?? SENSITIVITY_BY_CAP(t.caps ?? []);
    const meta = `R${t.risk}, ${(t.caps ?? []).join(", ")}, sensitivity:${sensitivity}`;
    lines.push(`### ${spec.pluginName}/${t.id} # ${meta}`);
    lines.push(
      t.description ?? `${t.id} — auto-generated; risk R${t.risk}; ${RISK_MAP[t.risk]} risk class.`,
    );
    lines.push("");
  }
  return lines.join("\n");
}

function renderSkillMd(skillName, spec) {
  return `---
name: ${spec.pluginName}/${skillName}
description: ${skillName} skill for the ${spec.pluginName} plugin
tier: T${spec.maturity === "enterprise" ? 3 : spec.maturity === "rich" ? 2 : 1}
---

# ${skillName}

${skillName} skill — ${spec.domain} domain.

## Usage

\`\`\`
${spec.pluginName}/${skillName} <args>
\`\`\`

## Tier

T${spec.maturity === "enterprise" ? 3 : spec.maturity === "rich" ? 2 : 1}.
`;
}

function renderManifestJson(spec) {
  return (
    JSON.stringify(
      {
        $schema: "https://schemas.openclaw.dev/plugin-manifest-v0.json",
        name: spec.pluginName,
        version: "0.1.0",
        description: `${spec.pluginName} plugin (${spec.domain})`,
        contributes: {
          tools: spec.tools.map((t) => `${spec.pluginName}/${t.id}`),
          ...(spec.skills?.length
            ? { skills: spec.skills.map((s) => `${spec.pluginName}/${s}`) }
            : {}),
          ...(spec.workflows?.length ? { workflows: spec.workflows } : {}),
          ...(spec.hasLintRules ? { lintRulePacks: [`${spec.pluginName}-rules-v0`] } : {}),
          ...(spec.hasDoctorContract ? { doctorContract: "./doctor-contract-api.ts" } : {}),
        },
      },
      null,
      2,
    ) + "\n"
  );
}

function renderWorkflowLobster(name, spec) {
  return `# ${name} — workflow shipped by the ${spec.pluginName} plugin

name: ${spec.pluginName}-${name.replace(/\.lobster$/, "")}
description: ${spec.domain} workflow

steps:
  - id: prepare
    pipeline: ${spec.pluginName}/prepare
    out: prepared

  - id: act
    pipeline: ${spec.pluginName}/${spec.tools[0]?.id ?? "invoke"}
    in: prepared
    out: result
`;
}

function renderDoctorContractApi(spec) {
  return `// Doctor-contract-api shipped by the ${spec.pluginName} plugin.
// Loaded by openclaw doctor via src/plugins/doctor-contract-registry.ts.

export const legacyConfigRules = [];
export const sessionRouteStateOwners = [];
export function normalizeCompatibilityConfig({ cfg }) {
  return { config: cfg, changes: [] };
}
`;
}

async function generateOne(spec) {
  const fixtureDir = join(root, "fixtures", "synthetic", spec.slug);
  if (existsSync(fixtureDir)) {
    return { slug: spec.slug, skipped: "already exists" };
  }
  await mkdir(fixtureDir, { recursive: true });

  await writeFile(join(fixtureDir, "AGENTS.md"), renderAgentsMd(spec));
  await writeFile(join(fixtureDir, "TOOLS.md"), renderToolsMd(spec));
  if (spec.hasManifest !== false) {
    await writeFile(join(fixtureDir, "manifest.json"), renderManifestJson(spec));
  }
  for (const skill of spec.skills ?? []) {
    const skillDir = join(fixtureDir, "skills", skill);
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), renderSkillMd(skill, spec));
  }
  for (const wf of spec.workflows ?? []) {
    await writeFile(join(fixtureDir, wf), renderWorkflowLobster(wf, spec));
  }
  if (spec.hasDoctorContract) {
    await writeFile(join(fixtureDir, "doctor-contract-api.ts"), renderDoctorContractApi(spec));
  }
  return {
    slug: spec.slug,
    generated: fixtureDir,
    fileCount:
      2 +
      (spec.skills?.length ?? 0) +
      (spec.workflows?.length ?? 0) +
      (spec.hasDoctorContract ? 1 : 0) +
      (spec.hasManifest === false ? 0 : 1),
  };
}

async function appendManifestEntries(specs) {
  const manifestPath = join(root, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const existing = new Set(manifest.fixtures.map((f) => f.slug));
  for (const spec of specs) {
    if (existing.has(spec.slug)) continue;
    manifest.fixtures.push({
      slug: spec.slug,
      kind: "synthetic",
      shapeFiles: [
        "AGENTS.md",
        "TOOLS.md",
        ...(spec.hasManifest !== false ? ["manifest.json"] : []),
        ...(spec.skills?.length ? ["skills/"] : []),
        ...(spec.workflows ?? []),
        ...(spec.hasDoctorContract ? ["doctor-contract-api.ts"] : []),
      ],
      notes: `synthetic 3rd-party openclaw plugin: ${spec.pluginName} (${spec.domain}, maturity:${spec.maturity}, ${spec.tools.length} tools)`,
    });
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  return manifest.fixtures.length;
}

const args = process.argv.slice(2);
if (args[0] === "--batch") {
  const specsPath = args[1];
  if (!specsPath) {
    console.error("--batch requires a path to a JSON file containing an array of specs");
    process.exit(2);
  }
  const specs = JSON.parse(readFileSync(specsPath, "utf8"));
  let generated = 0;
  let skipped = 0;
  for (const spec of specs) {
    const r = await generateOne(spec);
    if (r.skipped) skipped++;
    else generated++;
  }
  const total = await appendManifestEntries(specs);
  console.log(`generated: ${generated}, skipped (existing): ${skipped}, manifest size: ${total}`);
} else {
  console.error("usage: node scripts/gen-plugin-fixture.mjs --batch <specs.json>");
  process.exit(2);
}
