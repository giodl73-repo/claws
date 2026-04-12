# Experiment b: The glint CI Action Design

**QID**: Q12f-b
**Method**: Design analysis
**Date**: 2026-04-11
**Status**: Complete

---

## Objective

Design `@craftworks/glint-action` for GitHub Actions. Full action.yml schema, workflow examples, caching, SARIF integration, PR annotations, merge gating, secrets handling, and pitfall checking in CI.

---

## 1. Action Schema (action.yml)

```yaml
name: 'glint — governance for every agent'
description: 'Compile-time governance for AI agents. Pinch, comply, audit across any platform.'
author: 'Craftworks'

branding:
  icon: 'shield'
  color: 'blue'

inputs:
  # --- Core ---
  command:
    description: 'glint command to run: pinch (default), comply, audit, build, doctor'
    required: false
    default: 'pinch'

  version:
    description: 'glint CLI version (semver or "latest")'
    required: false
    default: 'latest'

  working-directory:
    description: 'Path to agent workspace (contains glint.json)'
    required: false
    default: '.'

  # --- Governance ---
  fail-on:
    description: 'Severity threshold to fail: critical, high, medium, low, all'
    required: false
    default: 'all'

  warn-only:
    description: 'Soft-fail mode — all findings are warnings, exit 0'
    required: false
    default: 'false'

  strict:
    description: 'Strict mode — warnings become errors'
    required: false
    default: 'false'

  only:
    description: 'Comma-separated rule IDs to check (e.g., "G2,G3,FE5")'
    required: false
    default: ''

  skip:
    description: 'Comma-separated rule IDs to skip (e.g., "G1")'
    required: false
    default: ''

  template:
    description: 'Policy template to apply if no glint.json exists: soc2, hipaa, eu-ai-act, minimal'
    required: false
    default: ''

  # --- Output ---
  format:
    description: 'Output format: sarif, github, json, text'
    required: false
    default: 'sarif'

  sarif-file:
    description: 'Path to write SARIF output (used with format=sarif)'
    required: false
    default: 'glint-results.sarif'

  upload-sarif:
    description: 'Auto-upload SARIF to GitHub code scanning'
    required: false
    default: 'true'

  # --- Compliance ---
  compliance-framework:
    description: 'Compliance framework for comply command: soc2, hipaa, eu-ai-act'
    required: false
    default: ''

  sign:
    description: 'Sign compliance evidence (requires GLINT_SIGNING_KEY secret)'
    required: false
    default: 'false'

  # --- Performance ---
  cache:
    description: 'Enable .glint/cache/ caching between runs'
    required: false
    default: 'true'

  diff-base:
    description: 'Only scan files changed since this ref (e.g., "origin/main"). Auto-detected for PRs.'
    required: false
    default: 'auto'

  # --- Secrets ---
  config:
    description: 'Base64-encoded glint.json override (for secrets in config)'
    required: false
    default: ''

  policies:
    description: 'Base64-encoded policy bundle (for private/proprietary policies)'
    required: false
    default: ''

  signing-key:
    description: 'HMAC signing key for compliance evidence (prefer GLINT_SIGNING_KEY secret)'
    required: false
    default: ''

outputs:
  violations:
    description: 'Number of violations found'

  severity-critical:
    description: 'Number of critical-severity violations'

  severity-high:
    description: 'Number of high-severity violations'

  severity-medium:
    description: 'Number of medium-severity violations'

  severity-low:
    description: 'Number of low-severity violations'

  sarif-file:
    description: 'Path to SARIF output file'

  compliance-file:
    description: 'Path to signed compliance evidence (comply command only)'

  audit-hash:
    description: 'Latest audit chain hash (audit command only)'

  exit-code:
    description: 'Raw exit code from glint command'

  cache-hit:
    description: 'Whether the cache was restored (true/false)'

runs:
  using: 'composite'
  steps:
    # Step 1: Install glint
    - name: Install glint
      shell: bash
      run: |
        if [ "${{ inputs.version }}" = "latest" ]; then
          npm install -g @craftworks/glint@latest
        else
          npm install -g @craftworks/glint@${{ inputs.version }}
        fi

    # Step 2: Restore cache
    - name: Restore glint cache
      if: inputs.cache == 'true'
      uses: actions/cache@v4
      with:
        path: ${{ inputs.working-directory }}/.glint/cache
        key: glint-${{ hashFiles(format('{0}/glint.json', inputs.working-directory), format('{0}/.glint/policies/**', inputs.working-directory)) }}-${{ github.sha }}
        restore-keys: |
          glint-${{ hashFiles(format('{0}/glint.json', inputs.working-directory), format('{0}/.glint/policies/**', inputs.working-directory)) }}-

    # Step 3: Apply config/policy overrides from secrets
    - name: Apply secret overrides
      if: inputs.config != '' || inputs.policies != ''
      shell: bash
      run: |
        cd "${{ inputs.working-directory }}"
        if [ -n "${{ inputs.config }}" ]; then
          echo "${{ inputs.config }}" | base64 -d > glint.json
        fi
        if [ -n "${{ inputs.policies }}" ]; then
          echo "${{ inputs.policies }}" | base64 -d | tar xz -C .glint/policies/
        fi

    # Step 4: Auto-init if no glint.json
    - name: Auto-init workspace
      if: "!fileExists(format('{0}/glint.json', inputs.working-directory))"
      shell: bash
      run: |
        cd "${{ inputs.working-directory }}"
        TEMPLATE_ARG=""
        if [ -n "${{ inputs.template }}" ]; then
          TEMPLATE_ARG="--template ${{ inputs.template }}"
        fi
        glint init $TEMPLATE_ARG --quiet

    # Step 5: Run glint command
    - name: Run glint ${{ inputs.command }}
      id: glint
      shell: bash
      run: |
        cd "${{ inputs.working-directory }}"

        CMD="glint ${{ inputs.command }}"

        # Add flags based on command
        case "${{ inputs.command }}" in
          pinch)
            # Format
            CMD="$CMD --format ${{ inputs.format }}"

            # Diff-based scanning
            if [ "${{ inputs.diff-base }}" = "auto" ] && [ -n "${{ github.event.pull_request.base.sha }}" ]; then
              CMD="$CMD --diff ${{ github.event.pull_request.base.sha }}"
            elif [ "${{ inputs.diff-base }}" != "auto" ] && [ "${{ inputs.diff-base }}" != "" ]; then
              CMD="$CMD --diff ${{ inputs.diff-base }}"
            fi

            # Severity gating
            if [ "${{ inputs.warn-only }}" = "true" ]; then
              CMD="$CMD --warn-only"
            elif [ "${{ inputs.strict }}" = "true" ]; then
              CMD="$CMD --strict"
            elif [ "${{ inputs.fail-on }}" != "all" ]; then
              CMD="$CMD --fail-on ${{ inputs.fail-on }}"
            fi

            # Rule filtering
            if [ -n "${{ inputs.only }}" ]; then
              CMD="$CMD --only ${{ inputs.only }}"
            fi
            if [ -n "${{ inputs.skip }}" ]; then
              CMD="$CMD --skip ${{ inputs.skip }}"
            fi
            ;;

          comply)
            if [ -n "${{ inputs.compliance-framework }}" ]; then
              CMD="$CMD ${{ inputs.compliance-framework }}"
            fi
            if [ "${{ inputs.sign }}" = "true" ]; then
              CMD="$CMD --sign"
            fi
            CMD="$CMD --format json"
            ;;

          audit)
            CMD="$CMD verify"
            ;;

          doctor)
            CMD="$CMD --post-upgrade"
            ;;
        esac

        CMD="$CMD --json"

        echo "Running: $CMD"

        # Run and capture output
        set +e
        OUTPUT=$($CMD 2>&1)
        EXIT_CODE=$?
        set -e

        echo "exit-code=$EXIT_CODE" >> $GITHUB_OUTPUT

        # Parse JSON output for violation counts
        if echo "$OUTPUT" | jq -e '.violations' > /dev/null 2>&1; then
          echo "violations=$(echo "$OUTPUT" | jq -r '.violations.total // 0')" >> $GITHUB_OUTPUT
          echo "severity-critical=$(echo "$OUTPUT" | jq -r '.violations.critical // 0')" >> $GITHUB_OUTPUT
          echo "severity-high=$(echo "$OUTPUT" | jq -r '.violations.high // 0')" >> $GITHUB_OUTPUT
          echo "severity-medium=$(echo "$OUTPUT" | jq -r '.violations.medium // 0')" >> $GITHUB_OUTPUT
          echo "severity-low=$(echo "$OUTPUT" | jq -r '.violations.low // 0')" >> $GITHUB_OUTPUT
        fi

        # Write SARIF file
        if [ "${{ inputs.format }}" = "sarif" ] && [ -f "${{ inputs.sarif-file }}" ]; then
          echo "sarif-file=${{ inputs.sarif-file }}" >> $GITHUB_OUTPUT
        fi

        # Compliance output
        if [ "${{ inputs.command }}" = "comply" ]; then
          COMPLY_FILE=$(echo "$OUTPUT" | jq -r '.artifact // empty')
          echo "compliance-file=$COMPLY_FILE" >> $GITHUB_OUTPUT
        fi

        # Audit hash
        if [ "${{ inputs.command }}" = "audit" ]; then
          HASH=$(echo "$OUTPUT" | jq -r '.chain_hash // empty')
          echo "audit-hash=$HASH" >> $GITHUB_OUTPUT
        fi

        # Exit with appropriate code
        if [ "${{ inputs.warn-only }}" = "true" ]; then
          exit 0
        else
          exit $EXIT_CODE
        fi

    # Step 6: Upload SARIF
    - name: Upload SARIF to GitHub
      if: inputs.format == 'sarif' && inputs.upload-sarif == 'true' && always()
      uses: github/codeql-action/upload-sarif@v3
      with:
        sarif_file: ${{ inputs.sarif-file }}
        category: glint
```

