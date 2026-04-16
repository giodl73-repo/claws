---
role: claws:ciso
round: 1
scope: pulses 50-52 (claws-aether-integration)
lens: "blob tampering resistance, signature verification completeness, R5 non-negotiable enforcement, approval bypass vectors, audit trail for policy changes"
date: 2026-04-13
---

# R1 Review: claws:ciso -- Aether Integration (P50-P52)

## Summary

Pulses 50-52 bridge claws's compile-time governance with Aether's runtime approval infrastructure. The design is sound in its core principle -- risk classification computed once, consumed by both enforcement points. However, several gaps exist in tamper resistance, bypass vectors, and audit completeness that would prevent me from certifying this to an auditor in its current form.

---

## Findings

### M1: Missing signature on host-approval-policies.json (Pulse 50)

**Severity: MUST**

The plan adds `host-approval-policies.json` as a 5th emit artifact, but neither Pulse 50 nor the plan's emit pipeline explicitly sign this artifact. The `.claws-manifest.json` from Pulse 18/29 lists content hashes for governance artifacts, but the pulse deliverables do not include updating the manifest to cover the new artifact. An attacker who gains write access to the blob can replace `host-approval-policies.json` with a permissive version (all `requires_approval: false`) without triggering blob integrity verification.

**Recommendation**: Pulse 50 must include a deliverable ensuring `host-approval-policies.json` is listed in `.claws-manifest.json` with its SHA-256 content hash. The manifest signing in `claws publish` (Pulse 29/35) must be updated to include this artifact in the signed manifest. Without this, Pulse 51's blob integrity verification has a coverage gap -- it verifies what the manifest lists, but the new artifact may not be listed.

---

### M2: Backward compatibility weakens blob integrity to optional (Pulse 51)

**Severity: MUST**

Pulse 51 specifies: "Missing signature (pre-signing era) -> WARNING, not failure" and "Missing manifest entirely -> WARNING, load proceeds." While backward compatibility is pragmatically necessary, this creates a permanent downgrade attack: an attacker can simply delete the `.claws-manifest.json` from the blob, and the container will start with zero integrity verification. There is no mechanism to enforce signed artifacts once an org has deployed them.

**Recommendation**: Add a `requireSignedArtifacts: boolean` field to fleet policy (`claws.json`). When `true`, missing signature or manifest is a FAIL, not a WARNING. The backward-compat WARNING mode is the default for unmanaged workspaces, but any fleet-governed workspace can enforce mandatory signing. This gives enterprises an upgrade path from "warning" to "hard fail" without breaking existing deployments.

---

### M3: No audit trail for policy changes (Pulse 50)

**Severity: MUST**

When a tool's risk classification changes (e.g., R3 to R1 in TOOLS.md) and the workspace is recompiled, the `host-approval-policies.json` silently changes. The plan's validation even celebrates this: "Changing a tool's risk from R3 to R1 in TOOLS.md and recompiling updates the approval policy without manual Aether config changes." From a CISO perspective, this is an unaudited policy change. An operator modifying TOOLS.md can downgrade a tool from gated to ungated with no audit entry, no approval chain, and no before/after diff persisted.

**Recommendation**: The emit pipeline must append a governance audit entry (via the audit chain from Pulse 11) whenever a tool's risk classification changes between compilations. The entry should record: tool name, server, previous risk level, new risk level, previous `requires_approval`, new `requires_approval`, operator identity, and timestamp. Without this, policy changes are invisible to security review and SIEM.

---

### M4: Fleet override for R3/R4 lacks approval gate (Pulse 50)

**Severity: MUST**

The plan states R3-R4 default to `requires_approval: true` but "Fleet policy can override to `false` via `claws.json` field `fleet.approvalOverrides.r3` and `fleet.approvalOverrides.r4`." This means a fleet admin can disable approval gates for R3/R4 tools (which include send-teams, calendar writes, file uploads) by editing a config file. There is no approval workflow, no counter-signature, and no audit trail for this override. A compromised fleet admin account can silently ungated all R3/R4 tools fleet-wide.

**Recommendation**: Fleet override changes to `approvalOverrides.r3` and `approvalOverrides.r4` must (a) be recorded in the audit chain, (b) require a separate approval (not self-service), and (c) emit a SIEM event. At minimum, the override should log who changed it, when, and which tools were affected. Consider requiring a counter-signature from a second admin for fleet-wide approval downgrades.

---

### W1: No key rotation story for blob verification (Pulse 51)

**Severity: WARN**

