# Gateway restore status role review

## Proposal

Add one read-only `gateway.restore.status({ restoreOperationId })` Gateway
Protocol method that projects the existing restored-admission startup binding
and durable ready record. The closed success union is `not-restored`, `held`,
or `ready`. There is no caller-controlled admission method.

## Gateway owner lens

Accepted with constraints:

- Reuse the existing Gateway Protocol schema, descriptor, handler, admission,
  and Admin HTTP RPC patterns from `gateway.suspend.status`.
- Keep the method `operator.read`, side-effect free, and outside control-plane
  write rate limiting.
- Do not read or hash SQLite synchronously on every poll. Retain the validated
  projection in memory and transition to `ready` only after durable commit.
- Do not add `restoring` or `quarantined` live phases; those outcomes occur
  before a live Gateway is available.

## Lobster/container operator lens

Accepted with constraints:

- The fresh destination needs an authenticated pre-admission observation path.
  Reuse the existing Admin HTTP RPC route on host-controlled loopback.
- `/readyz` is only a backoff hint; retained delivery waits for the exact
  operation- and generation-matched `ready` result.
- Do not add a sidecar, public listener, new token scheme, or second health
  service.

## Security and simplicity lens

Accepted with constraints:

- Mismatched operations fail without disclosing the active operation's
  identities.
- Results contain bounded identities only, with no paths, credentials,
  payloads, prompts, or arbitrary diagnostics.
- `not-restored` is not success for a host restore attempt.
- The host cannot supply readiness or invoke `gateway.restore.admit`.

## Remaining owner decision

The proposed method is a new public Gateway Protocol surface and requires
Peter (`@steipete`) to confirm its name and exact schema before implementation.
The RFC now recommends this method rather than presenting it as one equal
alternative among several.
