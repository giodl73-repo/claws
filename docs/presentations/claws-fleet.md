---
marp: true
theme: claws-dark
paginate: true
---

<!-- _class: title -->

# claws Fleet Operations

**47 workspaces. One policy floor. Governed from one terminal.**

For IT operations, platform teams, and DevOps engineers managing fleets of OC agent workspaces.

---

<!-- _class: small -->

## The Problem: 47 Workspaces, Zero Visibility

**Every team has agents. Nobody knows what they're doing.**

```
  YOUR FLEET TODAY
  ════════════════

  47 agent workspaces across 6 teams
  0  know their governance state
  0  share a common policy baseline
  0  detect when someone lowers a trust tier
  0  prove compliance to auditors

  HOW YOU FIND DRIFT TODAY               HOW LONG IT TAKES
  ─────────────────────────              ─────────────────
  1. Open spreadsheet                    5 min
  2. SSH into 47 workspaces              20 min
  3. Diff configs against... what?       15 min (partial coverage)
  4. Note discrepancies in Slack         5 min
  5. Follow up next week                 never

  TOTAL: 45 minutes. Partial coverage. No proof. No audit trail.
  Someone lowered trust tier 3 weeks ago. You find out during the incident.
```

---

<!-- _class: split -->

<div>

## The Fleet Model

**A promoted snapshot becomes the baseline. Local teams tighten -- never loosen.**

Three concepts govern fleet operations:

1. **Baseline**: a promoted snapshot that defines expected governance state
2. **Floor semantics**: fleet policy is a floor -- local workspaces can raise it, never lower it
3. **Monotonic tightening**: the floor only rises over time

A workspace at T2 can raise to T3. It cannot drop to T1. A workspace with SOC2 can add HIPAA. It cannot remove SOC2.

</div>
<div>

```
  FLEET BASELINE (promoted snapshot)
  ══════════════════════════════════
  Trust tier:    T2 (minimum)
  Policies:      SOC2 + tool_blocklist
  GovernanceIR:  compiled, signed

  LOCAL WORKSPACE: billing-agent
  ──────────────────────────────
  Trust tier:    T3          ✓ above floor
  Policies:      SOC2 + HIPAA  ✓ superset
  Custom rules:  pii_detection ✓ additive

  LOCAL WORKSPACE: dev-sandbox
  ──────────────────────────────
  Trust tier:    T1          ✗ BLOCKED
  Policies:      none        ✗ BLOCKED
  Floor violation: 2 rules
```

</div>

---

<!-- _class: small -->

## claws scan

**Workspace discovery, classification, and inventory in one command.**

```
  $ claws scan
    Scanning /agents (maxDepth: 5, concurrency: 10)...

    ██████████████████████████████████████████████████  47/47  (38s)

    GOVERNED (41)         claws.json + valid config      included in compliance
    UNGOVERNED (3)        no governance files             excluded from metrics
    MISCONFIGURED (2)     partial config, validation fails included as FAILING
    INACCESSIBLE (1)      permission denied               logged, scan continues

    Output: JSON, CSV, or table (--format)
    Fields: path, state, governanceVersion, trustTier, lastScanHash, error

    FAULT TOLERANCE
    ───────────────
    Permission denied  → INACCESSIBLE, scan continues
    Malformed config   → MISCONFIGURED, scan continues
    Timeout            → INACCESSIBLE, scan continues
    One failure never blocks the fleet scan. Partial results, always.
```

Scan is **read-only** and **idempotent** -- running twice with no changes produces identical output. Workspaces are never modified.

---

<!-- _class: small -->

## claws broadcast

**Push policy to 47 workspaces. Lossless. Floor-only.**

```
  $ claws broadcast
    DRY RUN — no changes written (add --confirm to execute)
    Would push 3 files to 47 workspaces (141 writes).

  $ claws broadcast --confirm --reason "Q2 SOC2 baseline update"
    Source: .claws/policies/ (3 files, 2.1 KB)
    Target: 47 workspaces (from last 'claws scan')
    Pre-broadcast snapshot: saved for each workspace (rollback-ready)

    ████████████████████████████████████████████████  47/47

    ✓ 44 updated    ✓ 3 already current (skipped)    ✗ 0 failed
    Run 'claws check --fleet' to verify.
```

**Fleet overwrite model** -- broadcast overwrites fleet-managed policy files in each workspace. A pre-broadcast snapshot is saved automatically before any write, enabling rollback if needed. Local customizations in non-fleet-managed files are preserved. Fleet values are floors -- local values can only raise.

Re-running is safe: already-updated workspaces are skipped via hash comparison.

