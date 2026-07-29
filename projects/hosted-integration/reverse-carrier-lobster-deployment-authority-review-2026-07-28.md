# Lobster Reverse-Carrier Deployment Authority Review

Date: 2026-07-28

## Frame

PR 55 owns the accepted WebSocket and O14 session/operation lifecycle, but it
cannot safely admit a Lobster peer without deployment-owned credential and
generation evidence. The smallest falsifiable thesis is that Lobster can
provide this evidence without a new service, port, Gateway role, OAuth profile,
or runtime activation by pairing:

- one short-lived credential bound to the peer's Ed25519 key, audience, binding,
  owner generation, and host-bundle generation; and
- one proof-of-possession signature over PR 55's connection ID and nonce.

The Lobster deployment remains authoritative for the secret and immutable
authority snapshot. OpenClaw O12 remains authoritative for session admission.
The downstream deletion target is ProxyPipe's provider-egress authority path
after the paired carrier is activated and proven.

The thesis is disproved if the verifier needs pod-local shared state, a new
issuer service, raw provider credentials, or a second admission registry.

## Audit

- `lobster-host-provider` already owns an inactive peer identity, reconnect
  lifecycle, declaration, and `HostProviderCredentialSource` port. It had no
  concrete credential issuer.
- The external `lobster-host` plugin already owns the accepted socket and had
  two independent `verifyPeer` and `expectedAuthority` ports. Sampling those
  independently permits a verifier/authority generation race.
- Lobster already derives protocol-specific keys from the island-stable
  `LOBSTER_PROXY_TOKEN_SECRET` using domain-separated HKDF-style HMAC in
  `teams_delivery_auth.rs` and `token_security.rs`. This is the internal
  analogue to reuse; the reverse carrier must use a distinct salt and info.
- ProxyPipe has generation-stamped connection ownership, but it is the deletion
  target rather than the new authority source. Reusing its live slot would
  preserve the private bridge dependency.
- Container-local connection state is permitted by the multi-pod contract. A
  credential or authority registry that only one runtime pod could observe is
  not.

## Compare

### Internal analogues

- **Reuse:** domain-separated derivation from existing deployment secret
  material; exact per-connection state; fixed redacted public failures.
- **Adapt:** PR 55's two callbacks become one atomic `authorizePeer` port that
  returns verified-peer evidence and its exact authority snapshot together.
- **Avoid:** ProxyPipe slot authority, a new in-memory cross-pod registry,
  Gateway shared-secret authentication, or a new Key Vault seeding contract.

### External comparators

- RFC 7800's confirmation-key model supports binding a credential to a key
  instead of treating it as a freely replayable bearer.
- RFC 9449's DPoP model reinforces signing request-specific material and
  bounding freshness. This slice uses the already-defined connection ID and
  server nonce rather than introducing an HTTP/OAuth proof protocol.
- SPIFFE/SVID provides a fuller workload-identity and rotation system, but
  Lobster has no existing Workload API owner in this container. Adding one for
  this single inactive connection would be a larger system than the problem.

## Evaluate

- **Lobster container owner:** no sidecar, service, listener, port, startup
  ordering, or health dependency is added. The JS verifier and Rust issuer are
  lazy factories only.
- **CISO:** admission fails closed on wrong HMAC key, audience, peer-key
  fingerprint, generation, expiry, overlong lifetime, timestamp, malformed or
  non-canonical encoding, and invalid Ed25519 proof. Tokens are capped at five
  minutes and failures cross the socket only as `credential-rejected`.
- **Lorant reviewer:** security inputs are strict and closed; one atomic result
  feeds O14 admission; exact key derivation is proven in both languages; stale
  generation, expiry, wrong signing key, timeout, cleanup, and no-replay paths
  remain covered. Generated bundles are marked review-only.

## Slice

Branch: `user/giodl/lobster-reverse-carrier-deployment-authority`, stacked on
Lobster fork PR 55.

The slice adds:

1. a Rust `HostProviderCredentialAuthority` implementing the existing
   `HostProviderCredentialSource` port;
2. a lazy plugin `./deployment-authority` factory that validates the matching
   credential and Ed25519 proof;
3. one atomic authorization result for O14 peer and authority evidence; and
4. cross-language key-derivation and credential-format proof.

It does not read deployment environment variables, register the route, start a
peer, activate a bundle, add Status/Doctor output, or queue an ADO deployment.
The next slice may compose the factories behind an explicit off-by-default
deployment owner only after this evidence PR is reviewed.
