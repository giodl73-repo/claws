# Omar Guidance: Scout September Rollout Alignment

## Context

Scout is scaling toward a broader September rollout while the team also plans
to push substantially more work upstream.

The current operating position includes:

- a growing architecture and integration backlog;
- many local patches;
- an older OpenClaw build retained while waiting for an LTS baseline;
- a need to explain the current Scout architecture and runtime environment
  before making data-platform decisions; and
- limited stakeholder availability next week.

This guidance is an architecture input, not a settled implementation plan.

## Priority Topics

1. Claws
2. Memory
3. Mail authentication
4. Memory ACL
5. Node / Rust
6. SQL and Dolt, including the Scout runtime constraints that make SQL
   challenging

## Architecture Mapping

| Topic | Primary EnterpriseClaw lanes | Initial implementation posture | Required alignment |
| ----- | ---------------------------- | ------------------------------ | ------------------ |
| Claws | Experience; configuration; extensibility/release; operations | Existing OpenClaw plus fork/RFC; new managed projections only where needed | Define whether Claws is packaging, governance projection, extension composition, or all three with explicit owners |
| Memory | Knowledge/context/continuity; data governance | Existing memory owners plus fork/RFC | Agree canonical memory sources, derived indexes, scope, lifecycle, recovery, and Scout-specific uses |
| Mail authentication | Identity/authority/trust; actions/integrations; conversations/delivery | Existing credential/policy/channel owners plus focused adapters | Define human/service/OBO identity, consent, token renewal, mailbox scope, send authority, and evidence |
| Memory ACL | Identity/authority/trust; knowledge/context/continuity; data governance | Fork/RFC to memory and policy owners; new policy projection only if necessary | Define subjects, resources, inheritance, retrieval-time enforcement, write authority, provenance, and revocation |
| Node / Rust | Nodes/edge; protocols; operations; Rust transition | New Rust Node Mode plus fork/RFC at Gateway contracts | Agree node profile, trust boundary, supported capabilities, lifecycle, update, containment, and conformance |
| SQL and Dolt | Knowledge/continuity; runtime protocols; operations; data governance | Assess before designation | Understand deployment topology, write ownership, connectivity, durability, branch/merge expectations, failover, and operational constraints |

## Critical Prerequisite: Current Scout Architecture

Technology decisions should begin with a shared current-state architecture,
including:

- deployment units and process boundaries;
- where Scout and OpenClaw run;
- local, container, service, and cloud-runtime responsibilities;
- network and trust boundaries;
- storage locations and canonical owners;
- configuration and secret flow;
- session, memory, mail, and node data paths;
- online/offline and intermittent-connectivity expectations;
- scaling and tenancy model;
- update/LTS and patch process;
- failure, restart, backup, and recovery behavior; and
- operational ownership across the team.

Without this view, SQL/Dolt discussion will collapse distinct questions about
canonical state, local durability, synchronization, branching, audit,
analytics, and fleet control into a database-product debate.

## Decisions Needed

### Scout and OpenClaw boundary

- Which Scout components host, configure, observe, or extend OpenClaw?
- Which state remains canonical in OpenClaw owners?
- Which state is Scout-owned?
- Which projections can be rebuilt?
- Which integrations must survive an OpenClaw upgrade or replacement?

### Upstream, fork, and local patch policy

For each patch:

- owner and architectural lane;
- reason it exists;
- required September behavior;
- current upstream equivalent;
- disposition: drop, carry, rewrite, upstream PR, upstream RFC, or temporary
  compatibility adapter;
- LTS compatibility;
- verification and rollback; and
- deletion condition.

### Memory and ACL

- memory object classes and canonical sources;
- user, agent, workspace, project, tenant, and shared scopes;
- read, retrieve, write, correct, export, and delete authorities;
- index-time versus retrieval-time enforcement;
- provenance and explanation;
- derived copy and cache behavior;
- revocation propagation; and
- offline/fallback behavior.

### Mail authentication

- delegated/OBO versus application identity;
- mailbox and message scope;
- consent and administrative grants;
- token storage, renewal, and revocation;
- read versus send authority;
- approval and high-risk action gates;
- provider-native audit/effect identity; and
- multi-tenant isolation.

### Node / Rust

- first supported node profile;
- Gateway/node protocol ownership;
- capability and policy boundary;
- local state and update ownership;
- connection, pairing, and invocation fencing;
- containment and recovery;
- compatibility with existing OpenClaw; and
- TypeScript deletion target.

### SQL and Dolt

Separate at least six possible needs:

1. local operational state;
2. canonical shared service state;
3. synchronization between deployments;
4. branchable configuration or policy history;
5. analytics/reporting; and
6. audit or recovery history.

Then evaluate whether SQL, Dolt, owner-native files/SQLite, event logs, object
storage, or a combination fits each need. No database should become canonical
merely because several projections need queries.

## Suggested Alignment Sequence

### Session 1: Scout architecture and September constraints

Required participants:

- Gio as facilitator;
- Omar for product/architecture intent;
- Daron for service and cloud-runtime ownership;
- Galin and Scott for current OpenClaw/Scout implementation context.

Agenda:

1. Current Scout topology and request/data flows.
2. September rollout profile, scale, tenancy, and reliability expectations.
3. Current LTS baseline and patch inventory.
4. Runtime constraints behind the SQL/Dolt challenge.
5. Confirm canonical owners and major trust boundaries.

Output:

- one current-state architecture diagram;
- one deployment/runtime responsibility table;
- one patch disposition inventory; and
- explicit unresolved architecture decisions.

### Session 2: State, identity, and trust

Agenda:

1. Memory purposes and owner classes.
2. Memory ACL and policy model.
3. Mail authentication and OBO/application boundaries.
4. Data lifecycle and audit expectations.

Output:

- memory and mail trust model;
- canonical/derived state map;
- authority and revocation flows; and
- bounded fork/RFC candidates.

### Session 3: Runtime evolution and upstream path

Agenda:

1. Rust Node Mode target profile.
2. Gateway/protocol compatibility and conformance.
3. Claws architectural role.
4. Upstream versus fork decisions.
5. September delivery slices and post-rollout migration.

Output:

- Rust-node contract and first deployment slice;
- Claws boundary;
- focused upstream portfolio; and
- implementation sequence with deletion gates.

## Facilitation Rule

Use meetings to settle ownership, constraints, and decisions. Do not spend the
shared session selecting technology before the current runtime and state model
is understood.

When a stakeholder cannot attend, proceed on source-backed and reversible
decisions, record assumptions, and reserve irreversible owner or data-model
choices for explicit confirmation.