---

<!-- _class: split -->

<div>

## Broadcast: Failure & Recovery

**Partial failure is normal. 44 succeed, 3 fail, you fix the 3.**

Broadcast does not stop on first failure. Each workspace is independent:

| Failure type | Retries | Action |
|---|---|---|
| Network timeout | 3 (exponential) | Transient, auto-retry |
| Permission denied | 0 | Not transient, fix ACLs |
| Not initialized | 0 | Needs `claws init` first |
| Disk full | 0 | Not transient, free space |

Exit codes: **0** = full success, **2** = partial success, **1** = total failure.

</div>
<div>

```
  $ claws broadcast --confirm
    ✓ 44 updated
    ✗  3 failed:
      dev-sandbox-1
        Permission denied
        (.claws/policies/ read-only)
      dev-sandbox-2
        Connection timeout (SSH)
      qa-isolated
        claws.json not found
        (not initialized)

    Fix the 3 failures and re-run.
    Already-updated workspaces
    are skipped.

  SAFETY
  ──────
  Concurrent broadcast prevention
  via fleet lock — two simultaneous
  broadcasts are blocked (P-176).
```

</div>

---

<!-- _class: small -->

## claws drift

**Hash-based detection. No recompilation. 38 seconds for 47 workspaces.**

```
  HOW IT WORKS
  ════════════
  After every broadcast, each workspace stores SHA-256 hashes for every governance file.
  'claws drift' re-hashes current files and compares. No file content transferred — only hashes.

  Manifest (from last broadcast):
    claws.json                sha256:a1b2c3d4...  → current: same      ✓
    .claws/policies/soc2.yaml sha256:e5f6a7b8...  → current: DIFFERS   ✗
    .claws/policies/risk.yaml sha256:c9d0e1f2...  → current: same      ✓

  $ claws drift
    47 workspaces scanned in 38s

    Drifted (2):
      dev-analytics
        claws.json                trustTier changed (3 → 1)    CRITICAL
        Last broadcast match:     2026-03-28

      staging-hr
        .claws/policies/soc2.yaml DELETED                      HIGH
        Last broadcast match:     2026-04-01

    Clean (45).
    Run 'claws check --fleet --fix' to remediate.
```

---

<!-- _class: split -->

<div>

## Drift Types & Severity

**Four drift types. Three severity levels. Each with a remediation path.**

| Drift Type | What Changed |
|---|---|
| **Configuration** | `claws.json` edited |
| **Policy** | Policy YAML modified or deleted |
| **Build** | Compiled artifacts stale vs source |
| **Infrastructure** | Trust tier vs fleet floor |

| Severity | Trigger |
|---|---|
| **CRITICAL** | Trust tier lowered, security escalation |
| **HIGH** | Policy file modified or deleted |
| **LOW** | Cosmetic or non-security config change |

</div>
<div>

```
  WHAT CAUSES DRIFT
  ═════════════════

  Manual edit          COMMON
    Developer lowered trust tier
    to unblock a tool

  Skipped broadcast    OCCASIONAL
    Workspace missed the
    last policy push

  File deletion        RARE
    Someone cleaned up "unused"
    files in .claws/

  External tool        RARE
    Another automation
    overwrote claws.json


  WEEKLY CADENCE (recommended)
  ────────────────────────────
  Daily is too noisy.
  Monthly is too late.
  Weekly catches drift before
  it becomes an incident.
```

</div>

---

<!-- _class: small -->

## Drift Exceptions: Approved Deviations

**Not all drift is accidental. Some workspaces intentionally diverge.**

```
  EXCEPTION REGISTRATION (in claws.json):
  ════════════════════════════════════════

  {
    "drift": {
      "exceptions": [
        {
          "field": "classification.maxRisk",
          "value": "R5",
          "reason": "Security research workspace — needs R5 for penetration testing tools",
          "approvedBy": "fleet-admin",
          "expires": "2026-07-01"
        }
      ]
    }
  }

  RULES
  ─────
  ✓ Excepted fields are excluded from drift reports
  ✓ Exceptions have expiration dates — no permanent opt-outs
  ✓ All exceptions are audited
  ✗ No permanent opt-out without fleet admin override
  ✗ Expired exceptions revert to drift detection automatically
```

Exemptions expire. Drift without an exception is always flagged. Drift with an expired exception is flagged again.

---

<!-- _class: small -->

## claws snap promote

**Elevate a snapshot to fleet baseline. Governance-gated.**

