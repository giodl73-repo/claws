# Experiment c: Full Pipeline Design

**QID**: Q12f-c
**Method**: Design analysis
**Date**: 2026-04-11
**Status**: Complete

---

## Objective

Design the end-to-end governance pipeline: pre-commit → CI → CD → scheduled fleet scan. For each stage define what commands run, what artifacts flow to the next stage, latency budget, failure mode, and how compliance evidence chains from local to fleet. Integrate with the Q12e three-ring model.

---

## Pipeline Overview

```
 Developer workstation          GitHub / CI               Deployment          Fleet
 ──────────────────────         ──────────                ──────────          ─────
                                                          
 ┌─────────────┐   git push   ┌───────────────┐  merge  ┌──────────────┐   cron
 │  PRE-COMMIT │ ───────────→ │   PR CHECK    │ ──────→ │   CD GATE    │ ──────→ ┌────────────┐
 │  (Stage 0)  │              │   (Stage 1)   │         │   (Stage 2)  │         │ FLEET SCAN │
 └──────┬──────┘              └───────┬───────┘         └──────┬───────┘         │ (Stage 3)  │
        │                             │                        │                 └─────┬──────┘
        ▼                             ▼                        ▼                       ▼
  .glint/audit/               SARIF → code scanning    signed evidence         fleet report
  local chain                 PR annotations           deploy artifact         drift alerts
                              merge gate               release gate            compliance
```

---

## Stage 0: Pre-Commit (Local)

### What runs

```bash
# .husky/pre-commit  (or .git/hooks/pre-commit)
glint pinch --staged --quiet
```

### Command breakdown

| Command | Purpose | Flags |
|---------|---------|-------|
| `glint pinch --staged` | Check only git-staged files against policies | `--staged` limits scope to staged files; `--quiet` suppresses banner |

### Artifact flow

| Produced | Consumed by |
|----------|-------------|
| Pass/fail exit code | Git (blocks or allows commit) |
| Audit event → `.glint/audit/chain.jsonl` | Stage 1 (audit chain travels with the code) |
| `.glint/cache/compile/` updated | Stage 1 (cache in repo or CI cache) |

### Latency budget

| Target | Maximum | Notes |
|--------|---------|-------|
| **<1s** | 2s hard cap | Pre-commit hooks that take >2s get disabled by developers |

Pre-commit MUST be fast. This is the inner ring from Q12e. `--staged` limits scope to changed files. The compile cache (`.glint/cache/compile/`) avoids recompilation. On a typical commit touching 2-3 files, this should complete in 200-500ms.

### Failure mode

| Result | Behavior |
|--------|----------|
| **Pass** | Commit proceeds |
| **Fail (violation)** | Commit blocked. Violations printed to terminal. Developer runs `glint pinch --fix` to auto-remediate, then re-stages and re-commits. |
| **Error (glint crash)** | Commit proceeds (fail-open). Governance shouldn't block development on tool errors. |

### Installation

```bash
# Package.json (husky)
{
  "scripts": {
    "prepare": "husky"
  }
}

# .husky/pre-commit
glint pinch --staged --quiet

# Or: glint-managed hook
glint init --hooks    # Installs pre-commit hook automatically
```

### Three-ring integration

Stage 0 IS the inner ring. It catches:
- Trust tier escalation (G3/FE5)
- Guardrail removal (G4)
- Skill governance violations (G2)
- Config drift from baseline (G-BASELINE)
- 70% of all governance scenarios (Q12e finding)

---

## Stage 1: PR Check (CI)

### What runs

```yaml
# Triggered by: pull_request event
# Runs: glint pinch + SARIF upload + PR comment
```

### Command breakdown

| Command | Purpose | Flags |
|---------|---------|-------|
| `glint pinch --diff $BASE_SHA --format sarif` | Check files changed in PR, output SARIF | `--diff` for PR-scoped scanning |
| `glint audit verify` | Verify audit chain integrity | Ensures chain wasn't tampered |
| (optional) `glint comply --dry-run` | Preview compliance impact | Non-blocking preview |

### Artifact flow

| Produced | Consumed by |
|----------|-------------|
| `glint-results.sarif` | GitHub code scanning (inline annotations) |
| PR comment (violation summary) | Developer (review context) |
| Check status (pass/fail) | Branch protection (merge gate) |
| Audit verification result | CD gate (chain integrity confirmed) |
| Updated `.glint/cache/` | Future CI runs (action cache) |

### Latency budget

| Target | Maximum | Notes |
|--------|---------|-------|
| **<30s** | 60s hard cap | CI checks that take >60s slow down review cycles |

