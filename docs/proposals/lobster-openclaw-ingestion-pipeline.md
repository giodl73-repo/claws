# OpenClaw Ingestion Pipeline — Design Spec

**Status**: Draft for dCISO exception review
**Date**: 2026-04-17
**Owner**: Gio Della-Libera (Agent 365 Tools engineering)
**Audience**: Aaron Zollman, Ilya Grebnov, Yonatan Zunger, Bryan Vorndran, Omar Shahine, Adam Sheppard
**Intent**: Stand up an automated, policy-gated ingestion path for OpenClaw packages into an isolated, Lobster-team-scoped Azure Artifacts feed. Buildable in one week.

---

## Goals

1. **Scale past manual curation.** Hundreds of transitive deps × bi-weekly LTS cadence = human-in-loop fails.
2. **Preserve security posture.** CG scan + quarantine + signed provenance on every promoted version.
3. **Lobster-only blast radius.** Feed ACL scoped to Lobster AAD group; no other team can pull from it.
4. **Fit the existing dCISO exception template.** Concrete, auditable, revocable.
5. **Provide Aaron a written design to attach to the S360 exception.**

## Non-goals

- **No org-wide unblock.** Option 1 from Aaron's 2026-04-10 mail stays off the table.
- **No Terrapin/CFS rule changes.** This is a new feed under existing exception rules, not a modification to CFS.
- **No fork of OpenClaw.** Pipeline consumes upstream LTS; Yonatan's fork-or-rewrite discussion stays a parallel strategic question.
- **No MEMORY.md or runtime governance.** Separate proposals (see `docs/claws/proposals/container-threat-model.md`).

---

