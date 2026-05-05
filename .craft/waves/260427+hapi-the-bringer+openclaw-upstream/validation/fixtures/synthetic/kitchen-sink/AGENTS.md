---
name: example-agent
trust: internal-trusted
---

# Example agent

A kitchen-sink fixture exercising every OpenClaw-shape file in a single
workspace. Every artifact is intentionally well-formed — this is the
"golden path" baseline: if any tool fails here, the toolchain is broken.

## Identity

See IDENTITY.md.

## Tools

| name | risk | description |
|------|------|-------------|
| read-file | R1 | read a file from the local filesystem |
| write-file | R3 | write a file to the local filesystem |
| send-email | R5 | send an email via the configured SMTP gateway |

## Memory scopes

- `default` — ephemeral
- `project` — per-workspace
- `session` — per-conversation
