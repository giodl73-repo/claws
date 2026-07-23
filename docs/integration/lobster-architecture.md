# Lobster Governance Architecture — claws + Aether + OpenClaw

## End-to-End Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│  Developer Machine                                                   │
│                                                                      │
│  SOUL.md  TOOLS.md  AGENTS.md  MEMORY.md  IDENTITY.md  lobster.yaml │
│     │        │         │          │           │             │         │
│     └────────┴─────────┴──────────┴───────────┴─────────────┘         │
│                              │                                       │
│                    ┌─────────▼──────────┐                            │
│                    │    claws build     │                            │
│                    │   (one compilation)│                            │
│                    └─────────┬──────────┘                            │
│                              │                                       │
│              ┌───────────────┼───────────────────────┐               │
│              │               │                       │               │
│              ▼               ▼                       ▼               │
│   ┌──────────────┐ ┌─────────────────┐ ┌────────────────────────┐   │
│   │ Gateway      │ │ host-approval-  │ │ exec-approvals.json    │   │
│   │ Plugin       │ │ policies.json   │ │ (OC-native backup)     │   │
│   │ (index.ts +  │ │                 │ │                        │   │
│   │  handlers/)  │ │ Per-tool policy │ │ Tool allowlist for     │   │
│   │              │ │ from same risk  │ │ host-level enforcement │   │
│   │ L2-L4 hooks  │ │ classification  │ │                        │   │
│   └──────┬───────┘ └───────┬─────────┘ └───────────┬────────────┘   │
│          │                 │                       │                 │
│          │    ┌────────────┘  ┌─────────────────────┘                │
│          │    │    Also emits:│                                      │
│          │    │    ▼          ▼                                      │
│          │    │  SKILL.md  .claws-manifest.json                     │
│          │    │  (L1 advisory)  (signatures)                        │
│          │    │                                                      │
│          └────┴─── all artifacts ──► Azure Blob (wuclaw-{hash})     │
│                        │              signed + versioned             │
└────────────────────────┼─────────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────────────────┐
         │                                           │
         ▼                                           ▼
┌─────────────────────────────┐   ┌──────────────────────────────────┐
│  Aether Runtime             │   │  Cowork UX                       │
│  (FastAPI · Redis · SSE)    │   │                                  │
│                             │   │  SSE ◄──── Aether streams events │
│  ┌────────────────────────┐ │   │                                  │
│  │ ApprovalPolicyRegistry │ │   │  tool_approval ──►               │
│  │                        │ │   │  User sees: "Allow send-email?"  │
│  │ Reads host-approval-   │ │   │  [Approve] [Deny]               │
│  │ policies.json from blob│ │   │                                  │
│  │                        │ │   └──────────────────────────────────┘
│  │ R1-R2: auto-allow      │ │
│  │ R3-R4: gate (config)   │ │
│  │ R5:    always gate     │ │
│  └───────────┬────────────┘ │
│              │              │
│  ┌───────────▼────────────┐ │
│  │ Container Provisioning │ │
│  │                        │ │
│  │ 1. Download blob       │ │
│  │ 2. Verify signatures   │◄── .claws-manifest.json check
│  │ 3. Inject policies     │    (tamper = block startup)
│  │ 4. Start container     │ │
│  └───────────┬────────────┘ │
│              │ gRPC         │
└──────────────┼──────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  OpenClaw Container (Plex / ACI sandbox)                         │
│  ┌──────────────────────────────────────────┐                    │
│  │  OC Gateway (stock OpenClaw)             │                    │
│  │                                          │                    │
│  │  ┌──────────────────────────────────┐    │                    │
│  │  │  claws Gateway Plugin            │    │                    │
│  │  │  (loaded from verified blob)     │    │                    │
│  │  │                                  │    │                    │
│  │  │  before_tool_call ─── L2 ────┐   │    │                    │
│  │  │  a2a-firewall ────── L3 ──┐  │   │    │                    │
│  │  │  elicitation-gate ── L3 ──┤  │   │    │                    │
│  │  │  output-guard ────── L3 ──┘  │   │    │                    │
│  │  │                              │   │    │                    │
│  │  │  RISK_MAP (pre-computed)     │   │    │                    │
│  │  │  R5 = fail-closed (always)   │   │    │                    │
│  │  │  Unknown tool = R5           │   │    │                    │
│  │  └──────────────────────────────┘   │    │                    │
│  │                                      │    │                    │
│  │  exec-approvals.json ──── L4 backup  │    │                    │
│  │  SKILL.md ──────────────── L1 prompt │    │                    │
│  └──────────────────────────────────────┘    │                    │
│                                              │                    │
│  ┌─────────────────────┐  ┌───────────────┐  │                    │
│  │  Python Adapter     │  │  nginx        │  │                    │
│  │  (gRPC ↔ HTTP)      │  │  (TLS proxy)  │  │                    │
│  │                     │  │               │  │                    │
│  │  LLM Proxy ────────►│──► Aether LLM   │  │                    │
│  │  (no direct egress) │  │   pipeline    │  │                    │
│  │                     │  │               │  │                    │
│  │  File Watcher ──────│──► Blob sync     │  │                    │
│  └─────────────────────┘  └───────────────┘  │                    │
│                                              │                    │
│  Network: gRPC to Aether ONLY (no egress)    │                    │
│  Filesystem: read-only + tmpfs               │                    │
└──────────────────────────────────────────────────────────────────┘

               │
               │  Cloud ↔ Device boundary
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  ClawPilot (Device Runtime)                                      │
│  Electron + Node Host                                            │
│                                                                  │
│  ┌──────────────────────────────────────────┐                    │
│  │  Same claws Gateway Plugin               │                    │
│  │  Same exec-approvals.json                │                    │
│  │  Same SKILL.md                           │                    │
│  │  Same host-approval-policies.json        │                    │
│  │                                          │                    │
│  │  L2-L4 enforcement (same as cloud)       │                    │
│  │  + Local approval dialogs (desktop UX)   │                    │
│  └──────────────────────────────────────────┘                    │
│                                                                  │
│  Connected mode: syncs from cloud blob                           │
│  Standalone mode: local claws build                            │
│                                                                  │
│  Shell, file ops, browser, credentialed flows                    │
└──────────────────────────────────────────────────────────────────┘
```

## Enforcement Layer Summary

```
         Compile Time                    Runtime
         ───────────                     ───────
         claws build ──┐
                         │
                         ├──► L1  SKILL.md (advisory prompt, costs tokens)
                         │
                         ├──► L2  before_tool_call hook (Gateway plugin, zero tokens)
                         │        Risk classification: R1-R5, unknown=R5
                         │        Budget enforcement: G-BOUND
                         │
                         ├──► L3  Lifecycle hooks (Gateway plugin, zero tokens)
                         │        A2A firewall, output guards, injection defense
                         │
                         ├──► L4  exec-approvals.json (OC host backup)
                         │        Independent of plugin — survives plugin crash
                         │
                         ├──► L5  Sidecar (separate process) [enterprise]
                         │        Integrity monitoring, kill switch
                         │
                         └──► HOST host-approval-policies.json
                                  │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
            Aether Runtime                 ClawPilot Device
            ApprovalPolicyRegistry         Local approval dialog
            SSE → UX approval              Desktop notification
            Credential gating              Credentialed local exec
