# Agents

## Orchestrator

- Model: claude-sonnet-4-20250514
- Description: Top-level orchestrator agent
- Trust: T2
- Tools: Read, Bash
- Delegates to: Security-Agent, Deploy-Agent, Data-Agent

## Security-Agent

- Model: claude-sonnet-4-20250514
- Description: Security scanning subagent
- Trust: T3
- Tools: Read, db-query
- Delegates to: Deploy-Agent
- Data ceiling: public

## Deploy-Agent

- Model: claude-haiku-4-5-20251001
- Description: Deployment automation subagent
- Trust: T4
- Tools: prod-deploy, Bash
- Delegates to: Orchestrator

## Data-Agent

- Model: claude-haiku-4-5-20251001
- Description: Data analysis subagent
- Trust: T2
- Tools: Read, api-call
- Delegates to: Data-Agent
- Data ceiling: public
