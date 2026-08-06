# Reverse-carrier connection-owner FACES review — 2026-07-27

## Frame

Thesis: OpenClaw already has the correct connection-owner surface for the
reverse carrier: an external plugin can register a plugin-authenticated
WebSocket upgrade route and own the accepted socket lifetime. O14 should only
make the generic O11–O13 frame, session-admission, and operation-ownership
contracts importable through one narrow Plugin SDK subpath.

Deletion target: remove the proposed Gateway `host-provider` role, process
token issuer, core WebSocket registry, send queue, timers, reconnect manager,
and provider-specific endpoint from O14. Authentication format, proof of
possession, remote client lifecycle, and socket scheduling remain with the
connection-owning plugin and its host runtime.

Disproof: if the public plugin route cannot own WebSocket upgrades, if it
cannot perform plugin-managed authentication before O12 admission, or if an
external plugin cannot consume O11–O13 without importing core internals, the
SDK-only slice is insufficient.

## Audit

- `api.registerHttpRoute(...)` already accepts `handleUpgrade`, explicit
  `auth: "plugin"`, exact/prefix route ownership, lifecycle replacement, and
  Gateway work-admission fencing.
- After an upgrade handler accepts a socket, OpenClaw deliberately treats the
  socket lifetime as plugin-owned. Plugin-auth routes receive the raw request,
  socket, and upgrade head and do not inherit operator authority.
- Gateway bearer/password HTTP authentication proves only a shared Gateway
  secret. It does not supply O12's exact peer-key fingerprint, audience,
  credential ID, or expiry evidence and therefore must not be adapted into
  host-provider identity.
- O11–O13 are currently internal under `src/infra/net`. OpenClaw's plugin
  boundary prohibits external plugins from importing those files directly.
- `openclaw/plugin-sdk/ssrf-dispatcher` is the internal analogue: one narrow
  public subpath re-exports generic network primitives without adding a new
  registration system or runtime singleton.
- The archived C2 implementation at `e8ab72556c4` mixed 39 files of Gateway
  role/protocol, token issuance, sockets, queues, timers, readiness, Status,
  and Doctor. None is required for a plugin-owned upgrade route.

## Compare

| Candidate                                      | Decision                | Reason                                                                                                         |
| ---------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| New Gateway `host-provider` role               | Avoid                   | Reopens role, protocol, auth, broadcast, presence, queue, and compatibility surfaces for one optional carrier. |
| Gateway-authenticated plugin upgrade           | Avoid for peer identity | Existing auth can protect a route but does not prove the narrower O12 peer identity.                           |
| Plugin-authenticated upgrade route             | Reuse                   | The external plugin already owns route auth, upgrade acceptance, socket lifetime, and cleanup.                 |
| Narrow `reverse-provider-dispatch` SDK subpath | Add                     | It is the missing legal import boundary for the already-tested generic contracts.                              |
| Generic host bus or connection manager         | Avoid                   | It duplicates the plugin lifecycle and speculates beyond the one provider-dispatch carrier.                    |

RFC 6455 leaves application authentication and authorization outside the
WebSocket framing protocol. The installed `ws` dependency's `noServer` /
`handleUpgrade` path matches OpenClaw's existing plugin-upgrade ownership. No
new transport dependency is required.

## Evaluate

- Gateway runtime: no new role, protocol method, listener, singleton, queue,
  timer, or hot-path lookup. Existing route admission remains authoritative.
- Lobster container owner: use the existing external plugin plus the existing
  Lobster runtime client; add no sidecar, service, port, or reconnect authority
  to OpenClaw core.
- Security: `auth: "plugin"` means the owner must verify its bounded signed or
  proof-of-possession credential before constructing O12 verified-peer
  evidence. The SDK must not mint tokens or accept Gateway shared-secret auth
  as peer-key proof.
- Skeptical maintainer: expose one versioned subpath, document ownership and
  non-goals, and rely on the O11–O13 behavior suites plus SDK export/API gates.
  Do not add a wrapper class that merely renames the existing registries.

## Slice plan

1. Add `openclaw/plugin-sdk/reverse-provider-dispatch`.
2. Re-export the O11 frame validator and types, O12 admission registry and
   types, and O13 operation registry and types.
3. Add no token verifier, connection implementation, dispatcher wiring,
   readiness, Status, Doctor, config, or host-specific identifier.
4. Document that the plugin owns authentication and accepted socket lifetime,
   and that reconnect creates a new O12 incarnation with no operation replay.
5. Prove the public package surface through the SDK API/export gates and retain
   all focused O11–O13 behavior tests.

## Outcome

Implemented as fork-only OpenClaw draft
[#182](https://github.com/giodl73-repo/openclaw/pull/182) at
`c3a2cd79ea45`, stacked directly on O13 PR 181. The patch adds one public
`openclaw/plugin-sdk/reverse-provider-dispatch` facade, its generated package
export/API baseline, and connection-owner documentation. It adds no Gateway
role, listener, token issuer, socket manager, reconnect protocol, Status, or
Doctor surface.

Focused proof passed the SDK export and API-baseline checks, type-aware Oxlint,
diff hygiene, all 53 O11-O13 behavior tests, and mandatory autoreview with no
actionable findings. Broader remote gates could not start because Blacksmith
was unauthenticated and the configured Crabbox broker token returned HTTP 401;
no remote lease was created. Fork checks for Real behavior proof, actionlint,
no-tabs, and dispatch are green. Labeler and Auto response fail only because
the fork lacks the OpenClaw GitHub App private key. No upstream OpenClaw issue
or PR is authorized.
