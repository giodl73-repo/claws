---
schemaVersion: 1
agent:
  id: code-reviewer
  name: Code Reviewer
  description: Reviews a repository and leaves actionable findings.
workspace:
  bootstrapFiles:
    AGENTS.md:
      source: workspace/AGENTS.md
  files:
    - source: assets/review.schema.json
      path: schemas/review.schema.json
packages: []
mcpServers: {}
cronJobs: []
---

Review code for correctness, security, and missing tests. Lead with concrete findings.
