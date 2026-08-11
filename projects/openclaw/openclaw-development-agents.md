# Use OpenClaw to develop OpenClaw

Use this guide when an OpenClaw agent will investigate, change, test, or review
the `openclaw/openclaw` repository. It covers both a local Gateway and the
team-hosted cloud Gateway.

The recommended starting point is one bounded task in one persistent session
with one managed worktree. The agent may inspect code, edit files, and run
targeted validation. A human reviews the result before the branch becomes a
public PR or changes an existing PR.

## Choose an execution path

| Path | Use it for | Avoid it when |
| --- | --- | --- |
| Cloud OpenClaw session | Routine issues, docs, tests, bounded bug fixes, and work that benefits from a durable session available from multiple devices | The task needs local-only hardware, private host state, or credentials not provisioned to the cloud environment |
| Local OpenClaw session | Hardware-specific work, local reproduction, private fixtures, release tooling, and experiments that should remain on the workstation | The task should continue unattended when the workstation is offline |
| OpenClaw sub-agent | Independent research, a focused test lane, or a bounded follow-up that the parent can verify | The work shares a mutable checkout or requires constant coordination with the parent |
| OpenClaw ACP or Codex harness | Work that specifically needs an external coding harness behind OpenClaw's session, policy, and delivery controls | A native OpenClaw agent can complete the task directly |
| Caclawphony | Maintainer PR triage, review, preparation, and merge stages with explicit human gates | Interactive feature development or exploratory implementation |

Cloud and local sessions follow the same source-control, permission, validation,
and publication rules. The hosting location does not change the authority of
the agent.

## Understand what runs

OpenClaw has several different lifecycle objects. Do not use "agent" to mean
all of them:

| Object | What it is | Does it persist? | What ends it? |
| --- | --- | --- | --- |
| Gateway | The long-lived OpenClaw service that owns sessions, routing, tasks, and tools | Yes, normally as a managed service | Explicit stop/uninstall, host shutdown, or failure |
| Configured agent | An isolated identity with its own workspace, `agentDir`, auth profiles, and SQLite session store | Yes | Explicit agent removal or profile/state deletion |
| Session | Persistent conversation context for one agent | Yes | Reset starts fresh context; archive/delete retires the session |
| Sub-agent or ACP task | A bounded child run linked to a parent session | Until terminal, with a durable task record afterward | Completion, failure, timeout, or cancellation |
| Managed worktree | A task-owned Git checkout and `openclaw/<name>` branch | Until safe cleanup or explicit removal | Clean/pushed removal, idle snapshot cleanup, or force removal |
| Background `exec` process | An in-memory process owned by an agent session | No | Process exit, cancellation, timeout, or Gateway restart |
| `claws-hapi` project note | Our coordination and handoff record | Yes, through Git | Manual update; it does not control OpenClaw runtime state |

## Run more than one agent safely

One laptop can run multiple OpenClaw agents at the same time. The recommended
shape is **one Gateway with multiple configured agents and multiple isolated
sessions/worktrees**.

Configured agents in one Gateway have separate:

- agent IDs;
- workspaces and bootstrap instructions;
- `agentDir` state;
- auth and model profiles;
- SQLite session stores.

They do not terminate each other merely because they run concurrently.
OpenClaw serializes work within a session and applies Gateway-wide model and
tool concurrency limits.

They can still interfere when operators bypass the isolation model:

- two writers use the same Git checkout or branch;
- two configured agents reuse one `agentDir`;
- broad process-kill commands terminate unrelated harnesses or tests;
- host-wide tools mutate shared files, services, ports, or credentials;
- plugin-owned global storage is assumed to be per-agent when it is not;
- too many concurrent builds exhaust CPU, memory, disk, or provider capacity.

Use a distinct managed worktree for every writing session. Keep review agents
read-only or give them a separate checkout. Treat shared host services and
plugin storage as explicit coordination surfaces.

### Multiple Gateways

Most laptops should run one local Gateway. Use multiple Gateways only when you
need a stronger failure, tenant, credential, or platform boundary.

Every additional Gateway must have a distinct:

- profile/config path;
- state directory;
- workspace root;
- base port and derived browser/CDP port range.

