# GRH — `ApprovalHandle`

**Sub-spec of**: [GR-guardrails.md](./GR-guardrails.md) · **Absorbs**: CL-07 §1.5

## 7-tuple binding

An `ApprovalHandle` is a 7-tuple that binds a review request to a
specific caller, invocation, and time window:

```ts
interface ApprovalHandle {
  readonly providerId: string; // 1. which GuardrailProvider
  readonly contentHash: string; // 2. sha256 over canonicalized args
  readonly sequenceNumber: number; // 3. per-chain monotonic
  readonly approverPrincipal: string; // 4. who can approve
  readonly keyId: string; // 5. HMAC key identifier
  readonly ttl: number; // 6. absolute epoch ms
  readonly nonce: string; // 7. 32-byte base64url, one-shot
  readonly signature: string; // HMAC-SHA256 over 1..7
}
```

## Binding validation

On redemption, the runtime MUST validate ALL SEVEN fields BEFORE
accepting the associated `ApprovalEntry`:

| #   | Check                                                     | Failure code        |
| --- | --------------------------------------------------------- | ------------------- |
| 1   | `providerId` matches the provider that emitted the handle | `provider-mismatch` |
| 2   | `contentHash` matches `sha256(canonicalize(currentArgs))` | `content-tampered`  |
| 3   | `sequenceNumber` matches the decision's sequence          | `sequence-drift`    |
| 4   | `approverPrincipal` matches the responding principal      | `approver-mismatch` |
| 5   | `keyId` resolves to an active trust-set key               | `unknown-key`       |
| 6   | `host.now() <= ttl`                                       | `ttl-expired`       |
| 7   | `nonce` has NOT been consumed                             | `nonce-replay`      |
| —   | HMAC signature verifies under the resolved key            | `signature-invalid` |

## First-failing order

Checks run in the order above, stop at first failure. This order is
NOT arbitrary — it surfaces the cheapest check first and the most
security-critical last. A `nonce-replay` check on a handle with an
`approver-mismatch` would be misleading.

The 7-tuple is the CL-07 §1.5 "handle-binding validator" — a pure
library at `packages/openclaw-guardrails/src/handle-binding/`.

## Mint side

```ts
mintHandle(ctx: AuthorizationContext, descriptor: ApprovalDescriptor,
  signer: HmacSigner): ApprovalHandle
```

The handle is signed HMAC-SHA256 over the canonical byte-encoding of
fields 1-7 (stable serialization order: field name alphabetical).

## Companion-side nonce

The companion app is trusted to issue a fresh `nonce` per response.
The audit chain is trusted to reject replay attempts (see
[GRA § Nonce scope](./GRA-audit-chain.md)). Together these defeat a
captured-handle replay attack.

See [../pitfalls/path-and-binding.md](../pitfalls/path-and-binding.md)
for the nonce-replay and content-tamper attack surfaces.
