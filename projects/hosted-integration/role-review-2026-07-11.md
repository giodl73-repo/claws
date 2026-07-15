# Host Provider Model Role Review

## Gateway Runtime Owner

**Finding:** Extending `OpenClawTransport` or Gateway into a universal reverse
service bus adds role handling, queues, credentials, and failure modes to the
Gateway event loop without proving that Gateway owns those capabilities.

**Required revision:** Keep `OpenClawTransport` request/event-only. Reuse
Gateway peer-invocation machinery only when a remote provider binding actually
uses the Gateway carrier, and isolate its queues from control traffic.

## Lobster Container Operator

**Finding:** One reverse connection can be operationally necessary, but one
connection does not justify one semantic protocol. Sidecar startup, health,
reconnect, generation rollover, and memory remain binding concerns.

**Required revision:** Lobster implements capability adapters and may multiplex
their remote bindings over one connection. Each adapter keeps independent
health, limits, compatibility, and deletion gates.

## Security Lens

**Finding:** A generic host-provider role with arbitrary methods creates a new
privilege aggregation point. Transparent host interception and explicit runtime
capability calls also have different audit and consent semantics.

**Required revision:** Permissions attach to named capability interfaces and
operations. Unknown interfaces fail closed. Secrets, egress, publication, and
ingress have separate redaction and subject rules. No provider gains operator
authority.

## Simplicity And Ecosystem Lens

**Finding:** The previous "one session carries all OpenClaw business" framing
duplicates ProxyPipe conceptually even if the wire schema is cleaner. It makes
hosting concerns visible to ordinary local users and plugin authors.

**Required revision:** Local bindings remain the default. Any shared carrier is
optional and removable. A provider interface must be useful without Lobster
and without a multiplexed bus before it qualifies for core.

## Blocking Contradictions Removed

- `OpenClawTransport` no longer serves both app clients and runtime host
  providers.
- ClawBus no longer owns Gateway, Channel, approval, lifecycle, continuity, or
  AgentHarness semantics.
- A physical multiplexed connection no longer implies one provider registry.
- ProxyPipe removal is measured per capability binding, not by replacing one
  central envelope with another.

## Proof Required

1. One existing OpenClaw capability interface has local and hosted bindings.
2. Both bindings pass the same semantic fixtures.
3. Hosted failure proves bounded unavailable, timeout, stale-generation, and
   overload behavior.
4. The Lobster adapter deletes a named ProxyPipe frame family and duplicated
   mechanics.
5. Gateway behavior and `OpenClawTransport` remain unchanged unless the chosen
   binding explicitly uses Gateway as its carrier.