In CI, `--diff` limits scanning to PR-changed files. Cache restore from previous runs speeds compilation. Full workspace recompile is the fallback (still <60s for typical projects).

### Failure mode

| Result | Behavior |
|--------|----------|
| **Pass (0 violations)** | Green check. PR can merge. |
| **Fail (violations, fail-on match)** | Red check. PR blocked. SARIF uploaded. Violations visible inline on PR diff. Summary comment posted. |
| **Warn (violations below threshold)** | Yellow check (with `fail-on: high`). SARIF uploaded. Warnings visible but merge allowed. |
| **Soft fail** | Green check (with `warn-only: true`). SARIF still uploaded. For onboarding. |
| **Error (glint crash)** | Check marked as "error". Optional: fail-open or fail-closed (configurable). |

### Merge gating configuration

```
Branch protection rules:
  Required checks: "Governance Check" (from glint.yml)
  
  # Recommended: require SARIF to be clean
  # (GitHub code scanning can also block on alert severity)
  Code scanning:
    Severity: error → must be fixed
    Severity: warning → may be deferred
```

### What CI catches that pre-commit misses

| Scenario | Why pre-commit missed it | CI catches it |
|----------|--------------------------|--------------|
| Developer skipped hooks (`--no-verify`) | Developer bypassed | CI always runs |
| External contributor (no local glint) | No local install | CI runs on all PRs |
| Bot-generated PR (Dependabot, Renovate) | No human commit | CI validates bot changes |
| Cross-file policy violation | `--staged` only sees staged files | `--diff` sees full PR diff |
| Audit chain tampering | Local chain is local | `glint audit verify` in CI |

### Three-ring integration

Stage 1 bridges the inner ring and middle ring. It is the enforcement backstop for the inner ring (catches what pre-commit missed) and the first automated gate for the middle ring (validates after platform changes that arrive via PR).

---

## Stage 2: CD Gate (Deploy Pipeline)

### What runs

```yaml
# Triggered by: push to main (post-merge) or release tag
# Runs: glint comply + sign + artifact upload
```

### Command breakdown

| Command | Purpose | Flags |
|---------|---------|-------|
| `glint comply <framework> --sign` | Generate signed compliance evidence | `soc2`, `hipaa`, `eu-ai-act` |
| `glint audit export --format cef` | Export audit trail for SIEM | CEF format for enterprise SIEM |
| `glint build <target> --pinch` | Cross-compile with governance validation | Ensures deployed artifact is governed |
| `glint snap save release-$TAG` | Save governance snapshot at release point | Named snapshot for future reference |

### Artifact flow

| Produced | Consumed by |
|----------|-------------|
| `.glint/compliance/soc2-YYYY-MM-DD.json` (signed) | Artifact registry, auditors, Stage 3 |
| `.glint/compliance/manifest.sig` (HMAC-SHA256) | Signature verification at deploy target |
| `audit-export.cef` | SIEM (Splunk, Sentinel, etc.) |
| `build/` output (cross-compiled agent) | Deployment target (OC, Cursor, Claude, etc.) |
| Named snapshot (`release-v1.2.3`) | Future diff, rollback reference |

### Latency budget

| Target | Maximum | Notes |
|--------|---------|-------|
| **<30s** | 120s hard cap | CD gates run after merge; developer isn't waiting interactively |

CD is less latency-sensitive than CI because it runs post-merge. The developer has already moved on. But it must complete before deployment proceeds.

### Failure mode

| Result | Behavior |
|--------|----------|
| **Pass** | Compliance evidence signed. Deployment proceeds. |
| **Fail (compliance gap)** | Deployment blocked. Alert to governance team. Compliance evidence NOT signed (unsigned = incomplete). |
| **Error (glint crash)** | Deployment blocked (fail-closed). Compliance evidence is a hard requirement for regulated deployments. |

### Signing model

```
1. glint comply soc2 → generates evidence JSON
2. Evidence JSON includes:
   - Timestamp (ISO 8601)
   - Workspace hash (SHA-256 of all governance-relevant files)
   - Policy version (hash of .glint/policies/)
   - Rule results (pass/fail per rule)
   - Audit chain hash (latest hash from chain.jsonl)
3. HMAC-SHA256 signature over evidence JSON
4. Signature stored in manifest.sig
5. Verification: glint comply verify <evidence-file>
```

### CD workflow example

