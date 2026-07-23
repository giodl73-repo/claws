/**
 * lkg-label-rollback — labeled-pin upgrade-recovery.
 *
 * Promote v1 with label → edit file (still valid) → promote v2 with new
 * label → rollback to v1 label → expect file bytes restored to v1.
 */
export const slug = "lkg-label-rollback";
export const description = "promote v1 → edit valid → promote v2 → rollback to v1";

const V1 = `{
  "version": "0.1.0",
  "plugins": { "entries": { "v1-plugin": { "endpoint": "https://v1.example.com" } } }
}
`;
const V2 = `{
  "version": "0.1.0",
  "plugins": { "entries": { "v2-plugin": { "endpoint": "https://v2.example.com" } } }
}
`;

export const setup = {
  files: {
    "AGENTS.md": `# Agent\n## Boundaries\n- none\n`,
    "gateway.jsonc": V1,
  },
};

export const steps = [
  {
    name: "promote v1 baseline",
    run: ["cage", "promote", "--label", "v1", "."],
    expect: { exitCode: 0, ok: true, parsed: { label: "v1" } },
  },
  {
    name: "edit gateway.jsonc to v2 (still valid)",
    edit: { "gateway.jsonc": { set: V2 } },
  },
  {
    name: "promote v2 baseline",
    run: ["cage", "promote", "--label", "v2", "."],
    expect: { exitCode: 0, ok: true, parsed: { label: "v2" } },
  },
  {
    name: "rollback to v1 label",
    run: ["cage", "rollback", "--label", "v1", "."],
    expect: { exitCode: 0, ok: true },
  },
  {
    name: "gateway.jsonc bytes restored to v1",
    file: { "gateway.jsonc": { contains: "v1-plugin" } },
  },
  {
    name: "gateway.jsonc no longer contains v2",
    file: { "gateway.jsonc": { notContains: "v2-plugin" } },
  },
];
