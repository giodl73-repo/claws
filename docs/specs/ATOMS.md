# claws Atoms — Product Concept Registry

Every concept in the claws governance compiler, where it is authoritatively defined, and where it must be accurately represented.

**Rules** (same as Craftworks ATOMS.md):
1. Each atom has exactly ONE authority (the canonical definition).
2. Every other mention is a **mirror** — it must be consistent with the authority.
3. When the authority changes, all mirrors must be updated in the same PR.

**Relationship to Craftworks atoms:**
- claws atoms that REUSE Craftworks infrastructure have a `reuses:` field pointing to `docs/ATOMS.md` atom IDs.
- Pure claws concepts (no Craftworks equivalent) have `reuses: --`.
- The global `docs/ATOMS.md` is NOT modified — claws atoms reference it, not merge into it.

**Legend:**
- **Authority** = canonical definition (update here first)
- **Mirror** = must stay consistent with authority
- **Reuses** = Craftworks atom ID from `docs/ATOMS.md` (if any)
- **Spec** = governing claws spec (CL-01 through CL-07)

**Related indexes:**
- **Craftworks Atoms** — `docs/ATOMS.md` (A01-A258: compiler, runtime, governance primitives)
- **claws Specs** — `design/claws/SPECS.md` (CL-01..CL-07)
- **claws Pitfalls** — `design/claws/PITFALLS.md` (50 pitfalls)
- **claws Command Map** — `design/claws/COMMAND-MAP.md` (40 commands)

---

## Compiler Layer

| ID | Slug | Name | Authority | Mirrors | Reuses | Spec |
|----|------|------|-----------|---------|--------|------|
| C01 | `atom:claws-compiler` | claws Compiler | `docs/claws/concepts/compiler.md` | design/claws/CLAUDE.md, why-claws.md | -- | CL-04 |
| C02 | `atom:governance-ir` | GovernanceIR | `design/claws/specs/CL-04-compilation-pipeline.md` | CL-02, CL-03 | A71 `atom:program-ir` | CL-04 |
| C03 | `atom:capability-manifest` | CapabilityManifest | `design/claws/specs/CL-04-compilation-pipeline.md` | CL-02 | -- | CL-04 |
| C04 | `atom:mechanical-intent` | Mechanical Intent | `design/claws/specs/CL-04-compilation-pipeline.md` | CL-03 | -- | CL-04 |
| C05 | `atom:workflow-inversion` | Workflow Inversion | `design/claws/specs/CL-04-compilation-pipeline.md` | CL-03, COMMAND-MAP | A76 `atom:stagetask-ir` | CL-04 |
| C06 | `atom:three-engine-model` | Three-Engine Model (PRESS + Context DAG + Plugin) | `design/claws/specs/CL-04-compilation-pipeline.md` | CL-03, why-claws.md | A148 `atom:policy`, A248 `atom:relax` | CL-04 |

## Security Layer

| ID | Slug | Name | Authority | Mirrors | Reuses | Spec |
|----|------|------|-----------|---------|--------|------|
| C10 | `atom:tool-classification` | Tool Classification (R1-R5) | `design/claws/specs/CL-02-security-model.md` | CL-01, CL-03, PITFALLS | A68 `atom:permission-tier` | CL-02 |
| C11 | `atom:obo-boundary` | OBO Boundary (FOR-user vs AS-user) | `design/claws/specs/CL-02-security-model.md` | CL-03, CL-05, PITFALLS | -- | CL-02 |
| C12 | `atom:elicitation-gate` | Elicitation Gate (G-ELICIT) | `design/claws/specs/CL-02-security-model.md` | CL-03, CL-04, COMMAND-MAP | A180 `atom:gate` | CL-02 |
| C13 | `atom:a2a-governance` | A2A Governance (FE6) | `design/claws/specs/CL-02-security-model.md` | CL-03, CL-04, PITFALLS | A192 `atom:tension` | CL-02 |
| C14 | `atom:injection-defense` | Injection Defense (16 rules) | `design/claws/specs/CL-02-security-model.md` | CL-03, PITFALLS | A248 `atom:relax` | CL-02 |
| C15 | `atom:compliance-artifact` | Compliance Artifact (SOC2/HIPAA/EU AI Act) | `design/claws/specs/CL-02-security-model.md` | CL-05, COMMAND-MAP | A43 `atom:cgr` | CL-02 |
| C16 | `atom:key-management` | Key Management (generation, rotation, KMS) | `design/claws/specs/CL-02-security-model.md` | CL-03 | -- | CL-02 |
| C17 | `atom:kill-switch` | Kill Switch (out-of-band, 3 paths) | `design/claws/specs/CL-02-security-model.md` | CL-03, COMMAND-MAP | -- | CL-02 |