```yaml
# .github/workflows/deploy.yml
name: Deploy with Governance

on:
  push:
    tags: ['v*']

jobs:
  govern-and-deploy:
    runs-on: ubuntu-latest
    environment: production    # GitHub environment with protection rules
    steps:
      - uses: actions/checkout@v4

      # Governance gate
      - uses: craftworks/glint-action@v1
        with:
          command: comply
          compliance-framework: soc2
          sign: true
          signing-key: ${{ secrets.GLINT_SIGNING_KEY }}

      # Build governed agent
      - run: glint build --pinch

      # Save release snapshot
      - run: glint snap save release-${{ github.ref_name }}

      # Export audit trail
      - run: glint audit export --format cef > audit-${{ github.ref_name }}.cef

      # Upload artifacts
      - uses: actions/upload-artifact@v4
        with:
          name: governance-${{ github.ref_name }}
          path: |
            .glint/compliance/
            build/
            audit-*.cef

      # Deploy (platform-specific)
      - run: ./deploy.sh
```

### Three-ring integration

Stage 2 is the middle ring's CI manifestation. It handles:
- Post-upgrade validation (if deployment includes platform version bump)
- Compliance evidence generation (signed, timestamped, hash-chained)
- Release-point snapshot for future diff/rollback

---

## Stage 3: Scheduled Fleet Scan

### What runs

```yaml
# Triggered by: cron schedule (weekly) or manual dispatch
# Runs: glint pinch + drift + comply across all workspaces
```

### Command breakdown

| Command | Purpose | Flags |
|---------|---------|-------|
| `glint pinch` (per workspace) | Governance check across all workspaces | Matrix strategy in CI |
| `glint drift` | Detect policy drift from last broadcast | Hash-based comparison |
| `glint comply --fleet` | Fleet-wide compliance report | Aggregated evidence |
| `glint report` | Fleet compliance dashboard | Summary across all workspaces |

### Artifact flow

| Produced | Consumed by |
|----------|-------------|
| Fleet SARIF (per workspace) | GitHub code scanning (per-workspace alerts) |
| Drift report | Platform engineering team (remediation) |
| Fleet compliance report | CISO, auditors |
| GitHub issue (auto-created) | Tracking (remediation tickets) |
| Alert (webhook/email) | Ops team (drift notification) |

### Latency budget

| Target | Maximum | Notes |
|--------|---------|-------|
| **<300s** | 600s hard cap | Scheduled, non-interactive. Can be slow. |

Fleet scans are the most latency-tolerant stage. They run on a schedule, not in a developer's critical path. But they should complete within 10 minutes to avoid CI timeout.

### Failure mode

| Result | Behavior |
|--------|----------|
| **All clean** | Report generated. No alerts. |
| **Drift detected** | GitHub issue created with drift details. Alert sent. |
| **Violations found** | Per-workspace SARIF uploaded. Fleet report summarizes. |
| **Compliance gap** | Urgent alert. Compliance evidence shows gap. |

### Fleet scan architecture

For organizations with many repos, the fleet scan uses a matrix strategy:

```yaml
strategy:
  fail-fast: false    # Scan all, don't stop on first failure
  matrix:
    workspace: [list of workspace paths or repos]
```

For cross-repo fleet scanning (workspaces in separate repos):

```yaml
# Option A: Monorepo (all agents in one repo)
strategy:
  matrix:
    workspace:
      - agents/research
      - agents/support
      - agents/internal

# Option B: Multi-repo (agents in separate repos)
# Use a dispatch workflow that triggers scans in each repo
# Or: a fleet registry file listing all repos to scan
```

### Three-ring integration

Stage 3 IS the outer ring. It catches:
- Accumulated drift between broadcasts
- Cross-workspace inconsistency
- Compliance gaps across the fleet
- Version skew (different workspaces on different platform versions)

---

## Compliance Evidence Chain

### How evidence flows from local to fleet

```
Stage 0 (local)                    Stage 1 (CI)                    Stage 2 (CD)                   Stage 3 (fleet)
─────────────                      ──────────                      ──────────                     ───────────
                                                                   
glint pinch --staged               glint pinch --diff              glint comply soc2 --sign       glint comply --fleet
     │                                  │                               │                              │
     ▼                                  ▼                               ▼                              ▼
.glint/audit/chain.jsonl ──────→  audit verify ───────────────→  compliance/soc2.json ──────→  fleet compliance report
  (local hash chain)              (chain integrity check)         (signed evidence)              (aggregated evidence)
     │                                  │                               │                              │
     │                                  ▼                               ▼                              ▼
     │                            SARIF → code scanning           manifest.sig                   fleet report + alerts
     │                            PR annotations                  (HMAC-SHA256)                  compliance dashboard
     │                                  │                               │
     └──── pinch result events ─────────┘                               │
           (appended to chain)                                          │
                                                                        │
                                          chain hash embedded in ───────┘
                                          compliance evidence
```

