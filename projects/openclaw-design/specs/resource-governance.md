# Resource Governance

## Boundary

This cross-cutting portfolio connects resource definitions, owner-native
admission, runtime leases, usage evidence, allocation, and fleet capacity. It
does not replace model selection, execution lanes, queues, schedulers, disk
owners, provider quotas, or host orchestration.

## Status and Sources

- Status: strong current local controls; enterprise allocation and fleet
  contracts incomplete.
- Source audit: `../source-audit-resource-governance-2026-08-01.md`.

## Observed Objects

- resource definition and policy generation;
- hard/soft limit, burst, priority, and window;
- admission decision;
- queue/lane/child/run lease;
- usage observation;
- pricing and allocation generation;
- chargeback record; and
- capacity/pressure projection.

## Capabilities

- bind limits and budgets to owner scopes;
- make admission and pressure outcomes explicit;
- allocate and renew bounded runtime capacity;
- observe tokens, cost, duration, concurrency, bytes, disk, memory, and
  provider usage;
- reconcile estimates with owner/provider evidence;
- project capacity, reservations, pressure, and SLO risk; and
- support tenant/project/workspace/agent showback or chargeback.

## Contracts

### Resource policy

- tenant/project/workspace/agent/owner scope;
- resource and unit;
- hard/soft limit and burst;
- priority, fairness class, and time window;
- reservation or provider-capacity binding;
- policy owner, generation, and effective time; and
- local safety limit that enterprise policy cannot weaken.

### Admission decision

- subject, resource, requested quantity, and enforcement point;
- allow, queue, defer, throttle, reject, truncate, cancel, or kill;
- reason and governing policy generation;
- retry-after, queue position, or settlement expectation;
- lease identity when admitted; and
- evidence correlation.

### Runtime lease

- lease ID, generation, owner, and scope;
- reserved capacity and resource type;
- acquisition, renewal, expiry, release, fencing, and revocation;
- restart and cross-node behavior; and
- stale-holder rejection.

### Usage observation

- subject and owner;
- provider/model/resource;
- quantity, unit, time range, and outcome;
- pricing/config generation;
- source and confidence;
- retry, fallback, truncation, or partial-result attribution; and
- disclosure-safe correlation.

### Allocation and chargeback

- tenant/project/workspace/agent allocation;
- pricing generation, currency, credits, and adjustments;
- estimated versus provider-reconciled status;
- immutable period totals and correction entries; and
- export to budget, finance, and anomaly systems.

### Capacity projection

- node, worker, lane, provider, and fleet scope;
- reserved, in-use, queued, and free capacity;
- disk/memory/process/provider pressure;
- freshness and partial-fleet coverage;
- SLO risk and recommended drain/scale action; and
- desired versus accepted capacity generation.

## Relationships and Non-Ownership

- Configuration and model owners define available settings and price metadata.
- The actual execution, queue, scheduler, provider, disk, or host owner makes
  the admission/enforcement decision.
- Privacy/retention rules constrain resource-triggered cleanup.
- Usage projections do not become invoice-grade records without reconciliation.
- A fleet controller may coordinate capacity but must not redefine owner
  semantics or bypass local safety limits.
- No mandatory global budget manager is required for local operation.

## Fleet and Evolution

- preserve policy, lease, and observation generations separately;
- compare mixed-version capabilities without assuming unsupported means zero;
- support staged quotas and dry-run impact;
- make partial fleet and stale capacity explicit;
- reconcile leases and allocations after restart; and
- expose rollback, drain, and kill outcomes at the real enforcement point.

## Enterprise Obligations

- Criticality: **E4**.
- Obligations: `A I O E R X U`; add `D` where resource cleanup or usage
  evidence contains governed data, and `N` for provider/private capacity.
- Current coverage: **C2**.
- Blocking gaps: tenant/project quotas, portable policy/decision correlation,
  weighted fairness, reservations, durable leases, invoice-grade allocation,
  fleet capacity, and SLO evidence.

## Current Gaps

- no unified scope model for tenant/project/workspace/agent budgets;
- no portable admission-result schema across enforcement points;
- no restart-portable cross-node lease contract;
- no provider quota/reservation binding;
- no durable allocation and chargeback ledger;
- no weighted cross-tenant fairness contract; and
- no complete fleet SLO/capacity projection.

## Promotion Candidates

- minimal resource-policy and admission-result schemas;
- lease/fencing conformance tests for child, cron, lane, and worktree owners;
- normalized usage observation with pricing generation;
- estimated-versus-reconciled cost status; and
- fleet capacity and pressure evidence contract.
