# restricted-file-ingest-traversal fixture — AGENTS

## agent: workspace-reader

- trustTier: R5
- declaredIntent: "Load workspace files including RESTRICTED; test traversal rejection"
- ingestPaths: [SECRETS.md]

Four parameterized sub-tests exercise the four P-03 vectors; each returns a
distinct `redirectPath` from the provider and asserts the host's rejection
mode via `DecisionEntry.invalidReason`.
