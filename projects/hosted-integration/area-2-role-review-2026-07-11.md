# Area 2 Provider-Dispatch Role Review

## Scope

Review the one-hop provider-request dispatcher contract with OpenClaw runtime,
Lobster/fleet operator, security, and skeptical simplicity lenses.

## OpenClaw Provider-Request Runtime Owner

The seam is correctly placed inside guarded fetch at one redirect-disabled
exchange. OpenClaw retains redirect handling, method/body rewrite,
cross-origin header policy, semantic retry, and response interpretation.

Required revisions:

- request bodies declare replayability;
- one-shot streams fail body-preserving redirects rather than being silently
  buffered; and
- local/hosted equivalence means the same guard profile produces the same
  decision, not that differently authorized networks are identical.

**Verdict: proceed after revisions.**

## Lobster And Fleet Operator

The contract removes ProxyPipe transport machinery without pretending the
current Lobster forwarding core is only transport.

Required revisions:

- host-side automatic redirect following is deliberately removed;
- the deletion inventory separates pipe-induced buffering from buffering still
  required by approval, provider routing, or body inspection;
- every brokered provider credential shape is inventoried before tags 1-5 are
  deleted; and
- host generation changes re-admit the dispatcher without advancing owner
  configuration.

**Verdict: proceed after provider inventory.**

## Security And SSRF Reviewer

The key trust boundary is physical DNS resolution. OpenClaw owns the guard
policy, while the selected dispatcher enforces it in the network where it
resolves and connects.

Required revisions:

- hosted address-class and DNS-rebinding checks are treated as net-new
  conformance work;
- managed private access uses explicit origin/CIDR authorization rather than a
  global private-network bypass;
- every hosted `3xx` returns unfollowed to the OpenClaw redirect loop;
- credential slots fix placement, header name, and allowed origins; and
- protected credentials remain redacted and cannot survive an unauthorized
  redirect.

**Verdict: proceed with these constraints as normative.**

## Skeptical Simplicity Reviewer

The interface is narrower than a generic fetch service:

- one request hop;
- one response stream;
- one fixed guard profile;
- declared credential slots;
- explicit certainty; and
- no provider, approval, quota, or retry semantics.

The design should not add multiple DNS modes in V1. Local and hosted
implementations both conform to the same dispatcher-enforced guard-profile
contract; their binding profiles may authorize different destinations.

**Verdict: proceed.**

## Decision

The contract is accepted for a paper evidence slice. The implementation gate
remains closed until:

1. the public network-guard shape is mapped from current SSRF behavior;
2. Lobster provider credential shapes are enumerated;
3. hosted rebinding and unfollowed-redirect fixtures pass; and
4. surviving product-policy code is separated from ProxyPipe-only code.

No production implementation or upstream submission is authorized.
