# Tool Guidance

## web-search
- Risk: R1
- Description: Search the public web for information
- Governance: audit-only (log all queries, never block)

## web-scrape
- Risk: R1
- Description: Fetch and extract content from a public URL
- Governance: audit-only

## file-read
- Risk: R2
- Description: Read files from the workspace directory
- Governance: audit-only (log every read, no block — enables audit-chain testing for non-blocking governance)

## file-list
- Risk: R2
- Description: List files and directories in the workspace
- Governance: audit-only

## file-write
- Risk: R3
- Description: Write or update files in the workspace directory
- Governance: audit + approval (team-lead)

## calendar-read
- Risk: R3
- Description: Read calendar events for scheduling
- Governance: audit + approval (team-lead)

## db-query
- Risk: R4
- Description: Execute read-only SQL against the analytics replica
- Governance: audit + approval (manager), query logged

## api-call
- Risk: R4
- Description: Make authenticated HTTP requests to internal APIs
- Governance: audit + approval (manager)

## send-email
- Risk: R5
- Description: Send email on behalf of the user
- Governance: audit + approval (exec) + elicitation required
- Note: Conflicts with SOUL deny constraint "never send without approval" — this is intentional for violation testing

## send-slack
- Risk: R5
- Description: Post messages to external Slack channels
- Governance: audit + approval (exec) + elicitation required

## shell-exec
- Risk: R5
- Description: Execute arbitrary shell commands
- Governance: audit + approval (exec) + elicitation required
- Note: Conflicts with SOUL deny constraint "never access production" when command targets production systems

## deploy-trigger
- Risk: R5
- Description: Trigger a deployment pipeline
- Governance: audit + approval (exec) + elicitation required + dual-approval
