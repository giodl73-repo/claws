/**
 * upgrade-lkg-state-future-version — operator downgraded openclaw and
 * the existing `.openclaw/lkg-health.json` was written by a future
 * version (`9.9.9`). Substrate must surface a clear, code-bearing
 * error that tells the operator what to do (don't crash, don't pretend
 * everything's fine).
 *
 * Recovery path: operator deletes the state file → re-promote from
 * scratch.
 */
export const slug = "upgrade-lkg-state-future-version";
export const description =
  "future-version state → LKG_STATE_FILE_VERSION_MISMATCH; recovery via delete+repromote";

export const setup = {
  files: {
    "AGENTS.md": `# Agent\n## Boundaries\n- none\n`,
    "gateway.jsonc": `{ "version": "0.1.0" }\n`,
    ".openclaw/lkg-health.json": `{
  "version": "9.9.9",
  "entries": {}
}
`,
  },
};

export const steps = [
  {
    name: "status hits LKG_STATE_FILE_VERSION_MISMATCH (F-011 fixed)",
    run: ["cage", "status", "."],
    // exit 2 because state-file load happens lazily inside observe;
    // the LKGError propagates to runCli's top-level catch (return 2).
    // Per-verb catches that return 1 only fire on promote/rollback/
    // delete-label paths. CLI-LKG-13 in lkg cli.test.ts pins this same
    // shape.
    expect: { exitCode: 2, errCode: "LKG_STATE_FILE_VERSION_MISMATCH" },
  },
  {
    name: "operator wipes the bad state file",
    edit: { ".openclaw/lkg-health.json": { delete: true } },
  },
  {
    name: "fresh promote works after wipe",
    run: ["cage", "promote", "."],
    expect: { exitCode: 0, ok: true },
  },
  {
    name: "subsequent status reports clean",
    run: ["cage", "status", "."],
    expect: { exitCode: 0, ok: true },
  },
];
