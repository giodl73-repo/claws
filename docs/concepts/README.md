# claws Concept Guides

All concept guides for the claws design area, flattened from the original
subdirectory layout into a single directory for area-scoped consistency.

## Getting Started

Read these guides in order. Each builds on the previous.

1. [claws init](claws-init.md) -- Set up governance in your workspace
2. [claws.json](claws-json.md) -- Understand the configuration file
3. [claws build](claws-build.md) -- Compile governance into enforcement artifacts
4. [Check](check.md) -- Check your workspace against policy rules
5. [Progressive Disclosure](progressive-disclosure.md) -- The 4/18/40 command surface

Start with `claws-init.md`. If you only read one guide, read that one.

## Architecture

- [architecture-three-rings.md](architecture-three-rings.md) -- Three Rings Architecture
- [capability-manifest.md](capability-manifest.md) -- Capability Manifest
- [claws-sdk.md](claws-sdk.md) -- claws-sdk (governance SDK)
- [compiler.md](compiler.md) -- The Compilation Pipeline
- [governance-ir.md](governance-ir.md) -- GovernanceIR
- [governance-host.md](governance-host.md) -- GovernanceHost (6-facet interface)
- [governance-plugin.md](governance-plugin.md) -- The Governance Plugin
- [lossless-guarantee.md](lossless-guarantee.md) -- The Lossless Guarantee
- [lossless-roundtrip.md](lossless-roundtrip.md) -- Lossless Round-Trip
- [mechanical-intent.md](mechanical-intent.md) -- Mechanical Intent
- [three-engine-model.md](three-engine-model.md) -- Three-Engine Model
- [three-tier-packages.md](three-tier-packages.md) -- Three-Tier Package Model
- [workflow-inversion.md](workflow-inversion.md) -- Workflow Inversion

## Building Skills

- [claws-publish.md](claws-publish.md) -- claws publish
- [claws-test.md](claws-test.md) -- @bic/claws-test
- [skill-kit.md](skill-kit.md) -- @bic/claws-skill-kit
- [tier-adoption.md](tier-adoption.md) -- Three-Tier Adoption

## Fleet

- [fleet-comply.md](fleet-comply.md) -- Fleet Comply (fleet-wide compliance evidence)
- [fleet-doctor.md](fleet-doctor.md) -- Fleet Doctor (fleet-wide upgrade + migration)
- [fleet-security.md](fleet-security.md) -- Fleet Security

## Governance

- [a2a-boundary.md](a2a-boundary.md) -- A2A Boundary
- [a2a-governance.md](a2a-governance.md) -- A2A Governance (FE6)
- [audit-chain.md](audit-chain.md) -- Audit Chain
- [audit-verify.md](audit-verify.md) -- Audit Verification (chain integrity proof)
- [claws-bypass.md](claws-bypass.md) -- Emergency Bypass (CLAWS_BYPASS=1)
- [compliance-artifact.md](compliance-artifact.md) -- Compliance Artifact (SOC2/HIPAA/EU AI Act)
- [compliance-eu-ai-act.md](compliance-eu-ai-act.md) -- Compliance: EU AI Act
- [compliance-hipaa.md](compliance-hipaa.md) -- Compliance: HIPAA Security Rule
- [compliance-soc2.md](compliance-soc2.md) -- Compliance: SOC2 Type II
- [defense-in-depth.md](defense-in-depth.md) -- Defense in Depth
- [elicitation-gate.md](elicitation-gate.md) -- Elicitation Gate
- [fail-mode.md](fail-mode.md) -- Fail Mode
- [fleet-compliance.md](fleet-compliance.md) -- Fleet Compliance
- [fleet-delegation.md](fleet-delegation.md) -- Fleet Delegation
- [fleet-inheritance.md](fleet-inheritance.md) -- Fleet Inheritance
- [fleet-scan.md](fleet-scan.md) -- Fleet Scan
- [injection-defense.md](injection-defense.md) -- Injection Defense
- [inner-ring.md](inner-ring.md) -- Inner Ring
- [middle-ring.md](middle-ring.md) -- Middle Ring
- [obo-boundary.md](obo-boundary.md) -- The OBO Boundary
- [outer-ring.md](outer-ring.md) -- Outer Ring
- [plugin-ordering.md](plugin-ordering.md) -- Plugin Ordering
- [siem-export.md](siem-export.md) -- How do I get governance events into our SIEM?
- [snapshot-diff.md](snapshot-diff.md) -- Snapshot Diff
- [snapshot-integrity.md](snapshot-integrity.md) -- Snapshot Integrity
- [snapshot-promote.md](snapshot-promote.md) -- Snapshot Promote
- [snapshot-restore.md](snapshot-restore.md) -- Snapshot Restore
- [snapshot-save.md](snapshot-save.md) -- Snapshot Save
- [snapshot-storage.md](snapshot-storage.md) -- Snapshot Storage
- [governance-skill.md](governance-skill.md) -- Governance SKILL.md (L1 advisory)
- [key-management.md](key-management.md) -- Key Management (generation, rotation, KMS)
- [latency-budget.md](latency-budget.md) -- Latency Budget (50ms hook, 200ms LSP)
- [snap-restore.md](snap-restore.md) -- Snapshot Restore (governance rollback)
- [tool-classification.md](tool-classification.md) -- Tool Classification

