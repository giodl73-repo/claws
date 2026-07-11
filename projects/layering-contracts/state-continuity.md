# State And Continuity

## Question

What OpenClaw state must survive, when is it consistent, and how can a host
safely continue the runtime in another process, container, cell, or machine?

## Scope

- Durable and ephemeral path semantics.
- Workspace, OpenClaw home, memory, sessions, transcripts, and plugin state.
- Restore-before-start and checkpoint triggers.
- Snapshot consistency and schema compatibility.
- Single-writer and lease requirements.
- Corruption, quota, storage, migration, and restore failure taxonomy.

## Ownership

OpenClaw owns state meaning, consistency points, compatibility, and portable
failure semantics. Lobster owns Graph/SPO/git storage, tenant routing,
encryption, leases, checkpoint scheduling, retries, and user-visible handling.

## First Deliverable

Build a source-backed table with these columns:

| State class | Path/owner | Writer | Durable expectation | Consistency point | Restore order | Compatibility | Lobster handling | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Use `synchronization-model.md` as a hypothesis to test against this inventory.
Do not assume `/synced`, a global generation, or a synchronization-provider
interface is correct before the evidence supports it.

## Audit Questions

- Is `/workspace` the only intentionally durable surface?
- Are memory SQLite files under `/tmp` intentionally ephemeral?
- Where do sessions, transcripts, plugin state, pairing state, and credentials
  live, and which can be reconstructed?
- Can a host request or observe a safe checkpoint?
- What prevents concurrent writers after route changes or retries?
- Which existing snapshot primitives already cover these requirements?
- Can every required component report whether it has caught up through a shared
  generation, or do components require independent watermarks?
- Where does local artifact materialization end and host durability begin?

## Status

This is the next active discovery area. Do not assume it requires one new RFC;
first map the requirements to existing OpenClaw state, session, memory, and
snapshot concepts.

The existing SQLite Snapshot RFC and implementation are the first concrete
mechanism to map, not a replacement for the overall continuity contract:

- https://github.com/openclaw/rfcs/pull/20
- https://github.com/openclaw/openclaw/pull/94805

The current Lobster ProxyPipe lifecycle protocol also carries generation-fenced
`LifecycleCommand`/`LifecycleCommandResult` messages with
`workspace_action=checkpoint_unmount` and `shutdown_ready`. See
`inventory/proxy-pipe-frames-2026-07-10.md`; the next audit must determine what
state those outcomes actually guarantee.