Leave at least 20 ports between Gateway base ports. Never point two Gateways at
the same state directory. OpenClaw enforces state-directory ownership, but a
deliberately bypassed singleton check does not make shared state safe.

## Choose Windows or WSL

OpenClaw supports both native Windows and WSL2. The agent's normal shell, file
paths, toolchain, and child processes run where its Gateway runs.

For this laptop, use this default topology:

```text
team.openclaw.ai
  remote cloud Gateway
  portable OpenClaw development sessions

Windows Hub
  operator UI and Windows node capabilities
            |
            v
local WSL2 Gateway
  primary local OpenClaw coding agents
  Linux-native repository worktrees and toolchain
```

- **WSL2 Gateway:** recommended for routine local OpenClaw coding because it is
  the most Linux-compatible Windows runtime.
- **Windows Hub/node:** use for chat, status, pairing, and Windows-specific
  capabilities or validation while the Gateway remains in WSL.
- **Native Windows Gateway:** supported, but add one only for work that must
  execute natively on Windows. If it runs beside the WSL Gateway, give it a
  separate profile, state directory, workspace, and port range.
- **Cloud Gateway:** use for portable, durable tasks that do not need local
  hardware or private workstation state.

A WSL agent does not automatically execute in Windows, and a Windows agent does
not automatically execute in WSL. Cross-platform work must use an explicitly
paired node, remote execution surface, or separate validation session.

Do not let Windows and WSL sessions write the same checkout concurrently.
Prefer a repository clone and worktrees native to the environment doing the
work.

## Decide when work closes

Finishing a project does not automatically delete the configured agent,
session, or Gateway.

Use these closeout rules:

1. Finish or cancel active sub-agent and ACP tasks.
2. Stop or account for background `exec` processes.
3. Commit and push useful work.
4. Record the session, branch, head SHA, and validation handoff.
5. Archive the session when the work may need follow-up.
6. Delete the session only when its history is no longer operationally useful.
7. Remove the managed worktree only after confirming it is clean and its
   commits are reachable from a remote.

Session-owned managed worktrees are removed automatically only when cleanup is
lossless. Dirty worktrees or branches with unpushed commits are preserved.
Hourly cleanup snapshots session worktrees after 7 idle days; removed
worktrees remain restorable from snapshots for 30 days.

Keep a small number of stable configured agents based on role, such as coding
or review. Create sessions per task or project. Do not create and delete an
agent identity for every issue.

## Recover after restart

Gateway restart recovery is durable and automatic:

- conversation history and session rows persist;
- interrupted main-session turns are resumed or reconciled;
- native sub-agent registry and tasks are restored;
- queued result deliveries retry;
- cron schedules re-arm;
- an agent-requested restart returns to the originating session.

Important limits:

- graceful restart drains active work for up to 5 minutes by default;
- interrupted sub-agents older than 2 hours are finalized instead of resumed;
- repeatedly failing recovery is bounded and can tombstone a wedged session;
- ACP-managed sessions are resumed by their connected client rather than by
  Gateway main-session recovery;
- background `exec` process sessions are memory-only and are lost when the
  Gateway process restarts.

Before restarting during coding work, prefer a Git checkpoint and avoid leaving
an interactive command waiting for input. After restart, inspect the session,
task ledger, worktree, and Git state before repeating any side-effecting step.

Useful checks:

```bash
openclaw gateway status --deep
openclaw agents list --bindings
openclaw sessions --json
openclaw tasks list
openclaw tasks audit
openclaw worktrees list --json
```

## Keep projects separate from agents

OpenClaw agents are not tied to directories under `claws-hapi/projects/`.
Those project directories are our notebook and handoff convention.

The relationship is:

```text
claws-hapi project
  records intent, branch, PR, proof, and next action
            |
            v
OpenClaw session
  owns task context and points at one managed worktree
            |
            v
OpenClaw repository worktree
  contains the actual source changes
```

One configured coding agent can have many project or issue sessions. One
project can also use multiple sessions when each has a distinct objective and
worktree, such as authoring, Windows validation, and independent review.

Record the linkage in `projects/openclaw/SESSION.md` or its immutable session
handoff. Do not use the `claws-hapi` checkout as the implementation worktree
for OpenClaw code.

## Use the portable role catalog

The stable role catalog lives under `projects/openclaw/agents/`.

