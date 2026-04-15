# Agents

## research-agent

- description: Gathers information from web sources and workspace files. Read-only — never modifies files or sends communications.
- model: claude-3.5-sonnet
- tools:
  - web-search
  - web-scrape
  - file-read
  - file-list
  - calendar-read
- delegates_to: action-agent
- governance: inherits workspace SOUL constraints

## action-agent

- description: Executes approved actions — file writes, API calls, emails, deployments. Always requires human approval for R5 operations.
- model: gpt-4o
- tools:
  - file-write
  - db-query
  - api-call
  - send-email
  - send-slack
  - shell-exec
  - deploy-trigger
- delegates_to: research-agent
- governance: inherits workspace SOUL constraints, R5 tools require elicitation
