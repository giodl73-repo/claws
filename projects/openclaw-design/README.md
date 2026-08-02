# OpenClaw Design Project

Use this area for the durable conceptual model of OpenClaw: the major objects,
facility boundaries, capabilities, contracts, ownership rules, and relationships
that should remain understandable across individual RFCs and implementation
waves.

This is a design notebook, not a second normative specification set. Existing
OpenClaw source, accepted RFCs, and published contracts remain authoritative.
Pages here connect those sources, expose gaps and overlaps, and can later be
promoted into focused RFCs or shared with OpenClaw maintainers.

The desired target architecture derived from this audit lives separately in
`../enterpriseclaw/README.md`.

## Frame

- **Problem**: OpenClaw design knowledge is distributed across source, RFCs,
  project notes, PRs, and host-specific investigations, making ownership and
  contract relationships difficult to recover.
- **Affected users**: RFC authors, OpenClaw maintainers, operators, integration
  owners, and agents resuming architecture work.
- **Working owner systems**: OpenClaw source owners and accepted RFCs remain
  authoritative for semantics and behavior.
- **Shared contribution**: a navigable index of design areas, owner objects,
  capabilities, contracts, evidence, and unresolved boundaries.
- **V1 boundary**: document and cross-link verified or explicitly hypothetical
  concepts; do not introduce implementation APIs or a universal object model.
- **Simplification target**: reduce repeated rediscovery, contradictory
  terminology, duplicated host contracts, and oversized RFC background
  sections.
- **Disproof / stop condition**: narrow or remove any model that cannot be
  mapped to current source owners, makes focused RFCs harder to understand, or
  requires healthy owner systems to translate into a central taxonomy.

## Working Method

1. Start with the system objects and their lifetimes.
2. Divide behavior into owner-shaped facilities rather than product screens or
   host-specific workflows.
3. Describe each facility through its capabilities and explicit contracts.
4. Link claims to current source, RFCs, tests, and operating evidence.
5. Record unresolved ownership or contract questions without inventing a
   parallel framework.

Each facility page should answer:

- What purpose does the facility serve?
- Which objects does it own, observe, or project?
- What capabilities does it provide?
- What are its input, output, lifecycle, error, compatibility, and trust
  contracts?
- Which other facilities may consume it, and what must they not duplicate?
- What is implemented, proposed, deferred, or still unknown?

## Active Notes

| Area | File |
| ---- | ---- |
| Current session and resume state | `SESSION.md` |
| System concepts, object classes, and contract vocabulary | `conceptual-model.md` |
| Candidate major facilities and source areas | `facility-map.md` |
| Area grading rubric | `assessment-rubric.md` |
| Enterprise need dimensions, layers, gates, and role validation | `enterprise-needs-framework.md` |
| Enterprise criticality and coverage by layer/facility | `enterprise-needs-matrix-2026-08-01.md` |
| External enterprise platform comparison | `enterprise-comparators-2026-08-01.md` |
| Enterprise `.craft/roles` findings and dispositions | `enterprise-role-review-2026-08-01.md` |
| First full area scorecard, gaps, and split recommendations | `area-scorecard-2026-08-01.md` |
| Configuration/activation current-source audit | `source-audit-configuration-activation-2026-08-01.md` |
| Agent execution current-source audit | `source-audit-agent-execution-2026-08-01.md` |
| Messaging/channel current-source audit | `source-audit-messaging-channels-2026-08-01.md` |
| Sessions/context/memory current-source audit | `source-audit-sessions-context-memory-2026-08-01.md` |
| Delegated/subagent execution current-source audit | `source-audit-delegated-execution-2026-08-01.md` |
| Models/provider routing current-source audit | `source-audit-models-provider-routing-2026-08-01.md` |
| Tools/MCP/actions current-source audit | `source-audit-tools-mcp-actions-2026-08-01.md` |
| Transport/protocol/API evolution current-source audit | `source-audit-transport-protocol-api-evolution-2026-08-01.md` |
| Supply-chain/artifact-trust current-source audit | `source-audit-supply-chain-artifact-trust-2026-08-01.md` |
| Nodes/devices/pairing current-source audit | `source-audit-nodes-devices-pairing-2026-08-01.md` |
| Install/update/release compatibility current-source audit | `source-audit-install-update-release-compatibility-2026-08-01.md` |
| Workspace/filesystem current-source audit | `source-audit-workspace-filesystem-2026-08-01.md` |
| Credentials/secrets/auth-profile current-source audit | `source-audit-credentials-secrets-auth-2026-08-01.md` |
| Privacy/retention/export/deletion current-source audit | `source-audit-privacy-retention-deletion-2026-08-01.md` |
| Resource-governance current-source audit | `source-audit-resource-governance-2026-08-01.md` |
| Cross-owner identity and lifetime comparison | `identity-lifetime-matrix.md` |
| Cross-facility relationship model | `relationship-model.md` |
| Ranked enterprise evidence slices | `enterprise-evidence-slices-2026-08-01.md` |
| Bounded evidence-slice notes | `evidence-slices/README.md` |
| Current phase progress | `progress-2026-08-01.md` |
| Facility-spec format and index | `specs/README.md` |
| Readiness facility | `specs/readiness.md` |
| `.craft/roles` review and dispositions | `role-review-2026-08-01.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| ---- | ---------- | ------ | ------ | ------- |
| `claws-hapi` | Local design notebook | `main` | Active | Build the cross-RFC OpenClaw conceptual overview and facility catalog. |
| `openclaw/rfcs` | Existing and future RFCs | Per RFC | Source material | Supply normative contracts when a design area is ready for upstream review. |
| `openclaw/openclaw` | Current implementation | Per worktree | Source material | Verify actual objects, ownership, lifetimes, and compatibility behavior. |

## Related Areas

- `projects/enterpriseclaw/README.md`
- `projects/openclaw/README.md`
- `projects/layering-contracts/README.md`
- `projects/hosting-profiles/README.md`
- `projects/hosted-integration/README.md`
- `projects/state-continuity/README.md`
- `projects/signals/README.md`
- `projects/catalog/README.md`
- `projects/policy/README.md`