```
  $ claws snap promote pre-release --env production
    Validating snapshot "pre-release"...
      Running claws check: 0 errors, 1 warning
      Governance state: CLEAN
    Promoting to fleet baseline for environment "production"...
      Previous baseline: v1.3.0 (2026-04-08)
      New baseline: v1.4.0 (2026-04-11)
    Baseline promoted successfully.

  VALIDATION GATE (non-negotiable)
  ────────────────────────────────
  claws check must pass with zero errors before promotion.
  Warnings are allowed. Errors block. No --force override.

  $ claws snap promote broken-state --env production
    Running claws check: 3 errors, 2 warnings
    Governance state: FAILING
    Error: Cannot promote snapshot with governance errors.

  AUTHORIZATION
  ─────────────
  Requires: fleet-admin or baseline-manager role
  Without auth infra: --i-am-authorized explicit acknowledgment
  Every promotion: operator identity + reason recorded in audit trail
```

---

<!-- _class: small -->

## Snapshot Integrity

**SHA-256 per-file hashing + HMAC-SHA256 manifest signing. Two layers, two threat models.**

```
  LAYER 1: SHA-256 PER-FILE HASHING              LAYER 2: HMAC-SHA256 MANIFEST SIGNING
  ═════════════════════════════════               ════════════════════════════════════════

  manifest.json:                                  manifest.json:
    files:                                          files: { ... }
      claws.json:    sha256:a1b2c3d4...             signature: "hmac-sha256:u1v2w3x4..."
      AGENTS.md:     sha256:e5f6g7h8...
      SKILLS.md:     sha256:i9j0k1l2...           Signing detects TAMPER — attacker
      policy.yaml:   sha256:m3n4o5p6...           modifies file + updates hash,
      governance.ir: sha256:q7r8s9t0...           but signature fails without the key.

  Hashing detects CORRUPTION —                    WHEN VERIFICATION FAILS
  bit rot, incomplete write, disk error.          ────────────────────────
                                                  Hash mismatch → likely accidental
  READ-AFTER-WRITE VERIFICATION                     → re-save from current state
  ─────────────────────────────                   Signature mismatch → potentially
  Every snap save writes, reads back,               malicious → investigate first
  and verifies immediately.

  $ claws snap verify pre-upgrade
    claws.json: OK  |  AGENTS.md: OK  |  policy.yaml: OK  |  governance.ir: OK
    Manifest signature: VALID
    Snapshot integrity: VERIFIED
```

---

<!-- _class: small -->

## claws comply --fleet

**Per-workspace evidence packages. Workspace x Framework matrix. Signed.**

```
  $ claws comply --fleet
    Evaluating 41 governed workspaces against 3 frameworks...

    Workspace          SOC2    HIPAA    EU AI Act    Overall
    ─────────────────  ──────  ───────  ─────────    ───────
    billing-agent      PASS    PASS     PASS         PASS
    hr-assistant       PASS    FAIL     PASS         FAIL
    research-bot       PASS    N/A      PASS         PASS
    customer-support   PASS    PASS     PASS         PASS
    ...                ...     ...      ...          ...

    41 governed, 3 ungoverned (excluded from metrics), 2 misconfigured (FAILING)
    Overall: 39/41 compliant (95.1%)

    Evidence: HMAC-SHA256 signed, generation timestamp, scan snapshot reference
    Validity window: report tied to scan snapshot — stale reports require fresh scan
    Formats: --format json | csv | table | sarif
    Cross-framework deduplication: shared rules evaluated once, mapped to all frameworks
```

Ungoverned workspaces are **excluded** from compliance percentages. Without this rule, 3 governed + 7 ungoverned = "100% compliant" despite 70% having zero governance.

---

<!-- _class: split -->

<div>

## Fleet Security

**Cross-workspace threats that no single workspace can detect.**

Fleet-level scanning correlates signals across workspaces to find patterns invisible to any one workspace.

**Lateral movement**: same agent blocked in 3+ workspaces within a time window. Distinguishes misconfiguration from compromise.

**Cross-workspace delegation cycles**: agent A delegates to B in workspace X, B delegates back to A in workspace Y -- creating circular trust that bypasses per-workspace controls. Fleet scan detects these cycles across workspace boundaries.

**Progressive escalation**:
1. Alert with correlation evidence
2. Agent quarantine (revoke trust fleet-wide)
3. Workspace kill switch (last resort)

Agent quarantine preferred over kill switch -- minimizes blast radius.

**SIEM export**: all fleet security events (lateral movement, quarantine, kill switch) export to SIEM via structured JSON or SARIF for integration with existing security toolchains.

</div>
<div>