### The hash chain

The audit chain (`.glint/audit/chain.jsonl`) is the backbone of the evidence model:

1. **Every `glint pinch` result** appends an event to the chain
2. **Each event** includes: timestamp, rule results, workspace hash, previous event hash
3. **The chain is hash-linked**: event N's hash includes event N-1's hash (like a blockchain)
4. **`glint audit verify`** walks the chain and verifies all hashes
5. **Compliance evidence** includes the latest chain hash — linking the evidence to the full audit history
6. **Fleet reports** aggregate chain hashes across workspaces

### Evidence integrity guarantees

| Property | How achieved |
|----------|-------------|
| **Tamper evidence** | Hash chain — any modification breaks the chain |
| **Temporal ordering** | ISO 8601 timestamps + hash ordering |
| **Non-repudiation** | HMAC-SHA256 signing with org key |
| **Completeness** | Chain includes ALL governance events (not just failures) |
| **Auditability** | `glint audit export --format cef` for SIEM ingestion |

---

## Stage-by-Stage Summary Table

| Dimension | Stage 0: Pre-Commit | Stage 1: PR Check | Stage 2: CD Gate | Stage 3: Fleet Scan |
|-----------|--------------------|--------------------|-----------------|---------------------|
| **Trigger** | `git commit` | `push` to PR branch | `push` to main / tag | Cron (weekly) or manual |
| **Ring** | Inner (live) | Inner→Middle bridge | Middle (upgrade) | Outer (fleet) |
| **Commands** | `pinch --staged` | `pinch --diff`, `audit verify` | `comply --sign`, `build --pinch`, `snap save`, `audit export` | `pinch` (matrix), `drift`, `comply --fleet`, `report` |
| **Scope** | Staged files only | PR diff files | Full workspace | All workspaces |
| **Latency target** | <1s | <30s | <30s | <300s |
| **Latency cap** | 2s | 60s | 120s | 600s |
| **Output format** | Terminal text | SARIF + PR comment + check status | Signed JSON + CEF audit + build artifacts | SARIF (per-workspace) + fleet report + issues |
| **Failure mode** | Block commit | Block merge | Block deploy | Alert + issue |
| **Fail-open?** | Yes (on tool error) | Configurable | No (fail-closed) | N/A (always reports) |
| **Cache** | `.glint/cache/` (local) | GitHub Actions cache | GitHub Actions cache | GitHub Actions cache |
| **Artifacts to next** | Audit chain events | SARIF, chain verification | Signed evidence, snapshot | Fleet report |
| **Pitfalls covered** | 6 (inner ring) | 12 (inner + middle) | 15 (+ compliance) | 18 of 23 total |
| **Who cares** | Developer | Developer + reviewer | DevOps + CISO | Platform eng + CISO |

---

## Pipeline Composition Patterns

### Pattern 1: Startup (minimal)

```
Pre-commit only → no CI, no CD
glint init --hooks
```

One command. Governance on every commit. No CI configuration needed. This is the "5 minutes to governed" path.

### Pattern 2: Team (standard)

```
Pre-commit + CI check
glint init --hooks + .github/workflows/glint.yml
```

Pre-commit for local enforcement. CI for backstop (catches `--no-verify`, external contributors, bots). SARIF for code scanning.

### Pattern 3: Enterprise (full)

```
Pre-commit + CI check + CD gate + fleet scan
All 4 stages. Signed evidence. SIEM integration. Fleet drift detection.
```

Full pipeline. Compliance evidence at every release. Weekly fleet scans. SIEM export. The "enterprise governance" package.

### Pattern 4: Gradual adoption

```
Week 1: CI only, warn-only: true          # See what glint finds
Week 2: CI only, fail-on: critical        # Start blocking critical
Week 4: Pre-commit + CI, fail-on: high    # Add local enforcement
Week 8: Full pipeline, fail-on: all       # Full governance
```

The Checkov `soft_fail` pattern applied to the entire pipeline. Start with visibility, graduate to enforcement.

---

## Integration with Q12e Three-Ring Model

### The CI/CD ring sits between inner and outer

Q12e defined three rings: inner (live), middle (upgrade), outer (fleet). CI/CD integrates as follows:

