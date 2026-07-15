# Area 2: Provider-Request Dispatcher Contract

## Decision

Define the provider-request dispatcher as one bounded, redirect-disabled HTTP
exchange beneath OpenClaw's guarded-fetch loop.

```text
semantic owner selects a provider adapter
  -> adapter prepares URL/body/non-secret headers/response policy
  -> owner selects declared credential slot resolvers
  -> OpenClaw resolves local secrets and provider policy
  -> Area 1 traffic policy denies, narrows, or selects a route profile
  -> OpenClaw validates one logical hop and applies redirect/header rules
  -> selected dispatcher resolves and executes that hop
  -> OpenClaw receives response head/body
  -> OpenClaw handles redirect, provider response, or semantic retry
```

This is the smallest seam that lets a host physically execute a request without
making Lobster the owner of fetch, provider, retry, or response semantics.

## Source-Backed Seam

`buildGuardedModelFetch` currently:

- materializes OpenClaw secret sentinels before egress;
- derives provider request policy, timeout, proxy, and TLS behavior;
- calls `fetchWithSsrFGuard`; and
- normalizes provider responses and SDK streaming afterward.

`fetchWithSsrFGuard` currently:

- validates the URL and HTTPS requirement;
- derives policy for each redirect hop;
- performs hostname and private-network checks;
- resolves and pins DNS or selects an approved proxy;
- executes one request with `redirect: "manual"`;
- captures the exchange;
- rewrites methods and strips cross-origin headers before the next hop; and
- repeats until a non-redirect response.

The dispatcher seam belongs at the one-hop execution inside that loop. It must
not wrap `buildGuardedModelFetch` or replace the redirect loop.

The Lobster forwarding core is not the interface. It currently also owns
allowlisting, user approval, provider selection, credential injection, quota
and plan policy, selected retries, telemetry, and response transformations.
Those concerns remain outside the portable dispatcher.

Provider-specific preparation does not disappear. It becomes a typed
contribution registered by the Lobster bundle in the relevant semantic owner's
existing registry. The dispatcher receives the result; it does not invoke an
arbitrary preparation callback.

## Registration And Selection

The bundle contributes three independently owned implementation kinds:

```text
model-provider adapter
  id: lobster/capi
  owner: model/provider

credential slot resolver
  id: lobster/capi-token
  owner: provider request/auth

dispatcher
  id: lobster/egress
  owner: provider request
  interface: provider-request-dispatcher/v1
```

Owner config selects each typed ID. The `lobster-host` bundle registers their
implementations. Missing, disabled, duplicate, or incompatible registration
fails explicitly.

There is no universal provider-adapter registry. Model, Channel, web, and other
owners reuse or add their own typed contribution surfaces.

The provider adapter may:

- select a provider endpoint from owner configuration;
- rewrite provider-specific URL, query, body, and non-secret headers;
- declare credential slot IDs and their allowed origins; and
- interpret provider-specific response details after dispatch.

It may not perform physical network dispatch or bypass provider-request policy.

The credential slot resolver may materialize only the credential value for its
declared slot. It does not choose the destination, header name, or redirect
behavior.

The prepared binding resolves adapter, slot resolver, policy, and dispatcher
IDs once per owner configuration generation. Per-request work uses that
immutable binding rather than repeating registry discovery on the Gateway hot
path.

The local implementation remains the default and preserves current OpenClaw
guarded-fetch behavior. A proxy or service mesh remains preferable when it can
preserve those semantics without a hosted dispatcher.

The hosted implementation deliberately does not preserve Lobster's current
redirect behavior. Lobster's default `reqwest` client can follow redirects
inside the host after only the initial target passed the product hostname
allowlist. V1 disables that behavior so every redirect target returns to the
OpenClaw guard loop before another dispatch.

## One-Hop Request

Each operation contains:

```text
operationId
bindingId
ownerGeneration
hostBundleGeneration
deadline
method
logicalUrl
headers
credentialSlotRefs
bodyStream
requestByteLimit
responseByteLimit
routeProfile
networkGuardProfile
auditCorrelation
```

Rules:

- `logicalUrl` is the exact current redirect hop.
- Automatic redirects are disabled in every dispatcher implementation.
- Headers are the post-policy, post-redirect-rewrite headers for this hop.
- The body is a bounded stream, even when a local implementation can optimize a
  small body as one chunk.
