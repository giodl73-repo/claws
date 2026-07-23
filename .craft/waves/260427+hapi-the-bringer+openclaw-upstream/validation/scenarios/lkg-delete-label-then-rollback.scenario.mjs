/**
 * lkg-delete-label-then-rollback — labels are immutable, but `delete-label`
 * is the operator's escape hatch. After delete, the label is gone — a
 * subsequent rollback must fail cleanly (LKG_LABEL_NOT_FOUND), and a
 * re-promote with the same name must succeed (no zombie state).
 */
export const slug = "lkg-delete-label-then-rollback";
export const description = "delete-label v1 → rollback v1 fails; re-promote v1 succeeds";

const V1 = `{ "version": "0.1.0", "tag": "v1" }\n`;
const V2 = `{ "version": "0.1.0", "tag": "v2" }\n`;

export const setup = {
  files: {
    "AGENTS.md": `# Agent\n## Boundaries\n- none\n`,
    "gateway.jsonc": V1,
  },
};

export const steps = [
  {
    name: "promote --label v1",
    run: ["cage", "promote", "--label", "v1", "."],
    expect: { exitCode: 0, ok: true },
  },
  {
    name: "edit gateway.jsonc to v2",
    edit: { "gateway.jsonc": { set: V2 } },
  },
  {
    name: "delete-label v1",
    run: ["cage", "delete-label", "v1", "."],
    expect: { exitCode: 0 },
  },
  {
    name: "rollback --label v1 now fails (label gone)",
    run: ["cage", "rollback", "--label", "v1", "."],
    expect: { exitCode: 1, errCode: "LKG_LABEL_NOT_FOUND" },
  },
  {
    name: "gateway.jsonc still has v2 bytes (rollback was a no-op)",
    file: { "gateway.jsonc": { contains: '"v2"' } },
  },
  {
    name: "re-promote --label v1 succeeds (no zombie state)",
    run: ["cage", "promote", "--label", "v1", "."],
    expect: { exitCode: 0, ok: true },
  },
];
