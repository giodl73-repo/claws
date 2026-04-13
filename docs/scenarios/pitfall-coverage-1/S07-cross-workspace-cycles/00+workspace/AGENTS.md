# Agents

## coordinator-a

- Model: claude-sonnet-4-20250514
- Description: Primary coordinator for workspace-alpha
- Tools: [query-db, send-request]
- Trust: T2
- Delegates:
  - executor-b@workspace-beta: data processing

## executor-b (external: workspace-beta)

- Description: Data processing executor in workspace-beta
- Trust: T2
- Delegates:
  - coordinator-a@workspace-alpha: results delivery
