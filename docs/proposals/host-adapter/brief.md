# HostAdapter — A Named Interface Between OpenClaw Plugins and Their Hosts

**To**: OC maintainers (Peter), aether engineering leads, Microsoft leadership
**From**: claws / bic team
**Status**: Pitch-ready for review
**Date**: 2026-04-20
**Related**: `openclaw-upstream/` proposal (the 4-package contribution this extends)

---

## One-paragraph summary

Every OpenClaw plugin today reaches into its host's internals: aether, lobster, vanilla OpenClaw each wire differently because there is no named contract for how a plugin asks its host "who is this user?", "which policy applies?", or "where do I put the audit entry?". We propose `HostAdapter` — a small interface in `@openclaw/guardrails` — that formalizes that contract. Aether's existing `openclaw_adapter.py` retroactively becomes *aether's implementation of* `HostAdapter`; anyone else hosting OpenClaw plugins writes their own adapter. Plugins become portable; hosts stop reinventing; OC gets a standardization target.

---

## The problem

OpenClaw's plugin model says "plugins run inside a host". It does NOT say how the plugin talks to that host. Today:

- **Aether** has `openclaw_adapter.py` — their own integration layer wrapping `TenantIsolationMiddleware` + `conversation_authz` + `ApprovalPolicyRegistry` + `/v1/tool-approval`. Works. But plugins generated for aether can't run anywhere else without rewriting.
- **Lobster** (single-tenant pod pattern) has its own informal adapter — sidecar snap + supervisor-HTTP approval. Different shape, different coupling points.
- **Vanilla OpenClaw** has no adapter — plugins use local files, CLI prompts, whatever they were compiled to expect.
- **Third-party hosts** (community adopters) have no guidance — each reinvents.

The generated plugin, the host, and the integration code are entangled. A plugin compiled for aether bakes in aether-specific calls. A plugin for lobster assumes sidecar semantics. Moving a plugin between hosts means regenerating — often with different source policies to match what the new host expects.

## The ask

Formalize the contract. Add `HostAdapter` + `ApprovalSink` interfaces to `@openclaw/guardrails`. Generated plugins target the interface; hosts implement the interface.

```typescript
// New in @openclaw/guardrails
interface HostAdapter {
  readonly adapterId: string;
  extractIdentity(req: IncomingRequest): Promise<AuthorizationContext>;
  routePolicy(ctx: AuthorizationContext): Promise<PolicyArtifactRef>;
  getApprovalSink(ctx: AuthorizationContext): ApprovalSink;
  shapeResponse(
    decision: AuthorizationDecision,
    ctx: AuthorizationContext,
  ): Promise<OutgoingResponse>;
}

interface ApprovalSink {
  writeDecision(entry: DecisionEntry): Promise<void>;
  writeApproval(entry: ApprovalEntry): Promise<void>;
  query?(filter: AuditFilter): AsyncIterable<AuditEntry>;  // optional read side
}
```

Four methods, one auxiliary interface, ~100 lines of TypeScript. Pure contract, zero runtime dependency.

## How it works

### Before (today)

```
  Agent inside aether container
    │
    ▼
  OpenClaw runtime
    │  before_tool_call
    ▼
  Generated plugin  (assumes aether globals / imports)
    │
    ▼
  openclaw_adapter.py  (aether-specific, no named contract)
    │
    ▼
  aether's middleware + registry + tool-approval sink
```

### After (proposed)

```
  Agent inside {any host}
    │
    ▼
  OpenClaw runtime
    │  before_tool_call
    ▼
  Generated plugin  (host-agnostic — calls HostAdapter methods)
    │
    ▼
  ┌─────────────────────────────────────────────────┐
  │  HostAdapter interface (from @openclaw/guardrails) │
  └─────────────────────────────────────────────────┘
          ▲              ▲              ▲                  ▲
          │ implements   │ implements   │ implements       │ implements
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐
  │ AetherAdapter│ │ LobsterAdapter│ │ OpenClawVanilla│ │ ClawsServiceAdapter│
  │              │ │              │ │ Adapter      │ │ (any future host) │
  │ formalizes   │ │ sidecar-snap │ │ CLI-stdin +  │ │                   │
  │ openclaw_    │ │ + supervisor-│ │ local policy │ │ JSONL sink +      │
  │ adapter.py   │ │ HTTP         │ │              │ │ single-tenant     │
  └──────────────┘ └──────────────┘ └──────────────┘ └───────────────────┘
         │                │                │                    │
         ▼                ▼                ▼                    ▼
   aether's          lobster pod's     openclaw's           claws's own
   middleware +      sidecar +         CLI prompt           sink (if
   registry +        supervisor                             self-hosted)
   tool-approval
```

The adapter adapts `{host}` → OpenClaw plugin contract. The interface lives in OpenClaw; each host writes their implementation.

## What each stakeholder gets

