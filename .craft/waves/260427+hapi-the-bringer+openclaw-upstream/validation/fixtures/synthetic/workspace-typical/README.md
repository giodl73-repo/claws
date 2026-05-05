# workspace-typical

synthetic openclaw workspace: workspace-typical

## Authoring

Drop fixture files into this directory (`AGENTS.md`, `*.lobster`, `policy.jsonc`, etc.).
Use file naming that matches the canonical roles in `@openclaw/oc-path`'s
`OPENCLAW_WORKSPACE_ROLES` so the substrate train sees them.

After authoring, run:

```sh
node scripts/run-suite-openclaw.mjs workspace-typical
# inspect results-openclaw/workspace-typical/
```

If the fixture surfaces a behavior worth pinning permanently, add an entry to
`findings.md`. If it's a regression-prone edge case, write expectations
inline in this README so the next person knows what "right" looks like.
