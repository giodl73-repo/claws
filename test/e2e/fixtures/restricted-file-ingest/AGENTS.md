# restricted-file-ingest fixture — AGENTS

## agent: workspace-reader

- trustTier: R5
- declaredIntent: "Load workspace files including RESTRICTED"
- ingestPaths: [SECRETS.md]

Agent profile for the file-ingest scenario harness. One ingest per scenario;
the test dispatches `simulateFileIngest('SECRETS.md')` and asserts the
decision verb, approval-handle shape, and audit-chain entries.