| Stakeholder | What they get |
|---|---|
| **OC maintainers (Peter)** | A standardization target. The plugin-host contract becomes a reviewable API surface instead of wishful convention. Third-party hosts onboard faster. |
| **Aether** | `openclaw_adapter.py` gets promoted from "informal layer" to "named interface implementation". Less ad-hoc coupling. Plugins generated for aether can be validated in isolation (against a test double of `HostAdapter`) without booting aether. |
| **Microsoft** | Opens a clean path for claws-as-a-service: if bic decides to host a runtime directly (for direct-customer deployments), it's one adapter away. Today this would be a full rewrite. |
| **Third-party hosts** | A drop-in shape. Any org that wants to run OpenClaw plugins inside their service implements `HostAdapter`; the plugin doesn't know or care. |
| **Plugin authors** | Write against an interface, not an environment. Test doubles are small. Portability across hosts is real, not aspirational. |

## What we've already validated

The Horus wave (currently in prep) simulates the pattern end-to-end:

- **4 concrete adapters in the sim** at `test/e2e/adapters/`:
  - `AetherAdapter` — mirrors aether's real `openclaw_adapter.py` shape (middleware + registry + sink), informed by direct survey of aether's codebase
  - `LobsterAdapter` — sidecar-snap + supervisor-HTTP
  - `OpenClawVanillaAdapter` — CLI-stdin + local `.openclaw/policy/`
  - `ClawsServiceAdapter` — stub for the Microsoft-direct-hosting path (not implemented, just interface-validated)
- **Matrix dispatcher** runs one behavioural suite (`@openclaw/policy` decision semantics + approval flow + file ingest) against all four adapters. Same scenarios, different hosts, same pass criteria.
- **Spec amendments in Horus Stage 3** (`specs/drafts/CL-07-amendment-host-adapter.md` forthcoming) — formal contract + invariants + version policy.

Everything runs today in sim. Wepwawet (the wave after Horus) swaps the sim adapters for real ones implementing the same interface in each host's repo. No refactor of plugin code; just new adapters.

## Shipping path

| Phase | Who | What |
|---|---|---|
| 1. Horus (in prep) | bic/claws | `HostAdapter` + `ApprovalSink` interfaces specified (CL-07 amendment); 4 sim adapters; test suite proves contract |
| 2. Wepwawet (next) | bic/claws + aether + lobster teams | Real adapters land in real repos. Aether's `openclaw_adapter.py` refactors to explicitly `implements HostAdapter`. Lobster writes their adapter. Behavioural suite from Horus runs against real code. |
| 3. Upstream PR wave (later, Peter-triggered) | OC community review | `HostAdapter` + `ApprovalSink` contributed to `@openclaw/guardrails`. Interface becomes canonical. Potential 5th package `@openclaw/host-adapter` if the concept earns its own home. |
| 4. Adopters | Third-party hosts | Write their own adapter. Plugins drop in without rewrite. |

## Risks and open questions

1. **Naming**: `HostAdapter` is the proposed name. Alternatives considered: `HostBinding`, `HostDriver`, `HostConnector`. Peter's call if the upstream PR lands.
2. **Interface scope creep**: easy to pile methods on. The current 4-method + 1-sink shape was chosen because each method maps to a real thing hosts already do. Growth requires version bump + migration playbook.
3. **Backwards compatibility**: existing informal adapters (aether's `openclaw_adapter.py`) need a refactor to implement the formal interface. Not huge (mostly renames + method signatures), but real. The OC maintainer ask is: does the interface shape aether already has match closely enough that their refactor is mechanical? Short answer yes, see Horus sim's `AetherAdapter` for the mapping.
4. **Version policy**: `HostAdapter v1` is the first named contract. Major bump = breaking change requires coordinated refactor across adapters. Minor = additive. Same evolution policy as sibling `@openclaw/*` specs (major/minor/patch + "tightening is MINOR" clause).
5. **Contribution timing**: Horus proves the pattern; Wepwawet validates against real aether + lobster; upstream PR comes after confidence is high. Not before.

## What we need

1. **Signal from OC maintainers** that a named `HostAdapter` interface is welcome upstream (not "just do it in your fork")
2. **Aether engineering acknowledgement** that refactoring `openclaw_adapter.py` to implement the formal interface is mechanically tractable (we think yes; they should verify)
3. **Microsoft leadership sign-off** that claws-as-a-service stays on the roadmap as a possible deployment shape (doesn't need to land anytime soon; the adapter contract keeps the door open)

---

## Appendix: the proof

Horus sim is the proof. When Wepwawet's real-integration scenarios pass against aether's real `AetherAdapter implements HostAdapter`, the contract is validated against reality. Before that: the sim scenarios pass against the sim adapter. Before that (today): specs drafted in `.craft/waves/260416+horus-the-heir+claws-migration/specs/drafts/`; sim harness specified in `.craft/plans/claws-e2e-sim-harness.md`; preset matrix in `.craft/plans/claws-sim-host-presets.md`.

Open a draft PR against `openclaw/openclaw` with `@openclaw/guardrails/host-adapter.ts` (interface only, ~100 lines) once Horus closes. That's the first visible upstream artifact; it has zero risk (no behavior, just types) and invites maintainer review of the shape.
