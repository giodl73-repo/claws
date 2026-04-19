# Agents

## planner

Breaks work into tasks. Cannot execute shell commands.

- tools: web_fetch

## operator

Executes sanctioned runbooks. Respects IDENTITY.md §Deny Rules.

- tools: bash, database_query
