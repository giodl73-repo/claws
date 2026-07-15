# Host Integration Bundle

## Decision

A hosting platform registers one namespaced integration bundle with OpenClaw.
The bundle declares the Area 1 attachments, Area 2 capability providers, Area
4 carrier implementations, and readiness criteria it can supply.

Owner-specific OpenClaw configuration selects those registered implementations.
Hosting Profiles declares which resulting conditions are required. Status and
Doctor expose the assembled effective integration.

```text
central host integration bundle registration
  -> typed references from owner configs
  -> owner validation and activation
  -> owner readiness evidence
  -> Hosting Profile required criteria
  -> one effective status and Doctor view
```

This is the replacement for ProxyPipe's central semantic frame catalog.

Managed Configuration may authoritatively select the typed owner references
for a hosted deployment, but it does not define the bundle manifest or perform
owner activation. See `managed-configuration-alignment.md`.

## Central Registration

Illustrative manifest:

```jsonc
{
  "id": "lobster-host",
  "version": "1.0.0",
  "contracts": {
    "gatewayClients": [
      "lobster/approvals",
      "lobster/pairing",
      "lobster/administration"
    ],
    "channelEndpoints": [
      "lobster/teams"
    ],
    "trafficPolicies": [
      "lobster/enterprise-egress"
    ],
    "providerRequestDispatchers": [
      "lobster/egress"
    ],
    "modelProviderAdapters": [
      "lobster/anthropic-direct",
      "lobster/capi",
      "lobster/substrate-llmapi"
    ],
    "credentialSlotResolvers": [
      "lobster/anthropic-key",
      "lobster/capi-token",
      "lobster/substrate-token",
      "lobster/entra-obo",
      "lobster/agentic-user"
    ],
    "secretProviders": [
      "lobster/vault"
    ],
    "publicationProviders": [
      "lobster/workspace"
    ],
    "telemetryProviders": [
      "lobster/telemetry"
    ],
    "carriers": [
      "lobster/reverse-provider"
    ],
    "readinessCriteria": [
      "channel.msteams.endpoint",
      "provider.request.policy",
      "model.provider.capi",
      "provider.request.credentials.capi",
      "provider.request.dispatcher",
      "secrets.lobster-vault",
      "publication.lobster-workspace",
      "telemetry.lobster"
    ]
  }
}
```

Names are illustrative. Every contract remains versioned and owned by its
OpenClaw subsystem.

The bundle may be an OpenClaw plugin package plus host-side implementation and
deployment metadata. Existing plugin registration should be reused; missing
contract types require additive registry contributions rather than a universal
host method registry.

Provider adapters register with their real semantic owner. CAPI and Substrate
belong in the model-provider owner surface; Teams outbound adaptation belongs
to the Channel owner; WebIQ belongs to its web/provider owner. The bundle does
not introduce one cross-owner `providerRequestAdapters` registry.

The bundle manifest is validated as one immutable registration snapshot before
any contribution becomes visible. This prevents a version-skewed bundle from
publishing only half its declared IDs. Runtime activation and readiness remain
owner-local and are not one global transaction.

## Distributed Selection

Detailed settings remain in their semantic owners:

```jsonc
{
  "channels": {
    "msteams": {
      "endpoint": "lobster/teams"
    }
  },
  "providerRequests": {
    "trafficPolicy": "lobster/enterprise-egress",
    "dispatcher": "lobster/egress"
  },
  "models": {
    "providers": {
      "capi": {
        "requestAdapter": "lobster/capi",
        "credentials": {
          "primary": "lobster/capi-token"
        }
      }
    }
  },
  "secrets": {
    "provider": "lobster/vault"
  },
  "hosting": {
    "profile": "lobster/managed"
  }
}
```

The distributed fields are typed references, not repeated Lobster
implementation definitions.

Names and config shapes are illustrative. The important assembly is:

