# C2: OpenClaw Reverse-Session Endpoint

## Outcome

Admit least-privilege host dispatcher peers and schedule provider streams
without affecting operator Gateway traffic.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: C1 and B5

## Change

- Reuse challenge, identity, limits, correlation, and peer machinery where
  practical.
- Add a distinct host-provider role, grants, queues, and scheduler.
- Admit only registered dispatcher bindings and compatible versions.
- Reject stale owner or bundle generations.
- Support explicit binding revocation and fleet disable.
- Publish endpoint and carrier readiness/status.

## Non-Goals

- Hosts are not nodes or operators.
- No changes to existing `node.invoke` wire behavior.

## Proof And Exit

- Least-privilege admission and denied-surface tests pass.
- Large provider streams do not delay control-plane requests.
- Event-loop latency, queue, memory, drain, and shutdown budgets are measured.
- Cancellation covers admission, queued work, and active stream waits.
- Disconnect and reconnect create explicit carrier incarnations without replay.

## Implementation Status

- Status: published as fork-only draft
- PR: https://github.com/giodl73-repo/openclaw/pull/49
- Branch: `user/giodl/hosted-integration-c2-reverse-endpoint`
- Head: `e8ab72556c4`
- Base: C1 head `b5554acab29`
- Proof:
  - 63 focused Gateway tests;
  - 66 protocol/hosting tests;
  - 8 Doctor tests;
  - core TypeScript, focused formatting/lint, diff, and file-mode checks.
- Review:
  - trusted production issuance derives authority from registered bundle and
    owner evidence;
  - bundle or owner generation changes revoke connected sessions and settle
    active operations;
  - only core descriptors may claim the host-provider scope;
  - final direct `codex review --uncommitted` reported no actionable findings.

## FACES Implementation Frame

### Thesis

A distinct `host-provider` Gateway role can admit exactly one registered
provider-request dispatcher binding and carry C1 frames without granting
operator or node authority or delaying Gateway control traffic.

The thesis is disproved if admission requires device/node pairing, if the peer
can call or receive unrelated Gateway surfaces, if provider frames share an
unbounded queue with control traffic, or if reconnect can replay an operation.

### Selected Slice

- Add `provider-request-dispatcher` as the third B5 contribution type.
- Add one explicit host-provider connect declaration and a short-lived
  capability token bound to:
  - the current Gateway process audience;
  - peer public-key identity;
  - dispatcher ID and interface/carrier versions;
  - owner and bundle generations;
  - issue/expiry times and a credential ID.
- Reuse the existing nonce-bound device signature as proof of possession. Its
  canonical payload already commits to role and token; host-provider admission
  bypasses pairing only after the token, signature, public key, and declaration
  agree.
- Add a purpose-scoped registry rather than refactoring `NodeRegistry` in the
  same PR. C1 streaming state differs materially from unary node invocation;
  extract shared mechanics later only if both implementations prove a stable
  common core.
- Use one dedicated host-provider WebSocket connection on the existing Gateway
  listener. Provider frames use a separate bounded queue and one-frame-per-turn
  scheduling, so socket buffering and queue pressure are isolated from operator
  connections.
- Use one host-provider-only inbound method and outbound event. The role is
  denied every operator/node method and every unrelated broadcast event.
- Admission and connection lifecycle enforce binding/generation/incarnation.
  C1 validates frame-level fencing and stream state within the admitted
  session.
- Generation supersession immediately fails old operations at their observed
  certainty. No pending operation transfers to the new incarnation.

### Deferred

- No provider fetch-path activation.
- No durable credential issuer or revocation store; V1 tokens are short-lived,
  process-audience-bound, and invalid after restart.
- No generic peer-invocation extraction.
- No generic host bus or additional host capability families.

### Required Evidence

- A host-provider peer cannot call operator or node methods and receives no
  unrelated broadcasts.
- A valid token from another audience, key, binding, version, or generation is
  rejected.
- One synthetic C1 operation completes over the registry.
- Queue saturation returns `overloaded` before dispatch.
- Disconnect after `dispatch-started` yields `connection-lost` with
  `started-unconfirmed`.
- A newer generation closes the old incarnation and never replays its work.
- Saturating the host-provider queue does not delay an operator `health`
  request beyond the focused test budget.
