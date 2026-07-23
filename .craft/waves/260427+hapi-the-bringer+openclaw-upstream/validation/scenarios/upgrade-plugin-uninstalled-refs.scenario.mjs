/**
 * upgrade-plugin-uninstalled-refs — operator removed a plugin from
 * gateway.jsonc but AGENTS.md (a manually-authored file) still mentions
 * the plugin's tools by name. Substrate has no source-of-truth for
 * "is this tool reference still valid" — pinch is text-based.
 *
 * Currently expected: pinch runs cleanly (no rule for this). The
 * substrate doesn't cross-reference AGENTS.md mentions vs gateway.jsonc
 * declarations. Captures this as a behavior + future-rule opportunity.
 */
export const slug = "upgrade-plugin-uninstalled-refs";
export const description =
  "AGENTS.md mentions removed plugin's tools; pinch silent (rule opportunity)";

export const setup = {
  files: {
    "AGENTS.md": `# Agent

## Boundaries

- never invoke removed-plugin/dangerous-thing without confirmation
- prefer removed-plugin/safe-thing for routine ops

## Notes

The removed-plugin tools are deprecated; will be removed in v2.
`,
    "gateway.jsonc": `{
  "version": "0.1.0",
  "plugins": { "entries": {} }
}
`,
  },
};

export const steps = [
  {
    name: "pinch run on workspace with stale tool refs in AGENTS.md",
    run: ["pinch", "run", "."],
    expect: {
      // No rule cross-references AGENTS.md mentions vs gateway.jsonc
      // entries. Pinch passes cleanly.
      exitCode: 0,
      parsed: { rulesRun: { atLeast: 20 } },
    },
  },
  {
    name: "AGENTS.md still mentions the removed plugin (no auto-fix)",
    file: { "AGENTS.md": { contains: "removed-plugin/dangerous-thing" } },
  },
];
