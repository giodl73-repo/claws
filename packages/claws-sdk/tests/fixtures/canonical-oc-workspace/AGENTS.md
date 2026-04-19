# Agents

The canonical OC workspace declares 12 agents so the delegation graph and
`AgentsIR` emission have real content to render. Each agent lists a tool
subset so undeclared-reference filtering runs with a realistic shape.

## Security Auditor

- Model: claude-sonnet-4-20250514
- Description: Reviews code and configuration for security issues.
- Tools: Read, Grep, Glob, LogQuery, TraceCollect

## Compliance Checker

- Model: claude-haiku-4-5-20251001
- Description: Validates compliance with organizational policies.
- Tools: Read, Grep, PolicyAudit, SessionAudit

## Policy Publisher

- Model: claude-sonnet-4-20250514
- Description: Publishes governance policy bundles to edge workers.
- Tools: Read, PolicySync, PolicyAudit, TokenIssue

## Fleet Coordinator

- Model: claude-sonnet-4-20250514
- Description: Drives compile across a fleet of workspaces.
- Tools: Read, FleetScan, FleetCompile, MetricPublish

## Observability Steward

- Model: claude-haiku-4-5-20251001
- Description: Curates log, trace, and metric pipelines.
- Tools: Read, LogQuery, MetricPublish, TraceCollect

## Incident Commander

- Model: claude-sonnet-4-20250514
- Description: Coordinates response to live incidents.
- Tools: Read, Bash, Rollback, SessionRevoke

## Platform Deployer

- Model: claude-sonnet-4-20250514
- Description: Promotes builds across platform environments.
- Tools: Read, Deploy, Rollback, TokenIssue

## Secret Steward

- Model: claude-haiku-4-5-20251001
- Description: Rotates and audits vault secrets.
- Tools: VaultRead, VaultWrite, TokenRevoke

## Session Auditor

- Model: claude-haiku-4-5-20251001
- Description: Reviews live session activity for anomalies.
- Tools: Read, SessionAudit, LogQuery

## Network Gate

- Model: claude-sonnet-4-20250514
- Description: Audits network egress and flow-log anomalies.
- Tools: Read, NetworkAudit, LogQuery

## Governance Reporter

- Model: claude-haiku-4-5-20251001
- Description: Produces governance posture reports.
- Tools: Read, PolicyAudit, LogQuery, MetricPublish

## Developer Assistant

- Model: claude-haiku-4-5-20251001
- Description: Assists developers with workspace queries.
- Tools: Read, Grep, Glob, Edit
