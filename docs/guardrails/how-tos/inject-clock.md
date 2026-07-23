---
covers: [atom:GRG/clock-injection]
---

# How-to: inject a deterministic clock

This is the P-17 mitigation: `GuardrailProvider` implementations MUST
NOT call `Date.now()` or `performance.now()` directly. The clock comes
from `ctx.host.now()`.

## Why

Providers that read wall-clock time directly are:

1. **Non-deterministic under replay** — audit-chain verification
   replays a sequence of entries and re-evaluates decisions to confirm
   the policy matches. A provider that reads `Date.now()` sees
   different values on replay, producing different decisions.
2. **Unobservable** — tests that mock wall-clock time at the Node.js
   level hit every provider in the process. Per-provider clock control
   (advance by 5s for THIS provider, not that one) is only possible
   through `HostContext` injection.
3. **Timezone-sensitive** — wall-clock time in different zones can
   cross TTL boundaries during a single decision. Monotonic
   `host.now()` is UTC-epoch-ms only.

## Correct usage

```ts
class MyProvider implements GuardrailProvider {
  readonly id = "my-provider";

  async preAuthorize(ctx: AuthorizationContext): Promise<HookResult> {
    const now = ctx.host.now(); // ✓ correct
    if (now > this.cacheExpiry) {
      await this.refreshCache(now);
    }
    // ...
  }
}
```

## Incorrect usage

```ts
class MyProvider implements GuardrailProvider {
  async preAuthorize(ctx: AuthorizationContext): Promise<HookResult> {
    const now = Date.now(); // ✗ breaks replay
    // ...
  }
}
```

Lint rule at `test/e2e/harness/lint-rules/no-direct-clock.ts` catches
`Date.now()`, `performance.now()`, and `new Date()` inside
`packages/openclaw-guardrails/src/**/*.ts`. Violations fail CI.

## Writing tests that advance the clock

The test harness exposes `ctx.host.now()` backed by `ClockMock`:

```ts
import { ClockMock } from "#harness/clock-mock.js";

const clock = new ClockMock(1_700_000_000_000);
const ctx = makeContext({ host: { now: () => clock.now() } });

// Tick forward by 5 seconds
clock.advance(5_000);
```

See [../pitfalls/composition.md](../pitfalls/composition.md) for
composition bugs that only surface under advanced clocks (TTL-expired
handle reuse, etc.).