## Architecture

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  OpenClaw LTS    │    │  Mirror Worker   │    │  Quarantine      │    │  Promotion       │
│  public npm      │───▶│  (pull + hash +  │───▶│  Store           │───▶│  Worker          │
│  @openclaw/*     │    │   scan)          │    │  7-day timer     │    │  (sign + audit)  │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
                                │                        │                        │
                                ▼                        ▼                        ▼
                        ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
                        │  Component       │    │  Audit Chain     │    │  Lobster Feed    │
                        │  Governance      │    │  (WAL + SIEM)    │    │  (Azure Artifacts│
                        │  Scanner         │    │                  │    │  tenant-scoped)  │
                        └──────────────────┘    └──────────────────┘    └──────────────────┘
```

**Flow**:

1. **Mirror worker** polls OpenClaw's LTS release feed (bi-weekly). For each new LTS tag, pulls the `@openclaw/*` package set + declared transitive deps from public npm. Computes SHA-256 per tarball. Writes to quarantine store with metadata `{version, source_url, pull_time, sha256, puller_identity}`.

2. **CG scanner** runs against every quarantined tarball: Terrapin-equivalent SCA, secret scan, malware scan, license check. Outputs `{passed: bool, findings: [...], scan_time}`. Rejection = package sits in quarantine with `status: rejected`, never promoted.

3. **Quarantine timer**: 7 days from ingest, unless emergency CVE fast-track (see §Emergency path). During quarantine, package is unreachable by any consumer.

4. **Promotion worker** runs daily. For each quarantined package that is (a) past 7-day timer AND (b) CG-clean: signs the package (Azure Artifacts native signing + SLSA-compatible provenance attestation), writes to the production feed, emits an audit event to the hash-chained log + SIEM.

5. **Lobster feed (Azure Artifacts)**: scoped to Lobster AAD group via upstream ACL. Production consumers (`npm install` / `pnpm install`) resolve `@openclaw/*` from here; everything else routes through the default CFS-gated feed.

---

## Components

### Mirror worker

- Language: TypeScript on Azure Container Apps (or a lightweight Function). Deployed to the Lobster-owned Azure subscription.
- Source-of-truth for "what to pull": a pinned LTS manifest file committed to the Lobster repo, updated only by an Lobster-eng PR (2-person review). No live-polling of public npm for "latest."
- Pull mechanism: `npm pack --registry=https://registry.npmjs.org/` with a managed identity that has read-only access to public npm (no credentials on disk).
- Output: tarball + metadata JSON written to quarantine blob store.

### CG scanner integration

- Wraps the existing Component Governance scanner API (Terrapin). No new scanner code.
- Scanner config: same ruleset as default CFS, plus a mandatory secret-scan + malware-scan pass.
- Timeout: 1 hour per package; on timeout, status = `scan_failed`, requires manual re-trigger.
- Scanner output stored with the package in quarantine for audit.

### Quarantine store

- Azure Blob Storage, immutable policy: 90-day retention on rejected packages for audit, 7-day minimum on promoted packages before deletion of staging copy.
- Schema per package:
  ```json
  {
    "name": "@openclaw/core",
    "version": "1.4.2-lts",
    "sha256": "…",
    "source_url": "https://registry.npmjs.org/…",
    "pulled_at": "2026-04-17T12:00:00Z",
    "scan_status": "clean | rejected | scan_failed | pending",
    "scan_findings": [],
    "quarantine_until": "2026-04-24T12:00:00Z",
    "promoted_at": null | "…",
    "provenance_url": null | "…"
  }
  ```

### Promotion worker

- Runs daily via cron trigger.
- Gate: `scan_status === 'clean' AND now > quarantine_until AND NOT promoted`.
- Signing: Azure Artifacts native package signing + SLSA provenance attestation written alongside the package (base64 JSON blob with `{builder, source, materials, timestamp}`).
- Audit event: hash-chained entry `{event: 'package_promoted', package, sha256, scan_id, signer, prev_hash}` written to Azure Storage WAL + forwarded to Sentinel.

### Target feed (Azure Artifacts, Lobster-scoped)

- New feed created under the Lobster project in the existing ADO organization.
- ACL: read + install restricted to `AAD group: Lobster-Engineering`. No public read, no tenant-wide read.
- Upstream sources: none. This feed is terminal — packages only arrive via the promotion worker, not via public-npm upstream fallthrough.
- Retention: last 10 LTS versions per package kept; older pruned (but audit chain retains provenance indefinitely).

---

## Policies

### LTS-only pinning

- Only versions tagged by OpenClaw maintainers as LTS are eligible for mirror. Non-LTS versions are not pulled.
- The LTS manifest file is the source of truth; emergency additions require a Lobster-eng PR + dCISO ack.

### 7-day quarantine

- All packages wait 7 calendar days from `pulled_at` before promotion, regardless of scan result.
- Quarantine period is the window for: upstream yank detection, out-of-band CVE disclosure, maintainer revocation.

### CG scan fail → reject

- Any CG finding at severity ≥ High halts promotion. Package sits with `scan_status: rejected`, audit event emitted, Lobster-eng notified.
- Medium/Low findings: promotion proceeds with findings recorded in audit metadata.

### Emergency CVE fast-track

- For CVE-fix releases, the 7-day quarantine may be shortened to 24 hours.
- Requires: (a) CVE ID attached to the LTS manifest PR, (b) 2-person approval from the dCISO-approved approver list (Aaron + one Lobster security liaison), (c) audit event flagged `quarantine_bypass: true`.
- Fast-tracked packages still must pass CG scan.

### Lobster-only ACL

- Feed access granted only to `AAD: Lobster-Engineering`. Membership changes are dCISO-auditable.
- No service-principal-to-service-principal sharing without dCISO review.

### Revocation

- Any promoted package can be recalled by dCISO-approved signed command. Recall removes the package from the feed, writes an audit event `{event: 'package_revoked', reason}`, and notifies all consuming pipelines.
- Recall is reversible within 30 days (re-promotion with a new provenance signature); after 30 days, the package must be re-mirrored from upstream.

---

## Security properties

| Property | How it's provided |
|----------|-------------------|
| Restricted access | AAD-group-scoped ACL on feed |
| Curated surface | LTS-only pin, no live-tracking of main |
| Auditable | Hash-chained audit log + SIEM export (CEF) |
| Tamper-evident | Per-package SHA-256 + Azure Artifacts signing + SLSA provenance |
| Revocable | Signed recall command with 30-day reversibility |
| Fail-closed | CG fail → no promotion. Quarantine timer → no bypass without 2-person approval. |
| Blast-radius-bounded | Lobster tenant only; org-wide unblock explicitly off the table |

---

## Operations

**Ownership**

- **Pipeline build + oncall**: Lobster engineering (primary: Gio's team). One named oncall per week.
- **Policy + exception authority**: dCISO (Aaron + Ilya).
- **Scanner integration**: Component Governance team (no new scanner code; integration only).
- **Feed administration**: ADO admins under the Lobster project.

**Monitoring**

- Metric: packages mirrored/day, scan pass rate, promotion latency, feed read rate.
- Alerts: scan failure streak, quarantine overdue, feed ACL drift, signing failure.
- Dashboard: Sentinel workbook, linked from the dCISO exception record.

**Escalation**

- CG finding High/Critical: auto-alert Lobster-eng + dCISO within 1 hour.
- Feed outage: Lobster-eng oncall, ADO ICM bridge.
- Exception-scope change request: goes through Aaron.

---

## Build plan — one week

| Day | Deliverable | Owner |
|-----|-------------|-------|
| Mon | Azure Artifacts feed + AAD ACL + audit-log Storage account + Sentinel workbook skeleton | Lobster-eng + ADO admin |
| Tue | Mirror worker v1: pulls from pinned LTS manifest, writes to quarantine blob | Lobster-eng |
| Wed | CG scanner integration: scan-on-ingest, status persisted to quarantine metadata | Lobster-eng + CG team |
| Thu | Promotion worker + signing + SLSA provenance emission | Lobster-eng |
| Fri | End-to-end test with `@openclaw/core` 1.x LTS through to Lobster feed; dashboard wired | Lobster-eng |
| Sat–Sun | Buffer / docs / handoff to oncall rotation | — |

**Prerequisites (must be in flight before Monday)**:

1. Azure Artifacts feed provisioning request filed (ADO project admin; ~1 day lead).
2. CG scanner API access (CG team; ~2 day lead).
3. dCISO exception paperwork drafted by Aaron, pointing at this spec (parallel track; signing can follow E2E test).

---

## What this gives each stakeholder

| Stakeholder | Concern | How this addresses it |
|-------------|---------|------------------------|
| **Ilya Grebnov** | Restricted-access, proper-not-hacky | AAD-scoped feed + automated pipeline + auditable |
| **Yonatan Zunger** | Curated surface, not bleeding-edge | LTS-only pin + 7-day quarantine + CG scan gate |
| **Bryan Vorndran** | Org-wide block preserved | No CFS rule change; exception is feed-local |
| **Aaron Zollman** | Concrete design for the S360 exception | This document + ownership/escalation spec |
| **Omar Shahine / Adam Sheppard** | Lobster ships on time for Build | 1-week build, no human-curation bottleneck |
| **CG team (Scovetta / Maxim)** | No modification to CFS capability | Consumes CG scanner as-is; no new tooling on their end |

---

## Open items (to lock in 30-min working session)

1. **Confirm CG scanner API** is callable from a Lobster-owned Container App / Function, or requires CG-team-hosted endpoint.
2. **LTS manifest PR review list**: who are the 2 required approvers?
3. **Emergency-CVE approver roster**: Aaron + who from Lobster?
4. **Sentinel workbook location**: Lobster subscription or dCISO tenant?
5. **Revocation authority**: which signed command format? dCISO existing infra, or new key?
6. **Transitive dep handling**: confirm that `@openclaw/*` closure lands in the Lobster feed and non-`@openclaw/*` deps (e.g., `zod`, `typescript`) continue to resolve from the default CFS-gated feed. If any openclaw dep is itself CFS-blocked, escalate for case-by-case review.
7. **Metric/alert thresholds**: default values to propose at the working session.

---

## Decision ask

- **Aaron**: does this spec provide sufficient concrete design to file the dCISO exception? What needs expansion?
- **Ilya**: does the 7-day quarantine + LTS-only pin + Lobster-only ACL satisfy the restricted-access bar?
- **Yonatan**: does the curated-surface posture (LTS, scan, quarantine, revocation) address the bleeding-edge concern?
- **Bryan**: any objection to the feed-local exception given no CFS rule change?
- **Omar / Adam**: Lobster eng commits to the one-week build + ongoing oncall. Confirm the team is resourced.

Target decision by end of week; build starts Monday contingent on dCISO exception approval in parallel.