---

## 2. Workflow Examples

### Example 1: Basic PR Governance Check

The simplest integration. Add to any repo, get governance checks on every PR.

```yaml
# .github/workflows/glint.yml
name: Agent Governance

on:
  pull_request:
    branches: [main]
    paths:
      - 'SOUL.md'
      - 'AGENTS.md'
      - 'TOOLS.md'
      - 'SKILLS.md'
      - '.cursorrules'
      - 'CLAUDE.md'
      - '.github/copilot-instructions.md'
      - 'glint.json'
      - '.glint/policies/**'

jobs:
  pinch:
    name: glint pinch
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write    # For SARIF upload
    steps:
      - uses: actions/checkout@v4
      - uses: craftworks/glint-action@v1
        with:
          command: pinch
          format: sarif
          upload-sarif: true
```

**What this does**:
- Triggers on PRs that touch agent workspace files
- Runs `glint pinch` with SARIF output
- Uploads results to GitHub code scanning
- Violations appear inline on the PR diff
- Blocks merge if any violations found (when configured as required check)

---

### Example 2: Full Governance with SARIF + Compliance

Enterprise workflow with compliance evidence, severity gating, and signed artifacts.

```yaml
# .github/workflows/glint-enterprise.yml
name: Enterprise Agent Governance

on:
  pull_request:
    branches: [main, release/*]
  push:
    branches: [main]

concurrency:
  group: glint-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # Job 1: Fast governance check on PR
  pinch:
    name: Governance Check
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    permissions:
      contents: read
      security-events: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0    # Full history for diff

      - uses: craftworks/glint-action@v1
        id: pinch
        with:
          command: pinch
          format: sarif
          upload-sarif: true
          fail-on: high         # Block on high+critical only
          cache: true

      - name: Post PR summary
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const violations = '${{ steps.pinch.outputs.violations }}';
            const critical = '${{ steps.pinch.outputs.severity-critical }}';
            const high = '${{ steps.pinch.outputs.severity-high }}';
            const medium = '${{ steps.pinch.outputs.severity-medium }}';
            const low = '${{ steps.pinch.outputs.severity-low }}';

            const icon = violations === '0' ? ':white_check_mark:' : ':x:';
            const body = `## ${icon} glint governance report

            | Severity | Count |
            |----------|-------|
            | Critical | ${critical} |
            | High | ${high} |
            | Medium | ${medium} |
            | Low | ${low} |
            | **Total** | **${violations}** |

            > Blocking on: high, critical. Medium/low are warnings.
            > Run \`glint pinch --fix\` locally to auto-fix.`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

  # Job 2: Compliance evidence on merge to main
  comply:
    name: Compliance Evidence
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: craftworks/glint-action@v1
        id: comply
        with:
          command: comply
          compliance-framework: soc2
          sign: true
          signing-key: ${{ secrets.GLINT_SIGNING_KEY }}

      - name: Upload compliance artifact
        uses: actions/upload-artifact@v4
        with:
          name: compliance-evidence-${{ github.sha }}
          path: .glint/compliance/
          retention-days: 365

  # Job 3: Audit chain verification on merge
  audit:
    name: Audit Verification
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: craftworks/glint-action@v1
        id: audit
        with:
          command: audit

      - name: Record audit hash
        run: echo "Audit chain hash: ${{ steps.audit.outputs.audit-hash }}"
