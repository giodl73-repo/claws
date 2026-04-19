# Enterprise Hardening x Governance Contribution — Integration Brief

**To**: Steven (Scribe)
**From**: Giovanni / Craftworks team
**Date**: 2026-04-15
**Re**: How the @openclaw/* governance packages fit into the Enterprise Hardening spec

---

Hey Steven,

Read through your Enterprise Hardening spec — great work. You're tackling the
runtime hardening that OpenClaw needs to be enterprise-ready: identity, isolation,
admin controls, audit, lifecycle. We're coming at the same problem from the
compile-time side: a governance compiler (claws) that reads workspace files and
emits enforcement artifacts — risk classification, approval policies, audit chains,
signed manifests.

Both are initiatives that make OpenClaw better for enterprise. Yours hardens the
runtime. Ours hardens what runs on it. There are a few places where these intersect
— let's take a look.

---

## The 6 Integration Points

### 1. Identity: WS-1 + @openclaw/identity-bridge

Your `gateway/auth-oidc.ts` (JWKS validation, claim extraction, role mapping) is
the same thing as our `@openclaw/identity-bridge` package (~3KB, MIT, zero deps).
OIDC/SAML token validation, pre-loaded signing keys, role mapping, RBAC checks.
Your gateway auth module could import it instead of implementing from scratch.

The config shape is nearly identical:

```typescript
// Our package:
import { IdentityBridge } from '@openclaw/identity-bridge';

const bridge = new IdentityBridge({
  provider: 'oidc',
  issuer: 'https://login.microsoftonline.com/{tenantId}/v2.0',
  signingKeys: preloadedJwks,  // pre-loaded at startup, no runtime fetching
  roleMapping: {
    'admin': 'admin',
    'user': 'editor',
    'viewer': 'viewer',
  },
});

const identity = await bridge.validate(bearerToken);
// { sub, roles, groups, claims }
```

Keys are pre-loaded at startup — no per-request JWKS fetching, which matches your
constraint that auth shouldn't add per-request overhead.

---

### 2. Audit: WS-6 + @openclaw/audit-chain

Your `AuditLogger` (append-only JSONL, in-memory ring buffer, daily rotation) is a
subset of our `@openclaw/audit-chain` (~20KB, MIT, zero deps). Ours adds
hash-chaining (HMAC-SHA256 tamper detection), write-ahead log (crash recovery), and
export to 5 formats (SARIF, CEF, NDJSON, JSON, syslog).

Your `AuditLogger` could wrap our chain:

```typescript
import { AuditChain } from '@openclaw/audit-chain';

const chain = await AuditChain.open('./audit/gateway-audit.jsonl', {
  algorithm: 'HMAC-SHA256',
  secret: process.env.AUDIT_SECRET,
});

// Every RPC dispatch:
await chain.append({
  type: action, category, userId, tenantId,
  actor: { clientId, deviceId, clientIp },
  resource: { type: resourceType, id: resourceId },
  result, details,
});

// tenant.audit.query handler:
const events = await chain.query({ category: 'policy', userId });

// tenant.audit.export handler:
const exported = await chain.export('ndjson'); // or 'sarif', 'cef', 'json', 'syslog'
```

Your `AuditEvent` type and ours are compatible — you add your fields (`tenantId`,
`actor`, `resource`, `category`) as the event payload, the chain handles integrity
and persistence. Your Lobster sidecar shipping to Azure Monitor would consume the
NDJSON/syslog output directly.

---

### 3. Tool Governance: WS-4 + GuardrailProvider

Your `tenant.tools.policy.get/set` (admin-managed tool approval) and our
`host-approval-policies.json` (compiler-generated per-tool risk policies) compose
as two layers. The claws serve API exposes tool governance through Layer 1
(`PATCH /api/oc/TOOLS.md#Tools/{tool}`) for direct OC file access and Layer 2
(`PATCH /api/chunks/connections/{server}`) for CAP settings partners:

```
Compile-time (claws):
  claws build --> host-approval-policies.json
  Per-tool risk classification: R1-R5
  R2 = auto-allow, R3-R4 = gated by default, R5 = always gated

Runtime (your admin API):
  tenant.tools.policy.set --> admin overrides
  Admin can relax R3 tools ("auto-approve send-teams for this tenant")
  Admin CANNOT relax R5 tools (non-negotiable)

Serve API (claws serve):
  Layer 1: PATCH /api/oc/TOOLS.md#Tools/{tool}  --> direct OC file edit
  Layer 2: PATCH /api/chunks/connections/{server} --> CAP chunk edit
  Both route through write-time validation (R5/fleet/governance)
```

The `GuardrailProvider` interface we're submitting to openclaw/openclaw defines how
multiple policy sources compose:

```
Tool call arrives
  |
  v
ProviderRegistry.preAuthorize(toolCall)
  |-- ShellExecProvider (wraps exec-approvals.json -- existing behavior)
  |-- ClawsProvider (wraps compiled host-approval-policies.json)
  |-- AdminPolicyProvider (wraps your tenant.tools.policy)
  |
  v
Compose: deny > review > modify > allow
If R5: requiresExternalApproval forced true (non-negotiable)
```

Your admin policy becomes another provider in the chain. To be precise: your
admin policy and our compiled policy are PEERS in the ProviderRegistry, not
caller/callee. Both register independently. The registry composes their decisions
using the `deny > review > modify > allow` precedence. Neither your API nor ours
calls the other at runtime -- both contribute policy decisions that the registry
merges. The chunk API (`/api/chunks/connections/*`) is for UX consumers (CAP, TUI),
not for your runtime enforcement.

---

### 4. Local Tool Approval: WS-8 + Approval Event Schema

Your `tool.executeLocal` has `requiresApproval?: boolean` on `LocalToolDefinition`.
We're defining a standard `ApprovalRequestEvent` / `ApprovalResponseEvent` schema
(transport-agnostic) for the approval exchange.

The flow would be:

```
1. Agent calls tool "clawpilot:filesystem"
2. tool-dispatch.ts calls ProviderRegistry.preAuthorize()
3. Provider returns { decision: 'allow', requiresExternalApproval: true, riskLevel: 4 }
4. Gateway emits ApprovalRequestEvent to ClawPilot via WebSocket
5. ClawPilot shows permission dialog
6. User approves --> ApprovalResponseEvent back to gateway
7. Gateway sends tool.executeLocal to ClawPilot
8. ClawPilot executes locally, returns result
```

The `requiresApproval` on `LocalToolDefinition` becomes the registration-time
default. The GuardrailProvider can override it per-call based on risk classification.
Same event schema whether it's ClawPilot desktop dialog or Teams inline card.

---

### 5. Secret Scanning: WS-11 + @openclaw/secret-scanner

You spec "gitleaks (or equivalent)" for CI. Our `@openclaw/secret-scanner` (~4KB,
MIT, zero deps) does regex patterns for 8 secret families plus Shannon entropy
analysis. Runs in Node.js (same stack), outputs SARIF, patterns tuned for AI agent
workspaces.

---

### 6. Compliance: WS-10 + Ontology System (future)

Your RAI assessment and GDPR consent flow documentation are manual today. We have
compliance ontologies on the roadmap that could generate consent mappings from tool
declarations + data labels. Not immediate — flagging for future convergence.

---

## Timeline

| Our Wave 1 (wks 1-4) | Your Workstream | Serve API Layer |
|----------------------|-----------------|-----------------|
| GuardrailProvider spec PR | WS-4 (tool policy) | Layer 1: `/api/oc/TOOLS.md`, Layer 2: `/api/chunks/connections/*` |
| @openclaw/identity-bridge | WS-1 (OIDC auth) | — (standalone package) |
| @openclaw/audit-chain | WS-6 (audit log) | — (standalone package) |
| @openclaw/approval-events | WS-8 (local tools) | Layer 3: `/api/sessions/:id` |
| @openclaw/oc-path | — (shared addressing) | Layer 1: `oc://` URI scheme for `/api/oc/{path}` |

| Our Wave 2 (wks 5-8) | Your Workstream | Serve API Layer |
|----------------------|-----------------|-----------------|
| @openclaw/secret-scanner | WS-11 (CI security) | — (standalone package) |
| @openclaw/siem-emitter | WS-6 (audit export) | — (standalone package) |

If your WS-1 or WS-6 are starting soon, let us know — we can prioritize those
packages.

---

Full spec: `design/claws/specs/CL-11-upstream-governance.md`