```
                       ┌──────────────────────────────────┐
                       │       OUTER — FLEET (Stage 3)    │
                       │   drift · pinch --fleet · report  │
                       │   Weekly scheduled scan           │
                       │                                   │
                       │ ┌──────────────────────────────┐ │
                       │ │   CD GATE (Stage 2)           │ │
                       │ │   comply --sign · build       │ │
                       │ │   Per-release                  │ │
                       │ │                               │ │
                       │ │ ┌──────────────────────────┐ │ │
                       │ │ │  CI CHECK (Stage 1)      │ │ │
                       │ │ │  pinch --diff · audit     │ │ │
                       │ │ │  Per-PR                   │ │ │
                       │ │ │                           │ │ │
                       │ │ │ ┌──────────────────────┐ │ │ │
                       │ │ │ │ INNER — LOCAL (S0)   │ │ │ │
                       │ │ │ │ watch · pinch --staged│ │ │ │
                       │ │ │ │ Every save/commit    │ │ │ │
                       │ │ │ └──────────────────────┘ │ │ │
                       │ │ └──────────────────────────┘ │ │
                       │ └──────────────────────────────┘ │
                       └──────────────────────────────────┘
```

### Ring escalation

| Event | Inner catches? | CI catches? | CD catches? | Fleet catches? |
|-------|---------------|-------------|-------------|---------------|
| Developer removes guardrail | Yes (watch) | Yes (pinch) | Yes (comply) | Yes (drift) |
| Developer uses `--no-verify` | No | Yes (CI backstop) | Yes | Yes |
| Bot PR adds bad config | No | Yes | Yes | Yes |
| Platform upgrade breaks config | No | Maybe (if PR) | Yes (doctor) | Yes (drift) |
| Policy broadcast changes rules | No | Yes (next PR) | Yes | Yes (compliance) |
| Cross-workspace drift over time | No | No | No | Yes (drift scan) |

### The 70/20/10 becomes 70/25/5

With CI/CD in the model:
- **Inner ring (local)**: catches 70% of scenarios instantly
- **CI/CD ring (Stages 1+2)**: catches 25% (the backstop for bypassed hooks, external contributors, compliance evidence)
- **Outer ring (fleet)**: catches 5% (accumulated drift, cross-workspace inconsistency)

The CI/CD ring is not a "fourth ring" — it is the enforcement mechanism for the inner and middle rings. Pre-commit (Stage 0) is inner ring. PR check (Stage 1) is inner ring enforcement. CD gate (Stage 2) is middle ring enforcement. Fleet scan (Stage 3) is outer ring.

---

## Latency Budget Visualization

```
Stage 0: Pre-commit     ████░░░░░░░░░░░░░░░░░░░░░░░░░░  <1s target, 2s cap
Stage 1: PR check       ████████████████░░░░░░░░░░░░░░  <30s target, 60s cap
Stage 2: CD gate        ████████████████░░░░░░░░░░░░░░  <30s target, 120s cap
Stage 3: Fleet scan     ██████████████████████████████  <300s target, 600s cap
                         0s   30s   60s   120s  300s 600s
```

### What makes each stage fast

| Stage | Latency technique |
|-------|-------------------|
| Pre-commit | `--staged` (only changed files), local cache, no network |
| PR check | `--diff` (only PR files), CI cache restore, skip unchanged |
| CD gate | Full workspace but cached from Stage 1, compile cache hit |
| Fleet scan | Parallel matrix (N workspaces concurrently), cache per workspace |

---

## Error Recovery

### Stage 0 failure recovery

```bash
# Violation found on commit
$ git commit -m "add web-search skill"
  glint: 1 violation
  G2: Skill 'web-search' declared as T3 but workspace is T2

$ glint pinch --fix    # Auto-remediate
  Fixed: SKILLS.md — downgraded 'web-search' to T2

$ git add SKILLS.md && git commit -m "add web-search skill (T2)"
  glint: 0 violations ✓
```

### Stage 1 failure recovery

```
PR check fails → developer sees inline SARIF annotations on PR diff
→ developer runs `glint pinch --fix` locally
→ pushes fix to PR branch
→ CI re-runs → passes
→ merge unblocked
```

### Stage 2 failure recovery

```
CD gate fails → deployment blocked
→ alert to governance team
→ team reviews compliance gap
→ fix applied to main via PR (goes through Stage 0 + 1)
→ new release tag → CD gate passes
```

### Stage 3 failure recovery

```
Fleet scan finds drift → issue auto-created
→ platform engineer reviews drift
→ either: glint pinch --fleet --fix (auto-fix across fleet)
→ or: glint broadcast (re-push policies)
→ next week's scan confirms remediation
```

---

## References

| Source | Contribution |
|--------|-------------|
| Q12e (three-ring model) | Inner/middle/outer ring architecture |
| exp-b (glint action design) | Action schema, workflow examples |
| inv-a (CI/CD landscape) | Patterns from existing tools |
| GLINT-MAP.md | Command surface, flags |
| GLINT-PITFALLS.md | 23 pitfalls mapped to pipeline stages |
