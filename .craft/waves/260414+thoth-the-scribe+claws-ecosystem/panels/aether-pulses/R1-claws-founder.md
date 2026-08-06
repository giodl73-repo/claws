---
round: 1
role: claws:founder
scope: "Pulses 50-52 (Aether integration: approval policies, blob integrity, guardrail composition)"
reviewer: founder
date: 2026-04-13
---

# R1 Review — claws:founder

**Lens**: Vendor neutrality, community impact, upstream-friendliness, open standard compliance, opt-in vs mandatory.

**Orientation**: OpenClaw is a community project first. 346K stars represent trust. Governance that makes simple agents complicated is worse than no governance. Any integration must pass: "Can the user uninstall this?" and "Does this make OpenClaw better or just add a tax?"

---

## Findings

### F1 — Artifact name leaks vendor identity into the open standard [M]

**Pulse**: 50
**Location**: `host-approval-policies.json` schema, type names (`AetherApprovalPolicy`), plan language throughout

The artifact is described as a standard JSON file any orchestrator can consume, but the type name `AetherApprovalPolicy` in `host-approval-policy-types.ts` bakes one consumer's identity into the SDK. A contributor reading this type will conclude "this is Aether's format" rather than "this is an open standard claws emits." The plan correctly states "Aether is ONE consumer, not THE consumer" but the naming contradicts that principle.

**Recommendation**: Rename to `HostApprovalPolicy` or `ToolApprovalPolicy`. The schema already uses neutral field names (`server`, `tool`, `requires_approval`). Make the type names match. References to "Aether format" in the plan are fine as motivation, but the code-level naming must be vendor-neutral.

---

### F2 — aether-sim runner embeds Aether resolution semantics into the test harness [M]

**Pulse**: 50
**Location**: `claws-sdk/tests/accept/runners/aether-sim.ts` — "specific->wildcard->global resolution order as Aether PR #5067"

The mock ApprovalPolicyRegistry resolves policies using Aether's specific resolution order (PR #5067). This means the claws test suite is implicitly validating Aether's behavior, not a generic host contract. If another orchestrator implements a different resolution order, the tests would still pass but that orchestrator would not behave the same way. The test runner's name and resolution semantics couple the test suite to one vendor.

**Recommendation**: Rename to `host-policy-sim.ts`. Document the resolution order as "reference resolution (matches Aether PR #5067)" but make it clear the test validates claws's EMIT contract, not the host's resolution. If resolution order matters, define it in a spec that any host can implement, not by importing Aether's behavior.

---

### F3 — Fleet override for R3-R4 tools is enterprise-only complexity in the default path [W]

**Pulse**: 50
**Location**: Plan H1 — `fleet.approvalOverrides.r3` and `fleet.approvalOverrides.r4` in `claws.json`

Fleet policy overrides that downgrade R3-R4 from `requires_approval: true` to `false` are an enterprise governance feature. This is appropriate. However, the configuration sits in `claws.json` which is the same file a solo contributor edits. There is no separation between "my personal config" and "my enterprise pushed this." A contributor who sees `fleet.approvalOverrides.r3: false` in their claws.json might not realize it was fleet-imposed vs something they set.

**Recommendation**: Make fleet overrides clearly distinguishable from user configuration. Either: (a) fleet overrides live under a `fleet.` namespace that personal config cannot write to (enforced at parse time), or (b) fleet overrides come from a separate file (`fleet-policy.json`) that the user cannot accidentally edit. The current design risks a contributor unknowingly weakening their own governance by copying a config snippet from a coworker.

---

### F4 — Blob verification failure blocks container startup with no recovery path [W]

**Pulse**: 51
**Location**: Plan H2 — "Failed verification blocks container startup and alerts the operator"

Blocking container startup on signature failure is correct for security. But for the 3.2M community users running personal agents, a corrupted blob (disk error, partial download, CDN glitch) would brick their agent with no self-service recovery. The plan handles "missing signature" gracefully (WARNING, proceed) but not "corrupted signature" or "network-truncated artifact." A community user who sees `GOVERNANCE_INTEGRITY_FAILED` has no idea what to do.

**Recommendation**: Add a `--skip-governance-verify` flag (opt-in, not default) that lets a user start their agent in degraded mode while they fix the blob. Log a prominent warning. This respects the personal assistant trust model: the user owns their agent and should be able to start it even if governance artifacts are damaged. Enterprise deployments can disable the flag via fleet policy. Without this, blob integrity verification becomes a bricking hazard for personal users.

---

### F5 — No upstream RFC or spec for `requiresExternalApproval` [M]

**Pulse**: 52
**Location**: GuardrailProvider spec extension — `requiresExternalApproval?: boolean` on AuthorizationDecision

The plan adds a field to the GuardrailProvider interface (which is an upstream OpenClaw spec contributed by us). Adding fields to a community-facing interface without an RFC process creates the perception that Craftworks is unilaterally extending the standard for its own integration needs. Even though the field is optional, it sets a precedent: "the compiler vendor can add fields to the provider interface whenever they need a new integration."

