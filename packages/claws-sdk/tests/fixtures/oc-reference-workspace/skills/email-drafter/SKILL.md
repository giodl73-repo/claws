---
name: email-drafter
description: Draft and send emails on behalf of the user
tools:
  - file-read
  - send-email
governance:
  audit: true
  approval: exec
  elicit: true
---

# Email Drafter

Draft an email from context files and send it on behalf of the user.

## Usage

Provide a topic and optional reference files. The skill will:
1. Read relevant workspace files for context
2. Draft the email body
3. Present the draft for review (elicitation)
4. Send upon executive approval

## Governance

This skill sends external communications (R5). All drafts and sends are logged.
Executive approval is required before dispatch. The user is always shown the
final draft before it is sent (elicitation).

When published with `claws publish`, this skill earns the governance-verified badge at tier R5.
