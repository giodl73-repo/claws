# Lobster/OpenClaw Layering Contracts Project

Use this area for the broader Lobster/OpenClaw host-runtime contract portfolio.
The goal is to reduce Lobster-only runtime patches by making the OpenClaw
contracts required by any serious host explicit, testable, and upstream-owned.

This is the umbrella effort. Individual contracts can have their own RFCs and
implementation stacks without becoming one monolithic hosted configuration
envelope.

## Areas

| Area | Question | Current work | File |
| --- | --- | --- | --- |
| Runtime activation | How does host intent become one accepted effective OpenClaw configuration? | Fold startup-critical observations into readiness | `activation.md` |
| Runtime boundary | How does a host authenticate, connect to, supervise, and route traffic to OpenClaw? | Hosting Profiles RFC 33 | `runtime-boundary.md` |
| State and continuity | What must survive, when is it consistent, and how can execution continue elsewhere? | Next discovery area | `state-continuity.md` |
| Evidence and compatibility | How does a host prove behavior and select a compatible OpenClaw release? | Inventory only | `evidence-compatibility.md` |

These are durable classification areas, not four automatic RFCs or projects.
An item leaves the umbrella project only when it has a distinct active RFC,
implementation stack, or operating loop.

The four areas classify portable semantics. They are governed by the project
charter and exercised through the concrete Lobster/OpenClaw compatibility
boundary; neither is a fifth semantic area.

## Active Notes

| Area | File |
| --- | --- |
| Governing ownership thesis and working rules | `charter.md` |
| Explicit as-is Lobster/OpenClaw integration ABI and migration ledger | `compatibility-boundary.md` |
| Approved Managed Configuration deliverable | `managed-configuration-deliverable.md` |
| Approved ordered evidence and decision plan | `next-evidence-plan.md` |
| Current portfolio, ownership rules, and audit plan | `contract-portfolio.md` |
| Completed four-corner framing and surface disposition | `four-corners.md` |
| Working `/synced`, generation, provider, and graceful-shutdown hypothesis | `synchronization-model.md` |
| As-is inventory index and evidence requirements | `inventory/README.md` |
| Boot/start DTO, environment, and baked-config audit pass 1 | `inventory/boot-config-2026-07-10.md` |
| Managed env reset, forwarding, and consumer audit pass 2 | `inventory/env-matrix-2026-07-10.md` |
| Effective config writer and ordering audit pass 3 | `inventory/config-writers-2026-07-10.md` |
| Sparse host authority versus operator config fit assessment | `inventory/host-operator-config-fit-2026-07-10.md` |
| Trusted identity and proxy-pipe boundary audit pass 4 | `inventory/trust-proxy-pipe-2026-07-10.md` |
| Proxy-pipe frame ownership and AgentHarness overlap pass 5 | `inventory/proxy-pipe-frames-2026-07-10.md` |
| Gateway coverage versus ProxyPipe and residual Host Bridge gaps pass 6 | `inventory/gateway-proxypipe-coverage-2026-07-10.md` |
| ProxyPipe fit with `OpenClawTransport` and migration options pass 7 | `inventory/proxypipe-openclaw-transport-fit-2026-07-10.md` |
| `node.invoke` fit and shared peer-invocation decision pass 8 | `inventory/node-invoke-duplex-fit-2026-07-10.md` |
| Hosted peer role, authentication, permissions, and generation pass 9 | `inventory/hosted-peer-identity-2026-07-10.md` |
| Duplex Transport candidate project and design gates | `duplex-transport.md` |
| Superseded Host Bridge composition hypothesis | `host-bridge-hypothesis.md` |
| Current session and resume state | `SESSION.md` |
| Historical boundary analysis | `../hosting-profiles/analysis.md` |
| Historical Lobster inventory | `../hosting-profiles/lobster-layer-inventory.md` |
| Historical first-pass contract audit | `../hosting-profiles/contract-audit.md` |
| Historical architecture milestones | `../hosting-profiles/milestones.md` |

## Active Work

| Repo | PR / Issue | Status | Purpose |
| --- | --- | --- | --- |
| `bic/lobster` | TBD | Audit | Inventory current host pressure and private runtime assumptions. |
| `openclaw/openclaw` | Per-contract follow-ups | Discovery | Find existing homes before proposing new contracts. |
| `openclaw/rfcs` | [RFC 33](https://github.com/openclaw/rfcs/pull/33) | Child initiative | Readiness Conditions and Standard Hosting Profiles. |
| `openclaw/rfcs` | [RFC 31](https://github.com/openclaw/rfcs/pull/31) | Related | Remote AgentHarness data-plane contract. |
| `giodl73-repo/rfcs` | [Fork PR 1](https://github.com/giodl73-repo/rfcs/pull/1) | Draft, fork-only | Managed Configuration RFC review. |
| `giodl73-repo/rfcs` | [Fork PR 2](https://github.com/giodl73-repo/rfcs/pull/2) | Draft, fork-only | Duplex Transport and Host Providers RFC review. |
| `giodl73-repo/rfcs` | [Fork PR 3](https://github.com/giodl73-repo/rfcs/pull/3) | Draft, fork-only | Runtime Continuity and Safe Shutdown RFC review. |

## Ownership Rule

OpenClaw owns portable runtime semantics and conformance. Lobster owns
enterprise hosting decisions and implementations. OCC may eventually compile
declarative desired state into these contracts; AgentHarness carries execution
events after admission and startup. Neither future architecture is a reason to
keep an implicit Lobster-only runtime contract today.

## Architecture Alignment

```text
OCC desired state
      |
      v
runtime activation
      |
      v
runtime boundary <--- host supervision and traffic
      |
      v
OpenClaw runtime ----> AgentHarness execution events
      |
      v
state and continuity
      |
      v
evidence and compatibility
```

OCC is a future producer of activation inputs. AgentHarness is an execution
data-plane protocol. Neither is another contract area to invent here.

## Related Areas

- `projects/hosting-profiles/README.md`
- `projects/lobster/README.md`
- `projects/openclaw/README.md`
- `projects/snapshot/README.md`
- `projects/policy/README.md`
