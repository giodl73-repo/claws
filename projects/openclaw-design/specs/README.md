# Facility Specs

Facility specs turn one row of `../facility-map.md` into an auditable design
page. They summarize current and proposed contracts while linking to normative
RFCs and implementation evidence.

## Spec Shape

1. **Purpose and boundary**
2. **Status and authoritative sources**
3. **Owned and observed objects**
4. **Capabilities**
5. **Contracts**: identity, input/output, lifecycle, failure, trust,
   compatibility, and evidence
6. **Relationships and non-ownership rules**
7. **Fleet and evolution**: partial rollout, stale evidence, mixed versions,
   migration, and comparison semantics
8. **Enterprise obligations**: criticality, applicable `A I D O N E R X U`
   dimensions, current coverage, and blocking gaps
9. **Current gaps and open questions**
10. **Promotion candidates** for RFCs, docs, tests, or implementation

Every **Current** claim must cite exact source, accepted documentation, or a
test that encodes the behavior. Directory-level links are discovery aids, not
proof. Unsupported claims remain **Hypothesis**.

## Index

| Facility | Status | Spec |
| -------- | ------ | ---- |
| Readiness | Proposed and partially implemented through active RFC/PR work | `readiness.md` |
| Configuration and activation | Current source owner plus proposed managed-source extension | `configuration-activation.md` |
| Agent execution | Current source-audited core; system contract needs consolidation | `agent-execution.md` |
| Messaging and channels | Current shared core plus channel-owned projection/transport | `messaging-channels.md` |
| Session continuity | Current source-audited transcript and registry owner | `session-continuity.md` |
| Context assembly | Current source-audited run-scoped projection and compaction relationship | `context-assembly.md` |
| Memory | Current source-audited plugin/corpus/projection owner with open retention semantics | `memory.md` |
| Delegated execution | Current source-audited Agent Execution child facility | `delegated-execution.md` |
| Models and provider routing | Current source-audited catalog, binding, runtime, attempt, and projection portfolio | `models-provider-routing.md` |
| Tools, MCP, and actions | Current source-audited catalog, transport, authority, invocation, and projection portfolio | `tools-mcp-actions.md` |
| Transport, protocol, and API evolution | Current Gateway/ACP foundations; cross-surface compatibility contract incomplete | `transport-protocol-api-evolution.md` |
| Workspace and filesystem | Current source-audited local ownership; enterprise data governance incomplete | `workspace-filesystem.md` |
| Credentials, secrets, and auth profiles | Current source-audited owner portfolio; enterprise federation and fleet semantics incomplete | `credentials-secrets-auth.md` |
| Privacy, retention, export, and deletion | Current owner-specific controls; shared lifecycle obligation/evidence contract proposed | `privacy-retention-deletion.md` |
| Resource governance | Strong current local controls; enterprise allocation and fleet contracts incomplete | `resource-governance.md` |
| Supply-chain and artifact trust | Current local integrity/install core; signed provenance and fleet trust incomplete | `supply-chain-artifact-trust.md` |
| Nodes, devices, pairing, and remote capabilities | Current source-audited node/device runtime; enterprise federation and fleet semantics incomplete | `nodes-devices-pairing.md` |
| Install, update, release, and compatibility | Current source-audited local and release core; optional fleet rollout and convergence incomplete | `install-update-release-compatibility.md` |
