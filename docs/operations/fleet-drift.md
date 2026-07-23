# Fleet Drift Detection

<!-- atom:fleet-drift (C61) -->

> **Status: Design** -- this guide describes planned functionality.
> Implementation has not started. See `design/claws/CLAUDE.md` for current status.

Drift is when a workspace stops matching fleet policy. Someone edited
`claws.json`. Someone skipped an upgrade. Someone deleted a policy file.
You find out three weeks later during an incident. `claws drift` finds
it in 38 seconds.

## How it works

Drift detection is hash-based. After every `claws broadcast`, each workspace
stores SHA-256 hashes for every governance file. `claws drift` re-hashes the
current files and compares.

```
Manifest (from last broadcast):
  claws.json                sha256:a1b2c3d4...  → current: same     ✓
  .claws/policies/soc2.yaml sha256:e5f6a7b8...  → current: DIFFERS  ✗
  .claws/policies/risk.yaml sha256:c9d0e1f2...  → current: same     ✓
```

No file content is transferred — only hashes. Fast even over slow connections.

## What drift looks like

```
$ claws drift
  47 workspaces scanned in 38s

  Drifted (2):
    dev-analytics
      claws.json               trustTier changed (3 → 1)
      Last broadcast match:    2026-03-28

    staging-hr
      .claws/policies/soc2.yaml  DELETED
      Last broadcast match:    2026-04-01

  Clean (45).
  Run 'claws pinch --fleet --fix' to remediate.
```

## What causes drift

| Cause           | Frequency  | Example                                        |
| --------------- | ---------- | ---------------------------------------------- |
| Manual edit     | Common     | Developer lowered trust tier to unblock a tool |
| Skipped upgrade | Occasional | Workspace missed last broadcast                |
| File deletion   | Rare       | Someone cleaned up "unused" files in `.claws/` |
| External tool   | Rare       | Another automation overwrote `claws.json`      |

The inner ring (`claws watch`) catches edits in the workspace where they
happen. The outer ring catches them fleet-wide, including workspaces where
`watch` is not running.

## Weekly cadence

```bash
# crontab (or GitHub Actions schedule)
0 9 * * 1  cd /agents && claws drift --json > /var/log/claws/drift-$(date +\%Y\%m\%d).json
```

Weekly is the right cadence. Daily is too noisy (temporary dev changes).
Monthly is too late (three weeks of drift is three weeks of ungoverned agents).

## Remediation

```
$ claws pinch --fleet --fix
  dev-analytics:
    ✗ trustTier: 1 is below fleet minimum (3) → FIXED (set to 3)
  staging-hr:
    ✗ policies/soc2.yaml missing → FIXED (restored from broadcast cache)
  2 violations found, 2 auto-fixed. 45 clean.
```

For workspaces intentionally diverged (e.g., test environments), set a
time-limited exemption:

```json
{
  "fleet": {
    "driftExempt": true,
    "driftExemptReason": "Isolated test environment",
    "driftExemptExpires": "2026-05-01"
  }
}
```

Exemptions expire. No permanent opt-outs without fleet admin override.

## Before and after

**Before**: Open spreadsheet. SSH into 47 workspaces. Diff configs against
baseline. Note discrepancies. Follow up on Slack. 45 minutes. Partial coverage.

**After**:

```bash
claws drift                     # 38 seconds, every file, every workspace
claws pinch --fleet --fix       # auto-remediate
```

## Scenario-Driven Additions

### From fleet-operations scenarios (89 findings applied)

- Drift hash composition: SHA-256 of claws.json + policy YAML files + GovernanceIR hash combined into a single composite hash for efficient comparison
- Drift severity classification: CRITICAL (trust tier lowered, security escalation), HIGH (policy file modified or deleted), LOW (cosmetic or non-security config change)
- Fleet baseline definition and manifest storage: promoted snapshot becomes the baseline; drift is measured against the baseline, not the last broadcast
- Drift exception registration for intentional overrides: time-limited exemptions with expiry and reason, preventing permanent opt-outs
- Configuration drift vs build drift distinction: config drift means source files changed; build drift means compiled artifacts do not match current config
- Drift timeline via scan history comparison: drift report shows when each workspace last matched baseline
- Per-drift-type remediation guidance in the drift report with appropriate ring for resolution
- Drift findings exportable as SARIF results for CI/CD integration
- Three-state drift classification: compliant, drifted, ungoverned (workspace has no governance at all)

## Further reading

- [Fleet Broadcast](fleet-broadcast.md) — pushing policies that drift compares against
- [Three Rings](three-rings.md) — drift detection is the outer ring
- [Kill Switch](kill-switch.md) — emergency stop when drift reveals a compromise
