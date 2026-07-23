/**
 * upgrade-pre-upgrade-rollback — the canonical upgrade-recovery flow:
 *
 *   1. Operator about to upgrade openclaw / a plugin / a rule pack.
 *      They `cage promote --label pre-upgrade-2026-05-05` to capture
 *      the known-good state.
 *   2. Upgrade applies. We simulate by editing gateway.jsonc + workspace.json
 *      to look "post-upgrade" (rule pack renamed, new tools wired, etc.).
 *   3. Upgrade is a regression. Operator rolls back to the labeled pin.
 *   4. Workspace bytes are restored to pre-upgrade state.
 *
 * This is what bic/aether#14526 was asking for. The scenario locks the
 * happy path end-to-end.
 */
export const slug = "upgrade-pre-upgrade-rollback";
export const description =
  "pin pre-upgrade label → simulate upgrade → rollback restores known-good";

const PRE = `{
  "version": "0.1.0",
  "plugins": {
    "entries": {
      "old-plugin": { "endpoint": "https://example.com/v1" }
    }
  }
}
`;
const POST = `{
  "version": "0.1.0",
  "plugins": {
    "entries": {
      "new-plugin-name": { "endpoint": "https://example.com/v2" }
    }
  }
}
`;
const PRE_WS = `{ "lint": { "skip": ["old-pack/some-rule"] } }
`;
const POST_WS = `{ "lint": { "skip": ["new-pack/renamed-rule"] } }
`;

export const setup = {
  files: {
    "AGENTS.md": `# Agent\n## Boundaries\n- pre-upgrade-only\n`,
    "gateway.jsonc": PRE,
    "workspace.json": PRE_WS,
  },
};

export const steps = [
  {
    name: "pre-upgrade promote --label pre-upgrade-2026-05-05",
    run: ["cage", "promote", "--label", "pre-upgrade-2026-05-05", "."],
    expect: { exitCode: 0, ok: true, parsed: { label: "pre-upgrade-2026-05-05" } },
  },
  {
    name: "simulate upgrade: new gateway entries + renamed skip",
    edit: {
      "gateway.jsonc": { set: POST },
      "workspace.json": { set: POST_WS },
      "AGENTS.md": { append: "\n\n(post-upgrade content)\n" },
    },
  },
  {
    name: "sanity: post-upgrade bytes are on disk",
    file: { "gateway.jsonc": { contains: "new-plugin-name" } },
  },
  {
    name: "upgrade was bad; operator rolls back",
    run: ["cage", "rollback", "--label", "pre-upgrade-2026-05-05", "."],
    expect: { exitCode: 0, ok: true },
  },
  {
    name: "gateway.jsonc restored to pre-upgrade state",
    file: { "gateway.jsonc": { contains: "old-plugin", notContains: "new-plugin-name" } },
  },
  {
    // workspace.json is NOT a canonical openclaw role — the substrate
    // reads it for config but doesn't track it via LKG. So rollback
    // doesn't restore it. Real-world implication: operators MUST also
    // version-control workspace.json themselves; LKG won't save them.
    // Documented finding F-023.
    name: "F-023: workspace.json NOT restored (not a canonical tracker)",
    file: { "workspace.json": { contains: "new-pack" } },
  },
  {
    name: "AGENTS.md restored (no post-upgrade append)",
    file: { "AGENTS.md": { notContains: "post-upgrade content" } },
  },
];
