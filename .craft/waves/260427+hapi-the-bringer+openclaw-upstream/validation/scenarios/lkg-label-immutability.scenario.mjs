/**
 * lkg-label-immutability — labels are immutable; re-promoting under the
 * same label name on the same path must fail with LKG_LABEL_DUPLICATE.
 */
export const slug = "lkg-label-immutability";
export const description = "second promote --label v1 (same name) is rejected";

const V1 = `{ "version": "0.1.0" }`;
const V1B = `{ "version": "0.1.0", "note": "different bytes" }`;

export const setup = {
  files: {
    "AGENTS.md": `# Agent\n## Boundaries\n- none\n`,
    "gateway.jsonc": V1,
  },
};

export const steps = [
  {
    name: "first promote --label v1 succeeds",
    run: ["cage", "promote", "--label", "v1", "."],
    expect: { exitCode: 0, ok: true },
  },
  {
    name: "mutate gateway.jsonc",
    edit: { "gateway.jsonc": { set: V1B } },
  },
  {
    name: "second promote --label v1 rejected as duplicate",
    run: ["cage", "promote", "--label", "v1", "."],
    expect: { exitCode: 1, errCode: "LKG_LABEL_DUPLICATE" },
  },
];
