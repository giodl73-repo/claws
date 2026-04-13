# Agents

## agent-alpha

- Model: claude-sonnet-4-20250514
- Description: Research coordinator
- Tools: web-search
- Trust: T2
- Delegates to: agent-beta

## agent-beta

- Model: claude-sonnet-4-20250514
- Description: Writing coordinator
- Tools: file-writer
- Trust: T2
- Delegates to: agent-alpha
