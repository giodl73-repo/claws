/**
 * lkg-fresh-deployment — empty workspace + first cage status:
 * no LKG state file, no errors, walks cleanly.
 */
export const slug = "lkg-fresh-deployment";
export const description = "fresh workspace, first cage status emits no error";

export const setup = {
  files: {
    "AGENTS.md": `# Agent\n## Boundaries\n- none\n`,
  },
};

export const steps = [
  {
    name: "first status on a workspace with no LKG state",
    run: ["cage", "status", "."],
    expect: { exitCode: 0, parsed: { tracked: { atLeast: 1 } } },
  },
  // Note: status DOES create .openclaw/lkg-health.json on first run as
  // soon as observe() walks the trackers — saveState fires post-promote
  // even from the implicit "first observe = promote" path. Documented
  // here so the scenario captures the actual behavior.
  {
    name: ".openclaw/lkg-health.json gets created during walk",
    file: { ".openclaw/lkg-health.json": { exists: true } },
  },
];