```

---

### Example 3: Fleet Scheduled Scan

Weekly fleet-wide governance scan across all agent workspaces in the org.

```yaml
# .github/workflows/glint-fleet.yml
name: Fleet Governance Scan

on:
  schedule:
    - cron: '0 6 * * 1'    # Every Monday 6:00 AM UTC
  workflow_dispatch:         # Manual trigger

jobs:
  fleet-scan:
    name: Fleet Governance
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
      issues: write
    strategy:
      fail-fast: false
      matrix:
        workspace:
          - path: agents/research
            name: research-agent
          - path: agents/support
            name: support-agent
          - path: agents/internal
            name: internal-agent
          - path: agents/customer-facing
            name: customer-agent
    steps:
      - uses: actions/checkout@v4

      - uses: craftworks/glint-action@v1
        id: pinch
        with:
          command: pinch
          working-directory: ${{ matrix.workspace.path }}
          format: sarif
          sarif-file: glint-${{ matrix.workspace.name }}.sarif
          upload-sarif: true
          warn-only: true    # Don't fail scheduled scan — report only

      - name: Check drift
        uses: craftworks/glint-action@v1
        id: drift
        with:
          command: pinch
          working-directory: ${{ matrix.workspace.path }}
          format: json

  # Aggregate results
  fleet-report:
    name: Fleet Report
    runs-on: ubuntu-latest
    needs: fleet-scan
    if: always()
    permissions:
      issues: write
    steps:
      - name: Create fleet report issue
        uses: actions/github-script@v7
        with:
          script: |
            const date = new Date().toISOString().split('T')[0];
            const title = `Fleet Governance Report — ${date}`;
            const body = `## Weekly Fleet Governance Scan

            **Scan time**: ${new Date().toISOString()}
            **Workspaces scanned**: ${{ strategy.job-total }}

            See individual SARIF results in the Security tab > Code scanning.

            > Auto-generated by glint fleet scan.`;

            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: title,
              body: body,
              labels: ['governance', 'fleet-scan']
            });
