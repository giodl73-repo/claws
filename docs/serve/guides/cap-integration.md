---
covers: [atom:SVC, atom:SVR/43-routes]
---

# Cap integration

Wiring claws-serve into a Cap-aware host — workspaces, skill
surfaces, and file ingest — so claws governance flows across
process boundaries.

## The 43-route surface

See [../specs/SVR-rest-api.md § 43-route surface](../specs/SVR-rest-api.md)
for the full endpoint list. Most integrations use only a subset:

- **Editor integrations**: `/workspace/*` + `/policy/*` + `/audit/events`
- **CI / SARIF**: `/policy/*` + `/audit/*`
- **Companion apps**: `/approvals/*` + `/snap/events`
- **Admin dashboards**: all groups

Pick the minimum scope your integration needs. Larger scopes mean
larger auth surface to defend.

## Wiring a new host

1. Stand up `claws-serve` behind a reverse proxy with TLS termination
2. Register your host with the fleet admin; receive a bearer token
   scoped to the capabilities you need
3. Probe `/healthz` and `/readyz` on startup; wait for readyz
4. Subscribe to the SSE streams your integration cares about
5. For commands that mutate state (promote, rollback), handle the
   trust-escalation flow (see below)

## Trust-escalation flow

When your integration calls a protected endpoint like
`/snap/promote`:

```ts
const res = await fetch("/snap/promote", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ snapshotId: "snap-xyz" }),
});

if (res.status === 202) {
  // approval required — get the handleId and subscribe
  const { handleId } = await res.json();
  const approvalStream = new EventSource("/approvals/subscribe");
  approvalStream.addEventListener("approval-response", (ev) => {
    const response = JSON.parse(ev.data);
    if (response.handleId === handleId && response.outcome === "approve") {
      // now retry the promote
    }
  });
}
```

See [../pitfalls/trust.md](../pitfalls/trust.md) for the common
integration bugs.

## Session cookies vs bearer tokens

Bearer tokens are stateless — the server validates signature +
scope on every request. Session cookies are stateful — the server
remembers a session. Prefer bearer tokens for machine-to-machine
integrations; sessions are for browser-based companion UIs.

## Cross-references

- [../specs/SVR-rest-api.md](../specs/SVR-rest-api.md) — full route surface
- [../specs/SVC-cap-surfaces.md](../specs/SVC-cap-surfaces.md) — capability vocabulary
- [../guides/session-model.md](./session-model.md) — session lifecycle details