- The dispatcher cannot change method, URL, headers, route profile, deadline,
  or limits except to materialize declared credential slots.
- Unknown fields required by a newer interface version fail closed.

## DNS And SSRF Enforcement

OpenClaw owns the network guard policy. The dispatcher enforces it at the point
where physical DNS resolution and connection occur.

`networkGuardProfile` is a versioned, fixed-shape policy derived from the
current OpenClaw SSRF rules. It carries only the constraints needed for this
hop, such as:

- required scheme;
- authorized logical hostname/origin;
- hostname allowlist decision;
- private, loopback, link-local, and reserved-address posture;
- route-profile restrictions; and
- DNS rebinding and address-selection requirements.

It is not an arbitrary host callback or executable policy.

The local dispatcher applies the profile through OpenClaw's existing pinned-DNS
path. A hosted dispatcher resolves in the host network and must apply the same
address-class and rebinding rules before connecting. This is necessary because
OpenClaw-side DNS cannot prove the address selected inside a host-only network.

Private access is not a global boolean. The effective profile may contain
binding-authorized private origins or CIDRs for a named host route. The same
profile input must produce the same allow/deny decision in local and hosted
conformance, but different bindings may intentionally receive different
profiles. A local binding may therefore deny an address that a managed hosted
binding is explicitly authorized to reach.

Host-side address-class and DNS-rebinding enforcement is net-new relative to
the current Lobster hostname-only allowlist. It is a deletion prerequisite, not
behavior already supplied by ProxyPipe.

The dispatcher returns redacted resolution/audit facts for status and
conformance. It never returns those facts as provider response headers.

Redirect responses return unchanged as ordinary HTTP responses. OpenClaw
validates the next URL, rewrites the method/body, strips or restores protected
headers under existing rules, derives a new guard profile, and dispatches the
next hop.

## Credential Slots

V1 supports two credential paths:

1. **OpenClaw-materialized credentials** are already present in protected
   headers. The host observes them because it executes the request, but cannot
   reinterpret or reuse them.
2. **Host-materialized credentials** use a named slot declared by provider
   configuration and supported by the selected dispatcher binding.

A credential slot fixes:

```text
slotId
placement: header
headerName
allowedOrigins
required
```

The request carries only `slotId`; it does not let the caller choose a header
name or arbitrary mutation. The host may populate exactly that header for an
allowed origin. It cannot override an existing protected header, add
undeclared credentials, or retain a credential across redirect hops.

The slot is usable only when adapter declaration, owner configuration, resolver
registration, allowed origins/header, and traffic policy all agree. Adapter
provenance and resolver provenance are retained in status and audit.

Credential acquisition failure is `unavailable` with dispatch certainty
`not-started`; operator status may identify a redacted
`credential-unavailable` cause.

Query-string and body credential slots are out of scope for V1.

Before tags 1-5 can be deleted, the migration inventory must enumerate every
brokered provider credential shape. Credentials requiring values in multiple
headers, computed request signing, query parameters, or body injection are
outside the single-header V1 slot until their semantic owner defines an
explicit contract.

Non-secret provider headers, URL/query rewrites, body transformations, and
response transformations belong to the provider adapter. CAPI and Substrate
therefore do not require the dispatcher to support arbitrary mutation: their
adapters prepare those semantics, while a single bearer slot can remain a
credential resolver.

## Response

A successful dispatcher operation returns:

```text
status
statusText
headers
bodyStream
```

Any HTTP status, including `3xx`, `4xx`, and `5xx`, is a successful dispatch
response. OpenClaw interprets it.

Response headers and body are bounded. Limit violations terminate the stream
with `response-limit-exceeded`; they never produce a truncated successful
response.

## Dispatch Failures And Certainty

Portable failures:

- `denied`;
- `unavailable`;
- `overloaded`;
- `stale-generation`;
- `timeout`;
- `cancelled`;
- `not-started`;
- `started-unconfirmed`;
- `response-limit-exceeded`;
- `protocol-violation`; and
- `connection-lost`.

Every transport failure includes one certainty state:

- `not-started`: no provider dispatch began;
- `started-unconfirmed`: dispatch may have reached the provider;
- `response-started`: response headers or body were observed; or
- `completed`: the response stream ended successfully.

