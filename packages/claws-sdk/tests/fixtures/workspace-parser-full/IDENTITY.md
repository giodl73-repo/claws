# Identity

## Organization

- Organization: Acme Corp
- Team: Platform Engineering
- Trust: L3 — verified enterprise deployment

## RBAC

- admin: platform-eng
- readonly: all-engineers

## Deny Rules

### No production writes

Block bash commands that write to production hosts.

### No secret exfiltration

Block web_fetch requests that include known credential patterns.

## Knowledge Sources

### Runbooks

- runbook-incident-response.md
- runbook-deploy-rollback.md

### Architecture SharePoint

- architecture-overview.md
- service-catalog.md

## Entitlements

### Paid tier

- gpt-enterprise
- anthropic-claude-opus
- analytics-warehouse-readonly

### Trial tier

- internal-vector-store