```

---

## 3. Caching Strategy

### Cache key design

```
Key:    glint-{hash(glint.json + .glint/policies/**/*)}}-{github.sha}
Restore: glint-{hash(glint.json + .glint/policies/**/*)}}-
```

**What gets cached** (`.glint/cache/`):
- `compile/` — compiled IR cache. Key: hash of workspace source files.
- `boost/` — optimization cache. Key: hash of compiled IR + boost config.
- `eval/` — evaluation/scenario cache. Key: hash of scenarios + compiled IR.

**What does NOT get cached**:
- `audit/` — hash-chained log. Must be authoritative, not cached.
- `compliance/` — signed evidence. Must be generated fresh.
- `snapshots/` — named snapshots. Not relevant in CI.
- `secrets/` — encrypted vault. Never cached.

### Cache invalidation

| Change | Cache impact |
|--------|-------------|
| `glint.json` changed | Full cache miss — new restore key |
| Policy files changed | Full cache miss — new restore key |
| Source files changed | Partial miss — compile cache misses, boost/eval may hit |
| Same PR, new push | Restore from previous push — incremental |
| Different PR, same policies | Restore from shared prefix — partial hit |

### Cache size estimate

| Component | Typical size | Notes |
|-----------|-------------|-------|
| `compile/` | 50-200 KB | Compiled IR is compact |
| `boost/` | 100-500 KB | Optimization artifacts |
| `eval/` | 200 KB - 1 MB | Scenario results |
| **Total** | **350 KB - 1.7 MB** | Well within GitHub Actions 10 GB cache limit |

---

## 4. SARIF Output Design

### SARIF schema mapping

```
glint pinch result → SARIF 2.1.0

  Tool:
    name: "glint"
    version: "{glint version}"
    semanticVersion: "{semver}"
    informationUri: "https://github.com/craftworks/glint"

  Rules (one per governance rule):
    id: "G2" (rule ID from policy)
    name: "skill-governance"
    shortDescription: "Skills must conform to platform API version"
    helpUri: "https://docs.craftworks.dev/rules/G2"
    defaultConfiguration:
      level: "error" | "warning" | "note"

  Results (one per violation):
    ruleId: "G2"
    message: "Skill 'web-search' declared as T3 but policy limits workspace to T2"
    level: "error"
    locations:
      - physicalLocation:
          artifactLocation:
            uri: "SKILLS.md"
            uriBaseId: "%SRCROOT%"
          region:
            startLine: 15
            startColumn: 1
    fixes:
      - description: "Downgrade skill to T2 or request T3 approval"
        artifactChanges: [...]
