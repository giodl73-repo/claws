---
role: claws:platform-eng
round: 1
plan: claws-sdk-graduation
date: 2026-04-11
verdict: CONDITIONAL — 2 MUST findings on fleet mixed-mode operations and sidecar ownership
tension: "Fleet consistency > workspace autonomy"
---

# R1 Review — claws:platform-eng — claws-sdk-graduation

## Summary

The graduation plan creates a freemium boundary that directly affects fleet operations. Today all 47 workspaces run the same package (`@bic/claws-sdk`). After graduation, some workspaces may run the free tier (`@claws/compiler`) while others run the paid tier. The plan does not address this mixed-mode fleet scenario. From a platform-eng perspective, `claws drift` must detect tier mismatch, `claws broadcast` must handle both package types, and `claws doctor --post-upgrade --fleet` must upgrade workspaces to the correct tier. The free tier's "detect 7, emit 1" design also creates operational confusion when platform-eng runs fleet-wide compliance scans.

## Findings

### M-01: Mixed-tier fleet operations are unaddressed — drift, broadcast, and upgrade will break

**Severity**: MUST

After graduation, a fleet of 47 workspaces could have a mix of `@claws/compiler` (free) and `@bic/claws-sdk` (paid) installations. The plan does not address:

1. **`claws drift`**: Currently compares workspace configs against a fleet baseline. After graduation, drift detection must distinguish between "workspace diverged from policy" and "workspace is on the free tier and lacks enterprise features." A free-tier workspace without SIEM export is not drift — it is expected. But a paid-tier workspace without SIEM export IS drift. The drift detector needs tier-awareness.

2. **`claws broadcast`**: Pushes policy updates to all workspaces. If a policy update references an enterprise feature (e.g., PRESS compression profile), broadcasting to a free-tier workspace will either fail silently or produce an error. Neither is acceptable at fleet scale.

3. **`claws doctor --post-upgrade --fleet`**: Monthly upgrade across all workspaces. After graduation, the upgrade must install the correct package for each workspace's tier. If a workspace was on `@bic/claws-sdk@1.2.0` and the new version is `@bic/claws-sdk@1.3.0`, the upgrade is straightforward. But if that workspace was migrated to the free tier mid-cycle, `doctor` must install `@claws/compiler@1.3.0` instead.

**Action**: Add a "Fleet Mixed-Mode" section to the plan that addresses tier detection in fleet commands. At minimum: (a) `claws scan` reports which tier each workspace runs, (b) `claws broadcast` filters policies by tier compatibility, (c) `claws drift` uses tier-specific baselines. This is enterprise-tier functionality but must be designed during graduation to avoid retrofitting.

### M-02: Sidecar (.claws) ownership split is unclear — who writes, who reads?

**Severity**: MUST

The plan lists ".claws sidecar (own impl)" in the free tier and says "Rewrite: own sidecar resolver, no FORMA dependency. ~200 lines." But the sidecar directory is also used by fleet operations (paid tier) for snapshot metadata, compliance signatures, and drift baselines. If the free tier owns the sidecar implementation and the paid tier extends it, there must be a clear contract for:

1. **Which files in `.claws/` are written by the free tier**: compilation cache, governance analysis, sidecar config.
2. **Which files are written by the paid tier**: compliance signatures, fleet sync metadata, snapshot manifests, PRESS cache.
3. **What happens when a paid-tier sidecar is opened by the free tier**: Does the free tier ignore unknown files? Error on them? Corrupt them by writing a partial sidecar?

The sidecar is the on-disk contract between tiers. If a workspace downgrades from paid to free (e.g., license expires), the free tier must not destroy paid-tier sidecar data. This is the `.claws` equivalent of database migration compatibility.

**Action**: Define a sidecar schema with namespaced directories: `.claws/core/` (free tier owns), `.claws/enterprise/` (paid tier owns). Free tier never reads or writes `.claws/enterprise/`. Paid tier reads `.claws/core/` and extends it. Document this in the internalization table.

### W-01: Detection for 7 platforms but emission to 1 creates "why not?" friction in fleet operations

**Severity**: WARN

The free tier detects all 7 platforms (OC, Cursor, Copilot, etc.) but only emits to OC. From a fleet perspective, this creates an operational puzzle. When platform-eng runs `claws scan --fleet` and sees "12 workspaces: 8 OpenClaw, 3 Cursor, 1 Copilot," the natural next step is `claws broadcast --fleet`. But broadcast cannot push governance to the Cursor workspaces because the free tier only emits OC plugins. The scan shows a problem; the tool cannot fix it.

This is not architecturally wrong — it is a deliberate upsell. But it creates support burden. Platform-eng will file tickets asking why `claws` can see a Cursor workspace but cannot govern it. The plan should acknowledge this UX friction and propose mitigation (e.g., the free tier shows "Cursor detected — upgrade to @bic/claws-sdk for Cursor governance emission" in scan output).

**Action**: Add a "Tier Boundary UX" subsection that defines the messaging when free-tier commands encounter enterprise-only capabilities. Every enterprise-only capability should have a specific free-tier message, not a generic "upgrade" prompt.

### W-02: Loss matrix split (free detects, paid routes) needs explicit documentation for platform-eng onboarding

**Severity**: WARN

The current astro compiler has a loss matrix that tracks what governance guarantees are maintained or lost when compiling to each platform. After graduation, the loss matrix splits:

