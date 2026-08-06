# Reverse-Carrier Generation Authority Audit

Date: 2026-07-28  
Decision: `BLOCK RUNTIME PEER`; bundle-generation prerequisite complete  
Reviewed tips: OpenClaw O14 `c3a2cd79ea45`; Lobster PR 58 `86edeaafc859`; OpenClaw fork PR 183 `c6ce310f1ab`

## Frame

The next proposed slice was a Lobster runtime peer that connects the selected
reverse carrier to a real OpenClaw Gateway endpoint. The slice is safe only if
the deployment can supply authoritative `ownerGeneration` and
`hostBundleGeneration` values and the Gateway owns an endpoint that admits the
same authority.

The invariant is:

```text
one committed bundle snapshot + one owner-prepared binding generation
  -> one admitted carrier session
  -> stale sessions and operations fail closed
```

Protocol versions, bundle SemVer, fixture labels, process restarts, and carrier
reconnect counters must not stand in for either semantic generation.

## Source Audit

### Lobster

- `ReverseCarrierDeploymentConfig` accepts a complete
  `HostProviderDeclaration`; deployment selection validates and copies its two
  generation strings but does not produce them.
- `HostProviderCredentialAuthority` signs that supplied declaration, while
  `HostProviderLifecycle` reconnects with it. This is correct consumer
  behavior, not an authority source.
- `UserConfigProvider` has a private process-local `AtomicU64` cache
  invalidation counter. It starts at zero, advances on ECS change/override
  notifications, and distinguishes fresh from stale cached reads. It is not an
  externally stable effective-config identity and does not identify a
  particular owner binding or bundle snapshot.
- The deployment fixtures use values such as `owner-7` and `bundle-4`. They
  prove validation and fencing only.

### OpenClaw

- O4's host-bundle registry returns enabled, non-failed manifest declarations.
  A declaration contains bundle `id`, exact SemVer `version`, and
  contributions, but the committed registry snapshot has no generation.
- O6's provider dispatcher registration owns a binding and a
  `trafficPolicyGeneration`. That value fences policy selection; it is not a
  generation for the complete owner-prepared binding.
- O12/O13 require caller-supplied `ownerGeneration` and
  `hostBundleGeneration`, compare them during admission and operation
  ownership, and correctly reject stale values. They do not mint either value.
- O14 is a public Plugin SDK facade over the carrier contracts. Its docs
  explicitly leave listener, credential verification, session admission, and
  socket lifecycle with a connection-owner plugin. There is no real Gateway
  WebSocket endpoint for a Lobster runtime peer to connect to yet.

## Internal Analogues

| Analogue                               | Decision                   | Reason                                                                                  |
| -------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| Lobster ECS cache generation           | `avoid` as wire authority  | Process-local invalidation evidence; not a stable selected-config identity.             |
| Dispatcher traffic-policy generation   | `reuse` only in its domain | Correctly fences one policy dependency; cannot identify the complete binding.           |
| O4 immutable bundle registration view  | `adapt`                    | It is the right state boundary, but needs an identity for the exact committed snapshot. |
| O12/O13 admission and operation fences | `reuse`                    | They already enforce the values once authoritative producers supply them.               |

## External Comparators

- [Envoy xDS](https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol.html)
  separates API/transport versions from `version_info`, which identifies the
  current resource configuration and is echoed by clients when accepting or
  rejecting updates. This supports a producer-owned applied-state identity.
- [Kubernetes pod generation](https://www.kubernetes.dev/resources/keps/5067/)
  advances when the desired Pod spec changes, rather than when unrelated
  metadata or transport activity changes. This supports owner-semantic
  generation rather than reconnect generation.
- [Azure App Configuration ETags](https://learn.microsoft.com/en-us/azure/azure-app-configuration/rest-api-headers)
  are opaque state tokens used for conditional operations. This supports
  preserving an owner-issued token rather than interpreting its format.

## Role Findings

### Lobster container owner

Starting a reconnecting peer without a real Gateway endpoint or authoritative
generation source would add boot ordering, recovery, and health behavior that
cannot become ready correctly. Keep normal startup inert until the endpoint
and its readiness contract exist.

### Fleet operator

Bundle SemVer and a process-local counter would allow different effective
registrations to appear identical across pods or identical registrations to
appear different after restart. Fleet status and rollback need opaque identities
from the systems that committed the selected states.

### Skeptical maintainer

The existing types make bad values non-empty, not authoritative. A runtime PR
using fixture literals, interface versions, or locally generated UUIDs would
look integrated while bypassing the stale-authority guarantee. No code slice
should claim real Gateway proof until the actual connection owner is present.

## Decision And Next Slices

Do not create Lobster PR 59 for the runtime peer yet. The smallest safe
fork-only prerequisite sequence is:

1. **Bundle registration identity — complete in fork PR 183** — OpenClaw exposes
   an opaque generation for each effective immutable bundle registration. It is
   content-addressed from loader-owned semantic identity, excludes machine-local
   paths and declaration order, and is not the bundle SemVer.
2. **Owner preparation generation** — the provider-request owner prepares one
   resolved binding against an effective config generation and bundle snapshot,
   then emits an opaque `ownerGeneration`. Policy generation remains a separate
   recorded dependency.
3. **Gateway connection owner** — a plugin-owned Gateway WebSocket endpoint
   verifies the short-lived credential, admits the declaration against the
   current two generations, and owns detach/drain/reconnect observability.
4. **Lobster runtime peer** — only then compose PR 58's selected issuer and
   declaration into `HostProviderLifecycle`, with off-by-default startup,
   loopback/private routing, readiness, shutdown, and a real Gateway proof.

G1 is [OpenClaw fork PR 183](https://github.com/giodl73-repo/openclaw/pull/183),
draft and fork-only at `c6ce310f1ab`, stacked directly on the refreshed O4
branch at `14bd05f5691`. Its exact-head review is clean and GitHub reports it
mergeable. The Real behavior proof check passed; only fork automation that
requires the unavailable GitHub App private key (label and auto-response) is
red. The next implementation slice is owner preparation generation; the
runtime-peer block remains in force.

## Deletion Gate

This prerequisite sequence is complete only when the runtime proof contains no
fixture generation strings and no hand-authored deployment generation values.
At that point the current synthetic WebSocket authority fixture can remain as a
conformance test, but it is no longer the integration proof.