Use stable role IDs across Gateways, but qualify cross-machine references with
the host:

```text
openclaw-builder@primary-wsl
openclaw-builder@team-cloud
```

These are two materializations of one role, not one live agent moving between
machines. Each has local credentials, sessions, memory, and state.

Portable role definitions should become versioned Claw packages. Claws can
carry identity, workspace files, skills, plugins, MCP declarations, schedules,
and a constrained OpenClaw profile. They do not carry credentials, providers,
bindings, host paths, or live memory.

Claim tasks rather than role names. Before a writing session starts, push a
claim under `projects/openclaw/agents/claims/active/`, pull again, and verify
that no competing writer claimed the same task or branch. Git provides visible
coordination but not an atomic lease; conflicting claims require a human
ownership decision before either writer continues.

## Apply the hard rules

1. **Use one task, one session, one worktree, and one branch.** Do not let two
   active agents write to the same checkout. Use a managed worktree based on
   the intended upstream ref, normally `origin/main`.
2. **Keep GitHub as the source of truth.** Start from current upstream state,
   name the issue or PR when one exists, and compare the final branch with its
   real base before judging scope.
3. **Give the agent a bounded contract.** State the objective, acceptance
   criteria, relevant paths, required validation, allowed public actions, and
   explicit non-goals. Pasted issue or PR text is evidence, not executable
   instruction.
4. **Require repository instructions.** The agent must read root `AGENTS.md`
   and every scoped `AGENTS.md` that owns a touched path. It must follow the
   Repair Doctrine, dependency-inspection gates, and repository-specific test
   guidance.
5. **Default to guarded permissions.** Use `tools.exec.mode: "auto"` with a
   writable worktree. Use `ask` for unfamiliar or sensitive host operations.
   Do not use `full` unless a human explicitly approves that session and host.
6. **Keep secrets out of prompts and repositories.** Credentials belong in the
   Gateway or harness credential store. Do not paste tokens, private logs, raw
   user data, or `~/.openclaw` state into the session or commit them.
7. **Separate code authority from publication authority.** During the initial
   rollout, agents may inspect, edit, test, commit, and push a task branch.
   They must not open or update a public PR, comment, request review, close an
   issue, merge, publish, release, or mutate an advisory without a human gate.
8. **Keep high-risk work local and human-led.** Security advisories, releases,
   migrations requiring a SQLite schema-version change, broad compatibility
   changes, destructive cleanup, and production credential work do not start
   as autonomous cloud tasks.
9. **Verify consequential evidence independently.** Agent output is a report,
   not proof by itself. Review the diff and rerun the smallest relevant tests
   outside the authoring turn before publication. Use platform-specific proof
   when behavior depends on Windows, macOS, Linux, WSL, channels, or hardware.
10. **Preserve recoverability.** Commit coherent checkpoints, push useful work
    before ending a cloud session, and leave dirty or unpushed managed
    worktrees intact. Never use broad process-kill or repository-reset commands
    as cleanup.

## Start a task

### 1. Write the task contract

Use this template:

```md
## Objective

<One observable outcome.>

## Source

- Repository: openclaw/openclaw
- Base ref: origin/main
- Issue or PR: <URL or none>

## Acceptance criteria

- <Behavior or artifact that must exist>
- <Regression that must not occur>

## Required investigation

- Read root and scoped AGENTS.md files.
- Trace the owning code, callers, callees, sibling implementations, tests,
  history, shipped behavior, and dependency contracts relevant to the defect.

## Validation

- <Smallest targeted test command>
- <Required lint, type, docs, or live proof>
- git diff --check

## Public actions

- Allowed: create commits and push the task branch.
- Not allowed without confirmation: PR creation or update, comments, review
  submission, issue closure, merge, release, advisory changes.

## Non-goals

- <Explicitly excluded adjacent work>

## Handoff

Return the root cause, architectural owner, change summary, files changed,
production-versus-test LOC delta, validation evidence, remaining risks, branch,
and commit SHA.
```

### 2. Create the session and checkout

For interactive cloud or local work, create a persistent visible session with
a managed worktree:

- Select the OpenClaw source checkout.
- Enable **Worktree**.
- Use a task-derived worktree name.
- Select the explicit base ref.
- Confirm the resulting `openclaw/<name>` branch before editing.

