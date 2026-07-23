/**
 * upgrade-policy-jsonc-old-shape — operator has a policy.jsonc generated
 * by an older substrate version that's missing newer fields (no
 * `policyId`, no `generatedFrom.hash`, no `generatedAt`). Verify
 * `policy check` doesn't crash on the older shape.
 *
 * Substrate's stance should be: minimal-but-valid policy.jsonc → check
 * runs (drift detection still works, just without provenance fields).
 * If the substrate insists on every new field being present, this is
 * a forced-upgrade story and worth noting.
 */
export const slug = "upgrade-policy-jsonc-old-shape";
export const description =
  "older policy.jsonc shape (missing newer fields) → check runs gracefully";

export const setup = {
  files: {
    "AGENTS.md": `# Agent\n## Boundaries\n- none\n`,
    "TOOLS.md": `# Tools\n\n## Tools\n\n### t # R1, READ\nA tool.\n`,
    // Older shape: just version + tools + denyRules. No policyId,
    // no generatedFrom, no generatedAt. Realistic of pre-v0.1 outputs.
    "policy.jsonc": `{
  "version": "0.0.5",
  "tools": [
    { "id": "t", "risk": 1, "caps": ["READ"], "sensitivity": "public" }
  ],
  "denyRules": []
}
`,
  },
};

export const steps = [
  {
    name: "policy check on old-shape policy.jsonc",
    run: ["policy", "check", "."],
    // Either it works (graceful) or it fails with a code we can act on.
    // Crashing with ERR_INTERNAL would be the bad case.
    expect: { exitCode: { oneOf: [0, 1, 2] } },
  },
];
