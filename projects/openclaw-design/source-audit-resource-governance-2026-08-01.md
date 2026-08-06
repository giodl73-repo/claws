# Resource Governance Source Audit - 2026-08-01

## Source Baseline

- Worktree: `C:\src\openclaw-design-audit`
- Head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Finding

OpenClaw has strong local resource controls: token and context caps, model cost
metadata, timeouts, rate limits, cooldowns, concurrency lanes, queue limits,
child admission, disk budgets, output truncation, heap diagnostics, and usage
reporting.

The enterprise gap is not the absence of limits. It is the lack of a portable
contract connecting policy scope, admission decisions, runtime leases, usage
observations, cost allocation, and fleet capacity. One global budget manager
would flatten independently owned resources and enforcement points.

## Current Architecture

```text
definition and selection
   model cost / context cap / timeout / concurrency / disk / queue
        |
        v
owner-native admission and enforcement
   allow / queue / throttle / reject / cancel / kill / truncate
        |
        v
runtime lease or generation
   lane slot / child slot / cron admission / worktree lease
        |
        v
usage observation
   tokens / cost estimate / duration / bytes / pressure / result
        |
        +--> operator status and diagnostics
        +--> enterprise allocation, budget, SLO, and fleet projections
```

## Contract Coverage

| Contract | Coverage | Current evidence |
| -------- | -------- | ---------------- |
| Definitions and selections | C3 | Typed model costs, context/output limits, timeouts, concurrency, queue, disk, and sandbox settings |
| Admission and enforcement | C3 | Gateway rate limits, control-plane limits, child/spawn admission, queue caps, cron admission |
| Runtime leases | C2 | Worktree leases, subagent generations, registry slots, and cron run admission; renewal is owner-specific |
| Usage observations | C3 | Normalized token/cost rollups, per-session reporting, status APIs, memory/disk/process diagnostics |
| Billing and cost | C2 | Local estimated cost and pricing metadata, not an invoice-grade allocation ledger |
| Fleet projection | C1 | Cell profiles and heap hardening exist; cross-fleet quota, fairness, reservation, and SLO policy are mostly planned |

## Definitions and Selections

Typed configuration covers:

- model input/output/cache pricing and tiered cost metadata:
  `src/config/types.models.ts:166-193,222-226`;
- context-token and output-token budgets:
  `src/config/types.models.ts:185,191,193`,
  `src/config/types.agent-defaults.ts:209,213,383-404`;
- main/subagent concurrency and child limits:
  `src/config/agent-limits.ts:24-47`,
  `src/config/types.agent-defaults.ts:263-352`;
- cron concurrency:
  `src/config/cron-limits.ts:3-12`;
- transcript, archive, media, and disk controls:
  `src/config/sessions/disk-budget.ts:30-31,652-971`,
  `src/config/sessions/archive-compression.ts:1-125`; and
- sandbox process, memory, CPU, and filesystem constants:
  `src/agents/sandbox/constants.ts:13-72`.

These are selections or safety bounds. Their presence does not prove
tenant-wide quota allocation, priority, fairness, or billing.

## Admission and Enforcement

Current enforcement points include:

- Gateway authentication and control-plane rate limits:
  `src/gateway/auth-rate-limit.ts:42-161,379-399`,
  `src/gateway/control-plane-rate-limit.ts:1-90`;
- child and spawn admission:
  `src/agents/child-admission.ts:1-46`,
  `src/agents/spawn-plan.ts:281-383`;
- reply queue caps and policies:
  `src/auto-reply/reply/queue/state.ts:48-134`,
  `src/auto-reply/reply/queue/enqueue.ts:92-190`,
  `src/auto-reply/reply/queue-policy.ts:5-14`;
- cron run admission:
  `src/cron/service/run-admission.ts:23-194`; and
- session placement and execution lanes:
  `src/agents/session-placement-admission.ts:37-73`,
  `src/agents/embedded-agent-runner/run/lane-runtime.ts:11-60`,
  `src/agents/embedded-agent-runner/run/lane-controller.ts:40-184`.

The Gateway applies grouped lane budgets so related cron, nested cron, hooks,
and agent work do not accidentally receive additive concurrency.

Enforcement behavior remains owner-specific. Depending on the resource, the
result may be queue, defer, retry-after, reject, truncate, cancel, cooldown, or
process protection. A shared contract should preserve that result rather than
reduce every decision to allow/deny.

## Runtime Leases and Renewal

Lease-like mechanisms include:

- worktree run leases:
  `src/agents/worktrees/run-lease.ts:53-285`;
- subagent run generations:
  `src/agents/subagent-run-generation.ts:1-18`;
- subagent registry admission and settlement:
  `src/agents/subagent-registry-run-manager.ts:675-907`; and
- cron admission slots:
  `src/cron/service/run-admission.ts:51-194`.

These mechanisms protect local ownership and stale work. They are not yet one
durable enterprise lease protocol with portable fencing, renewal, revocation,
restart recovery, and cross-node settlement.

## Context, Tokens, Timeouts, and Output

Context pressure and token budgeting are tied to model and context-engine
behavior:

- `docs/concepts/compaction.md:9,27,63,109-111,238-242`;
- `docs/reference/token-use.md:87-91,109-121,172-184`; and
- `src/config/types.agent-defaults.ts:383-404`.

Execution timeouts and recovery are owner-specific:

- `src/agents/timeout.ts:12-39`;
- `src/agents/embedded-agent-runner/run/llm-idle-timeout.ts:22-24,243-593`;
- `src/agents/embedded-agent-runner/run/timeout-context-recovery.ts:10-67`;
- `src/agents/embedded-agent-runner/run/idle-timeout-breaker.ts:16,73-78`.

