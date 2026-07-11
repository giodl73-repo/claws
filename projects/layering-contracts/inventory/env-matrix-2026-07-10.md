# Managed Environment Matrix - Pass 2

## Baseline

- Lobster revision: `0a9514c1ce`
- Worktree: `C:\src\lobster-layering-audit`
- Scope: eight Pass-1 projection/reset candidates plus the registry model
- Status: consumer tracing complete for the candidates; full key matrix remains
  to be generated

## Environment Stages

One environment key can participate in four different stages:

```text
runtime projection
  -> adapter process environment or adapter-local state
  -> config/workspace overlay and/or Gateway child forwarding
  -> OpenClaw/plugin consumer
```

The code currently represents these stages in separate places:

| Stage | Current source |
| --- | --- |
| Runtime projection | `lobster_runtime::gateway_proxy::start_options` and later per-claims injectors |
| Adapter baseline reset | `openclaw_container::plex_api::MANAGED_EXTRA_ENV_KEYS` |
| Gateway child forwarding | `openclaw_container::gateway_process::ALLOWED_ENV` |
| Adapter-local/config consumers | Seeding, workspace, plugin/config overlay, proxy/lifecycle modules |
| Gateway/plugin consumers | Bundled Lobster plugins and patched/package OpenClaw code |

There is no single descriptor tying key identity, lifecycle, reset behavior,
secret handling, forwarding, and consumer together.

## Candidate Resolution

| Key | Projection | Reset | Forwarding | Consumer | Finding |
| --- | --- | --- | --- | --- | --- |
| `OPENCLAW_GIT_PASSPORT_STRICT_LEASE_ENABLED` | Explicit on current starts | Missing from generic reset | Not forwarded | Adapter workspace passport checks | Current caller overwrites it, but omission by an older/alternate caller can preserve prior process state |
| `OPENCLAW_WEBIQ_ENABLED` | Explicit on current starts | Missing from generic reset | Not forwarded | Adapter plugin overlay before Gateway spawn | Current caller overwrites it; rolling/alternate omission can preserve a prior overlay input |
| `OPENCLAW_WORKIQ_TEAMS_DELEGATED_RENAME_ENABLED` | Explicit on current starts | Missing from generic reset | Explicitly forwarded | WorkIQ plugin in Gateway | Current caller overwrites it; rolling/alternate omission can leak prior child behavior |
| `OPENCLAW_CODE_MODE_STREAMING_ENABLED` | Explicit on current starts | Missing from generic reset | Not forwarded | No non-test consumer found in repository | Appears to be dead compatibility surface at this revision |
| `CRON_WORKIQ_PLAN_CAPTURE_ENABLED` | Explicit on current starts | Missing from generic reset | Not forwarded | No non-test consumer found in repository | Appears to be dead compatibility surface at this revision |
| `OPENCLAW_DEFAULT_MODEL` | Explicit on current starts | Missing from generic reset | Not forwarded | Adapter config seeding reads once before spawn | Current caller overwrites it; rolling/alternate omission can seed from stale process state |
| `OPENCLAW_GIT_REPO_FILENAME` | Conditional on `LOBSTER_OPENCLAW_GIT_REPO_FILENAME` | Missing from generic reset | Not forwarded | Adapter workspace git store reads process env | Later omission preserves a previously applied filename until adapter restart |
| `OPENCLAW_TEAMS_DELIVERY_AUTH_TOKEN` | Conditional on secret resolution | Intentionally excluded from generic process reset | Intentionally not forwarded | Routed into `AdapterState.teams_delivery_auth_token` | Correct special handling: each real start initializes to `None`, then applies a nonblank token if present |

## Key Findings

### Rolling compatibility changes the reset requirement

`GatewayStartBody` intentionally ignores unknown fields and permits omitted
fields so newer and older runtime/adapter revisions can interoperate. Therefore
this argument is insufficient:

> The current runtime always projects an explicit value, so reset is unnecessary.

An older runtime, alternate path, or future conditional projection can omit a
key. If the adapter previously accepted that key into process environment and
does not restore it, omission means accidental retention rather than the
documented baseline/default behavior.

### Gateway child forwarding is not the same as acceptance

Several keys are correctly absent from `ALLOWED_ENV` because the adapter
consumes them before spawning Gateway:

- default model drives config seeding;
- WebIQ drives plugin overlay generation;
- git filename and strict lease drive workspace code;
- delivery auth token stays in adapter-local secret state.

The child allowlist should remain least-privilege. The gap is not that every
projected key must be forwarded; it is that every accepted key needs an
explicit destination and omission rule.

### Two projected keys currently have no implementation consumer

Repository-wide source search found no non-test consumer for:

- `OPENCLAW_CODE_MODE_STREAMING_ENABLED`
- `CRON_WORKIQ_PLAN_CAPTURE_ENABLED`

They may refer to removed patches, generated package behavior not represented
in source, or incomplete features. Until proven otherwise they should be marked
suspect and considered for deletion from runtime projection and ECS schema.

### The delivery secret demonstrates the right pattern

`OPENCLAW_TEAMS_DELIVERY_AUTH_TOKEN` is intercepted instead of being written to
process env or forwarded to Gateway. Every real `/start` clears adapter-local
token state before optionally applying the new value. A warm-container test
proves re-projection. This is a stronger contract than a generic env key and a
useful pattern for other secrets.

### Repository filename is process-sticky

`OPENCLAW_GIT_REPO_FILENAME` is conditionally projected and read directly by
workspace persistence. It is not generically restored. Removing the host
configuration while reusing the same adapter process leaves the prior filename
active. Because the source setting appears deployment/process-scoped rather
than per-user, this is primarily configuration-removal and rolling-version
drift, not yet proven cross-tenant leakage.

## Recommended Lobster Hardening

Define one typed managed-start-key registry in Lobster adapter code, with fields
equivalent to:

```text
key
source
lifecycle: image | process | per-start | per-session
destination: adapter-state | adapter-env | config-overlay | gateway-child
reset: baseline | clear-on-omission | explicit-only
sensitivity: public | identifier | secret
consumer
```

Use that registry to derive or test:

- accepted runtime keys;
- baseline restoration;
- Gateway child forwarding;
- redacted diagnostics;
- projection/reset parity;
- documentation.

This is Lobster compatibility-layer hardening, not automatically an OpenClaw
RFC. Individual consumers may still expose missing portable OpenClaw contracts.

## Immediate Actions

1. Verify whether the two no-consumer keys are used by generated patch/package
   artifacts outside source search; delete their projection if not.
2. Add omission/reset coverage for repository filename, default model, WebIQ,
   strict lease, and delegated rename under a warm adapter process.
3. Decide whether those keys belong in `MANAGED_EXTRA_ENV_KEYS` or should be
   moved to typed start-body/config inputs with explicit clearing semantics.
4. Generate the complete matrix for all projected keys, including per-claims
   injectors, policy, context-budget, remote-harness, and identity fields.
5. Trace config overlay writers next; they are the durable side effects of many
   adapter-local env consumers.

