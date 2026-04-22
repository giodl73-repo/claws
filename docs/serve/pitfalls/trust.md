---
covers: [atom:SVC/trust-escalation]
---

# Pitfalls: trust escalation

The trust-escalation model produces a handful of common integration
bugs.

## P-01 · Retry-on-202 infinite loop

**Scenario**: Client calls `POST /snap/promote`. Gets 202 + handleId.
Client retries in 5 seconds without waiting for approval. Gets another
202 + DIFFERENT handleId. Retries in another 5 seconds. Now has 20
pending approvals and a very confused companion app.

**Consequence**: approval queue pollution; actual operations get
buried.

**Fix**: on 202, WAIT for the approval response (via SSE), don't
poll. If you must poll, poll `/approvals/{handleId}` for status,
NOT the original endpoint.

## P-02 · Token scope mismatch

**Scenario**: Client's token has `snap:read` but they call
`POST /snap/promote`. Gets 403. Client adds `snap:promote` to scope
in code locally... but doesn't actually have it granted.

**Consequence**: server returns 403 again with clearer message,
client is confused about who controls scope.

**Fix**: scope is granted by fleet admin, not claimed by client.
The token's fleet-side definition is authoritative. 403 errors
include the missing capability in the body — use that signal.

## P-03 · SSE reconnect without Last-Event-ID

**Scenario**: Client's network blips; SSE reconnects. Client didn't
pass `Last-Event-ID` header. Missed events are lost.

**Fix**: track the last-seen event ID client-side. Pass it on
reconnect. The server replays the gap.

## P-04 · Bearer token in logs

**Scenario**: Integration logs every request including the
`Authorization` header for debugging.

**Consequence**: bearer tokens in log files. Anyone with log access
has unbounded access to claws.

**Fix**: REDACT `Authorization` headers in logs unconditionally.
claws-serve itself redacts them in its access log.

## P-05 · Trust escalation assumed to be session-wide

**Scenario**: Client completes one approval for a promote. Five
minutes later calls promote again, expecting the prior approval to
"carry over".

**Consequence**: 202 again; approval is per-operation, not per-session.

**Fix**: trust escalation is scoped to a single `ApprovalHandle`.
Each `/snap/promote` call needs its own approval. The UX layer can
batch-approve multiple pending requests, but each handle gets its
own `approve/deny` response.

## P-06 · Fleet reload during mid-flight request

**Scenario**: Client starts a long-running
`POST /audit/export`. Mid-request, `POST /fleet/reload` fires and
replaces the trust set. The original request's bearer token is no
longer in the new trust set.

**Consequence**: the export operation FAILS mid-stream with 401.
Partial export is discarded.

**Fix**: fleet reloads are ATOMIC but don't invalidate in-flight
authorizations. The original request completes against the original
trust set. This is intentional — we don't rug-pull long-running
ops. The NEXT request uses the new trust set.
