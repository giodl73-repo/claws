# Agent Roster

## Lead Developer

- description: Coordinates the development workflow and delegates tasks
- model: claude-sonnet-4-20250514
- Tools: Read, Write, Bash, Grep, Glob
- Delegates to: Code Reviewer, Test Runner

## Code Reviewer

- description: Reviews pull requests and code changes
- model: claude-haiku-4-5-20251001
- Tools: Read, Grep
- Delegates to: Test Runner

## Test Runner

- description: Runs test suites and reports results
- model: claude-haiku-4-5-20251001
- tools:
  - Bash
  - Read
