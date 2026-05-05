# Agent

Companion to TOOLS.md — the policy generator extracts tools from
TOOLS.md when AGENTS.md exists in the workspace.

## Boundaries

- Don't read outside the workspace.
- Don't shell out to unbounded commands.
