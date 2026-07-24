# Skill Memory Lobster plugin POC

Updated: 2026-07-24

## Thesis

A Lobster-bundled OpenClaw plugin can prove the first Skill Memory experience
without a new OpenClaw core API: a trusted tool remembers one typed fact from
completed work, and another agent process can recall or count it later.

The thesis is disproved if the return authorization code cannot be recovered
by exact memory type, subject, memory ID, or session without rereading the
conversation.

## Evidence slice

- Worktree: `C:\src\lobster-skill-memory-poc`
- Preserved PR branch: `user/giodl/auditable-skills-lobster-poc`
- Rewrite branch: `user/giodl/skill-memory-lobster-poc-rewrite`
- Draft PR: [bic/lobster#5211](https://microsoft.ghe.com/bic/lobster/pull/5211)
- Commit: `7c79a99af` (`refactor: recast POC as Skill Memory`)
- Plugin: `src/openclaw_container/plugins/skill-memory`
- Baked state: bundled and allowlisted, but
  `entries.skill-memory.enabled` remains `false`.

The plugin provides `authorize_return`, `skill_memory_recall`, and
`skill_memory_count`. Its companion skill declares
`metadata.remembers: "return.authorized"`. The trusted tool directly records a
canonical memory in configurable `~/.openclaw/state/skill-memory.sqlite`;
model prose and the declaration do not record facts.

## Proof

`just skill-memory-plugin-test` passes seven cases:

- authorization issuance and recovery by subject and memory ID;
- entry-scoped OpenClaw plugin configuration;
- replay of the same source identity without duplication;
- rejection when the same source identity is reused with different input;
- exact counts across two sessions;
- malformed input creates no success memory;
- optional tool contracts and portable `metadata.remembers` remain packaged.

The same recipe passes Lobster's strict code-mode container wiring guard, and
`git diff --check` passes. `just openclaw-container-fmt-check` cannot start on
this Windows host because the repository's `ms-prod-1.93` Cargo component is
not installed; it did not report a formatting defect.

Earlier proof loaded the plugin through OpenClaw's real plugin loader and agent
tool resolver, then used two Node processes sharing one temporary SQLite file.
The second process recovered the first process's authorization code with exact
type and subject filters. The 2026-07-24 rename preserves that behavior and is
covered by the focused plugin suite.

## Boundaries and migration

- This is a local proof authorization, not an external returns integration.
- The plugin records only its own trusted operation; it does not intercept
  arbitrary tools or model prose.
- The SQLite file survives process restarts in one container, not container
  replacement or multi-host deployment.
- Agents allowed to call the query tools can read the configured shared store.
- Skill Memory is typed completed-work history, not semantic/vector memory.
- It is not a CRM, workflow state machine, compliance ledger, or authoritative
  source of case or payment state.

A core OpenClaw implementation can delete the plugin recorder and point the
same producer and query experience at OpenClaw's canonical Skill Memory store.
The POC therefore gives us something testable now without making Lobster a
dependency of the proposal.