```text
semantic owner selects adapter from its own registry
  -> adapter prepares URL/body/non-secret headers/response policy
  -> owner selects credential slot resolver
  -> provider request applies traffic and network policy
  -> dispatcher executes the prepared hop
  -> semantic owner interprets the response
```

For example, `lobster/capi` owns CAPI-specific request and response adaptation,
`lobster/capi-token` supplies the declared bearer slot, and `lobster/egress`
only performs physical dispatch. All three are available from the same bundle
without becoming one interface.

Each owner publishes its own readiness evidence. A model-provider condition can
therefore report that its adapter and credential resolver compose correctly,
while provider-request dispatcher readiness reports only physical dispatch.

The effective credential grant is the intersection of:

```text
adapter-declared slot
  intersect owner configuration
  intersect resolver-declared header and origins
  intersect traffic and network policy
```

An adapter cannot obtain a credential merely by naming a slot.

This preserves owner boundaries:

- the Teams Channel owns Teams semantics;
- model/provider owners own provider-specific request and response adaptation;
- provider request owns traffic policy, credential-slot application, and
  physical dispatch;
- secrets owns secret references and failures;
- continuity owns publication semantics;
- telemetry owns export semantics; and
- Gateway owns approvals and administration.

Lobster supplies implementations of those contracts. It does not become their
semantic owner.

## Hosting Profile

The namespaced profile declares the deployment contract:

```jsonc
{
  "hosting": {
    "profile": "lobster/managed",
    "profiles": {
      "lobster/managed": {
        "extends": "reverse-proxy",
        "requiredCriteria": [
          "channel.msteams.endpoint",
          "provider.request.policy",
          "provider.request.dispatcher"
        ],
        "advisoryCriteria": [
          "telemetry.lobster"
        ]
      }
    }
  }
}
```

The profile does not configure implementations. It makes selected outcomes
required or advisory.

## Effective Inventory

OpenClaw status should answer:

- which integration bundle and version are active;
- which contracts it registered;
- which owner configs reference each contract;
- desired versus resolved implementation;
- interface and carrier versions;
- readiness condition and reason;
- generation and connection incarnation where applicable;
- configuration, credential, and policy provenance;
- required versus advisory posture; and
- migration authority.

Doctor should report:

- unresolved or ambiguous references;
- disabled or failed bundle registration;
- incompatible interface versions;
- missing credentials or carrier registration;
- configuration references to unregistered contracts;
- required criteria that cannot be evaluated; and
- obsolete compatibility paths still enabled.

## Failure Rules

- A config reference to an unregistered implementation fails explicitly.
- Unknown bundle contracts or interface versions fail closed.
- A bundle manifest is rejected before publication when required contributions
  are duplicate, unsupported, or version-incompatible.
- Bundle registration cannot widen owner policy or permissions.
- A Hosting Profile requirement cannot make an unavailable binding healthy.
- No implicit fallback may replace a governed Lobster binding with a direct,
  less-governed implementation.
- Disabling the bundle makes every referenced binding unavailable with
  structured status and Doctor findings.

## Why This Is Not A Bus

The bundle centralizes declaration and packaging, not invocation semantics.

Its implementations may use:

- Gateway clients;
- Channel endpoints;
- proxies or service meshes;
- direct provider APIs;
- local process/file bindings; or
- the narrow provider-dispatch reverse carrier.

They may share deployment bootstrap or a physical carrier where justified, but
they keep independent schemas, authority, queues, readiness, and failures.

## V1 Boundary

V1 proves the bundle with:

1. `lobster/teams` Channel endpoint attachment;
2. `lobster/enterprise-egress` traffic policy;
3. one provider adapter and credential-slot resolver pair;
4. `lobster/egress` provider-request dispatcher;
5. `lobster/managed` Hosting Profile criteria; and
6. one effective status/Doctor inventory.

Approvals use canonical Gateway clients and may be listed in the bundle for
packaging and status without becoming a reverse capability provider.

No implementation is authorized by this design.