**Recommendation**: Before implementing, draft an OpenClaw RFC (even a lightweight one) proposing the `requiresExternalApproval` field. Frame it as "how providers communicate that a tool call needs host-level gating" — a general capability, not an Aether-specific extension. The RFC should include at least one non-Aether use case (e.g., ClawPilot device-level consent, or a hypothetical Slack-based approval flow). This protects our credibility as upstream contributors and prevents the community from seeing the spec as Craftworks-captured.

---

### F6 — `review` decision implicitly forcing `requiresExternalApproval: true` is opinionated [W]

**Pulse**: 52
**Location**: Plan H3 — "`review` -> implicitly `requiresExternalApproval: true`"

The plan mandates that `review` decisions always trigger host-level approval. This is a reasonable default for Aether (where the approval UX exists), but it makes an assumption about what "review" means in every host environment. A host that implements `review` as "log for later audit" would be forced into an approval gate it doesn't support. This implicit mapping bakes Aether's UX model into the spec.

**Recommendation**: Make the `review` -> `requiresExternalApproval: true` mapping a RECOMMENDED default in the spec, not a MUST. Document it as "hosts SHOULD treat review as requiring external approval, but MAY implement alternative review workflows (e.g., async audit)." This keeps the spec host-agnostic while still guiding implementors toward safe defaults.

---

### F7 — Three new concept guides are Aether-centric in community-facing docs [W]

**Pulse**: 52
**Location**: `docs/claws/integration/aether-bridge.md`, `docs/claws/integration/blob-integrity.md`, `docs/claws/ecosystem/guardrail-composition.md`

The docs directory is community-facing documentation. Two of three new guides reference Aether by name in the title/path. A contributor browsing `docs/claws/integration/` will see "aether-bridge.md" and conclude claws is built for Aether. This contradicts the "any orchestrator" principle. The `blob-integrity.md` and `guardrail-composition.md` are correctly general.

**Recommendation**: Rename `aether-bridge.md` to `host-integration.md` or `orchestrator-bridge.md`. Use Aether as one example within the guide, not the organizing concept. The guide should teach "how claws artifacts integrate with any orchestrator" with Aether as a reference implementation.

---

### F8 — No contributor experience validation for generated policy artifact [N]

**Pulse**: 50
**Location**: Artifact at `.claws/compiled/host-approval-policies.json`

The plan validates the artifact's correctness (schema, risk mapping, fleet overrides) but doesn't address the contributor experience of finding an unfamiliar JSON file in their workspace. A contributor who runs `claws build` and sees 5 artifacts in `.claws/compiled/` may be confused by `host-approval-policies.json` — what is it? Do I need it? Can I delete it? The Gateway plugin has obvious purpose; the approval policies artifact does not, especially for personal agent users who don't have an orchestrator.

**Recommendation**: Add a brief header comment or `_description` field in the JSON artifact explaining its purpose: "Approval policies for host orchestrators. Safe to ignore if not using a managed deployment." This is the "would a contributor who reads the generated code understand it without knowing Craftworks?" test from the founder lens.

---

### F9 — Evaluation sim resolves against Aether PR #5067 but the spec doesn't define resolution order [N]

**Pulse**: 50
**Location**: Plan section "Evaluation Sim" — aether-sim.ts resolution order

The evaluation sim uses Aether's specific->wildcard->global resolution order, but the `host-approval-policies.json` spec (the contract section in the plan) doesn't define what resolution order a consumer should use. This means the artifact is well-specified for content but under-specified for behavior. Two hosts could read the same file and resolve differently.

**Recommendation**: Either: (a) add a `resolution_order` field to the schema that declares the intended precedence, or (b) add a "Resolution" section to the artifact spec documenting the expected behavior. This turns the artifact from "here are some policies" into "here are policies with deterministic resolution" — a stronger standard that any host can implement consistently.

---

## Summary

The Aether integration plan is architecturally sound: single compilation driving multiple enforcement points is the right design. The security model (blob integrity, R5 non-negotiable, fail-closed for unknowns) is strong. The plan correctly keeps Aether-side changes out of the claws repo.

The primary concern is **vendor leakage**: Aether's identity and behavior semantics are bleeding into code-level naming (F1), test infrastructure (F2), spec semantics (F6), and community-facing documentation (F7). Each instance is small, but together they create a pattern where the "open standard" reads as "Aether's format that others can also use." The fix is naming discipline and spec formalism (F5, F9).

The secondary concern is **community impact of mandatory governance**: blob verification without a recovery path (F4) and fleet overrides in the personal config namespace (F3) could make personal agents harder to run. These features should be enterprise-hardened but personal-agent-friendly.

### Severity Tally

| Severity         | Count | IDs        |
| ---------------- | ----- | ---------- |
| Must-fix (M)     | 3     | F1, F2, F5 |
| Worth-fixing (W) | 3     | F3, F4, F6 |
| Noted (N)        | 2     | F8, F9     |

### Verdict

**Conditional pass** — the 3 must-fixes (vendor-neutral naming, test harness decoupling, upstream RFC for spec extension) should be addressed before implementation. The worth-fixing items can be addressed during implementation without blocking.
