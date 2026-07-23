# Area 1 Deep Dive: Provider Traffic Governance

## Frame

### Problem

Hosted OpenClaw deployments need enterprise control over provider-bound
traffic: approved destinations, proxies, private-network access, TLS trust,
client certificates, tenant routing, and audit.

Lobster currently solves the strongest version by forwarding HTTP requests
through ProxyPipe to a host-side container proxy. That combines two different
responsibilities:

1. deciding whether and where a request may travel; and
2. physically executing and streaming the request.

The first is Area 1 traffic governance. The second is an Area 2 capability
provider.

### Thesis

Area 1 attaches compiled, declarative governance to OpenClaw's existing
provider-request policy and guarded-fetch pipeline. It may deny or narrow a
request and select an approved route profile. It does not inspect or rewrite
arbitrary request bodies and does not become the request dispatcher.

### Invariant

```text
OpenClaw semantic request and hard safety
  -> effective OpenClaw provider policy
  -> host governance intersection
  -> selected dispatch binding
  -> provider response interpreted by semantic owner
```

No later layer may widen an earlier layer's authority.

### V1 Boundaries

Include:

- destination and endpoint-class constraints;
- private-network policy;
- approved proxy and direct-route selection;
- TLS trust and client identity profiles;
- owner-declared header transformations;
- policy provenance and compiled generation;
- deny and route-decision audit;
- activation and readiness; and
- handoff to local or hosted dispatch.

Exclude:

- arbitrary body inspection;
- a synchronous global host callback for every request;
- silent URL or recipient rewriting;
- provider response interpretation;
- generic streamed HTTP transport; and
- replacement of OpenClaw SSRF, timeout, redirect, or secret handling.

### Deletion Target

Area 1 removes duplicated host policy selection, route ambiguity, and
uninspectable proxy configuration. It does not by itself delete ProxyPipe
`BeginRequest`, request chunks, response chunks, or cancellation. Those frames
belong to the Area 2 hosted dispatcher migration.

### Disproof

The new governance surface is unnecessary if managed configuration of the
existing `request.proxy`, `request.tls`, headers, and private-network fields
provides sufficient policy, provenance, activation, and fleet status.

It is wrongly layered if the host must parse provider payloads to enforce the
policy.

## Audit

### Existing OpenClaw pipeline

OpenClaw already resolves provider request behavior through one ordered path:

- provider defaults and discovered configuration;
- operator and model headers;
- authentication override;
- protected attribution headers;
- endpoint classification and capabilities;
- private-network permission;
- explicit or environment proxy;
- target and proxy TLS;
- secret sentinel substitution immediately before egress;
- SSRF and DNS-rebinding protection;
- redirect restrictions;
- request timeout;
- local provider service leasing;
- guarded fetch; and
- response stream normalization.

`resolveProviderRequestPolicyConfig()` produces the effective policy, headers,
auth, proxy, TLS, endpoint classification, and private-network decision.

`buildProviderRequestDispatcherPolicy()` compiles direct, environment-proxy,
or explicit-proxy TLS routing.

`buildGuardedModelFetch()` then:

1. materializes egress secrets;
2. derives the SSRF policy from the final target;
3. selects configured or environment proxy behavior;
4. starts any required local provider service;
5. executes `fetchWithSsrFGuard`;
6. enforces timeout and redirect safety; and
7. normalizes the provider response.

This is the correct insertion region. A host integration should contribute to
policy compilation before guarded fetch, not intercept the body afterward.

### Existing safety constraints

The current implementation already rejects:

- unresolved secret sentinels;
- insecure TLS verification overrides;
- runtime auth overrides that attempt to add proxy or TLS settings;
- caller replacement of protected attribution headers;
- unsafe private-network and metadata destinations; and
- unsafe cross-origin replay of request bodies.

Host governance must preserve these constraints.

### Lobster brokered egress

ProxyPipe tags 1-5 carry:

- request metadata;
- request body chunks;
- response metadata;
- response body chunks; and
- cancellation.

The Lobster runtime validates targets, injects trusted host context, selects
backend routing, and performs the HTTP request.

That path is not merely policy. It is an out-of-process
`ProviderRequestDispatcher`, so its transport and streaming semantics belong
to Area 2 and Area 4.

## Exact Governance Attachment

