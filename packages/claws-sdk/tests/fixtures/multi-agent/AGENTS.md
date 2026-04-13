# Agents

## orchestrator

- Model: claude-sonnet-4-20250514
- Description: Main orchestrator that delegates to subagents
- Tools: Read, Write, Bash
- Trust: L3
- Delegates: researcher, deployer, communicator

## researcher

- Model: claude-haiku-4-5-20251001
- Description: Searches and reads data
- Tools: Read, Grep, Glob
- Trust: L1
- Data-ceiling: INTERNAL

## deployer

- Model: claude-sonnet-4-20250514
- Description: Handles deployments and infrastructure changes
- Tools: Bash, deploy-prod
- Trust: L2

## communicator

- Model: claude-sonnet-4-20250514
- Description: Sends emails and books meetings on behalf of user
- Tools: email-sender, calendar-book
- Trust: L2
- OBO: true

## phantom-agent

- Model: claude-haiku-4-5-20251001
- Description: References tools that do not exist in TOOLS.md
- Tools: magic-wand, time-travel
- Trust: L0