## Runtime Layer

| ID | Slug | Name | Authority | Mirrors | Reuses | Spec |
|----|------|------|-----------|---------|--------|------|
| C20 | `atom:governance-plugin` | Governance Plugin (L2+L3) | `design/claws/specs/CL-03-runtime-enforcement.md` | CL-04, COMMAND-MAP | -- | CL-03 |
| C21 | `atom:governance-skill` | Governance SKILL.md (L1 advisory) | `design/claws/specs/CL-03-runtime-enforcement.md` | CL-04 | A03 `atom:skill` | CL-03 |
| C22 | `atom:governance-host` | GovernanceHost (6-facet interface) | `design/claws/specs/CL-03-runtime-enforcement.md` | CL-04 | A151 `atom:exec-host` | CL-03 |
| C23 | `atom:defense-in-depth` | 5-Layer Defense-in-Depth | `design/claws/specs/CL-03-runtime-enforcement.md` | CL-02, why-claws.md | -- | CL-03 |
| C24 | `atom:fail-mode` | Risk-Based Fail Mode (R1 open → R5 closed) | `design/claws/specs/CL-03-runtime-enforcement.md` | CL-02, CL-04 | -- | CL-03 |
| C25 | `atom:claws-bypass` | Emergency Bypass (CLAWS_BYPASS=1) | `design/claws/specs/CL-03-runtime-enforcement.md` | CL-01 | -- | CL-03 |

## CLI Layer

| ID | Slug | Name | Authority | Mirrors | Reuses | Spec |
|----|------|------|-----------|---------|--------|------|
| C30 | `atom:pinch` | pinch (governance enforcement verb) | `design/claws/COMMAND-MAP.md` | CL-01, CL-02, CL-05 | A148 `atom:policy` | CL-01 |
| C31 | `atom:snap` | snap (snapshot verb) | `design/claws/COMMAND-MAP.md` | CL-01, CL-05 | A186 `atom:compilation-snapshot` | CL-01 |
| C32 | `atom:claws-init` | claws init (installer) | `design/claws/specs/CL-03-runtime-enforcement.md` | CL-01, COMMAND-MAP | -- | CL-01, CL-03 |
| C33 | `atom:claws-uninstall` | claws uninstall (clean removal) | `design/claws/specs/CL-03-runtime-enforcement.md` | CL-01, COMMAND-MAP | -- | CL-01, CL-03 |
| C34 | `atom:progressive-disclosure` | Progressive Disclosure (4/18/40) | `design/claws/specs/CL-01-cli-surface-schema.md` | COMMAND-MAP | -- | CL-01 |
| C35 | `atom:claws-json` | claws.json (three-layer schema) | `design/claws/specs/CL-01-cli-surface-schema.md` | CL-03, CL-04 | -- | CL-01, CL-07 |

## Developer Experience Layer

| ID | Slug | Name | Authority | Mirrors | Reuses | Spec |
|----|------|------|-----------|---------|--------|------|
| C40 | `atom:three-rings` | Three Rings (live/upgrade/fleet) | `design/claws/specs/CL-05-developer-experience.md` | CL-01, COMMAND-MAP | -- | CL-05 |
| C41 | `atom:skill-kit` | @bic/claws-skill-kit | `design/claws/specs/CL-05-developer-experience.md` | CL-06 | -- | CL-05 |
| C42 | `atom:governance-badge` | ClawHub Governance Badge (DECLARED/TYPED/VERIFIED) | `design/claws/specs/CL-05-developer-experience.md` | CL-06 | -- | CL-05 |
| C43 | `atom:claws-lsp` | claws-lsp (Language Server) | `design/claws/specs/CL-05-developer-experience.md` | -- | A189 `atom:language-service` | CL-05 |
| C44 | `atom:error-contract` | Error Message Contract (WHAT + HOW + WHERE) | `design/claws/specs/CL-05-developer-experience.md` | CL-01 | -- | CL-05 |
| C45 | `atom:tier-adoption` | Three-Tier Adoption (DECLARED/TYPED/VERIFIED) | `design/claws/specs/CL-05-developer-experience.md` | CL-06 | -- | CL-05 |

