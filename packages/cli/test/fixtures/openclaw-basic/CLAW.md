---
schemaVersion: 1
agent:
  id: adapter-proof
  name: Adapter proof
  description: Proves the packed CLI to OpenClaw process boundary.
workspace:
  bootstrapFiles:
    SOUL.md:
      source: workspace/SOUL.md
  files:
    - source: assets/incident.schema.json
      path: schemas/incident.schema.json
packages: []
mcpServers: {}
cronJobs: []
---
