/**
 * plugin-add-skill-cage-tracks — workspace gains a new skills/<name>/SKILL.md
 * mid-flight. Subsequent `cage status` should pick it up automatically
 * (manifest-walker discovers it; tracker registers; first observation
 * promotes it).
 */
export const slug = "plugin-add-skill-cage-tracks";
export const description = "add new skill mid-flight → cage status picks it up automatically";

export const setup = {
  files: {
    "AGENTS.md": `# Agent\n## Boundaries\n- none\n`,
  },
};

export const steps = [
  {
    name: "baseline status (no skills yet)",
    run: ["cage", "status", "."],
    expect: { exitCode: 0, parsed: { tracked: 1 } },
  },
  {
    name: "operator adds a new skill",
    edit: {
      "skills/get-weather/SKILL.md": {
        set: `---
name: get-weather
description: fetches current weather
tier: T1
---

# get-weather

Fetches current weather for a location.
`,
      },
    },
  },
  {
    name: "cage status picks up the new skill on next walk",
    run: ["cage", "status", "."],
    expect: {
      exitCode: 0,
      parsed: { tracked: { atLeast: 2 } },
    },
  },
  {
    name: "observations include the new SKILL.md",
    run: ["cage", "list-trackers", "."],
    expect: {
      exitCode: 0,
      parsed: { "entries.length": { atLeast: 2 } },
    },
  },
];
