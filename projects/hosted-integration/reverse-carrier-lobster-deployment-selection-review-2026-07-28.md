# Lobster Reverse-Carrier Deployment Selection Review

Date: 2026-07-28

## Frame

Lobster fork PR 57 proves that an explicit selected plugin composition works,
but its test independently derives the plugin key from the deployment secret.
The smallest falsifiable thesis is that the Lobster deployment owner can make
one atomic decision that produces both the Rust credential issuer and the
credential-only plugin projection from one derived key, while the disabled
decision resolves nothing.

The broader deployment secret must remain outside the selection seam and the
plugin. Owner and bundle generations remain caller-supplied authority; this
slice must not invent values, activate a route, add an ECS flag, or change
container startup. The downstream deletion target is duplicate or divergent
credential-key derivation before any live carrier rollout.

The thesis is disproved if disabled selection invokes the key resolver, if the
issuer and plugin can receive different keys or authority, or if JavaScript
still needs the deployment secret.

## Audit

- PR 56's issuer derives its key internally from a broad secret.
- PR 57's plugin accepts only a pre-derived `Uint8Array`, which is the correct
  least-authority boundary.
- PR 57's paired fixture test re-derived the key in JavaScript, leaving two
  derivation sites that could drift despite matching today.
- No deployed selection source currently owns trustworthy owner and bundle
  generations. Adding an ECS or startup activation path now would register a
  route without the runtime peer and would invent premature generation rules.

## Compare

### Internal analogues

- **Reuse:** the existing domain-separated Rust derivation and PR 56 issuer.
- **Adapt:** add an issuer constructor for an already-derived fixed-size key and
  one deployment selection result that owns both consumers.
- **Avoid:** passing the deployment secret into composition, serializing it into
  OpenClaw config, hardcoding generations, or introducing a parallel issuer.

### External comparators

The shape remains consistent with the prior key-binding comparison: derive a
purpose-specific key at the authority boundary, then distribute only the
least-authority result to the verifier. This slice adds no new wire protocol or
identity system.

## Evaluate

- **Lobster container owner:** no image, process, listener, startup, readiness,
  health, or memory behavior changes.
- **Platform owner:** selection is explicit and disabled by default; rollout,
  rollback, ECS targeting, and generation publication remain future deployment
  work instead of being guessed here.
- **Lorant reviewer:** a fixed `[u8; 32]` boundary makes broad-secret wiring
  impossible in composition; disabled, selected, and resolver-failure branches
  are distinct; invalid authority is rejected before key resolution; the
  selected object deliberately does not implement `Debug`; and its authority
  serializes directly to the plugin's flat contract without adapter reshaping.
- **Security reviewer:** JavaScript consumes the Rust-projected fake key and no
  longer accesses the fake deployment secret. The same selected object issues
  the exact credential admitted by the real WebSocket proof.

## Slice

Branch: `user/giodl/lobster-reverse-carrier-deployment-selection`, stacked on
Lobster fork PR 57.

The slice adds:

1. an off-by-default Rust deployment selection with a lazy credential-key
   resolver;
2. one selected object containing the exact plugin key, immutable authority,
   and Rust credential issuer;
3. an issuer constructor that consumes the already-derived key rather than
   deriving again; and
4. a paired fixture proving JavaScript receives only the Rust-projected key.

It does not add ECS configuration, environment activation, persisted secret
material, a new plugin entry, runtime peer startup, route activation, readiness,
Status/Doctor output, deployment YAML, or ADO work. The next slice may define
the runtime peer lifecycle and a real Gateway proof only after the owner and
bundle generation sources are explicit.
