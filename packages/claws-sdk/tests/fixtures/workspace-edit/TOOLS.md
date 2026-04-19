---
owner: platform-team
updated: 2026-03-01
---

# Tool Guidance

<!-- Fixture for workspace-edit tests. Preserves frontmatter + comment -->

## web-search
- Risk: R1
- Description: Search the public web for information
- Governance: audit-only
- enabled: true

## file-read
- Risk: R2
- Description: Read files from the workspace directory
- Governance: audit-only
- enabled: true

## file-write
- Risk: R3
- Description: Write or update files in the workspace directory
- Governance: audit + approval (team-lead)
- enabled: true

## db-query
- Risk: R4
- Description: Execute read-only SQL against the analytics replica
- Governance: audit + approval (manager)
- enabled: false

## send-email
- Risk: R5
- Description: Send email on behalf of the user
- Governance: audit + approval (exec) + elicitation required
- enabled: true
