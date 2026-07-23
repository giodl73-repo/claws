/**
 * upgrade-stale-rule-skip — exposes F-022: workspace.json `lint.skip`
 * entries that don't match ANY registered rule are silently ignored.
 *
 * Realistic upgrade pain: a rule pack renamed `pack-v0/foo-rule` →
 * `pack-v1/foo-rule`. Operator's workspace.json still references the
 * old ID. After upgrade, the operator BELIEVES the rule is still being
 * skipped — but it's actually been re-enabled (because the skip pattern
 * matches no current rule, and the new-name rule isn't excluded). They
 * suddenly see findings they thought were silenced.
 *
 * Pinch should at minimum warn: "skip glob `pack-v0/foo-rule` matches
 * no registered rule (typo? or referencing a renamed/removed rule?)".
 */
export const slug = "upgrade-stale-rule-skip";
export const description =
  "F-022: pinch silently ignores skip entries that match no registered rule";

export const setup = {
  files: {
    "AGENTS.md": `# Agent\n## Boundaries\n- none\n`,
    "workspace.json": `{
  "lint": {
    "skip": [
      "starter-v0/agents/missing-boundaries",
      "old-pack-v0/long-since-removed-rule",
      "pack-renamed/this-id-is-stale-after-upgrade"
    ]
  }
}
`,
  },
};

export const steps = [
  {
    name: "pinch run with mix of valid + stale skip entries",
    run: ["pinch", "run", "."],
    expect: { exitCode: 0, parsed: { rulesDisabledByConfig: 1 } },
  },
  // F-022 lock-in: 2 of 3 skip entries are stale, but pinch reports
  // rulesDisabledByConfig=1 (only the valid one). No warning is emitted.
  // When F-022 lands, expect a `staleSkipPatterns: [...]` field or
  // similar diagnostic in the summary.
  {
    name: "F-022: no warning surfaced for stale skip refs",
    expect: {
      parsed: {
        rulesRun: 22, // 23 registered minus 1 valid skip; stale ones don't reduce
      },
    },
  },
];