## Maker and DX

- [claws-assess.md](claws-assess.md) -- claws assess (regulatory risk classification)
- [claws-doctor.md](claws-doctor.md) -- claws doctor (diagnostic + repair)
- [claws-lsp.md](claws-lsp.md) -- claws-lsp (Language Server)
- [claws-sift.md](claws-sift.md) -- @claws/sift (typed expression engine)
- [claws-uninstall.md](claws-uninstall.md) -- claws uninstall (clean removal)
- [error-contract.md](error-contract.md) -- Error Contract (WHAT + HOW + WHERE)
- [error-messages.md](error-messages.md) -- Error Messages
- [governance-badge.md](governance-badge.md) -- Governance Badge (DECLARED/TYPED/VERIFIED)
- [pinch.md](pinch.md) -- pinch (governance budget optimization)
- [skill-scaffold.md](skill-scaffold.md) -- Skill Scaffold
- [three-tier-adoption.md](three-tier-adoption.md) -- Three-Tier Adoption

## Operations

- [cicd-pipeline.md](cicd-pipeline.md) -- CI/CD Pipeline Integration (@bic/claws-action)
- [claws-watch.md](claws-watch.md) -- How do I get continuous governance?
- [fleet-broadcast.md](fleet-broadcast.md) -- Fleet Broadcast
- [fleet-drift.md](fleet-drift.md) -- Fleet Drift Detection
- [incident-response.md](incident-response.md) -- What happens after I pull the kill switch?
- [kill-switch.md](kill-switch.md) -- Kill Switch
- [operations-three-rings.md](operations-three-rings.md) -- Three Rings of Continuous Governance
- [upgrade-lifecycle.md](upgrade-lifecycle.md) -- Upgrade Lifecycle
- [upstream-contrib.md](upstream-contrib.md) -- Upstream Contribution Strategy (@openclaw/*)

## Platforms

- [bedrock.md](bedrock.md) -- Platform: Bedrock
- [claude-code.md](claude-code.md) -- Platform: Claude Code
- [crewai.md](crewai.md) -- Platform: CrewAI
- [cursor.md](cursor.md) -- Platform: Cursor
- [langgraph.md](langgraph.md) -- Platform: LangGraph
- [openclaw.md](openclaw.md) -- Platform: OpenClaw

## Vision

- [dotnet-for-oc.md](dotnet-for-oc.md) -- The .NET for OpenClaw

---

## Atom Index

Atoms referenced in claws concept guides, searchable via `/lookup atom:<name>`.

| Atom | ID | Guide |
|------|----|-------|
| `atom:pinch` | C52 | [pinch.md](pinch.md) |
| `atom:claws-uninstall` | C33 | [claws-uninstall.md](claws-uninstall.md) |
| `atom:claws-assess` | C73 | [claws-assess.md](claws-assess.md) |
| `atom:claws-doctor` | C81 | [claws-doctor.md](claws-doctor.md) |
| `atom:claws-compiler` | C01 | [compiler.md](compiler.md) |
| `atom:workflow-inversion` | C05 | [workflow-inversion.md](workflow-inversion.md) |
| `atom:governance-badge` | C42 | [governance-badge.md](governance-badge.md) |
| `atom:error-contract` | C44 | [error-contract.md](error-contract.md) |
| `atom:upstream-contrib` | C91 | [upstream-contrib.md](upstream-contrib.md) |
| `atom:cicd-pipeline` | C92 | [cicd-pipeline.md](cicd-pipeline.md) |
| `atom:claws-sift` | C53 | [claws-sift.md](claws-sift.md) |
| `atom:governance-skill` | C21 | [governance-skill.md](governance-skill.md) |
| `atom:claws-bypass` | C25 | [claws-bypass.md](claws-bypass.md) |
| `atom:snap-restore` | C84 | [snap-restore.md](snap-restore.md) |
| `atom:latency-budget` | C86 | [latency-budget.md](latency-budget.md) |
| `atom:compliance-artifact` | C15 | [compliance-artifact.md](compliance-artifact.md) |
| `atom:audit-verify` | C75 | [audit-verify.md](audit-verify.md) |
| `atom:fleet-doctor` | C63 | [fleet-doctor.md](fleet-doctor.md) |
| `atom:fleet-comply` | C64 | [fleet-comply.md](fleet-comply.md) |
