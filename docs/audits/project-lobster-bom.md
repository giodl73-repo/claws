---
title: Project Lobster — Compliance BOM
status: Draft
date: 2026-04-16
owner: giodl
fundamentals:
  [threat-model, privacy, compliance, responsible-ai, accessibility, data-classification]
scope: [lobster, aether, cowork, claws]
purpose: >
  Bill-of-materials of DFD-node candidates and owner picks for Project Lobster
  threat modeling. Cowork is a fresh cert (no prior TM). Aether expands with
  OpenClaw trust zone. claws folds into Horus and brings supply-chain surface.
fundamentals-source: design/works/_archive/fundamentals/ (C-SDL, seeded from WorkIQ 2026-03-03)
methodology: STRIDE per C-SDL; MS Threat Modeling Tool; independent security review
---

# Project Lobster — Compliance BOM

Source repos surveyed 2026-04-16:

- `C:\src\lobster` — integration layer + ClawPilot bridge
- `C:\src\lobster\project-lobster-vault\` — Obsidian vault (PDRs, People, Teams, Product, Tech, Customers, Canvases, Weekly Status, Meetings)
- `C:\src\aether` — M365 Copilot backend orchestration
- `C:\src\cowork` — React micro-frontend (Module Federation)
- `C:\src\craftworks\claws-sdk` — claw compiler (moving to Horus)

## Trust zones

1. **Cowork browser / Module Federation shell** — client-side, MSAL tokens, localStorage
2. **Aether Runtime (cloud)** — multi-tenant FastAPI + Redis + Azure Bot Service
3. **Aether Orchestrator (per-session CLI container)** — gRPC host↔container bridge, HTTP interceptor
4. **OpenClaw Adapter + Container** — gRPC↔OpenAI translation, SQLite agent memory
5. **ClawPilot (device-side)** — privileged local execution, operator UX
6. **claws compile/sign surface** — Ed25519 keys, vault, audit chain
7. **External services** — MS Graph, Anthropic, Copilot Studio, Substrate CIQ, Power Platform

## DFD node inventory

Roles are from `.craft/roles/claws/` (16 roles, tension clusters A–J).
Governance lenses (ciso, compliance, platform-eng, claws-repo-steward) apply
cross-cutting and are listed separately below.

| #   | Node                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Repo           | PR owner                         | Governing role(s)                                        | Cluster |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------- | -------------------------------------------------------- | ------- |
| N1  | Cowork Module-Federated shell + chat UI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | cowork         | Soroush Ghorashi                 | cowork-ux-eng                                            | G       |
| N2  | Cowork Token Provider / MSAL / Weave / CS token broker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | cowork         | Soroush Ghorashi                 | cowork-ux-eng · ciso                                     | G·A     |
| N3  | CoworkerClient SDK (agents/connectors/projects/skills/tasks)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | cowork         | David Zearing                    | cowork-ux-eng                                            | G       |
| N4  | Graph / CIQ / Substrate client layer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | cowork         | David Zearing                    | cowork-ux-eng · m365-connector-eng                       | G·C     |
| N5  | Aether Runtime (FastAPI + Redis 64-partition queue)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | aether         | Marius de Vogel                  | aether-runtime-eng                                       | A       |
| N6  | Aether Orchestrator (gRPC, HTTP interceptor)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | aether         | Lukas Stankiewicz                | aether-runtime-eng                                       | A       |
| N7  | Aether Security / Auth (JWT, Fernet, tool approval gate)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | aether         | Bas Brekelmans                   | aether-runtime-eng · ciso · compliance                   | A·C     |
| N8  | Container Management (circuit breaker, provider factory)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | aether         | Adam Sheppard                    | aether-runtime-eng · lobster-container-eng               | A·B     |
| N9  | MCP Proxy (Graph) + OBO / token encryption                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | aether         | Marius de Vogel                  | m365-connector-eng · ciso                                | C·A     |
| N10 | File Service + SharePoint rclone mount                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | aether         | Lukas Stankiewicz                | m365-connector-eng · ciso                                | C·A     |
| N11 | LLM Providers (Anthropic / Copilot SDK)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | aether         | Lukas Stankiewicz                | aether-runtime-eng · ciso (RAI)                          | A       |
| N12 | OpenClaw Adapter (sidecar, gRPC↔OpenAI)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | lobster/aether | Omar Shahine                     | aether-adapter-eng                                       | F       |
| N13 | OpenClaw Container image + workspace blob sync                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | lobster/aether | Adam Sheppard                    | lobster-container-eng · aether-adapter-eng               | B·F     |
| N14 | Per-user container scoping + Permission Gate (Tier 1–4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | lobster        | Emmanuel Miranda-Steiner         | aether-runtime-eng · ciso                                | A       |
| N15 | ClawPilot Node host + desktop UX                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | lobster        | Jakob Werner · Carmen Pfeil      | clawpilot-product · ciso                                 | J·A     |
| N16 | claws CLI + compile pipeline (parse → IR → emit); includes `claws fleet signing-status` runbook CLI (S6 rollout prereq); LLM annotation timeout → hard error (no silent unsigned-metadata fallback)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | claws          | Gio Della-Libera                 | founder · claws-repo-steward                             | H       |
| N17 | claws Audit Chain + WAL (Ed25519 signed); emits to Azure Monitor → Log Analytics (Sentinel-ready via customer DCR)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | claws          | Gio Della-Libera                 | ciso · compliance · founder                              | A·C     |
| N18 | claws Secrets Vault + Key Store (AES-256-GCM, argon2id); separate append-only key-audit log (distinct from N17 compile chain, SOC2-scopable); quarterly rotation ceremony documented as part of handover                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | claws          | **Gio → Galin Iliev** (handover) | gateway-eng · ciso · compliance                          | A·C     |
| N20 | claws Compilation Cache (SHA-256 LRU)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | claws          | Gio Della-Libera                 | gateway-eng · founder                                    | B       |
| N21 | **Agent365 Entra identity broker** — agents get own Entra IDs (not delegated)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | lobster        | Kenneth Pan · Sid Uppal          | m365-connector-eng · ciso                                | A·C     |
| N22 | **Network policy enforcer** — iptables sandbox per agent container                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | lobster        | Stanislaw Wilczynski             | lobster-container-eng · ciso                             | B·A     |
| N23 | **Purview audit trail** — compliance sink for Agent365 actions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | lobster        | (TBD — Compliance/M365)          | compliance · ciso                                        | C·A     |
| N24 | **Trust Ladder** — Read→Suggest→Organize→Execute permission earning (expands N14)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | lobster        | Omar Shahine (PDR-001)           | aether-runtime-eng · ciso                                | A       |
| N25 | **claws-serve** — HTTP sidecar (`/api/oc/*`, `/api/chunks/*`, `/api/sessions/*`) — THE consumer surface. Contract obligations: (a) reads artifacts **only** from in-memory ApprovalPolicyRegistry (never opens blob directly) — verify-before-parse; (b) latency SLO ≤50ms for decision dispatch; audit writes async/non-blocking; timeouts >100ms fail-closed (deny, not crash); (c) `/healthz` probe verifies registry loaded + audit-chain healthy + latest policy cached; (d) emits `policy_changed` event on S6 flag flip so consumer caches invalidate without restart; (e) PatchError contract: 9 codes must have human-readable messages + remedy hints per CAP-tab context (codes alone are not user-facing); (f) `dryRunPatch` response shape defines projected risk deltas + lock changes; (g) ServeClient session-agnosticism validated across `/api/chunks/*` (no workspace-scoped field leaks that would break ClawPilot Layer3) | claws          | Gio Della-Libera                 | gateway-eng · aether-adapter-eng · lobster-container-eng | A·B·F   |
| N26 | **GPR auth surface** — `NODE_AUTH_TOKEN` for `npm.pkg.github.com`; 90-day PAT rotation. PAT lifecycle (create/rotate/revoke) must log to Azure Key Vault audit sink; every `npm publish` cross-references active PAT fingerprint in audit entry. Supply-chain: every publish generates + signs SBOM (Sigstore); consumer repos validate SBOM signature pre-install. Community skill author path: either (a) `claws auth detect-gpr` fails loudly with setup instructions, or (b) public-npm mirror for published skills so non-Entra community authors are not locked out of `@gim-home/*`                                                                                                                                                                                                                                                                                                                                                     | cross-repo     | claws-release-eng                | claws-release-eng · ciso                                 | I·A     |
| N27 | **Loop / Calendar / To Do Graph connector pair** — Graph write-sources that call N25 `/api/oc/{path}` PATCH on user edits in M365 surfaces                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | lobster/m365   | Sid Uppal                        | m365-connector-eng · ciso · compliance                   | C·A     |

Vault source: `project-lobster-vault/Product/PDR-001-Agent-User-Model.md`,
`project-lobster-vault/Tech/Cowork-OpenClaw-Integration.md`, `Tech/Agent365-Identity.md`.
See also `project-lobster-vault/Canvases/Agent Ecosystem.canvas` and
`Product Architecture.canvas` — candidate DFD seeds.

### Cross-cutting governance roles (apply to all nodes)

| Role                   | Lens                                                                | Owner (to assign)           |
| ---------------------- | ------------------------------------------------------------------- | --------------------------- |
| **ciso**               | OWASP coverage, audit trail, OBO gates, incident response           | (MS SDL reviewer)           |
| **compliance**         | SOC2/HIPAA/EU AI Act evidence, signed artifacts, tamper-proof chain | Bas Brekelmans (Aether CMP) |
| **platform-eng**       | Fleet governance, drift detection, CI/CD integration                | TBD                         |
| **claws-repo-steward** | craftworks↔claws separation, history preservation (for Horus move)  | Gio Della-Libera            |

### Role-to-owner resolution (PRs + Lobster vault)

| Role                                   | Person                                                            | Source                           | Notes                                                                     |
| -------------------------------------- | ----------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------- |
| aether-runtime-eng                     | **Marius de Vogel** (534), Lukas Stankiewicz (468)                | Aether git                       | Marius=runtime, Lukas=orchestrator                                        |
| aether-adapter-eng                     | **Omar Shahine** (40)                                             | Aether git                       | Sole adapter author; Seed squad lead                                      |
| lobster-container-eng                  | **Adam Sheppard** (33), **Stanislaw Wilczynski** (security lens)  | Aether git + vault               | Sheppard = lifecycle + Redis; Wilczynski = E2E/security, iptables sandbox |
| cowork-ux-eng                          | **Soroush Ghorashi**, David Zearing, Christopher Whitten          | Cowork git                       | 3-way co-ownership                                                        |
| m365-connector-eng                     | **Sid Uppal** (Agent365/Teams connector), David Zearing (CIQ/SDK) | Vault (Teams squad) + Cowork git | Sid is the dedicated connector owner the BOM was missing                  |
| clawpilot-product                      | **Jakob Werner** · Carmen Pfeil · **Tom Underhill**               | Vault (Oslo ClawPilot squad)     | Role "future" but squad active                                            |
| gateway-eng                            | **Galin Iliev** (Governance / AI Gateway)                         | Vault (Lobster Redmond squad)    | Previously TBD — filled from vault                                        |
| ciso lens                              | **Aaron Zollman** (Security / CFS exception paths)                | Vault meetings                   | Driving CFS block mitigation                                              |
| compliance lens                        | **Bas Brekelmans** (Aether CMP, 47 commits)                       | Aether git                       | Closest MS-internal match for auditable evidence format                   |
| platform-eng                           | (TBD)                                                             | —                                | Still unfilled                                                            |
| founder (OpenClaw)                     | (external — OpenClaw creator)                                     | —                                | Needs external engagement for claws→Horus                                 |
| claws-repo-steward / claws-release-eng | **Gio Della-Libera**                                              | claws git                        | Sole claws author; Horus must pick up                                     |
| gateway-eng (N18, N20, N25)            | **Galin Iliev**                                                   | Vault                            | Governance / AI Gateway lead; Gio handing over N18 Secrets Vault          |
| skill-author / power-user / new-hire   | (review lenses, not owners)                                       | —                                | Pull reviewers from community                                             |

### Additional named reviewers / approvers (from vault)

| Person                                       | Role in Lobster                         | Relevance to BOM                                               |
| -------------------------------------------- | --------------------------------------- | -------------------------------------------------------------- |
| Daron Spektor                                | Architect / alignment (Lobster Redmond) | Architecture review reviewer                                   |
| Brad Cleaver                                 | Systems / perf                          | N5/N8 performance lens                                         |
| Harry Ferguson                               | Full-stack rapid prototyping            | N1–N4 shell surface                                            |
| Ryan Gregg                                   | Extensibility                           | N12/N13 adapter/container extension points                     |
| Alex Acebo                                   | Teams Squad                             | N21 Agent365 + M365 Teams integration                          |
| Kenneth Pan                                  | W365 identity                           | N21 Entra broker (primary)                                     |
| Tejas Dharamsi                               | Strategy / LinkedIn overlap             | RAI / data-sharing review                                      |
| Eduardo Piva                                 | Lobster Redmond squad                   | WorkIQ sandbox (referenced in reference_workiq_sandbox memory) |
| Steven Ickman, Alex Weingart                 | Teams squad                             | N21/N23 consumers                                              |
| Yonatan Zunger, Ilya Grebnov, Bryan Vorndran | Approval signers                        | Gate approvers (not hands-on owners)                           |

### Squad → cluster map

| Squad                                                      | Location | Covers nodes                           |
| ---------------------------------------------------------- | -------- | -------------------------------------- |
| Seed (Omar, Adam, Kathy)                                   | —        | N12, N13 (OpenClaw container/adapter)  |
| Lobster Redmond (Eduardo, Daron, Galin, Brad, Harry, Ryan) | Redmond  | N14, N22, gateway layer, extensibility |
| Teams (Sid, Alex W., Steven, Alex A.)                      | Redmond  | N21, N23, M365 connector surface       |
| ClawPilot (Jakob, Stanislaw, Tom, Carmen)                  | Oslo     | N15, N22 (iptables via Stanislaw)      |
| Cowork (Emmanuel ~50%)                                     | —        | N1–N4 integration touchpoints          |
| Skills (Gio)                                               | —        | N16–N20 claws                          |

## Components that warrant their own threat model

- **N5 Aether Runtime** — multi-tenant, 64-partition queue, tenant isolation keys; biggest blast radius
- **N7 Aether Security / Auth** — Fernet key mgmt, OBO flows, tool approval gate (Tier 1–4 is new governance surface)
- **N9 MCP Proxy (Graph)** — token encryption boundary, OBO client cache, proxies prod customer data
- **N10 File Service + SharePoint mount** — customer content + credential-less mount via rclone is novel surface
- **N12 + N13 OpenClaw Adapter & Container** — new trust zone introduced by Lobster; SQLite memory persistence, blob sync workspace rehydration
- **N14 Permission Gate** — _new_ policy surface (~150 LOC but governs M365 action scope); treat as critical
- **N15 ClawPilot device host** — crosses device/cloud boundary with privileged local exec
- **N17 + N18 claws Audit Chain + Secrets Vault** — signing-key compromise = skill impersonation across Horus; needs its own supply-chain TM

### Subsumable (roll into parent TM; no standalone doc)

- N3, N4 under N1 Cowork shell zone
- N6, N8, N11 under N5 Aether Runtime TM
- N20 under N16 claws compile TM

## Per-repo data classifications

### Cowork

- Customer content (conversation drafts, task bodies)
- PII (tenant/user IDs, AAD OIDs, presence, email)
- OAuth tokens (Copilot Studio, Graph, Weave, Power Platform)
- Telemetry (key-sanitized, localStorage, scoped by conversationId)

### Aether

- PII (user emails, meeting titles, Teams messages, Graph data)
- Credentials/secrets (Graph tokens, Claude keys, OAuth, encryption keys)
- Customer content (SharePoint docs, attachments)
- Tenant boundaries (`tenant_id:user_id:session_id` Redis keys)

### Lobster (OpenClaw zone)

- Workspace content (agent outputs, persistent SQLite memory)
- Agent identity (Ed25519 device keypair in blob)
- LLM telemetry (token counts, latency, cost)
- Tool approval decisions (Tier-based)
- OneDrive replication _explicitly skipped_ for OpenClaw containers

### claws

- Secret — Ed25519 signing keys, vault passphrases
- Confidential — user skill source, governance rules
- Internal — GovernanceIR, conflict reports, audit chain
- PII — identity/author in audit events
- Operational — cache manifest, usage patterns

## Fundamentals mapping

Fundamentals are grounded in Microsoft C+AI / E+D policy (C-SDL mandate).
Source docs: `design/works/_archive/fundamentals/`.

### Threat model (STRIDE, DFDs, C-SDL)

Mandatory for all services. DFDs + STRIDE per flow. Independent security review
before release. MS Threat Modeling Tool. Applies to every node N1–N20.

### Privacy (MPS, GDPR, DPIA, PII)

Bites hardest at:

- **N2** Cowork Token Provider (OAuth, tenant/user IDs)
- **N9** MCP Proxy (Graph) — proxies PII + customer content
- **N10** File Service + SharePoint rclone mount — customer documents
- **N13** OpenClaw Container + workspace blob — persisted agent memory
- **N17** claws Audit Chain — identity in audit events

### Compliance (SDL, SDLCA / S360, auditable evidence)

- Cowork: **no prior TM or SECURITY.md → fresh cert**, not re-cert
- Aether: reuse `CMP/` tooling (Bas Brekelmans) for auditable evidence format
- claws: audit chain + WAL already produce signed evidence; format for S360
- **SIEM reachability** — N17 (claws) and N23 (Purview) are the two audit chains. N23 already reaches Sentinel via the Microsoft Defender / Purview connector. **N17 must emit to Azure Monitor / Log Analytics (via DCR)** so customer SOCs pick it up through their existing Sentinel workspace — no custom SIEM bridge needed. Defines the schema + event taxonomy at N17, wires the emitter sidecar, relies on upstream Sentinel connectors.

### Responsible AI (RAI review, fairness, transparency)

Explicit fundamental — not subsumed under security. Bites at:

- **N11** LLM Providers (Anthropic / Copilot SDK) — prompt injection, data exfil
- **N12** OpenClaw Adapter — gRPC↔OpenAI translation, model routing
- **N13** OpenClaw Container — 100+ skills, persistent memory, agent behaviors
- **N16** claws compile pipeline — LLM annotation (Anthropic provider)
- **N14** Permission Gate — governs agent action scope on M365

### Accessibility (WCAG, a11y, assistive tech)

- **N1** Cowork Module-Federated shell + chat UI — primary surface
- **N15** ClawPilot desktop UX — operator approval/recovery flows
- **Known gap** — panel review surfaced that a11y coverage as currently scoped is too narrow. Error-surface and governance-UI nodes likely also need WCAG treatment: **N3** CoworkerClient SDK (error messages surfaced to users), **N4** Graph/CIQ/Substrate client layer (error responses), **N14** Permission Gate (tier-escalation UI, keyboard nav), **N25** claws-serve PatchError codes (need human-readable messages + aria-live regions). Reuse `cowork/.claude/skills/design-guide/references/accessibility.md` (WCAG 2.1 AA, 354 lines) as the checklist. **Deferred from this round** — flagged for follow-up a11y sweep.

### Data classification (Public / Internal / Confidential / High-Conf)

| Tier                     | Applies to                                                                       | Nodes                                                     |
| ------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **High Confidentiality** | Signing keys, vault passphrases, Fernet keys, OAuth tokens                       | N2, N7, N9, N18                                           |
| **Confidential**         | Customer content (email, meetings, SharePoint, conversations), user skill source | N5, N9, N10, N13, N16                                     |
| **Internal**             | Agent memory, audit chain, GovernanceIR, telemetry with IDs                      | N13, N17, N20                                             |
| **Public**               | Generated code emitted by claws (when published), published skills               | — (deferred; N19 ClawHub publish out of scope this round) |

## Horus integration points (contract seams)

Source: `.craft/waves/260416+horus-the-heir+claws-migration/contract-seams.md`
(Wave XCVI, 4 plans, R1+R2 cleared). Each seam is a trust-boundary or
data-flow crossing that belongs on the DFD as an edge, not a node.

**4 plans in wave:**

- `claws-repo-migration` — move 7 packages to `gim-home/claws` (zero `@craftworks/claws` remains)
- `aether-claws-serve-integration` — Aether .NET runtime consumes claws-serve
- `lobster-claws-serve-integration` — Lobster container spawns claws-serve sidecar; Cowork UX consumes ServeClient
- `claws-local-sim-evolution` — sim harness owns boot-sequence + dispatch-protocol contracts

**7 packages moving** (8th post-migration): `claws-compiler` (ex-claws-sdk),
`claws-sdk` (paid), `claws-cli`, `claws-skill-kit`, `claws-test`,
`claws-serve` (N25). (`claws-lsp`, `claws-sim`, and ClawHub publish are out of scope for this round.)

### 10 seams → DFD flow inventory

| Seam                                                 | Summary                                                                                                                                                                                                                                                                                                                                            | Trust-boundary implication                                                                           | Owner                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **S1** Package set & scope                           | All 7 claws-* move under `@gim-home/claws-*` on GPR. **CI merge-gate**: craftworks CI post-filter-repo runs `rg "@craftworks/claws-" --type ts --type js --exclude-dir=.archive` and fails PR if count > 0 (archive/historical comments allowed, active code refs gate-critical)                                                                   | Namespace + install-path authority; boundary purity is CI-enforced                                   | claws-repo-steward                         |
| **S2** GPR auth lifecycle                            | `NODE_AUTH_TOKEN` in 4 consumer CIs; 90-day PAT rotation; `docs/operations/gpr-auth.md`. PAT create/rotate/revoke events logged to Azure Key Vault audit sink; publish audit entries cross-reference PAT fingerprint                                                                                                                               | **New cross-repo secret surface** (N26); publish provenance is auditable                             | claws-release-eng                          |
| **S3** Sidecar boot-order state machine              | 9 states (ContainerBooting → SidecarReady); sidecar must NOT start before artifacts verified; **sidecar reads only from in-memory RegistryReady artifacts, never opens blob directly**                                                                                                                                                             | **Integrity ordering constraint** — verify-before-serve + verify-before-parse                        | claws-sim owns contract                    |
| **S4** ServeClient / SseBridge / OcUri typed surface | Layer1/Layer2/Layer3 client, pattern-based SSE dispatch, session-aware URIs. Contract must define: PatchError code→message mapping per CAP-tab, `dryRunPatch` response shape (risk-delta projection), explicit non-coupling rule (no Cowork workspace-scoped field types leak into ServeClient — validated against ClawPilot Layer3 session shape) | **API contract trust boundary** (N25 surface); session-agnosticism enforced                          | Lobster authors types                      |
| **S5** Fixture ownership                             | Single source at `@gim-home/claws-sim/fixtures/`                                                                                                                                                                                                                                                                                                   | Test-data supply chain                                                                               | claws-sim                                  |
| **S6** `requireSignedArtifacts` per-tenant flag      | Default false → true per-tenant; unsigned → `GOVERNANCE_INTEGRITY_FAILED`. **Rollout prereq**: `claws fleet signing-status` CLI (N16) must ship before any tenant flag flip                                                                                                                                                                        | **Enforcement boundary** for signed-artifact policy; runbook gate                                    | aether-runtime-eng + Cowork surfaces state |
| **S7** Audit-chain entries                           | `AuditEntry` union: Producer/Consumer/Decision/Approval; shared schema; LLM annotation timeout in compile path → hard error (no silent unsigned-metadata fallback that would bypass the chain)                                                                                                                                                     | **Cross-process audit integrity** — one chain, two writers; annotation failures never weaken signing | claws-sdk owns schema                      |
| **S8** Session-shaped extension points               | `SessionRef` reserved; 5 adoption rules (registry resolve, bridge context, SSE, PatchError, OcUri). **Validation obligation**: `/api/chunks/*` must explicitly reserve optional `session?: SessionRef` parameter (not just assume workspace-scope) or ClawPilot wave requires Layer2 refactor                                                      | **Future-surface reservation** (ClawPilot wave); Layer2 session-shape-transparent                    | clawpilot-product                          |
| **S9** Parallel-path migration observability         | `legacyDirectWrite` flag, direct-write counter, `claws fleet api-mode`, **2026-07-01 removal**                                                                                                                                                                                                                                                     | **Silent-bypass + fleet-drift mitigation**                                                           | lobster-container-eng + platform-eng       |
| **S10** .NET↔Node sim dispatch protocol              | JSON-RPC 2.0 over stdio; `handshake` version negotiation; 30s timeout; orphan cleanup                                                                                                                                                                                                                                                              | **New IPC trust boundary** — Aether .NET spawns Node subprocess                                      | claws-sim owns spec                        |
| **S11** Serve version pinning                        | claws-serve semver: major.minor breaking, patch in-wave only. Tenant fleet policy locks all workspaces to same serve version. `claws doctor --post-upgrade --fleet` validates version parity before RegistryReady; fails-safe if drift detected                                                                                                    | **Fleet consistency** — prevents silent ServeClient API divergence across workspaces                 | platform-eng + claws-release-eng           |

**Integration surface summary for the DFD:**

- **N25 claws-serve** is the primary trust boundary crossed by S3, S4, S6, S9 (integrity, API contract, enforcement, migration)
- **N26 GPR auth** is crossed on every consumer CI install (S2)
- S3 boot-sequence, S7 audit schema, and S10 dispatch protocol are _contracts_ owned by claws packages; the IPC flows land on N5/N12/N25 at runtime (claws-sim's CI role is out of scope)
- **N17 audit chain** is the cross-process integrity boundary (S7)

### Horus known blockers

- Ra wave must close clean (claws-compiler must achieve zero `@craftworks/` runtime deps + validated GPR publish flow)
- `claws-test` fixture bundles must publish to GPR before sim integration tests can run
- 8 plan-local Major findings still open (see contract-seams.md §Per-plan R1 Major)

## claws inherits astro TM gaps (Horus must own)

The fundamentals `threat-model.md` already enumerates TM-01..TM-16 against the
astro compiler. claws forked from astro and carries most of them forward. On
Horus absorption, these need re-triage:

- **TM-01** no DFDs for astro/claws pipeline — this BOM is the starting input
- **TM-03** LLM-to-file emitters with zero output validation
- **TM-04** path traversal across file-writing features (need `securePath()`)
- **TM-07** YAML parser not specified (unsafe parser → RCE)
- **TM-12** template override functions unsandboxed
- **TM-14** Spec 24 `SecurePath`/`SecureShell`/`SecurityAuditLog` defined but unwired
- **TM-16** no independent security review gate before ship

(Full list in `design/works/_archive/fundamentals/threat-model.md` §Codebase Punchlist.)

## Cowork reuse — existing compliance artifacts

Cowork has already run through OSS governance and accessibility SDL cycles.
Reuse their patterns/files across all four repos instead of redoing:

### Direct-reuse files (copy/adapt)

| Cowork artifact                                                  | Reuse for                             | What to copy                                                                                                                            |
| ---------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `cowork/ThirdPartyNotices.txt` + `cgmanifest.json`               | aether, lobster, claws                | OSS compliance pattern — auto-generated NOTICE, CG manifest with JSON Schema                                                            |
| `cowork/scripts/generate-third-party-notices.mjs`                | aether (Python equiv), lobster, claws | 260-line automation: runs in CD pipeline, validates, exits non-zero on failure                                                          |
| `cowork/.pipelines/build-pipelines/steps/deploy-cdn.yml`         | all pipelines                         | CI compliance step: 5-min timeout NOTICE gen + validation                                                                               |
| `cowork/.claude/skills/design-guide/references/accessibility.md` | N1 shell, N15 ClawPilot desktop       | WCAG 2.1 AA reference (354 lines) — contrast, touch targets, focus rings, ARIA, keyboard nav, motion, zoom; directly reusable checklist |
| `cowork/docs/architecture/coworker-architecture-diagrams.md`     | DFD seeds for all                     | Mermaid system context + container diagrams across BizChat / Coworker / Aether / Graph / Substrate / Power Platform / WOPI              |
| `cowork/docs/architecture/architecture-review-one-pager.md`      | Per-cluster TM scaffolds              | One-pager section structure — copy headings, not content                                                                                |
| `cowork/CODEOWNERS`                                              | aether, lobster, claws                | Approval-matrix pattern for federated packages                                                                                          |

### Cowork SDL work already landed (don't redo)

- **OSS / CG compliance** — PR #1108 (2026-03-16): cgmanifest + NOTICE gen + Azure MSAL/hono CVE bumps
- **OCV compliance via CPS** — PR #1695 (2026-04-08): tenantCloudType, connectedExperiences, policy-driven feedback gating, NonCPS fallback
- **S360 accessibility audit** — PR #1847 (2026-04-13) fixed WCAG 2.1.2, 2.5.3, 4.1.3, 1.4.3; PR #1663 (2026-04-07) fixed 13 bugs from March 2026 CT audit with ADO tickets
- **CVE remediation cadence** — PR #1524 (picomatch ReDoS), #1504 (Dependabot), #1629 (lodash) — reuse the commit-traceability pattern (CVE ID + ADO ticket)
- **Privacy surfacing** — Terms + Privacy links in AI disclaimer (PR #1397, 2026-03-27)
- **Client SDK hardening** — CoworkerClient v1.0.0 P2 (PR #1859): CRUD, retry, branded types, security validation

### Cowork SDL evidence that lives outside the repo

The explicit threat-model / DPIA docs aren't in-repo. Expect them in:

- Internal MS SDL tool instance (C-SDL attestations)
- eng.ms wiki pages (referenced from `docs/telemetry-access.md`)
- Azure DevOps work items (linked from a11y commit trailers — 37216023, 37232946, etc.)
- S360 program records (audit cadence is visible in the commit stream)

Action: get SharePoint/eng.ms links from Soroush + David before drafting cluster TMs so we inherit the existing evidence chain instead of starting fresh.

## Live blockers (from vault Weekly Status W1, Apr 10 2026)

- **CFS security block on OpenClaw npm** — blocks prod release; Aaron Zollman driving mitigation options; 3 under eval, no release until resolved
- **Graph API scope approval** — pending Charles's sign-off; only Entra scopes available currently (limits N9 / N21); does NOT block claws migration itself — parallelize, unbind from Horus CP-1
- **6 workstream DRIs unfilled** — capacity planning in flight (Jakob); token cost model pending
- **Ignition target Apr 30**; Orbit/Build ~June
- **Supply-chain tamper detection (TM-03 / TM-04)** — release-critical. Horus must not ship until SBOM + Sigstore signature verification + `securePath()` wired into claws publish (N26) and consumer install paths (aether/lobster/cowork). Currently deferred unsafely — flagged by panel-4 review

## Key architectural decisions (from vault Product/)

- **PDR-001 Agent User Model** (Omar accountable, Adam responsible) — **Trust Ladder**: Read → Suggest → Organize → Execute; expands N14 beyond 4 static tiers to continuous permission earning
- **PDR-002 ClawPilot in Lobster** (Omar / Jakob, draft) — reference node host
- **Single container, not sidecar** — OpenClaw + Python adapter + nginx in one MCR Linux container; confirms N13 single trust zone
- **Employee Model** chosen for agent identity — agents operate as Entra-registered entities, not on behalf of user (drives N21)
- **Plex-managed per-user pods, Redis pool pre-warming, idle timeout** (5 min + cron-aware wake)

## Customer-driven classification hints (from vault Customers/)

- **Eli Lilly** — EBC 2026-05-07; regulated pharma, customer-zero interest; AWS cloud preference flagged → cross-cloud data handling is a real scenario, not hypothetical
- **PayPal** — $1B partnership context; already on A365 / Foundry Agent Services track → treat as flagship financial-services tenant
- **No GCC/GCCH/DoD hits** in Customers — sovereign cloud is out-of-scope for this round

## Gaps surfaced during inventory

- Cowork has **OSS + accessibility compliance done**; explicit TM / DPIA live in MS-internal systems (not in-repo). Pull those refs before starting cluster TMs.
- Aether has a compliance-tooling dir (`CMP`, Bas Brekelmans, 47 commits) — reuse its format.
- OpenClaw adapter logs aren't forwarded to Kusto (#4880) — observability gap worth flagging in TM.
- claws has one committer (giodl) — Horus must assign ownership for N16–N20 on absorption.
- `platform-eng` role still unfilled.
- **No SDL checklist / TM template / review cadence documented in vault** — team constitution has 11 principles but no explicit compliance cadence; Lobster needs to adopt the `design/works/_archive/fundamentals/` framework.
- Vault docs themselves carry **no data classification labels** — recommend adding Confidential/Internal/Public taxonomy to the vault template (Meta/Templates).

## Panel review findings (2026-04-16)

Five role-based panels reviewed this BOM across tension clusters A–J
(16 claws roles, 5 panels). Findings below: **landed** = applied to node/seam
rows above this section; **open** = non-claws findings left for the owning
team (aether / lobster / cowork / security-ops) to absorb into their own TM.

### Landed (claws scope — applied above)

| Panel | Severity | Finding                                                        | Where applied                     |
| ----- | -------- | -------------------------------------------------------------- | --------------------------------- |
| 1     | CRITICAL | N17 audit chain must emit to SIEM                              | N17 row + Compliance fundamentals |
| 1     | MAJOR    | N18 vault — separate key-audit log + rotation ceremony         | N18 row                           |
| 1     | MAJOR    | LLM annotation timeout must hard-error, not silent-unsigned    | N16 row + S7                      |
| 2     | CRITICAL | N25 latency SLO + fail-open/closed policy undefined            | N25 row                           |
| 2     | CRITICAL | Sidecar must read from verified in-memory registry, not blob   | N25 row + S3                      |
| 2     | MAJOR    | N25 `/healthz` probe semantics + `policy_changed` event        | N25 row                           |
| 2     | MAJOR    | `claws fleet signing-status` CLI is S6 rollout prereq          | N16 row + S6                      |
| 3     | CRITICAL | N26 GPR community-author DX (public mirror or clear auth-fail) | N26 row                           |
| 3     | CRITICAL | N25 PatchError 9 codes need human-readable messages            | N25 row + S4                      |
| 3     | MAJOR    | S4 `dryRunPatch` response shape missing                        | N25 row + S4                      |
| 3     | MAJOR    | ServeClient coupling risk — Cowork field types must not leak   | S4 + S8                           |
| 4     | CRITICAL | N26 PAT lifecycle audit (create/rotate/revoke)                 | N26 row + S2                      |
| 4     | CRITICAL | N16 boundary-residue CI merge gate                             | S1                                |
| 4     | MAJOR    | N25 serve version pinning contract                             | **new S11**                       |
| 4     | MAJOR    | Supply-chain SBOM + Sigstore at publish/install                | N26 row + Live blockers           |
| 5     | MAJOR    | S8 `/api/chunks/*` must reserve `session?: SessionRef`         | S8                                |

### Open — non-claws (to absorb into owning team's TM)

| Panel | Severity | Finding                                                                                                            | Owner                                              |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1     | MAJOR    | OBO token TTL + revocation on container restart (N7, N9)                                                           | Marius de Vogel / Bas Brekelmans (Aether)          |
| 1     | MAJOR    | N8 circuit-breaker fail-closed behavior when GuardrailProvider unreachable                                         | Adam Sheppard (Aether)                             |
| 1     | CRITICAL | Blob signature verification before `/workspace` mount (N6/N13)                                                     | Lukas Stankiewicz + Adam Sheppard (Aether/Lobster) |
| 1     | MAJOR    | N21 Agent365 identity mode must be optional (preserve user-delegated default); HIPAA scope tags in Purview         | Kenneth Pan + Sid Uppal (Teams squad)              |
| 1     | MAJOR    | N9 MCP Proxy OBO per-resource scoping (not broad Graph scope)                                                      | Marius de Vogel (Aether)                           |
| 1     | MAJOR    | N14 / N24 permission-revocation path (`claws kill-access` + SSE invalidation)                                      | Emmanuel Miranda-Steiner + Omar Shahine (Lobster)  |
| 2     | CRITICAL | P99 sidecar ready-time <3s validation (referenced doc missing)                                                     | Adam Sheppard (Lobster)                            |
| 2     | MAJOR    | Idle teardown state machine for SSE sessions (N13 + S8)                                                            | Adam Sheppard + Stanislaw Wilczynski               |
| 2     | MINOR    | N13 8GB budget — claws-serve heap limit to prevent container-kill on leak                                          | Adam Sheppard                                      |
| 2     | MAJOR    | S6 telemetry tagging (UNSIGNED_LEGACY vs SIGNED_TAMPERED)                                                          | Marius de Vogel (Aether)                           |
| 2     | MAJOR    | S6 unsigned-workspace read-only policy when `requireSignedArtifacts: true`                                         | Marius de Vogel (Aether)                           |
| 2     | MINOR    | ServeClient reconnect backoff + user-facing "Reconnecting…" UX                                                     | Cowork (Soroush) + Lobster                         |
| 3     | CRITICAL | N1 lock-source propagation (r5 / fleet / governance / none) to 6 CAP tabs                                          | Soroush Ghorashi (Cowork)                          |
| 3     | MAJOR    | A11y coverage expand to N3/N4/N14/N25 error surfaces                                                               | Cowork (per `accessibility.md`) — deferred         |
| 5     | CRITICAL | N15 ClawPilot Node host: Agent365 token flow, telemetry egress, reconnect state, device-session boundary           | Jakob Werner + Carmen Pfeil (Oslo ClawPilot)       |
| 5     | CRITICAL | N24 Trust Ladder is state machine, not static gate — state transitions + audit sink + S6 fallback on policy reject | Omar Shahine (PDR-001)                             |
| 5     | MAJOR    | Device-audit → cloud-audit linkage contract (N17 + N21 + N25 reservation)                                          | Lobster + Teams squads                             |
| 5     | MAJOR    | N17/N23 unified audit correlation + HIPAA PHI-scope tagging                                                        | Bas Brekelmans + compliance team                   |

### Open — cross-cutting (no single owner)

| Severity | Finding                                                                                                                                                                | Suggested owner                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| CRITICAL | Founder-lens: claws-serve HTTP surface was not in open-source OpenClaw spec; publish contract doc in `@openclaw/` clarifying optional nature + local-sidecar guarantee | Gio + OpenClaw community liaison (TBD) |

## Open questions to tighten scope

1. Compliance framework — SDL / M365 SFI / SOC 2 / internal SFI-v2? Determines tenant-isolation and data-residency depth.
2. Are Copilot Studio and Power Platform full DFD nodes, or boundary-terminators?
3. Is the BizChat host (one level out from Cowork) in scope, or a trust-boundary-terminator?
4. ~~For claws → Horus move: is ClawHub registry in scope this round, or deferred?~~ → **Deferred.** ClawHub publish dropped from this round; GPR auth (N26) is the only claws network surface in scope.

## Owner matrix (for TM authorship assignment)

| Cluster                        | Lead              | Supporting                         |
| ------------------------------ | ----------------- | ---------------------------------- |
| Cowork frontend + tokens       | Soroush Ghorashi  | David Zearing, Christopher Whitten |
| Cowork client SDK + CIQ        | David Zearing     | Bas Brekelmans                     |
| Aether Runtime + security      | Marius de Vogel   | Bas Brekelmans                     |
| Aether Orchestrator + files    | Lukas Stankiewicz | —                                  |
| Aether container lifecycle     | Adam Sheppard     | —                                  |
| OpenClaw integration (Lobster) | Omar Shahine      | Emmanuel Miranda-Steiner           |
| ClawPilot device host          | Jakob Werner      | Carmen Pfeil                       |
| claws → Horus                  | Gio Della-Libera  | (Horus team TBD)                   |

## Next steps

1. Answer the four scope questions above with the compliance team.
2. Per-cluster owners draft TM scaffolds against the six fundamentals (threat-model / privacy / compliance / responsible-ai / accessibility / data-classification) — see `design/works/_archive/fundamentals/`.
3. Consolidated DFD (Mermaid or MS Threat Modeling Tool) drawn from this node list once scope is locked.
4. Triage TM-01..TM-16 inherited astro gaps for claws→Horus handoff.
5. Schedule independent security review per C-SDL (separate reviewer per cluster).