Pulse 51's `verifyGovernanceArtifacts()` checks manifest signatures using a `keyId` in the manifest. But the pulse does not address key rotation: what happens when the signing key is rotated? Old manifests signed with the previous key would fail verification, breaking container restarts. There is no key ring or multi-key verification described.

**Recommendation**: Document the key rotation protocol in the blob-integrity concept guide (Pulse 52 deliverable `docs/claws/integration/blob-integrity.md`). At minimum: verification should accept a set of trusted key IDs, and the rotation procedure should be: (1) add new key to trust set, (2) re-sign manifests with new key, (3) remove old key after grace period.

---

### W2: `requiresExternalApproval: false` can bypass host gate for R3/R4 tools (Pulse 52)

**Severity: WARN**

The GuardrailProvider composition model allows a provider to return `{ allowed: true, requiresExternalApproval: false }` for R3/R4 tools. The plan says this maps to "tool executes without approval dialog (R1-R2 tools)" but there is no enforcement that R3+ tools MUST set `requiresExternalApproval: true`. A misconfigured or malicious GuardrailProvider could allow all tools without host-level approval by always returning `requiresExternalApproval: false`, bypassing the entire Aether approval UX.

**Recommendation**: The GovernanceValidator in Pulse 52 should enforce: if the tool's risk level is R3+, the `requiresExternalApproval` field MUST be `true` when `allowed` is `true`. A provider returning `{ allowed: true, requiresExternalApproval: false }` for an R3+ tool is a validation error. This mirrors the R5 non-negotiable pattern -- the host gate is not optional for gated tools.

---

### W3: Unknown tool default is R5 at emit time but not enforced at composition time (Pulse 50 + 52)

**Severity: WARN**

Pulse 50 correctly specifies: "Unknown tools default to R5 fail-closed -> gated." The `host-approval-policies.json` schema includes `"unknown_tool": { "requires_approval": true, "risk_level": 5 }`. However, Pulse 52's GuardrailProvider composition does not address what happens when the provider encounters a tool not in the policy set. If the provider's `preAuthorize()` does not have a policy for a tool, it must default to deny or review -- but the spec does not mandate this. The `preAuthorize` chain could fall through to the ProviderRegistry's empty-allows-all default (Pulse 49 acceptance criteria: "Empty ProviderRegistry defaults to allow-all behavior").

**Recommendation**: The GuardrailProvider composition doc (Pulse 52) must explicitly state: for tools not in the compiled policy set, the provider MUST return `{ decision: "review", requiresExternalApproval: true }`. The allow-all default for empty registries is acceptable only when NO governance provider is registered. Once a claws governance provider is active, unknown tools must be fail-closed.

---

### N1: No SIEM event for blob integrity failures (Pulse 51)

**Severity: NOTE**

Pulse 51 specifies logging `GOVERNANCE_INTEGRITY_FAILED` when verification fails, but does not specify the log format or SIEM integration. The audit chain (Pulse 11/46) and SIEM emitter (Pulse 48) exist, but Pulse 51 does not wire blob integrity failures into them. A tampered blob is a security incident -- it should fire a CEF/syslog event, not just a container log line.

**Recommendation**: Wire blob integrity verification failures into the SIEM emitter from Pulse 48. The event should include: workspace ID, container ID, which artifact(s) failed verification, expected vs. actual hash (truncated), and timestamp. This ensures SOC teams are alerted to tampering attempts.

---

### N2: No schema version negotiation failure mode (Pulse 50)

**Severity: NOTE**

The plan specifies: "If the version is higher than supported, fall back to the default (don't fail)." This means a future schema version 2 with stricter policies would be silently ignored by an older Aether consumer, which would fall back to the blanket `requires_approval: true` wildcard. While this is safe (more restrictive), it means the precise per-tool policies compiled by claws are thrown away. The operator has no signal that their compiled policies are not being consumed.

**Recommendation**: When schema version negotiation falls back to the default, emit a WARNING log entry and a SIEM event indicating that compiled policies could not be loaded due to version mismatch. Include both the artifact's `schemaVersion` and the consumer's max supported version.

---

## Verdict

**CONDITIONAL PASS** -- The design is architecturally sound: single-compilation, dual-enforcement is the right pattern. R5 non-negotiable enforcement is correctly specified in Pulse 50. However, the four MUST findings (M1-M4) represent real gaps that an auditor would flag:

- M1 (unsigned new artifact) creates a manifest coverage gap
- M2 (permanent warning-only mode) enables a downgrade attack
- M3 (silent policy changes) fails audit trail requirements
- M4 (unaudited fleet overrides) is a privilege escalation vector

All four are addressable within the existing architecture without scope expansion. The WARN findings (W1-W3) should be addressed in the implementation but are not blockers.