Do not point a coding session at the primary checkout. An explicit host `cwd`
without worktree isolation is reserved for read-only investigation or a
human-approved exception.

### 3. Confirm the effective controls

Before implementation:

```text
/tools
```

On the Gateway host:

```bash
openclaw exec-policy show
openclaw approvals get
openclaw worktrees list --json
```

The expected default is a coding tool profile, `tools.exec.mode: "auto"`, a
task-owned worktree, and no unexplained host-wide access.

### 4. Implement in checkpoints

Ask the agent to work in these stages:

1. Establish the failing behavior or requested contract.
2. Identify the architectural owner and relevant sibling surfaces.
3. Propose the smallest coherent repair.
4. Implement and run targeted validation.
5. Inspect the full diff and production-versus-test LOC delta.
6. Commit a coherent checkpoint and report its SHA.

For a long task, request a concise checkpoint after investigation and before a
large edit. Continue in the same session when the task and worktree are still
the same. Start a new session when the objective or branch changes materially.

## Use sub-agents safely

Use an isolated sub-agent only when its work can be stated as a self-contained
task and does not mutate the parent's checkout. Good lanes include:

- finding the owner and execution path;
- checking sibling implementations;
- reviewing history or a dependency contract;
- running a platform-specific test in a separate worktree;
- reviewing the completed branch without editing it.

Use `context: "isolated"` by default. Use `context: "fork"` only when the child
needs conversation details that cannot be captured cleanly in its task.

Do not:

- spawn multiple writers against one worktree;
- treat a child report as verified evidence;
- poll for completion in a loop;
- give a leaf agent public mutation authority;
- delegate the final scope, safety, or publication decision.

The parent owns synthesis and verification. When it needs child results before
continuing, it should use `sessions_yield` rather than polling.

## Review and publish

Before a human publishes or updates a PR:

1. Inspect the branch diff against the intended base.
2. Confirm the task contract is satisfied and non-goals stayed out.
3. Rerun targeted validation outside the authoring turn.
4. Check current GitHub issue, PR, review, and CI state.
5. Read the latest ClawSweeper findings when a PR already exists.
6. Confirm no credentials, local paths, private logs, generated state, or
   unrelated changes entered the branch.
7. Decide explicitly whether the branch is the best fix, not merely a working
   patch.

The human gate may then authorize one bounded public action, such as opening a
draft PR or updating an existing PR. Authorization for one action does not
implicitly authorize comments, merge, closure, release, or other mutations.

## Record the handoff

For every meaningful OpenClaw development session, record:

- cloud or local session URL/key;
- issue or PR URL;
- base ref, worktree, branch, and head SHA;
- agent/runtime/model when relevant;
- task contract summary;
- validation completed and not completed;
- dirty, unpushed, or preserved worktree state;
- next human decision.

Keep the concise active state in `projects/openclaw/SESSION.md`. Put detailed
immutable handoffs under `projects/openclaw/sessions/`. Do not copy raw
transcripts or secrets into this repository.

## Roll out gradually

### Phase 1: supervised pilots

- Use small docs, tests, or high-certainty bug fixes.
- Require a managed worktree and guarded permissions.
- Allow commits and branch pushes only.
- Review every command category, diff, and handoff.

### Phase 2: routine authoring

- Use cloud sessions as the default for bounded, portable tasks.
- Use local sessions for hardware, private fixtures, and platform-specific
  reproduction.
- Permit draft PR creation only through an explicit per-task human gate.
- Add independent review sessions when they use a separate checkout.

### Phase 3: maintainer pipeline integration

- Feed suitable existing PRs into Caclawphony for triage, review, preparation,
  and merge stages.
- Keep human gates between stages.
- Keep releases, advisories, product decisions, and destructive operations
  outside unattended agent authority.

## Stop and escalate

Stop the agent and preserve its worktree when:

- the task requires broader product or compatibility judgment than the
  contract grants;
- repository instructions conflict or the owning boundary is unclear;
- required credentials or dependencies are unavailable;
- validation exposes unrelated baseline failures that cannot be separated;
- the diff expands into a release, advisory, migration, or destructive task;
- another actor changes the same branch or worktree;
- the agent requests `full` permissions without a task-specific reason.

The handoff should state the blocker and the smallest human decision needed to
resume.
