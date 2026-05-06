/**
 * upgrade-lkg-state-no-version-field — pre-versioning state file
 * (legacy, before the substrate started stamping `version: "0.1.0"`).
 * Substrate must surface a clean error, not crash.
 *
 * The LKG_STATE_FILE_VERSION_MISMATCH path catches this: parsed.version
 * !== '0.1.0' (where parsed.version is undefined → undefined !== '0.1.0').
 * Should hit the same error code as the future-version case.
 */
export const slug = 'upgrade-lkg-state-no-version-field';
export const description = 'pre-versioning state file → LKG_STATE_FILE_VERSION_MISMATCH';

export const setup = {
  files: {
    'AGENTS.md': `# Agent\n## Boundaries\n- none\n`,
    // Note: no `version` field. Realistic of legacy state.
    '.openclaw/lkg-health.json': `{
  "entries": {
    "/some/legacy/path/AGENTS.md": {
      "lastKnownGood": { "hash": "abc", "bytes": 0, "observedAt": "2025-01-01T00:00:00Z" }
    }
  }
}
`,
  },
};

export const steps = [
  {
    name: 'status hits LKG_STATE_FILE_VERSION_MISMATCH on no-version state',
    run: ['cage', 'status', '.'],
    expect: { exitCode: 2, errCode: 'LKG_STATE_FILE_VERSION_MISMATCH' },
  },
];
