/**
 * lkg-promote-corrupt-recover — the canonical LKG state-machine.
 *
 * Promote a baseline → corrupt gateway.jsonc with malformed JSON → cage
 * status detects invalid via the strict jsonc tracker → recovers bytes
 * from LKG (`outcome: recovered`, file restored to promoted snapshot).
 *
 * Why gateway.jsonc and not AGENTS.md: the md tracker is forgiving (only
 * fails on error-severity Markdown parse diagnostics) so YAML frontmatter
 * corruption isn't caught. The jsonc tracker errors on malformed JSON
 * which is exactly what triggers recover().
 */
export const slug = "lkg-promote-corrupt-recover";
export const description = "promote → corrupt gateway.jsonc → status recovers from LKG";

export const setup = {
  files: {
    "AGENTS.md": `# Agent\n\n## Boundaries\n\n- baseline-only\n`,
    "gateway.jsonc": `{
  "version": "0.1.0",
  "plugins": {
    "entries": {
      "baseline-plugin": { "endpoint": "https://example.com" }
    }
  }
}
`,
  },
};

export const steps = [
  {
    name: "initial promote captures LKG",
    run: ["cage", "promote", "."],
    expect: { exitCode: 0, ok: true, parsed: { promoted: { atLeast: 1 } } },
  },
  {
    name: "corrupt gateway.jsonc with malformed JSON",
    edit: { "gateway.jsonc": { set: '{ "this is not": valid json [' } },
  },
  {
    name: "status recovers gateway.jsonc from LKG",
    run: ["cage", "status", "."],
    expect: {
      exitCode: 0,
      parsed: { "byOutcome.recovered": { atLeast: 1 } },
    },
  },
  {
    name: "gateway.jsonc bytes restored to baseline",
    file: { "gateway.jsonc": { contains: "baseline-plugin" } },
  },
];
