# GRR — Runtime enforcement

**Sub-spec of**: [GR-guardrails.md](./GR-guardrails.md) · **Absorbs**: CL-03

## R5 non-overridability

R5 is the highest risk tier. An R5 tool call:

- CANNOT be overridden by any local config
- CANNOT be downgraded by any `modify` decision
- MUST go through full companion review every time
- CANNOT use `allow` with `requiresExternalApproval: true` as a
  substitute (that's R4 territory)

The runtime MUST reject any policy artifact that attempts to register
an R5 tool with `fail-mode: open`. This is the pre-merge registry
guard — it runs BEFORE a snapshot is promoted. See
[../pitfalls/path-and-binding.md § P-R5-downgrade](../pitfalls/path-and-binding.md).

## Fail-mode policy

| Tier | Fail mode | Rationale |
|------|-----------|-----------|
| R1 | `open` | Low-risk reads; blocking on guardrail outage is worse than allowing |
| R2 | `open` | Same |
| R3 | `configurable` | Host decides; most hosts default `open` for availability |
| R4 | `configurable` | Host decides; most hosts default `closed` for safety |
| R5 | `closed` (fixed) | Never fail open; always escalate |

`configurable` means the host passes a `failMode: 'open' | 'closed'`
in `HostContext` that the runtime honours for that tier.

## Pre-merge registry guard

Before a snapshot is promoted (see `snap/specs/SNP-promote.md`), the
runtime walks the policy-IR's tool registry and asserts:

1. No R5 tool has `fail-mode: open`
2. No R5 tool has `requiresExternalApproval: true` as substitute for review
3. No R4-or-lower tool has `fail-mode: closed` WITH `review` in its
   decision table (would hard-block on companion outage)

Violations raise `PreMergeGuardFailure` and the promote is aborted.
The old snapshot stays active; the new one is discarded.

## Enforcement entry point

```ts
async function enforce(
  ctx: AuthorizationContext,
  policy: PolicyIR,
  providers: readonly GuardrailProvider[],
): Promise<HookResult>
```

`enforce` runs every provider's `preAuthorize` in parallel, merges
results per the composition rule (see
[GRG-guardrail-provider.md](./GRG-guardrail-provider.md)), applies
pre-merge guards, and returns the final `HookResult`. The host adapter
calls this from `routePolicy`'s wired path.