The semantic owner decides whether retry is safe. Neither the dispatcher nor
carrier automatically replays after reconnect.

Cancellation is advisory. It requests prompt resource release but does not
prove provider-side work stopped. Certainty state remains authoritative.

## Streaming And Bounds

Streaming is part of V1 rather than a later threshold-based extension.

Required behavior:

- bounded request and response chunks;
- per-operation and connection credit;
- maximum concurrent operations;
- request and response half-close;
- one terminal outcome;
- deadline and idle-timeout enforcement;
- prompt cancellation propagation;
- no reconnect replay or resume; and
- independent scheduling from Gateway control traffic.

This removes ProxyPipe's current need to buffer up to 100 MiB and commonly send
the rewritten request body as one gRPC message.

Request bodies also declare whether they are replayable. A one-shot stream
cannot be replayed for a body-preserving `307` or `308` redirect. OpenClaw must
reject that redirect as non-replayable unless request preparation supplied a
bounded re-materializable source. V1 does not silently buffer an unbounded
stream to make redirects replayable.

The streaming benefit is therefore:

- response streaming for all responses;
- request streaming for non-replayed hops; and
- bounded replay only when the semantic owner already supplied a replayable
  body source.

## Readiness And Status

`provider.request.policy` reports successful policy compilation.

`provider.request.dispatcher` reports that the configured implementation is
registered, compatible, authenticated where remote, current for both
generations, and operationally capable of accepting work. Current free
capacity is not a readiness predicate; saturation reports `Degraded` and
returns `overloaded`.

Work admission requires both conditions when the selected Hosting Profile marks
them required.

Status includes dispatcher ID, interface version, binding type, owner
generation, host bundle generation, carrier incarnation, resolution mode,
credential slot IDs, limits, queue pressure, in-flight count, last transition,
and redacted failure.

Adapter, resolver, and dispatcher interface versions are reported separately.
Owner readiness verifies their compatibility without acquiring a live
per-request token merely to prove readiness.

## Evidence Fixture

Use one provider-neutral HTTPS fixture with a redirecting endpoint and a final
streaming endpoint.

Run the same cases against the local and hosted dispatchers:

1. accepted request with a two-chunk body and two-chunk response;
2. first-hop destination denial that never invokes the dispatcher;
3. hosted `3xx` returned unfollowed to OpenClaw;
4. redirect to a private address denied under the same restrictive guard
   profile before a second dispatch;
5. allowlisted hostname resolving to loopback/private space denied at hosted
   connect time;
6. a host-only private origin accepted only under an explicitly authorized
   managed-route profile;
7. cross-origin redirect proving credential/header stripping;
8. declared host credential slot injected only at its allowed origin;
9. undeclared slot rejected before send;
10. overload rejected with `not-started`;
11. disconnect after send reported as `started-unconfirmed`;
12. cancellation after send preserving uncertain dispatch state;
13. stale owner or host bundle generation rejected;
14. one-shot body rejected on a body-preserving redirect; and
15. response-limit violation without truncated success.

Equivalent proof means the local and hosted paths produce the same decision for
the same guard profile and the same HTTP response semantics,
protected-header behavior, and portable failure/certainty classes. It does not
require differently authorized bindings to reach the same destinations.

## ProxyPipe Deletion Gate

After conformance and mixed-version expiry, delete:

- `BeginRequest` tag 1;
- `RequestChunk` tag 2;
- `BeginResponse` tag 3;
- `ResponseChunk` tag 4;
- `RequestCancelled` tag 5;
- pipe-local HTTP request ID allocation and inflight registries;
- pipe-local body channels and cancellation state;
- pipe-wide dispatcher permits and HTTP queue handling;
- 100 MiB single-message allowances introduced for buffered request bodies;
- bridge buffering introduced only to package requests onto ProxyPipe; and
- the pipe refresh compatibility path after credential renewal moves to its
  owning binding.

Do not delete Lobster product policy by moving it into the dispatcher. Approval,
quota, provider selection, product allowlists, and semantic telemetry require
separate owners or explicit retirement decisions.

The current forwarding core also buffers selected requests up to 10 MiB for
approval, provider routing, or body inspection. The migration inventory must
separate buffering required by surviving product semantics from buffering that
exists only because of ProxyPipe. Only the latter is part of this deletion
gate.

No implementation is authorized by this evidence contract.