The owner-defined attachment is a **provider egress policy**.

### Descriptor

| Field              | Meaning                                                            |
| ------------------ | ------------------------------------------------------------------ |
| Stable ID          | `provider-egress.policy`                                           |
| Semantic owner     | Provider request policy/transport                                  |
| Match dimensions   | Provider, capability, transport, endpoint class, configured origin |
| Inputs             | Redacted request metadata and effective policy facts               |
| Outcomes           | Deny or select a route profile within the allowed destination      |
| Mutation authority | Explicit owner-declared route/header fields only                   |
| Evaluation mode    | Compiled local policy in V1                                        |
| Failure posture    | Fail closed when a required policy cannot evaluate                 |
| Status owner       | Hosted composition plus provider policy owner                      |

The attachment does not receive the request body, provider credential value,
or response body.

### Route Profile

A route profile may select:

- direct or named proxy route;
- allowed destination origins or endpoint classes;
- DNS and private-network posture;
- target TLS trust and server name;
- proxy TLS trust;
- client certificate reference;
- approved timeout ceiling;
- dispatch binding ID; and
- owner-declared routing headers.

It cannot:

- change the semantic provider or model;
- redirect to an origin outside the already-authorized destination set;
- weaken TLS or SSRF checks;
- increase a timeout beyond the owner/operator maximum;
- inject arbitrary provider feature flags;
- replace protected attribution; or
- expose secret values to policy evaluation or status.

### Decision

The compiled decision is:

```text
allow(routeProfile, constraints, policyGeneration)
deny(reason, policyGeneration)
```

There is no generic `mutate(request)` result.

## Authority And Precedence

The effective request is an intersection:

1. **Core hard safety** defines non-overridable restrictions.
2. **Provider owner** defines protocol semantics, endpoint classification, and
   permitted transformations.
3. **Effective OpenClaw configuration** selects the desired provider endpoint,
   auth, proxy, and TLS within those constraints.
4. **Host governance** may deny, narrow destinations, reduce timeout, or
   select an approved physical route.
5. **Dispatch binding** executes exactly the resulting request.

An operator-managed base URL change is visible effective configuration, not a
runtime governance rewrite. It must carry configuration provenance and pass
the same owner validation.

Multiple host policies combine by intersection or explicit conflict. They do
not union permissions. If two required policies select incompatible routes,
activation fails rather than silently choosing by order.

## Header Rules

Headers are not uniformly transport metadata. Some alter provider semantics.

V1 therefore separates:

- **auth headers**, owned by provider auth/configuration;
- **protected attribution headers**, owned by OpenClaw;
- **routing headers**, allowed only when the provider owner declares them;
- **proxy authentication**, owned by the route profile; and
- **arbitrary provider headers**, ordinary visible configuration rather than
  hidden host mutation.

The host governance attachment may select values or secret references for
declared routing/proxy fields. It may not inspect or overwrite arbitrary
headers after OpenClaw resolves them.

## Evaluation Model

### V1: Compiled Local Decisions

Policy is validated and compiled during composition activation. Request-time
evaluation is a bounded local lookup over redacted metadata.

Benefits:

- no request-body disclosure;
- no synchronous network dependency;
- deterministic generation;
- cheap hot path;
- inspectable effective policy; and
- predictable failure.

### Future: External Decision Service

A remote authorization service may be useful for highly dynamic fleet policy,
but it is not V1. If added, it needs:

- strict timeout;
- explicit fail-open or fail-closed posture, defaulting closed;
- bounded redacted inputs;
- decision ID and policy revision;
- caching semantics;
- overload behavior; and
- proof that managed policy bundles cannot meet the need more simply.

It must still return deny or a bounded route selection, never an arbitrary
request mutation.

## Dispatch Handoff

After governance, composition selects one dispatcher:

```text
local guarded fetch
hosted ProviderRequestDispatcher
sidecar proxy
platform egress gateway
```

All dispatchers receive the same prepared request contract and must preserve:

- final target and method;
- headers after owner/governance resolution;
- body and stream bytes;
- timeout and cancellation;
- policy and request correlation;
- generation fencing; and
- typed transport failures.

If the host merely operates a standard HTTP proxy or service-mesh egress
gateway, existing proxy/TLS configuration may be enough; no Area 2 hosted
provider is needed.