- **Free tier**: Detects platform, reports loss matrix for OC only. For other platforms, reports "detection only — no governance emission available."
- **Paid tier**: Full loss matrix across all emitted platforms.

Platform-eng relies on the loss matrix to decide which workspaces need additional manual governance. If the free tier shows a loss matrix for Cursor (because it can detect Cursor) but that matrix is meaningless (because it cannot emit to Cursor), platform-eng will make incorrect decisions. The free tier should either (a) not show a loss matrix for non-OC platforms, or (b) show it with a clear "informational only — no enforcement available" qualifier.

**Action**: Document the loss matrix behavior per tier. Free tier: loss matrix for OC only. Paid tier: loss matrix for all emitted platforms. No partial/misleading loss matrices.

### W-03: `claws comply --fleet` must work across tier boundaries

**Severity**: WARN

Compliance scans (`claws comply --sign`) are a paid-tier feature. But `claws comply --fleet` aggregates compliance status across all workspaces. After graduation, free-tier workspaces cannot produce compliance evidence (no SOC2, HIPAA, EU AI Act modules). The fleet compliance report must either:

(a) Exclude free-tier workspaces with a clear "N workspaces excluded — free tier, no compliance data" line.
(b) Include free-tier workspaces with a "non-compliant — no governance enforcement" status.

Option (b) is operationally dangerous — it conflates "we chose not to govern this workspace" with "this workspace is out of compliance." Option (a) is correct but must be documented.

**Action**: Specify that fleet compliance commands report free-tier workspaces as "ungoverned" (not "non-compliant") with a workspace count. This is a semantic distinction that matters for audit reports.

### W-04: CI/CD action (`@bic/claws-action`) must handle both package types

**Severity**: WARN

The GitHub Action (`@bic/claws-action`) runs `claws pinch --ci` in every PR. After graduation, some repos will have `@claws/compiler` and others will have `@bic/claws-sdk`. The action must detect which package is installed and adjust its behavior:

- Free tier: `claws pinch --ci` runs with free rules only.
- Paid tier: `claws pinch --ci` runs with enterprise rules + compliance checks.

If the action always assumes the paid tier is installed, it will fail on free-tier repos. If it always assumes the free tier, it will skip enterprise checks on paid-tier repos.

**Action**: Add the CI/CD action to the Phase 2 package split scope. The action should auto-detect the installed tier and adjust its check set accordingly.

### W-05: Workspace tier downgrade (paid to free) must preserve compilation history

**Severity**: WARN

When a license expires and a workspace reverts from paid to free, the compilation history (audit chain, compliance snapshots, fleet sync metadata) becomes inaccessible to the free tier. Platform-eng needs to know: Can the free tier still read the audit chain it created before the downgrade? Can `claws pinch` still verify past compilations?

If the free tier uses HMAC-only audit and the paid tier uses Ed25519, a downgrade means the free tier cannot verify Ed25519-signed entries in the chain. The chain becomes partially unverifiable.

**Action**: Specify the downgrade behavior in the plan. At minimum: free tier can read (but not verify) Ed25519 entries, and the audit chain continues with HMAC entries appended after the downgrade point. The chain should never become corrupted by a tier change.

### N-01: `claws pinch` producing identical output across tiers is a strong operational guarantee

**Severity**: NOTE

The plan's H3 validation ("claws pinch produces identical output regardless of which package is installed") is the right contract for platform-eng. It means the core governance analysis is tier-independent. Fleet reporting can aggregate pinch results across mixed-tier workspaces without normalization. This is the most important operational guarantee in the plan — preserve it.

### N-02: The freemium boundary aligns well with the three-ring operational model

**Severity**: NOTE

The three-ring model (watch/doctor/drift) maps cleanly to the tier split. `claws watch` (daily, workspace-level) works on both tiers. `claws doctor` and `claws drift` (fleet-level) are enterprise-only. This means individual developers can use the free tier for their own workspaces, and platform-eng upgrades to paid when managing the fleet. The adoption path is natural: individual use (free) leads to team adoption leads to fleet management (paid).

### N-03: 5-week core internalization timeline does not include fleet compatibility testing

**Severity**: NOTE

The 5-week estimate covers core internalization. Fleet compatibility testing (mixed-tier scan, broadcast, drift, comply) is enterprise-tier work and not in scope for core internalization. But it must be scheduled immediately after Phase 1, before Phase 3 (publish). Publishing the free tier before fleet commands handle mixed-tier scenarios would break platform-eng workflows.

**Action**: Add a dependency note: "Phase 3 (Publish) is blocked by fleet mixed-mode compatibility testing in the paid tier." This is not additional work for the graduation plan itself, but a sequencing constraint.

## Verdict

The freemium boundary is operationally sound for single-workspace use. The two MUST findings address fleet-scale gaps that must be designed (not necessarily implemented) during graduation planning. Mixed-tier fleet operations (M-01) and sidecar ownership (M-02) are the kind of problems that cost 3x to fix if discovered after the free tier is published. The WARN findings are implementation details that can be resolved during Phase 2-3, but each should be captured as a deliverable or scenario to prevent it from falling through the cracks.

| Severity  | Count  |
| --------- | ------ |
| MUST      | 2      |
| WARN      | 5      |
| NOTE      | 3      |
| **Total** | **10** |
