# Implementation Disposition Role Review - 2026-08-02

This initial focused review is complemented and superseded for portfolio
approval by `implementation-disposition-craft-role-review-2026-08-02.md`,
which applies the full relevant `.craft/roles` set and records the corrections
made before area decomposition.

## Review Lenses

- Runtime owner: `gateway-eng`.
- Operator: `power-user`.
- Ecosystem and simplicity: `founder`.
- Security and evidence: `ciso`.
- Maintainer rigor: `lorant-reviewer`.

## Findings

### 1. Permanent portable semantics in the fork are a blocking failure

The fork is an incubation and adoption surface. If a portable identity,
generation, lifecycle, effect, or compatibility rule remains fork-only, every
upstream merge becomes more expensive and the broader open-source path closes.

**Applied:** Every row names upstream/public semantic work. Fork components are
adapters, migration code, canary wiring, or private connectors.

### 2. Lobster must not become the OpenClaw state database

Fleet and tenant services need projections and durable operation records, but
canonical sessions, memory, channels, effects, plugins, and workspace state
remain with OpenClaw owners.

**Applied:** Lobster owns cross-tenant composition, not owner-native semantics.

### 3. Rust must replace owners, not duplicate implementations indefinitely

A Rust library or daemon counts only when it owns a complete lifecycle behind
a public contract and allows deletion of the TypeScript owner. Line-count
migration, utility rewrites, and permanent dual execution do not advance the
architecture.

**Applied:** EC-026 is the first authoritative Rust owner. Supervisor,
protocol, verification, scheduler, worker, and kernel replacements follow in
dependency order.

### 4. One authoritative effect owner is mandatory during migration

Shadow mode may compare safe observations. Canary routing may select a Rust or
TypeScript owner. Both implementations must never perform the same external
effect for one operation.

**Applied:** Admission-time selection and operation identity are required
before Rust effect workers or agent execution become authoritative.

### 5. Upstream work must improve ordinary OpenClaw

Maintainers should not need EnterpriseClaw, Scout, Lobster, or Microsoft
infrastructure to justify the contract. Each upstream proposal must delete a
real inference, ambiguity, unsafe retry, lifecycle gap, or compatibility
problem in local OpenClaw.

**Applied:** Managed policy, tenancy, fleet storage, and compliance remain out
of upstream owner semantics.

### 6. Scout-specific integrations should prefer plugins over core patches

Private Microsoft connectors, credential materializers, evidence exporters,
and host adapters should use stable plugin/host seams when possible. A core
fork patch is justified only when the required seam does not exist.

**Applied:** Track B explicitly includes movement into normal plugins as an
exit.

### 7. The mixed release is a product contract

Every release must identify:

- upstream OpenClaw base;
- EnterpriseClaw fork generation;
- Lobster service compatibility;
- Rust component versions;
- protocol/conformance versions;
- supported migration and rollback window; and
- the currently authoritative owner for each replaced component.

Without this manifest, the four-track strategy becomes operational guesswork.

### 8. Operator simplicity remains the acceptance test

The internal disposition map is complex. Product surfaces still answer what is
running, whether it works, what needs attention, and what action is safe.
Operators should not choose between upstream, fork, Lobster, or Rust paths.

## Required Next Artifacts

1. A versioned mixed-release manifest.
2. A fork patch/deletion ledger mapped to these 35 rows.
3. A Lobster service inventory mapped to the C column.
4. A Rust component registry with owner, protocol, conformance, canary, and
   TypeScript deletion gates.
5. The fleet-recovery simulation covering EC-021 and EC-034.
