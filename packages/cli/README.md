# Standalone Claws CLI Incubator

This private package proves the future harness-neutral Claws command without
selecting or publishing its final npm identity.

```bash
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- ./path/to/claw --agent openclaw --dry-run
CLAWHUB_REGISTRY_URL=https://registry.example OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- clawhub:@publisher/claw@1.0.0 --agent openclaw --dry-run
```

The CLI validates local package bytes with the independent reference parser.
The OpenClaw adapter then delegates planning through the public
`openclaw claws add --dry-run --json` process boundary. It does not import
OpenClaw code or reproduce OpenClaw consent, mutation, provenance, or removal
policy.

Exact `clawhub:<package>@<version>` sources resolve through the official
experimental Claws feed. The CLI binds feed package/version/integrity to
same-origin artifact metadata, bounded safe extraction, and the extracted
package identity before delegation. `CLAWHUB_REGISTRY_URL` is required until
that feed is deployed. Mutation, final naming, and publication remain deferred.
