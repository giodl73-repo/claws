# Emergency Bypass

The CLAWS_BYPASS=1 escape hatch for disabling governance enforcement in emergencies.

## Overview

`CLAWS_BYPASS=1` is an environment variable that disables all governance enforcement. It exists for emergency situations where governance rules block a critical operation that must proceed immediately. The bypass is logged, audited, and intended to be temporary.

## When to Use

The bypass is strictly for emergencies:

- Production incident where governance rules block a hotfix
- Deployment rollback where time-sensitive action is needed
- Investigation where enforcement interferes with diagnosis

The bypass is **not** for convenience, development, or testing. Use `claws doctor --fix` for development issues and `--severity info` for relaxed enforcement during testing.

## Audit Trail

When bypass is active, every operation emits a `CLAWS-BYPASS-001` diagnostic:

```
WARNING: Governance bypass active (CLAWS_BYPASS=1)
  All enforcement gates are DISABLED
  This session will be flagged in the audit trail
  Operator: giodl@microsoft.com
  Timestamp: 2026-04-12T09:14:22Z
```

The CGR chain records the bypass event. Fleet compliance checks flag bypassed sessions.

## Automatic Expiry

The bypass can be time-limited:

```bash
CLAWS_BYPASS=1 CLAWS_BYPASS_TTL=3600 claws build  # 1 hour bypass
```

After TTL expires, governance enforcement resumes automatically.

## Related

- [Kill Switch](kill-switch.md) -- the opposite: force-disable a workspace
- [Fail Mode](fail-mode.md) -- what happens when governance engine fails
- `design/claws/ATOMS.md` -- C25 `atom:claws-bypass`
