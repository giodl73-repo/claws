# SVC — Cap surfaces

**Sub-spec of**: [SV-serve.md](./SV-serve.md)

## Capability-scoped access

Every REST endpoint maps to one or more CAPABILITIES. Clients attach
a bearer token whose scope enumerates the capabilities they hold;
endpoints reject requests whose scope doesn't include the required
capability.

Capability vocabulary:

| Capability | Grants |
|------------|--------|
| `workspace:read` | `/workspace/*`, `/policy/*` GET |
| `workspace:write` | (unused — workspace is read-only via API) |
| `policy:run` | `POST /policy/validate`, `/policy/generate` |
| `snap:read` | `/snap/current`, `/snap/list`, `/snap/{id}`, `/snap/healthz`, `/snap/events` |
| `snap:promote` | `POST /snap/promote` |
| `snap:rollback` | `POST /snap/rollback` |
| `audit:read` | `/audit/chain`, `/audit/verify`, `/audit/events` |
| `audit:export` | `POST /audit/export` |
| `approval:sign` | `POST /approvals/{handleId}/respond` |
| `fleet:admin` | `POST /fleet/reload` |

## Trust escalation

Some capabilities escalate trust at request time. Example:
`snap:promote` requires both the bearer token scope AND a fresh
approval from an external approver:

```
Client ──(POST /snap/promote with Bearer X)──▶ serve
                                                │
                                         Scope check: X has snap:promote? yes
                                                │
                                         Trust check: is this
                                         request pre-approved?
                                                │
                                         If no → 202 Accepted +
                                                approval-required
                                                  (emits request on
                                                  /approvals/subscribe)
                                                │
                                         Companion approves ──▶ client retries
                                                │
                                         Scope + Trust both satisfied → promote
```

The trust-escalation model means possession of a bearer token is
necessary but NOT sufficient for the most sensitive operations. An
out-of-band approval is also required.

See [../pitfalls/trust.md](../pitfalls/trust.md) for the trust-escalation
failure modes.

## Token issuance

Tokens come from the fleet binding:

```json
{
  "fleetName": "acme",
  "capabilities": ["workspace:read", "policy:run", "audit:read"]
}
```

Each fleet binding enumerates the tokens it issues + their scope.
Fleet admins rotate tokens via fleet reloads; old tokens expire at
the same time as the fleet binding's `notAfter`.

## Default-deny

No endpoint has a "default allow" scope. Every endpoint requires at
least ONE scoped capability. `/healthz` is the only exception —
unauthenticated liveness probes are always allowed.