## Platform Layer

| ID | Slug | Name | Authority | Mirrors | Reuses | Spec |
|----|------|------|-----------|---------|--------|------|
| C50 | `atom:claws-sdk` | claws-sdk (sibling to craftworks-sdk) | `design/claws/specs/CL-04-compilation-pipeline.md` | CL-06, CL-07 | -- | CL-04 |
| C51 | `atom:three-tier-packages` | Three-Tier Packages (@openclaw → @claws → @craftworks) | `design/claws/specs/CL-06-platform-ecosystem.md` | CL-04, CL-07 | -- | CL-06 |
| C52 | `atom:press-pinch` | PRESS→pinch (governance budget optimization) | `design/claws/specs/CL-06-platform-ecosystem.md` | CL-04 | A148 `atom:policy`, PRESS atoms | CL-06 |
| C53 | `atom:claws-relax` | @claws/relax (typed expression engine) | `design/claws/specs/CL-06-platform-ecosystem.md` | CL-07 | A248 `atom:relax` | CL-06 |
| C54 | `atom:lossless-roundtrip` | Lossless Round-Trip (byte-for-byte fidelity) | `design/claws/specs/CL-04-compilation-pipeline.md` | CL-03, CLAUDE.md | A133 `atom:forma` | CL-04 |
| C55 | `atom:dotnet-for-oc` | .NET for OpenClaw (platform vision) | `design/claws/specs/CL-06-platform-ecosystem.md` | why-claws.md, CLAUDE.md | -- | CL-06 |

## Fleet Operations Layer

| ID | Slug | Name | Authority | Mirrors | Reuses | Spec |
|----|------|------|-----------|---------|--------|------|
| C60 | `atom:fleet-broadcast` | Fleet Broadcast (push policies to all workspaces) | `design/claws/COMMAND-MAP.md` | CL-01, CL-05, PITFALLS | -- | CL-01 |
| C61 | `atom:fleet-drift` | Fleet Drift Detection (hash-based divergence) | `design/claws/COMMAND-MAP.md` | CL-01, CL-05, PITFALLS | -- | CL-01 |
| C62 | `atom:fleet-scan` | Fleet Scan (workspace discovery) | `design/claws/COMMAND-MAP.md` | CL-01, CL-03 | A150 `atom:workspace-runtime` | CL-01 |
| C63 | `atom:fleet-doctor` | Fleet Doctor (fleet-wide upgrade) | `design/claws/specs/CL-05-developer-experience.md` | CL-01, CL-03 | -- | CL-05 |
| C64 | `atom:fleet-comply` | Fleet Compliance (fleet-wide evidence) | `design/claws/specs/CL-02-security-model.md` | CL-01, COMMAND-MAP | A43 `atom:cgr` | CL-02 |

## Compliance Framework Layer

| ID | Slug | Name | Authority | Mirrors | Reuses | Spec |
|----|------|------|-----------|---------|--------|------|
| C70 | `atom:compliance-soc2` | SOC2 Type II Evidence (controls, temporal evidence) | `design/claws/specs/CL-02-security-model.md` | CL-05, COMMAND-MAP | A43 `atom:cgr` | CL-02 |
| C71 | `atom:compliance-hipaa` | HIPAA Security Rule Evidence (safeguards, PHI) | `design/claws/specs/CL-02-security-model.md` | CL-05 | A43 `atom:cgr` | CL-02 |
| C72 | `atom:compliance-eu-ai-act` | EU AI Act Assessment (Article 6, Annex III) | `design/claws/specs/CL-02-security-model.md` | CL-06 | -- | CL-02 |
| C73 | `atom:claws-assess` | claws assess (regulatory risk classification) | `design/claws/COMMAND-MAP.md` | CL-02, CL-06 | -- | CL-02 |
| C74 | `atom:audit-chain` | Audit Chain (HMAC/Ed25519 hash chain, tamper-evident) | `design/claws/specs/CL-02-security-model.md` | CL-03, PITFALLS | A153 `atom:audit-trail` | CL-02 |
| C75 | `atom:audit-verify` | Audit Verification (chain integrity proof) | `design/claws/COMMAND-MAP.md` | CL-02 | -- | CL-02 |
| C76 | `atom:siem-export` | SIEM Export (CEF, JSON, syslog) | `design/claws/COMMAND-MAP.md` | CL-02, PITFALLS | -- | CL-02 |