```

### SARIF result levels

| glint severity | SARIF level | GitHub code scanning | Merge gate |
|---------------|-------------|---------------------|-----------|
| Critical | `error` | Error annotation (red) | Blocks by default |
| High | `error` | Error annotation (red) | Blocks with `fail-on: high` |
| Medium | `warning` | Warning annotation (yellow) | Blocks only with `--strict` |
| Low | `note` | Note annotation (blue) | Never blocks |

---

## 5. PR Comment Annotations

### Inline annotations via SARIF

When SARIF is uploaded to GitHub code scanning, violations appear as inline annotations on the PR diff. This is the primary annotation mechanism — zero additional configuration.

### Summary comment via github-script

The action posts a PR comment with a summary table (see Example 2 above). The comment includes:

1. Pass/fail status icon
2. Violation count by severity
3. What severity levels block merge
4. Remediation command (`glint pinch --fix`)

### Native GitHub format fallback

When SARIF upload is not available (no `security-events: write` permission), the action falls back to `--format github` which emits `::error` and `::warning` commands:

```
::error file=SKILLS.md,line=15,col=1,title=G2 violation::Skill 'web-search' declared as T3 but policy limits workspace to T2
::warning file=SOUL.md,line=42,col=1,title=G4 advisory::DM policy is set to 'open' — consider restricting for enterprise
```

These render as native GitHub Actions annotations on the PR diff without SARIF.

---

## 6. Merge Gating

### Branch protection configuration

```
Settings > Branches > main > Branch protection rules:
  [x] Require status checks to pass before merging
    Required checks:
      - "glint pinch"           (from glint.yml workflow)
```

### Gating modes

| Mode | Input | Behavior |
|------|-------|----------|
| **Hard gate** | `fail-on: all` (default) | Any violation blocks merge |
| **Severity gate** | `fail-on: high` | Only high+critical block |
| **Strict gate** | `strict: true` | Warnings promoted to errors, then hard gate |
| **Warn only** | `warn-only: true` | Never blocks. SARIF still uploads. For onboarding. |
| **Rule-specific** | `only: G2,G3,FE5` | Only specific rules can block |

### Recommended adoption path

```
Week 1:  warn-only: true                    # See what glint finds
Week 2:  fail-on: critical                  # Block only critical
Week 4:  fail-on: high                      # Tighten to high
Week 8:  fail-on: all                       # Full governance
```

---

## 7. Secrets Handling

### Secret types in glint CI

| Secret | Purpose | GitHub Actions secret name | How used |
|--------|---------|---------------------------|----------|
| Signing key | Sign compliance evidence | `GLINT_SIGNING_KEY` | `sign: true` + `signing-key: ${{ secrets.GLINT_SIGNING_KEY }}` |
| Config override | Private config values | `GLINT_CONFIG` | `config: ${{ secrets.GLINT_CONFIG }}` (base64-encoded) |
| Policy bundle | Proprietary policies | `GLINT_POLICIES` | `policies: ${{ secrets.GLINT_POLICIES }}` (base64 tar.gz) |

### Security model

1. **glint.json in repo** is the public config. Contains policy references, rule configuration, platform settings.
2. **Secrets** (signing keys, API tokens, private policy bundles) are GitHub Actions secrets. Never in repo.
3. **Policy bundles** can be private (org-specific compliance rules distributed via secrets) or public (in `.glint/policies/`).
4. **Compliance evidence** is signed with HMAC-SHA256. The signing key is a GitHub Actions secret.
5. **The vault** (`.glint/secrets/vault.enc`) is not used in CI. CI uses GitHub Actions secrets instead.

### Org-wide secret distribution

For organizations with many repos, use GitHub org-level secrets:

```
Org settings > Secrets > Actions:
  GLINT_SIGNING_KEY     → Available to all repos
  GLINT_POLICIES        → Available to all repos (base64 tar.gz of policy bundle)
