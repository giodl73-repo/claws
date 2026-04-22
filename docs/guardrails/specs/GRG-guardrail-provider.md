# GRG — `GuardrailProvider` interface

**Sub-spec of**: [GR-guardrails.md](./GR-guardrails.md) · **Absorbs**: CL-07 §1

## Interface

```ts
interface GuardrailProvider {
  readonly id: string;
  preAuthorize(ctx: AuthorizationContext): Promise<HookResult>;
  postAudit(ctx: AuthorizationContext, result: ExecutionResult): Promise<void>;
}

interface AuthorizationContext {
  readonly tool: string;
  readonly args: unknown;
  readonly caller: Principal;
  readonly snapshotId: string;
  readonly policyArtifactSha256: string;
  readonly correlationId: string;
  readonly host: HostContext;
}

interface HostContext {
  readonly now(): number;          // monotonic ms, injectable (P-17)
  readonly nonce(): string;        // 32-byte base64url
  readonly hostId: string;
}
```

## Decision vocabulary

```ts
type HookResult =
  | { kind: 'allow'; requiresExternalApproval?: boolean }
  | { kind: 'deny'; reason: string }
  | { kind: 'review'; handle: ApprovalHandle; descriptor: ApprovalDescriptor }
  | { kind: 'modify'; args?: unknown; redirectPath?: string };
```

- **allow** — proceed as-is. Optional `requiresExternalApproval: true`
  still escalates to companion.
- **deny** — reject with `reason`. Audited; no further processing.
- **review** — stall the call; supervisor receives a signed
  `ApprovalHandle`. See [GRH-approval-handle.md](./GRH-approval-handle.md).
- **modify** — rewrite `args` (tool) or `redirectPath` (file ingest)
  before proceeding. See [GRF-file-ingest.md](./GRF-file-ingest.md) for
  the `redirectPath` invariant.

## Composition rule

When multiple providers run against the same decision:

```
deny > review > modify > allow
```

The host MUST surface the highest-severity outcome. OC-7 merger makes
`requireApproval` non-downgradable — once any provider sets it, it
stays set for the lifetime of the decision, and the companion receives
every `ApprovalDescriptor` the plugins emitted (conjunctive — all must
be approved).

See [../pitfalls/composition.md](../pitfalls/composition.md) for the
silent-allow failure mode this rule prevents.

## Clock injection

Providers MUST NOT call `Date.now()` or `performance.now()` directly.
Use `ctx.host.now()`. This is the P-17 mitigation — see
[../how-tos/inject-clock.md](../how-tos/inject-clock.md). A provider
that reads wall-clock time directly is non-deterministic under replay
and breaks audit-chain verification.

See also the authoritative flow walkthrough at
[../guides/approval-flow.md](../guides/approval-flow.md).
