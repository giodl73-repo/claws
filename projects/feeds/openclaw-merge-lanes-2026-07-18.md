# OpenClaw Feeds Merge Lanes

Last updated: 2026-07-18

## Terminology

- A ClawHub publisher is the stable identity for either a person or an
  organization, such as NVIDIA. The former "account feed" stack is therefore
  the publisher-feed stack.
- A publisher feed is not an arbitrary named feed. User-created named feeds
  remain a later product lane.
- ClawHub's social follow graph is not required for OpenClaw to follow a
  publisher feed. OpenClaw can persist a publisher subscription locally from
  the signed publisher-feed protocol.

## Shared Prerequisite: Signed Feed Activation

Merge before activating publisher or scalable catalog distribution:

1. RFC #39: corrected protocol inventory and scalable distribution contract.
2. OpenClaw #110037: standard DSSE envelope compatibility.
3. OpenClaw #108342: monotonic rollback handling across signing-key rotation.
4. ClawHub #3005: sign stored official catalog publications.
5. Provision the ClawHub private signing key and hand its public key/key ID to
   OpenClaw.
6. OpenClaw #101981: bundle and bind the default `clawhub-public` trust root.

RFC #39 role review was folded directly into the protocol sidecars at
`e4b78a5`. The resulting implementation audit required two follow-ups:
OpenClaw #101981 now requires the DSSE media type and uses ETag-only signed
conditionals at rebased head `1ed499b0f71`; OpenClaw #109461 now applies
bounded refresh backoff and jitter at restacked head `86dce1cd898`. Key
rotation PR #108342 now has durable SQLite proof at `6f45b915dc3`, and standard
DSSE PR #110037 has its strict test-type repair at `ffbb18bb9b3`. These PRs
were restacked onto current `main` on 2026-07-18 and GitHub reports them
mergeable when last queried. #101981 and #109461 remain draft pending their
prerequisites; #108342 and #110037 are ready and under automatic CI.

This is shared infrastructure, not a separate end-user product lane.

## Lane 1: Publisher Feeds

This is the first product lane to merge. It enables a publisher such as NVIDIA
to expose a signed feed and lets OpenClaw follow and refresh it.

### ClawHub producer

1. #2948: publisher identity, coherent snapshot, and base feed API.
2. #3116: durable revisions, query projection, and changed-since state.
3. #3117: signed snapshot, query, change, and reset routes.

Keep these as three PRs. Their incremental changes are substantial and their
review boundaries are useful: identity/snapshot, durable state, then signed
transport.

### OpenClaw consumer

1. #109305: complete CLI vertical through verified projection payloads,
   bounded signed transport/pagination, durable refresh and delta/reset,
   local follow persistence, and publisher search/follow/refresh commands.
2. #109461: combine gateway scheduling and RPCs from #109407 and #109461.
3. #109584: combine Control UI and signed-profile selection from #109518 and
   #109584.

Consolidation completed 2026-07-18: #109407 and #109518 are closed as separate
review stops; their contents remain in #109461 and #109584 respectively.
#109340, #109378, and #109397 are also closed after their transport, durable
refresh, and local-follow commits were folded into ready entry PR #109305.
The registered CLI is the first production consumer, so this is the smallest
independently landable unit under the repository dead-code gate.

The first useful stopping point is now one PR, #109305: signed publisher feeds
can be followed and refreshed from the CLI. Gateway automation and Control UI
remain a separate second publisher-feed wave.

## Lane 2: Large Catalog Distribution

Merge after the publisher-feed core is moving through review. This fixes
bounded-snapshot, pagination, changed-since, query, and large-catalog delivery
for the main ClawHub catalog.

1. #3149 is the combined schema and durable-history foundation; #3147 is
   closed as superseded.
2. #3160 is the combined signed change/query transport; #3151 is closed as
   superseded.
3. #3163: signed sharded full snapshots.
4. OpenClaw #110250: verify, fetch, persist, and recover sharded catalogs.

This reduces five ClawHub review stops to three without mixing the sharded
snapshot implementation into the query/change implementation.

## Lane 3: Local Watches

1. OpenClaw #110438: local signed item watches and update history.

Land after default signed trust is active, preferably after the sharded catalog
consumer. Shared SQLite schema v5 ownership requires explicit maintainer
acceptance. Keep the hosted inbox PR #3171 parked.

## Optional ClawHub Social Lane

This is virality and discovery UX, not a publisher-feed protocol dependency.

1. #2950: public publisher follow graph.
2. #2958 is the combined follow-controls and activity-timeline PR; #2957 is
   closed as superseded.
3. #2949 now combines publisher state and discovery labels; #2951 is closed as
   superseded.

Park #2953 until a concrete registry-export consumer exists. #2959 is closed;
raw feed links are not needed for the preferred
`openclaw publisher follow <handle>` experience.

## Future Lane: Named Feeds

Arbitrary named feeds, feed composition, sharing ACLs, and following a named
feed are not completed by the publisher-feed stack. Start this only after the
publisher identity/feed path is proven, reusing the same signed projection and
follow machinery where possible.

## Merge Priority

1. Complete signed-feed activation.
2. Merge publisher feeds through the CLI stopping point.
3. Merge large-catalog distribution.
4. Finish publisher gateway and Control UI.
5. Merge local watches.
6. Take ClawHub social discovery independently as Patrick has review capacity.
7. Start arbitrary named feeds only after the publisher path is deployed.
