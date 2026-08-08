# CP-1 Review — R1 Consolidated

**Wave**: Thoth the Scribe (XCV)
**Checkpoint**: CP-1 (Security Hardening + Protect)
**Date**: 2026-04-14
**Round**: 1
**Panel**: craft:architect, claws:ciso, claws:founder, claws:platform-eng, craft:testing

## Summary

| Severity    | Raw | Deduplicated |
| ----------- | --- | ------------ |
| Major (M)   | 17  | 16           |
| Warning (W) | 32  | ~25          |
| Note (N)    | 28  | ~22          |

**Consensus findings** (flagged by 2+ roles independently):

- Fleet budget missing workspace identity (platform-eng + founder)
- PublishRestriction enforcement ignores tool risk tiers (architect + platform-eng)
- PKCE timing oracle on === comparison (ciso + platform-eng + founder)

## Major Findings (must-fix)

### Budget / Fleet (4)

| #    | Finding                                                                                             | File            | Flagged By            |
| ---- | --------------------------------------------------------------------------------------------------- | --------------- | --------------------- |
| M-01 | Fleet budget output has no workspace name/path — anonymous percentages unusable at scale            | budget-fleet.ts | platform-eng, founder |
| M-02 | `budgetFleet` silently drops failed workspace reads from `runParallel` — under-reports fleet totals | budget-fleet.ts | platform-eng          |
| M-03 | Budget period 'weekly' falls through to monthly in `periodLimit` ternary                            | budget.ts       | platform-eng          |
| M-04 | Policy version reads from `governedWorkspaces[0]` — non-deterministic on readdir order              | broadcast.ts    | platform-eng          |

### Security / Crypto (5)

| #    | Finding                                                                                     | File               | Flagged By                  |
| ---- | ------------------------------------------------------------------------------------------- | ------------------ | --------------------------- |
| M-08 | PKCE `verifyPkce` uses `===` instead of `timingSafeEqual` — timing oracle on code challenge | identity.ts        | ciso, platform-eng, founder |
| M-09 | JWT validation missing `iat`/`nbf` checks — token replay and pre-positioning attacks        | identity.ts        | ciso                        |
| M-10 | Registry client sends Bearer tokens without enforcing HTTPS — credential leak               | registry-client.ts | ciso                        |
| M-11 | Vault file written without `chmod(0o600)` — world-readable encrypted secrets on POSIX       | secrets.ts         | ciso                        |
| M-12 | `verifyKeyMaterial` early return on length mismatch leaks key length via timing             | rotate.ts          | ciso                        |

### Architecture (3)

| #    | Finding                                                                                          | File                 | Flagged By              |
| ---- | ------------------------------------------------------------------------------------------------ | -------------------- | ----------------------- |
| M-05 | `checkPublishRestrictions` blocks all broadcasts to low-trust workspaces regardless of tool risk | trust-compat.ts      | architect, platform-eng |
| M-06 | `AnthropicLLMProvider` removed from compile barrel but still exported from sub-barrel            | compile/llm/index.ts | architect               |
| M-07 | Double-stacked backoff — outer sequential delay + inner retry delay compound                     | extractor.ts         | architect               |

### CLI / UX (2)

| #    | Finding                                                                       | File             | Flagged By |
| ---- | ----------------------------------------------------------------------------- | ---------------- | ---------- |
| M-13 | Passphrase and secret values exposed in `process.argv` — visible via `ps aux` | protect.ts (CLI) | founder    |
| M-14 | `claws` bare invocation hides protect command group — no discoverability      | cli.ts           | founder    |

### Test Config (2)

| #    | Finding                                                                                          | File             | Flagged By |
| ---- | ------------------------------------------------------------------------------------------------ | ---------------- | ---------- |
| M-15 | Vitest `accept` project only scans `tests/accept/**` — misses 7 accept tests in `tests/protect/` | vitest.config.ts | testing    |
| M-16 | E2e tests included in both `integration` and `e2e` vitest projects — double-counted in CI        | vitest.config.ts | testing    |

## Fix Plan

Group into 4 parallel fix agents:

1. **fix-budget** (M-01, M-02, M-03, M-04): Budget/fleet identity, error propagation, weekly period, policy version
2. **fix-security** (M-08, M-09, M-10, M-11, M-12): PKCE timing, JWT replay, HTTPS enforcement, vault permissions, key length timing
3. **fix-architecture** (M-05, M-06, M-07, M-13, M-14): Publish restriction, provider export, backoff dedup, argv passphrase, CLI discoverability
4. **fix-testconfig** (M-15, M-16): Vitest project glob fixes

## Individual Reviews

- [R1-craft-architect.md](R1-craft-architect.md) — 3M / 7W / 9N
- [R1-claws-ciso.md](R1-claws-ciso.md) — 5M / 7W / 5N
- [R1-claws-founder.md](R1-claws-founder.md) — 3M / 7W / 4N
- [R1-claws-platform-eng.md](R1-claws-platform-eng.md) — 4M / 6W / 5N
- [R1-craft-testing.md](R1-craft-testing.md) — 2M / 5W / 5N