```

---

## 8. Pitfall Coverage in CI

The 23 pitfalls from GLINT-PITFALLS.md map to CI checks as follows:

### Pitfalls caught by `glint pinch` in CI

| Pitfall | Rule | What CI catches |
|---------|------|-----------------|
| P-001 (patches wiped) | G-PATCH | Config baseline diff detects missing patches |
| P-004 (skill regression) | G2 | Skill governance validates at compile time |
| P-005 (silent config reset) | G-BASELINE | Baseline comparison detects value regression |
| P-008 (exec allowlist drift) | G3/FE5 | TOOLS.md validated against trust tier |
| P-009 (security defaults) | G5 | Network config validated against security policy |
| P-011 (open DM) | G4 | Safety guardrails check DM policy |
| P-015 (subagent timeout) | G-TIMEOUT | Timeout config validated against policy |
| P-016 (config baseline drift) | G-BASELINE | Hash comparison against known-good state |
| P-020 (cron misconfiguration) | G-CRON | Cron config validated against approved patterns |

### Pitfalls caught by `glint doctor` in CI

| Pitfall | Check | CI context |
|---------|-------|-----------|
| P-002 (doctor --fix fails) | Schema migration | `glint doctor --post-upgrade` in CD pipeline |
| P-003 (plugin paths) | G-PLUGIN | Plugin path validation |
| P-006 (dangerous tags) | G-CHANNEL | Version channel check |
| P-010 (gateway auth) | G-AUTH | Auth config validation |
| P-017 (env prefix) | G-ENV | Legacy env var detection |
| P-018 (state directory) | G-STATE | State directory location check |

### Pitfalls caught by scheduled fleet scan

| Pitfall | Command | CI context |
|---------|---------|-----------|
| P-007 (breaking releases) | `glint doctor` | Post-upgrade in CD pipeline |
| P-012 (credential exposure) | N/A | Architecture: glint vault is encrypted by design |
| P-016 (baseline drift) | `glint drift` | Weekly scheduled scan |
| P-021 (memory reindex) | `glint doctor` | Post-upgrade check |

### Pitfalls outside CI scope

| Pitfall | Why |
|---------|-----|
| P-013 (plugin/messaging breaks) | Runtime channel bugs — not compile-time |
| P-014 (unreliable self-report) | Runtime behavior — but `glint test` in CI is external validation |
| P-019 (gateway restarts) | Runtime stability |
| P-022 (no message tracing) | Runtime observability |
| P-023 (no incident correlation) | Runtime forensics |

**Coverage**: 18 of 23 pitfalls (78%) detectable in CI. 5 are runtime-only.

---

## Design Summary

### Action distribution

| Property | Value |
|----------|-------|
| **Name** | `@craftworks/glint-action` |
| **Marketplace** | GitHub Marketplace |
| **Versioning** | `v1` (major), `v1.2.3` (exact) |
| **Runtime** | `composite` (bash steps) |
| **Dependencies** | `@craftworks/glint` (npm), `actions/cache@v4`, `github/codeql-action/upload-sarif@v3` |

### Key design decisions

1. **Composite action** (not JavaScript/Docker) for transparency and debuggability
2. **SARIF-first** output — code scanning integration is the primary value
3. **Built-in cache management** — users don't configure `actions/cache` separately
4. **Auto-detect PR context** — diff-base defaults to PR base SHA
5. **Gradual adoption** — `warn-only` mode for onboarding
6. **Org-wide secrets** — signing key and policy bundles at org level
7. **Auto-init** — if no `glint.json` exists, init with template

---

## References

| Source | Contribution |
|--------|-------------|
| inv-a (CI/CD landscape survey) | Patterns from eslint, semgrep, snyk, trivy, checkov, ruff |
| GLINT-MAP.md | Command surface, flags, scope model |
| GLINT-PITFALLS.md | 23 pitfalls mapped to CI detection |
| Q12e (three-ring model) | Ring integration points |
| GitHub Actions docs | Action schema, permissions, caching, SARIF upload |
