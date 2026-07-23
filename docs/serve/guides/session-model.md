---
covers: [atom:SVC, atom:SVI]
---

# Session model

How clients establish and maintain sessions with claws-serve —
bearer tokens, mutual TLS, session cookies, and SSE reconnection.

## Three auth forms

### Bearer token (default)

Stateless. Token is issued by fleet admin, scoped to a set of
capabilities, signed by the fleet, carries `notBefore` + `notAfter`.
Every request:

```
Authorization: Bearer <token>
```

Server validates signature, checks expiry, checks scope against
the endpoint's required capabilities.

### Mutual TLS

For machine-to-machine where certificate management is already
in place. Client presents a cert; server validates against the
configured CA pool; subject's CN becomes the principal. Scope is
derived from the fleet binding's per-subject capability map.

### Session cookie

For browser UIs. `POST /auth/session` with a bearer token returns
a signed session cookie scoped to the origin. The cookie is
`Secure` + `HttpOnly` + `SameSite=Strict`. Subsequent requests
from the same origin use the cookie.

Session cookies expire at the earlier of: bearer token's
`notAfter`, or configured session TTL (default 1 hour).

## SSE subscriptions

`/snap/events`, `/audit/events`, `/approvals/subscribe`,
`/fleet/events` all stream via SSE. Client model:

```ts
const stream = new EventSource("/snap/events", {
  withCredentials: true, // send session cookie
});
stream.addEventListener("state-change", (ev) => {
  const data = JSON.parse(ev.data);
  // ...
});
```

## Reconnection

SSE automatically reconnects on network failure. Each subscription
has a buffered replay window (default 100 events) so clients
don't miss events during disconnection.

Use `Last-Event-ID` header to resume exactly where you left off:

```
GET /snap/events HTTP/1.1
Last-Event-ID: 42
```

Server replays events 43+ on reconnect. Client never sees a gap.

## Auth expiry mid-stream

If a bearer token expires while SSE is open, the server closes the
connection with `HTTP 401`. The client's `onerror` handler fires;
the client should re-auth and re-subscribe (preserving
`Last-Event-ID` for gap-free replay).

## Rate limiting

Per-subject rate limits apply across all endpoints (default 1000
requests per 60 seconds). `429 Too Many Requests` responses include
a `Retry-After` header.

SSE subscriptions don't count toward rate limits — they're
long-lived by design. Re-subscriptions after disconnection DO count,
so flapping clients that drop every few seconds can trigger rate
limits on reconnect.
