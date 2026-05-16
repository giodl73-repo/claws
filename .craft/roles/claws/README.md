# claws Roles — OpenClaw Governance & Integration Perspectives

> 17 roles representing the key stakeholders who care about different aspects of
> OpenClaw agent governance, the claws product itself, and the integration
> partners that consume claws's serve API and governance artifacts. Used for
> reviews, design validation, and pitch testing.

## How It Works

Each role represents a real person in the OpenClaw ecosystem — from the founder
who built it to the CISO who must govern it to the aether engineer who consumes
its governance artifacts at runtime. They have different priorities, different
pain points, and different definitions of success.

**Role path**: `.craft/roles/claws/{name}.md`
**Domain lenses**: `.craft/roles/claws/domains/{domain}.yaml`

## Roles by Stakeholder Layer

### Platform Layer — The Builders

| Role | Perspective | Cares about |
|------|------------|-------------|
| [founder](founder.md) | OpenClaw creator/maintainer | Community growth, ecosystem health, not alienating contributors, upstream contributions |
| [gateway-eng](gateway-eng.md) | OC Gateway engineer | Runtime performance, plugin API quality, hook latency, backward compatibility |
| [skill-author](skill-author.md) | Community skill developer | DX, testing framework, publishing workflow, @claws/* library quality |

### Enterprise Layer — The Buyers

| Role | Perspective | Cares about |
|------|------------|-------------|
| [ciso](ciso.md) | Chief Information Security Officer | OWASP coverage, audit trail, compliance evidence, incident response, OBO gates |
| [platform-eng](platform-eng.md) | Enterprise platform engineer | Fleet governance, upgrade safety, drift detection, CI/CD integration |
| [compliance](compliance.md) | Compliance/audit officer | SOC2/HIPAA/EU AI Act evidence, signed artifacts, tamper-proof chain, reporting |
| [policy-steward](policy-steward.md) | Policy model steward | Category-first policy rules, evidence extraction, health checks, attestations, runtime gates |

### User Layer — The Operators

| Role | Perspective | Cares about |
|------|------------|-------------|
| [power-user](power-user.md) | Advanced OC operator (the boss) | Upgrade experience, patches, security drift, skill supply chain, daily workflow |
| [new-hire](new-hire.md) | First-week developer | Progressive disclosure, 5-min setup, clear errors, no footguns |

### Integration Partner Layer — The Consumers (Horus)

| Role | Perspective | Cares about |
|------|------------|-------------|
| [aether-runtime-eng](aether-runtime-eng.md) | Aether .NET orchestrator engineer | ApprovalPolicyRegistry correctness, SSE approval dialog, GuardrailProvider consumer impl, fail-closed defaults |
| [aether-adapter-eng](aether-adapter-eng.md) | Aether OpenClaw blob adapter engineer | Blob rehydration integrity, manifest signature verification, sidecar start ordering, tamper-blocking |
| [lobster-container-eng](lobster-container-eng.md) | Lobster OpenClaw container engineer | Container boot, `claws serve` sidecar lifecycle, health probes, reconnect semantics, idle teardown |
| [cowork-ux-eng](cowork-ux-eng.md) | Cowork front-end engineer | Chunk-bound UI, PatchError surfaces, lock icons, governance badges, dry-run preview, ServeClient session-agnosticism |
| [m365-connector-eng](m365-connector-eng.md) | M365 Graph connector engineer | Loop/Calendar/To Do/Trust sync, write-time validation in-path, PatchError → Graph error mapping, idempotency |

### Repo Infrastructure Layer — The Release Chain (Horus)

| Role | Perspective | Cares about |
|------|------------|-------------|
| [claws-repo-steward](claws-repo-steward.md) | Repository boundary steward | craftworks ↔ claws separation, residue sweeps, filter-repo history preservation, package scope cleanliness |
| [claws-release-eng](claws-release-eng.md) | GPR release engineer | Publish workflow, version/tag conventions, install smoke + dogfood tests, registry auth scope, atomic releases |

### Future Surface Layer — The Extension Guardrail (Horus, selective)

| Role | Perspective | Cares about |
|------|------------|-------------|
| [clawpilot-product](clawpilot-product.md) | Future ClawPilot product lead | Layer-3 extension points, ServeClient session-agnosticism, PatchError code forward-compat, oc:// session paths |

## Tension Clusters

Reviews with 3+ roles from different clusters produce non-overlapping findings.

| Cluster | Tension | Roles |
|---------|---------|-------|
| A | Security/Correctness > Convenience | ciso, founder, aether-runtime-eng |
| B | Runtime performance > Governance overhead | gateway-eng, power-user, lobster-container-eng |
| C | Evidence/Validation completeness > Speed | compliance, m365-connector-eng |
| D | Fleet/Surface consistency > Autonomy | platform-eng |
| E | Approachability/DX > Completeness | new-hire, skill-author |
| F | Boot-time integrity > Boot speed | aether-adapter-eng |
| G | Governance transparency > UI minimalism | cowork-ux-eng |
| H | Boundary purity > Migration convenience | claws-repo-steward |
| I | Publish reliability > Velocity | claws-release-eng |
| J | Session-agnostic abstractions > Cowork-specific shortcuts | clawpilot-product |
| K | Coherent policy model > One-off enforcement | policy-steward |