```
  L0 IMPERSONATION RISK
  ═════════════════════
  L0 = name only. Zero effort to
  impersonate. Critical in fleet.

  Level   Effort         Fleet Risk
  ─────   ──────         ──────────
  L0      Zero           CRITICAL
  L1      Key theft      High
  L2      Fleet breach   Medium
  L3      PKI forgery    Low (certificate-attested)

  warning: L0 identity in fleet
    agent: "research-assistant"
    risk: any agent can claim
          this name fleet-wide
    remediation: upgrade to L2+
      (claws keys init)

  TRANSITIVE TRUST CHAINS
  ───────────────────────
  Workspace A trusts agent X
  Workspace B trusts X and Y
  Agent X bridges A → B → Y

  Invisible to any single workspace.
  Fleet scan detects transitive trust
  via BFS/DFS graph traversal.
```

</div>

---

<!-- _class: small -->

## Compliance Trending

**`claws audit history` -- track governance posture over time.**

```
  $ claws audit history
    Fleet compliance trend (last 90 days):

    Date        Governed  Drifted  Ungoverned  Compliance
    ──────────  ────────  ───────  ──────────  ──────────
    2026-01-12     35        8         4         81.4%
    2026-01-19     37        5         5         88.1%
    2026-01-26     38        4         5         90.5%
    2026-02-02     40        3         4         93.0%
    2026-02-09     41        2         4         95.3%
    ...
    2026-04-06     43        1         3         97.7%
    2026-04-12     44        0         3        100.0%

    History is append-only (never modified after generation).
    Regression detection: workspace passing last week but failing today → alert.
    Export: JSON, CSV, SARIF for CI/CD integration.

    Trend direction: ↑ improving (8 → 0 drifted over 90 days)
    Ungoverned trend: ↓ decreasing (4 → 3, one team onboarded)

    NOTE: Drift (hash deviation from baseline) and compliance (framework
    adherence via 'claws comply') are distinct metrics. This view tracks
    drift posture. Use 'claws comply --fleet' for framework compliance.
```

---

<!-- _class: small -->

## Per-Environment Baselines

**Production, staging, development -- each with independent governance.**

```
  ENVIRONMENT BASELINES
  ═════════════════════

  Environment    Baseline     Trust Floor    Policies              Workspaces
  ───────────    ────────     ───────────    ────────              ──────────
  production     v1.4.0       T3 (strict)    SOC2 + HIPAA          23
  staging        v1.4.0-rc    T2             SOC2                  12
  development    v1.3.0       T1 (relaxed)   Minimal               12

  $ claws snap promote pre-release --env production
    Affects: 23 production workspaces
    Does NOT affect: staging or development baselines

  $ claws snap promote pre-release --env staging
    Affects: 12 staging workspaces
    Production baseline unchanged

  EACH ENVIRONMENT HAS:
  ─────────────────────
  ✓ Independent promotion and versioning
  ✓ Independent drift tracking
  ✓ Independent compliance metrics
  ✓ Independent rollback history

  Promoting to production does not change the development baseline.
  Staging mirrors production policy for pre-production validation.
```

---

<!-- _class: small -->

## Fleet CLI Reference

**6 fleet commands + 4 scope-sensitive commands with --fleet.**

```
  INHERENTLY FLEET (no --fleet flag needed)
  ═════════════════════════════════════════

  claws scan                 Discover and classify all workspaces
    --format json|csv|table  Output format (default: table)

  claws broadcast            Push policies to all workspaces
    --confirm                Execute (without: dry run only)
    --reason "..."           Required audit annotation

  claws drift                Detect hash-based drift from baseline
    --json                   Export as JSON for CI/CD

  claws audit history        Compliance trend over time (distinct from drift)

  claws report               Generate fleet governance report
  claws push                 Deploy compiled artifacts to fleet
  claws kill                 Emergency stop — isolate workspace or fleet

  SCOPE-SENSITIVE (add --fleet to escalate)
  ═════════════════════════════════════════

  claws check --fleet        Validate all workspaces against policies
    --fix                    Auto-remediate violations
  claws comply --fleet       Compliance matrix across all workspaces
    --format sarif           SARIF output for security toolchains
  claws snap promote         Elevate snapshot to fleet baseline
    --env production         Target environment
```

---

<!-- _class: title -->

# 47 workspaces governed from one terminal.

```
  $ claws scan                   Discover         38s
  $ claws broadcast --confirm   Push policy      12s
  $ claws drift                 Detect drift     38s
  $ claws comply --fleet        Prove it         45s

  Total: 2 minutes, 13 seconds.
  Every workspace. Every policy. Every week. Signed.
```

**claws** -- the claw compiler.
