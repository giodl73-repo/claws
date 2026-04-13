# Fleet Compliance

<!-- atom:fleet-compliance -->

## Overview

Fleet compliance evaluates governed workspaces against one or more regulatory frameworks, producing a workspace-by-framework matrix. It answers the fleet-level question: which workspaces meet which standards, and where are the gaps? Ungoverned workspaces are excluded from compliance metrics to prevent inflated pass rates.

---

## Workspace x Framework Matrix

The compliance report is structured as a matrix where rows are governed workspaces and columns are regulatory frameworks:

| Workspace | SOC2 | HIPAA | EU AI Act | Overall |
|-----------|------|-------|-----------|---------|
| billing-agent | PASS | PASS | PASS | PASS |
| hr-assistant | PASS | FAIL | PASS | FAIL |
| research-bot | PASS | N/A | PASS | PASS |

**Overall compliance** requires all targeted frameworks to pass. A workspace passing SOC2 but failing HIPAA is non-compliant overall. This prevents cherry-picking passing frameworks to mask gaps. *(Source: fleet-operations S06-F01)*

---

## Ungoverned Exclusion

Ungoverned workspaces (state = UNGOVERNED from fleet scan) are **excluded** from compliance percentage calculations. Without this rule, a fleet with 3 governed workspaces passing and 7 ungoverned workspaces would report "100% compliant" despite 70% of the fleet having zero governance.

The compliance report includes an ungoverned count as a separate metric so operators see the true coverage picture. *(Source: fleet-operations S06-F02, P-180)*

---

## Evidence Signing

Compliance reports can serve as audit evidence. To support this:

- Reports include a generation timestamp and scan snapshot reference
- Report manifests are signed with HMAC-SHA256 (same mechanism as snapshot signing)
- A **validity window** ties the report to the scan snapshot that generated it -- reports older than the window require a fresh scan

This prevents presenting stale compliance data to auditors. *(Source: fleet-operations S06-F04)*

---

## Output Formats

`claws comply --fleet` supports multiple output formats:

| Format | Flag | Use case |
|--------|------|----------|
| JSON | `--format json` | CI/CD integration, programmatic consumption |
| CSV | `--format csv` | Spreadsheet import, executive reporting |
| Table | `--format table` | Terminal display (default) |
| SARIF | `--format sarif` | Security toolchain integration |

JSON and CSV are the minimum required formats. SARIF support aligns with drift findings output. *(Source: fleet-operations S06-F05)*

---

## Cross-Framework Deduplication

When multiple frameworks evaluate the same underlying governance rule (e.g., both SOC2 CC6.1 and HIPAA 164.312 check access controls), the compliance engine deduplicates rule evaluation. Each rule runs once; results are mapped to all applicable frameworks. This prevents redundant computation and ensures consistent verdicts across frameworks. *(Source: fleet-operations S06-F06)*

---

## History Storage

Compliance results are stored in fleet history for trend analysis:

- Historical reports are append-only (never modified after generation)
- Trend queries support time-range filtering
- History enables compliance regression detection: a workspace that was passing last week but fails today triggers an alert

*(Source: fleet-operations S06-F07)*

---

## Related Concepts

- [Fleet Scan](fleet-scan.md) -- provides the workspace inventory compliance operates on
- [Fleet Drift](fleet-drift.md) -- drift detection complements compliance (configuration vs policy)
- [Audit Chain](audit-chain.md) -- compliance evidence feeds the audit trail