Tool and process output is bounded and truncated:

- `src/process/exec-output.ts:25-67,161-208`;
- `src/agents/embedded-agent-runner/tool-result-truncation.ts:41-42,437-458,924-926`;
- `src/agents/code-mode.ts:71,112,132`.

A truncation or timeout is a semantic runtime outcome and must remain visible
in evidence; it must not be reported as ordinary success.

## Rate Limits, Cooldowns, and Retries

Provider/auth-profile cooldown and usage state protect failing or exhausted
routes:

- `src/agents/auth-profiles/usage-state.ts:22-195`;
- `src/agents/auth-profiles/usage.ts:707-716,918-1057`; and
- `src/agents/model-fallback-cooldown.ts:11-15,31-164`.

These mechanisms are route-health and local availability contracts. They do
not replace an enterprise quota policy or provider reservation contract.

## Disk, Memory, and Process Protection

Current protections include:

- session disk-budget enforcement and archive compression;
- diagnostic RSS/heap observations:
  `src/logging/diagnostic-memory.ts:31-35,69-95,105-342`;
- Gateway heap configuration and warnings:
  `src/daemon/gateway-heap.ts:47-152`; and
- Linux OOM-score adjustment:
  `src/process/linux-oom-score.ts:21-113`.

Disk-budget cleanup intersects privacy and retention. Resource pressure may
trigger cleanup only within the retention and protected-category rules of the
owning data facility.

## Usage and Cost Evidence

Usage infrastructure normalizes prices and rolls observations into session and
operator views:

- `src/infra/session-cost-usage-pricing.ts:17-254`;
- `src/infra/session-cost-usage-rollup.ts:336-516`;
- `src/infra/session-cost-usage-reporting.ts:56-211`;
- `src/gateway/server-methods/usage.ts:1209-1719`; and
- `src/utils/usage-format.ts:528-707`.

This is strong operational evidence. It remains estimated local cost rather
than an invoice-grade ledger with tenant/project allocation, adjustments,
credits, currency normalization, provider reconciliation, or immutable
chargeback records.

## Fleet Capacity

Current node/worker capacity and safety signals include:

- `src/fleet/cell-profile.ts:12-295`;
- `src/agents/code-mode-worker.ts:79-140,199`;
- `src/daemon/gateway-heap.ts:47-58`; and
- `src/process/linux-oom-score.ts:21-23`.

Fleet-wide quota, reservation, weighted fairness, capacity planning, and SLO
contracts are incomplete. Cloud-worker fleet policy remains primarily a plan:
`docs/plan/cloud-workers.md:16-26,57,109-126,148-215`.

## Enterprise Validation

### Covered

- explicit local token, context, timeout, concurrency, queue, disk, output, and
  sandbox bounds;
- owner-native admission and failure behavior;
- grouped concurrency lanes;
- child and cron admission;
- cooldown and retry state;
- disk, heap, RSS, and process protection;
- normalized usage and estimated cost observations; and
- operator-facing usage and capacity projections.

### Partial or missing

- tenant/project/workspace/agent quota scopes;
- durable policy generations and decision correlation;
- reservations, burst, priority, and weighted fairness;
- portable lease renewal, fencing, and revocation across nodes/restart;
- provider quota and provisioned-capacity binding;
- invoice-grade allocation and chargeback;
- budget alerts and anomaly evidence;
- fleet capacity targets and SLO ownership;
- cross-fleet kill, drain, and pressure response; and
- consistent evidence for queue, throttle, reject, truncate, cancel, and kill.

## Separation Decision

Document six child contracts:

1. **Resource policy**: scope, resource, hard/soft limit, burst, priority,
   window, owner, and version.
2. **Admission decision**: allow, queue, defer, throttle, reject, cancel, kill,
   or truncate with reason and retry/settlement semantics.
3. **Runtime lease**: owner, scope, generation, capacity, renewal, expiry,
   fencing, and revocation.
4. **Usage observation**: subject, provider/model/resource, quantity, unit,
   time, outcome, source, and confidence.
5. **Allocation/chargeback**: tenant/project/agent attribution, pricing
   generation, currency, adjustments, and reconciliation status.
6. **Capacity projection**: node/worker/lane availability, reservations,
   pressure, freshness, SLO risk, and partial-fleet coverage.

Definitions remain with configuration and model owners. Admission remains at
the real runtime enforcement point. Usage remains owner-native evidence.
Enterprise policy and projections coordinate these contracts without becoming
one mandatory global scheduler or budget manager.

## Revised Rubric

| Dimension | Score | Reason |
| --------- | ----- | ------ |
| Ownership | 3 | Many real resource owners and enforcement points exist; enterprise scope ownership is incomplete. |
| Object model | 4 | Limits, lanes, queues, cooldowns, leases, usage, cost, disk, and pressure objects are concrete. |
| Contract completeness | 3 | Local definitions, admission, outcomes, and observations are broad; allocation, fairness, and fleet contracts are missing. |
| Separation/cohesion | 2 | Controls are intentionally distributed, but definition, enforcement, cleanup, and reporting boundaries are not consistently named. |
| Evidence | 4 | Extensive source, tests, diagnostics, status, and usage reporting support current behavior. |
| Evolution/operations | 2 | Restart-portable leases, fleet policy, SLOs, chargeback, and mixed-version comparison are incomplete. |

**Total: 18/24 (B), high confidence for the audited paths.**

Enterprise contract coverage is **C2** overall: local definitions,
enforcement, and observations are strong, while billing and fleet governance
remain incomplete.