```

## What Runs Where

| Artifact                      | Produced By     | Consumed By                                | Enforcement Point                  |
| ----------------------------- | --------------- | ------------------------------------------ | ---------------------------------- |
| Gateway plugin (`index.ts`)   | `claws build`   | OC Gateway (in container + ClawPilot)      | L2-L4: every tool call             |
| `exec-approvals.json`         | `claws build`   | OC host (Gateway reads at startup)         | L4: backup allowlist               |
| `SKILL.md`                    | `claws build`   | LLM context (injected by Gateway)          | L1: advisory only                  |
| `host-approval-policies.json` | `claws build`   | Aether `ApprovalPolicyRegistry`, ClawPilot | HOST: credential-gated approval UX |
| `.claws-manifest.json`        | `claws publish` | Aether blob rehydration, ClawPilot         | Integrity: tamper detection        |
| `lobster.yaml`                | Developer       | OC Gateway (workflow engine)               | Workflow orchestration             |

## Security Properties

| Property             | Cloud Container                    | ClawPilot Device             |
| -------------------- | ---------------------------------- | ---------------------------- |
| Network isolation    | gRPC only (no egress)              | Full local network           |
| LLM credential       | Aether metered pipeline            | Direct API key               |
| Graph credential     | Aether holds (OBO token)           | User's local credential      |
| Plugin integrity     | Blob signature verified at startup | Local `.claws-manifest.json` |
| Unknown tool default | R5 fail-closed                     | R5 fail-closed               |
| Approval UX          | Cowork SSE dialog                  | ClawPilot desktop dialog     |
| Kill switch          | L5 sidecar (if deployed)           | L5 sidecar (local)           |

## Composition Model

```
Tool call arrives at OC Gateway
        │
        ▼
   GuardrailProvider.preAuthorize(toolCall)
        │
        ├── { allowed: false } ──────────────────► BLOCKED (L2-L3)
        │
        ├── { allowed: true, requiresExternalApproval: true }
        │         │
        │         ▼
        │   Host approval gate fires
        │   (Aether SSE or ClawPilot dialog)
        │         │
        │         ├── User approves ──► EXECUTE
        │         └── User denies ───► BLOCKED
        │
        └── { allowed: true, requiresExternalApproval: false } ──► EXECUTE
```

The `requiresExternalApproval` flag is the bridge between claws's risk classification
and the host's credential-gated approval UX. claws decides the risk. The host
decides whether to gate credentials. They compose, they don't conflict.

## Trust Assumptions

1. **L2-L4 are the security boundary.** The Gateway plugin runs inside the container, loaded from verified blob artifacts. These layers cannot be bypassed by the host operator. Even if the HOST layer is disabled, L2-L4 enforce risk classification, OBO elicitation, A2A firewall, and output guards.

2. **HOST is defense-in-depth, not a security boundary.** The host operator (Aether admin) can set `openclaw_approval_policies: []` to disable HOST-level gating. This is by design — the host controls its own credentials and approval UX. claws provides the policy; the host decides whether to enforce it.

3. **Blob integrity is verified at startup only.** The manifest and content hashes are checked when artifacts are loaded from blob. Post-startup tampering of artifacts on tmpfs is NOT covered by this plan. L5 sidecar (runtime integrity monitoring) addresses this threat model but is out of scope for the Ra wave. Enterprise deployments requiring post-startup integrity should deploy the L5 sidecar.

4. **Gateway token authenticates the container to Aether's gRPC endpoint.** This token is injected into openclaw.json at container provisioning time. It is NOT a Graph credential (OBO tokens stay in Aether). A compromised container process can read this token from the filesystem. Mitigation: token should be short-lived (TTL) and bound to the container's identity.

5. **HMAC signing is sufficient for blob integrity but not for compromised adapter.** The signing key is symmetric — both the signing side (developer's `claws build`) and the verification side (adapter's blob_mount.py) hold the same key. If the adapter is compromised, it can forge signatures. For environments requiring stronger guarantees, Ed25519 asymmetric signing (Thoth Pulse 18) provides non-repudiation.
