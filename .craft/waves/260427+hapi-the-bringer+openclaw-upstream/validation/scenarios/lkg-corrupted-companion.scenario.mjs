/**
 * lkg-corrupted-companion — both the active file AND the .lkg companion
 * are corrupt. The substrate can't recover (no good bytes anywhere).
 * Expect a clean failed-or-skipped outcome, not a crash.
 */
export const slug = "lkg-corrupted-companion";
export const description = "active corrupt + .lkg corrupt → clean failure (no good bytes)";

export const setup = {
  files: {
    "AGENTS.md": `# Agent\n## Boundaries\n- none\n`,
    "gateway.jsonc": `{ "version": "0.1.0" }\n`,
  },
};

export const steps = [
  {
    name: "promote captures baseline",
    run: ["cage", "promote", "."],
    expect: { exitCode: 0, ok: true },
  },
  {
    name: "corrupt the .lkg companion",
    edit: { "gateway.jsonc.lkg": { set: "{ this is not valid json [" } },
  },
  {
    name: "corrupt the active file too",
    edit: { "gateway.jsonc": { set: "{ also broken" } },
  },
  {
    name: "status reports an outcome (no crash)",
    run: ["cage", "status", "."],
    // Substrate can't recover; expect failed or skipped, not a crash. We
    // don't assert exact outcome since it depends on whether the .lkg
    // is even read for fingerprint comparison vs. only on recover.
    expect: { exitCode: { oneOf: [0, 1] } },
  },
];
