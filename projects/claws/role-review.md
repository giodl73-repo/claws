# Claws Role Review

Date: 2026-07-06

Reviewed `rfcs/0010-claws.md` against the focused `.craft/roles/claws` panel:

- `founder`
- `clawpilot-product`
- `claws-repo-steward`
- `gateway-eng`
- `ciso`
- `compliance`
- `skill-author`
- `power-user`
- `claws-release-eng`

## Findings Applied To RFC

- Community and skill-author lens: Claws must not become a new packaging tax.
  Skills remain `SKILL.md` folders, plugins remain normal OpenClaw plugins or
  compatible bundles, and Claws point at existing artifacts where possible.
- Product lens: Claws are the ClawHub-facing starter setup concept, not a
  second lower-level pack concept. A Claw can include skills, plugins, MCP
  servers, workspace files, persona files, heartbeat/crons, schedules, and
  automations.
- Plugin-author lens: plugins may bundle plugin-owned companion skills. Claws
  do not replace that model; they compose a runnable setup across artifacts,
  files, and automations.
- Gateway lens: Claw planning and install stay out of the per-turn Gateway hot
  path. Runtime behavior remains owned by the installed skills, plugins, MCP
  servers, files, schedules, automations, and Gateway mechanisms.
- Security/compliance lens: workspace and automation entries require preview,
  conflict handling, backup, rollback or disable paths, explicit consent, and
  provenance.
- Release lens: ClawHub publishing and feed export should prove published
  artifacts with smoke tests before promotion.

## Remaining Review Questions

- Which workspace-file mutation modes should v1 support: create-only,
  create-or-patch, whole-file replace, or all three?
- Which automation substrate should v1 target first: heartbeat, cron,
  schedules, or one stable OpenClaw-owned automation surface?
- What is the exact local state file for Claw provenance, and how does it avoid
  fighting existing skill/plugin install records and workspace-file ownership?
- What does uninstall mean when a member was installed directly by the user, is
  shared by more than one Claw, or was locally edited after install?

## OpenClaw And ClawHub Tracks

- OpenClaw should stage the surface deliberately but compactly: schema/local
  reader/read-only plan, feed plus safety/ownership checks, artifact install,
  workspace apply, automation enablement, then lifecycle/update/E2E proof.
- ClawHub should be a separate dependent track. It owns public Claw publishing,
  search, detail pages, feed export, and authoring docs, but must follow the
  stable OpenClaw schema, parser fixtures, and read-only plan contract instead
  of inventing a divergent ClawHub-only shape.
- ClawHub feed export should be gated by published-artifact smoke tests, not
  workspace-only fixtures.
- The end-to-end proof must cover the public lifecycle: publish a fixture Claw
  to a ClawHub test/dev environment, find it through search/detail/API, fetch
  the hosted feed, run `openclaw claws plan`, install artifacts, apply
  workspace entries, enable automation when explicitly requested, and verify
  status/provenance.

## PR Stack

1. `openclaw/rfcs`: RFC/docs terminology.
2. `openclaw/openclaw`: schema, local reader, inspect, and read-only plan.
3. `openclaw/openclaw`: feed integration and read-only safety/ownership checks.
4. `openclaw/openclaw`: artifact install and provenance.
5. `openclaw/openclaw`: workspace file/persona apply with backup and rollback.
6. `openclaw/openclaw`: heartbeat/schedule/automation enablement with disable
   and rollback.
7. `openclaw/openclaw`: lifecycle, update, doctor, and E2E.
8. `openclaw/clawhub`: schema ingestion and data model.
9. `openclaw/clawhub`: publish validation and authoring docs.
10. `openclaw/clawhub`: search, detail, and API surfaces.
11. `openclaw/clawhub`: feed export and published E2E.

## Latest Role Verdict

The staging is appropriate for a fast-but-reviewable path: the OpenClaw track is
six implementation PRs after the RFC. The first two implementation PRs are
schema/read-only/safety work, then artifact mutation, workspace writes,
automation enablement, and lifecycle proof. ClawHub is four separate dependent
PRs after the OpenClaw schema and read-only plan contract are stable.