## Operations Layer

| ID | Slug | Name | Authority | Mirrors | Reuses | Spec |
|----|------|------|-----------|---------|--------|------|
| C80 | `atom:claws-watch` | claws watch (inner ring, continuous governance) | `design/claws/specs/CL-05-developer-experience.md` | CL-01, COMMAND-MAP | -- | CL-05 |
| C81 | `atom:claws-doctor` | claws doctor (middle ring, upgrade + migration) | `design/claws/specs/CL-05-developer-experience.md` | CL-01, CL-03, COMMAND-MAP | -- | CL-05 |
| C82 | `atom:claws-build` | claws build (compile + emit, primary command) | `design/claws/COMMAND-MAP.md` | CL-01, CL-04 | -- | CL-01, CL-04 |
| C83 | `atom:upgrade-lifecycle` | Upgrade Lifecycle (snap → upgrade → doctor → verify) | `design/claws/specs/CL-05-developer-experience.md` | CL-03, PITFALLS | -- | CL-05 |
| C84 | `atom:snap-restore` | Snapshot Restore (rollback to named state) | `design/claws/COMMAND-MAP.md` | CL-01, CL-05 | A208 `atom:cache-snapshot` | CL-01 |
| C85 | `atom:hook-lifecycle` | OC Hook Lifecycle (before_tool_call → execute → after) | `design/claws/specs/CL-03-runtime-enforcement.md` | CL-04 | -- | CL-03 |
| C86 | `atom:latency-budget` | Latency Budget (50ms per hook, 200ms for LSP) | `design/claws/specs/CL-03-runtime-enforcement.md` | CL-05 | -- | CL-03 |
| C87 | `atom:incident-response` | Incident Response (kill → forensic → remediate) | `design/claws/specs/CL-02-security-model.md` | PITFALLS | -- | CL-02 |

## Ecosystem Layer

| ID | Slug | Name | Authority | Mirrors | Reuses | Spec |
|----|------|------|-----------|---------|--------|------|
| C90 | `atom:claws-test` | @bic/claws-test (skill testing framework) | `design/claws/specs/CL-05-developer-experience.md` | CL-06 | A129 `atom:quest-eval-pipeline` | CL-05 |
| C91 | `atom:upstream-contrib` | Upstream Contribution Strategy (@openclaw/* packages) | `design/claws/specs/CL-07-deep-integration.md` | CL-06, why-claws.md | -- | CL-07 |
| C92 | `atom:cicd-pipeline` | CI/CD Pipeline Integration (@bic/claws-action) | `design/claws/specs/CL-05-developer-experience.md` | CL-06, COMMAND-MAP | -- | CL-05 |
| C93 | `atom:claws-publish` | claws publish (governed ClawHub publishing) | `design/claws/COMMAND-MAP.md` | CL-05, CL-06 | -- | CL-05 |

---

## Summary

| Layer | Atoms | Count | Reuses Craftworks |
|-------|-------|-------|-------------------|
| Compiler | C01-C06 | 6 | 4 |
| Security | C10-C17 | 8 | 5 |
| Runtime | C20-C25 | 6 | 3 |
| CLI | C30-C35 | 6 | 2 |
| Developer Experience | C40-C45 | 6 | 1 |
| Platform | C50-C55 | 6 | 3 |
| Fleet Operations | C60-C64 | 5 | 1 |
| Compliance Frameworks | C70-C76 | 7 | 3 |
| Operations | C80-C87 | 8 | 1 |
| Ecosystem | C90-C93 | 4 | 1 |
| **Total** | | **62** | **24 (39%)** |

62 atoms across 10 layers. 24 reuse Craftworks atoms (39%). 38 are new to claws.
