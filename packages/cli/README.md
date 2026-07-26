# Standalone Claws CLI Incubator

This private package proves the future harness-neutral Claws command without
selecting or publishing its final npm identity.

```bash
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- ./path/to/claw --agent openclaw --dry-run
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- ./path/to/claw --agent openclaw --yes --plan-integrity sha256:<reviewed-digest>
CLAWHUB_REGISTRY_URL=https://registry.example OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- clawhub:@publisher/claw@1.0.0 --agent openclaw --dry-run
```

The CLI validates local package bytes with the independent reference parser.
The OpenClaw adapter delegates through the public `openclaw claws add` process
boundary. Preview uses `--dry-run --json`; apply requires explicit `--yes` and
the exact `planIntegrity` returned by preview. It does not import OpenClaw code
or reproduce OpenClaw consent, mutation, provenance, or removal policy.

Exact `clawhub:<package>@<version>` sources resolve through the official
experimental Claws feed. The CLI binds feed package/version/integrity to
same-origin artifact metadata, bounded safe extraction, and the extracted
package identity before delegation. `CLAWHUB_REGISTRY_URL` is required until
that feed is deployed. OpenClaw recomputes the plan before mutation and rejects
stale consent. Broader lifecycle dispatch, final naming, and publication remain
deferred.

The adapter uses a private, content-addressed OS-temporary snapshot because
OpenClaw includes the absolute local package path in development-plan
integrity. Snapshot creation is atomic and existing bytes are verified before
reuse; the harness then performs its own full revalidation. Snapshots expire
after 24 hours, and the cache is capped at 16 snapshots or 512 MiB while
protecting recently active operations.

A timed-out apply is an uncertain host outcome and is never retried
automatically. Check `openclaw claws status` for partial provenance before any
follow-up action.