The RFC text has now been raised to the stronger OpenClaw RFC style used by the
memory ACL proposal: it states the safety guarantee up front, separates
normative core from follow-up choices, gives concrete entry-kind semantics,
includes representative plan and provenance schemas, calls out what Claws can
and cannot enforce, and adds acceptance criteria for the OpenClaw plus ClawHub
lifecycle.

## Final Role Pass

Date: 2026-07-07

Reviewed current `rfcs/0011-claws.md` against the focused panel again:

- Founder/community: passes. Claws remain additive, source-neutral, removable,
  and do not change the basic `SKILL.md` or plugin authoring model.
- Skill-author/new-hire: passes. The RFC says Claws are a small setup manifest,
  not a packaging tax, and keeps inspect/plan as the first user-visible path.
- Gateway/runtime: passes. Planning/install stay out of the per-turn Gateway hot
  path and runtime behavior remains owned by installed primitives.
- CISO/compliance: passes for RFC stage. The draft states no silent workspace
  mutation, no silent automation enablement, no transitive approval, provenance,
  audit fields, and fail-closed unknown required entries.
- Repo/process steward: passes after moving from `0010` to `0011` and expanding
  bare cross-repo references to full GitHub URLs.
- Release/ClawHub: passes. ClawHub remains a separate dependent track with
  publish validation, feed export, and published-artifact E2E.

Applied cleanup from the pass: removed one duplicated feed-resolution sentence
and wrapped long issue-reference lines. No remaining role-blocking RFC changes
identified before maintainer review.

## SQLite Provenance Role Pass

Date: 2026-07-07

Reviewed current `rfcs/0016-claws.md` and the updated PR plan against all
`.craft/roles/claws` lenses after deciding that Claw provenance/reference
accounting belongs in OpenClaw's shared SQLite state store.

### Verdict

The RFC and plan still hold. The storage decision makes the plan stronger for
security, status, doctor, update, remove, and audit because it gives Claws a
Claw-owned ownership ledger instead of trying to infer ownership from plugin
install records or skill directories.

### Role Findings

- Founder/community: passes. Claws remain additive and do not change the
  `SKILL.md` or plugin authoring model. The SQLite provenance ledger is local
  OpenClaw state, not registry lock-in.
- Skill-author/new-hire: passes. Skill authors do not need a new packaging
  shape. Claws reference installed skills by canonical path/slug/source
  identity when needed.
- Gateway/runtime: passes. The RFC keeps planning/apply out of the per-turn
  Gateway hot path and says the validation PR performs no Gateway interaction.
- CISO/compliance/policy: improved. Claw-owned SQLite provenance gives status,
  doctor, update, remove, rollback, and audit export a stable evidence source.
  The RFC should not turn this into a broad runtime policy surface.
- Platform/power-user: improved. Reference accounting covers direct installs,
  shared artifacts, drift, remove safety, and local repair workflows.
- ClawHub/release: passes. ClawHub remains a dependent track that reuses
  OpenClaw schema/parser/apply-plan contracts and later verifies published
  feed E2E.
- Integration partner roles: mostly non-applicable by design. The RFC should
  keep Aether/Lobster/Cowork sidecar, serve, and M365 connector enforcement out
  of scope unless a later RFC deliberately connects Claw state to those paths.
- Lorant/reviewer: one wording issue found and fixed. The normative-core table
  still said the "exact storage path" was a follow-up even though the direction
  is shared SQLite. Updated it to say the follow-up is exact SQLite schema,
  table names, and migration details.

### Current PR Shape

- Validation stack: 1 RFC PR, 1 OpenClaw non-mutating validation PR, 4 ClawHub
  validation/publishing/search/feed PRs.
- Future mutating OpenClaw series: 4 PRs: artifact apply plus Claw-owned
  SQLite provenance/ref accounting; workspace/persona apply;
  automation/status/doctor; update/remove/rollback/full mutating E2E.

No role-blocking RFC changes remain from this pass.