If the host must receive the request as an application service, inject
host-only credentials, or stream through a reverse connection, that is an
Area 2 provider.

## Lifecycle And Status

The prepared governance binding carries:

- attachment ID;
- match scope;
- required or optional posture;
- policy source and revision;
- provider-request owner generation;
- host bundle generation where the policy implementation is host-supplied;
- compiled-policy digest;
- selected route profiles;
- referenced secret and certificate readiness;
- dispatch binding references;
- last activation result; and
- reload disposition.

Status conditions:

```text
Accepted
ResolvedRefs
Compiled
Programmed
Ready
Degraded
```

- `Accepted`: schema and owner constraints are valid.
- `ResolvedRefs`: proxy, certificate, secret, and dispatcher references exist.
- `Compiled`: policy has one deterministic effective generation.
- `Programmed`: selected route and dispatcher are activated.
- `Ready`: required routes can dispatch.
- `Degraded`: an optional route or dependency is impaired.

Request audit records should include:

- provider and capability;
- redacted target class/origin;
- allow or deny;
- selected route profile;
- policy generation and decision reason;
- dispatch binding ID; and
- transport outcome class.

They must not contain provider secrets or unrestricted payload bodies.

## Failure Semantics

| Failure                          | Outcome                                               |
| -------------------------------- | ----------------------------------------------------- |
| Invalid or conflicting policy    | Activation fails                                      |
| Missing required route reference | Non-ready                                             |
| Required policy unavailable      | Deny                                                  |
| Destination outside owner policy | Deny before dispatch                                  |
| Private-network widening attempt | Reject configuration                                  |
| Insecure TLS request             | Reject configuration                                  |
| Proxy unavailable                | Typed dispatch failure                                |
| Stale policy generation          | Reject or retry under current generation              |
| Hosted dispatcher disconnected   | Required route non-ready; no silent direct fallback   |
| Optional route unavailable       | Degraded if another explicitly permitted route exists |

Fallback from governed to direct egress is never implicit. It must be an
explicit route in the effective policy.

## Compare

### Internal analogues

| Analogue                                  | Classification | Lesson                                            |
| ----------------------------------------- | -------------- | ------------------------------------------------- |
| Provider request config and guarded fetch | Reuse          | Existing owner and insertion point                |
| SecretRef resolution                      | Reuse          | Resolve secret references without exposing values |
| Config reload planning                    | Adapt          | Owner declares activation and restart effect      |
| Channel route attachment                  | Adapt          | Share status/provenance, not payload API          |
| Global request middleware                 | Avoid          | Hidden order and mutation obscure authority       |

### External comparators

| Comparator                    | Reuse                                                                  | Avoid                                                           |
| ----------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| Istio egress gateway          | Explicit external destinations, route profiles, TLS origination, audit | Requiring a sidecar or gateway for local OpenClaw               |
| Envoy external authorization  | Explicit fail-open/closed and per-route policy                         | Synchronous remote checks as the default                        |
| OPA bundles and decision logs | Versioned policy, local evaluation, decision provenance                | Sending unrestricted provider bodies to policy                  |
| Kubernetes NetworkPolicy      | Default-deny posture                                                   | Additive union semantics that allow one policy to widen another |

## Role Evaluation

### Runtime owner

Reuse the existing policy/fetch pipeline. Do not add a second HTTP stack or a
generic interception callback.

### Host operator

Expose the effective route, policy generation, references, and readiness in
one composition inventory. Standard proxy and service-mesh configurations
should remain first-class solutions.

### Security

Host policy may only narrow. Conflicts fail activation. Secret values and
provider bodies are not policy inputs. Required policy failure is fail-closed.

### Simplicity

First prove that managed configuration plus route profiles cover the common
case. Add a new policy engine or external decision service only with a concrete
need.

### Fleet operation

Policy digest, source provenance, selected route, dispatch binding, and
transition reason are required for drift diagnosis.

## Conclusion

Area 1 provider traffic governance is not the ProxyPipe HTTP protocol.

```text
Area 1: may this request travel, and over which approved route?
Area 2: which provider executes the prepared request?
Area 4: how does a remote provider carry bytes and cancellation?
```

This boundary preserves OpenClaw's existing safety pipeline and prevents a
host dispatcher from becoming the policy authority merely because it owns the
network connection.
