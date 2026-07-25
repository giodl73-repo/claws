---
schemaVersion: 1
agent:
  id: incident-triage
  name: Incident triage
  description: Reviews incidents and prepares an evidence-backed handoff.
metadata:
  openclaw.config: profiles/openclaw.yml
workspace:
  bootstrapFiles:
    AGENTS.md:
      source: workspace/AGENTS.md
packages: []
mcpServers: {}
cronJobs: []
---

# Incident triage

Review incoming incidents, identify severity and ownership, and leave a concise
handoff with evidence.
