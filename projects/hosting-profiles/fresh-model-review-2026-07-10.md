# Fresh Model Review: Hosting Profiles

Reviewed 2026-07-10:

- RFC PR: https://github.com/openclaw/rfcs/pull/33
- Ready surfaces: https://github.com/giodl73-repo/openclaw/pull/17
- Profile selection and criteria: https://github.com/giodl73-repo/openclaw/pull/18
- Node-mode readiness: https://github.com/giodl73-repo/openclaw/pull/19

## Verdict

Resolved 2026-07-10. The project has found a useful OpenClaw seam: enrich the
existing Gateway `/ready` and `/readyz` probes with a stable condition model,
and project that same result into health and status. The repaired draft stack
is coherent and review-clean. Docker behavior proof remains before opening the
implementation PRs upstream.

## Resolution

- PR 17 now compares against a clean current-upstream base and shows 14 files,
  not the divergent fork history.
- PR 1 exposes only the default `local` profile. Required `Unknown` conditions
  block readiness, and an active plugin registry with zero errors is healthy.
- PR 2 contains built-in selection and exact predicates only. Custom profiles
  and custom criteria are deferred until trusted evidence publication exists.
- Container readiness uses the resolved listener host. Reverse-proxy does not
  inherit container networking. Existing Gateway readiness remains the sole
  startup/channel/drain/event-loop lifecycle source.
- PR 3 correlates approved pairing ids with live connected node sessions and
  intersects advertised commands with grants/allow/deny policy.
- Each exact PR head and the RFC received a clean Codex review after fixes.
- Current heads: PR 17 `63ad1aaa64`, PR 18 `468b0f289d`, PR 19 `464310eefa`,
  RFC PR 33 `c60c609`.

## Findings

### P0: PR 17 is not a usable review artifact

The fork PR compares against a divergent fork `main` and currently reports
22,188 changed files, 3,495,139 additions, and 731,614 deletions. The actual
commit is a 15-file change. Repair the fork base or open the eventual upstream
PR from a branch whose merge base is current `openclaw/openclaw` main.

### P1: The RFC does not define profile truth predicates

The RFC names stable criteria and lists fields they read, but does not define
the exact pass/fail/unknown predicates or stable failure reasons. A support
profile is not interoperable until two implementations would produce the same
answer from the same runtime facts.

### P1: PR 18 custom required criteria cannot become ready

`hosting.criteria` declares identity and text, but there is no trusted runtime
status producer or evaluator registration path for a custom criterion.
`normalizeCriterionCondition` therefore always emits
`CriterionEvidenceMissing`. Required custom criteria permanently block
readiness. Either defer custom criteria to a later RFC/PR or define the evidence
publication and trust contract in this slice.

### P1: PR 19 node-mode can report ready with no connected target

Node-mode maps paired records directly to target count and derives control
channel readiness from the Gateway HTTP readiness request. A stale paired node
therefore counts as a controlled target even when no node session is connected.
Use the live node registry/catalog for connected-target and control-channel
facts; pairing state is admission evidence, not liveness evidence.

### P1: PR 17 is not independently correct for node-mode

PR 17 exposes the `node-mode` profile through the environment parser but its
Gateway `/ready` path does not supply node-mode evidence. The profile is
therefore permanently not ready at the PR 17 head. PR 19 fixes this later, but
each upstream slice must be coherent. Keep PR 17 local-only, or move all
node-mode declarations to PR 19.

### P1: PR bodies cite full-stack validation, not per-head validation

PR 17 and PR 18 list tests that exist only in later branches. The hydrated test
worktree contained the full stack, so those validation claims do not prove each
PR head independently. Run and report tests from each exact head before opening
upstream PRs.

### P2: Required `Unknown` conditions do not prevent `ready: true`

The result builder only treats blocking `False` conditions as failures. A
non-probing status result can therefore say `ready: true` while
`GatewayResponding` is `Unknown`. Define the invariant explicitly. Recommended:
all required conditions must be `True` for `ready: true`; status surfaces that
cannot adjudicate should report an unknown/not-evaluated result rather than a
positive ready result.

### P2: PR 18 accepts criterion keys that references cannot resolve

Custom criterion declaration keys are trimmed but preserve case, while
references are lowercased. For example, `Acme.Backup-Ready` is accepted as a
declaration but `acme.backup-ready` cannot resolve it. Normalize both paths
identically or reject uppercase identifiers.

### P2: Explicit undeclared custom profile selection silently falls back

The Gateway CLI accepts any syntactically namespaced profile, writes it to
`OPENCLAW_HOSTING_PROFILE`, and runtime resolution ignores it unless config
declares that profile. The effective profile then falls back to config or
`local`. An explicit startup selection should fail closed when it cannot be
resolved.

### P2: Several readiness facts are placeholders, not host guarantees

Workspace usability currently means `process.cwd()` returns a non-empty string;
plugin readiness means no selected plugin error was observed; container state
mostly means local Gateway mode plus the same workspace check; managed lifecycle
does not yet observe drain, restore, or lifecycle state. These can seed the
condition framework, but the RFC and profile names must not claim stronger
support semantics until the evidence exists.

## What To Keep

- Reuse `/ready` and `/readyz`; do not add a competing first probe surface.
- Keep core readiness independent of policy and doctor.
- Keep the spec/status split: config selects desired profile; runtime facts
  determine observed readiness.
- Keep stable condition type/status/reason/message output.
- Keep OCC as a declarative control plane and AgentHarness as a runtime event
  contract; neither should own this workload-local readiness projection.

## Recommended Reshape

1. RFC first: define exact built-in condition predicates, failure reasons,
   unknown semantics, and the existing `/ready` behavior being extended.
2. PR 1: canonical condition/result type plus `local` evaluation integrated
   once into `/ready`, health, and status. Do not expose later profiles yet.
3. PR 2: built-in profile selection and fully specified container,
   reverse-proxy, and managed predicates. Defer custom criteria unless the
   evidence producer contract is included.
4. PR 3: node-mode using live node registry/catalog facts, with pairing,
   connected targets, approval posture, and control-channel evidence kept
   distinct.

## Verification

The current full-stack focused suite passed: 9 requested files were routed
through 5 Vitest shards, with 177 tests passing. `git diff --check` passed in
the publish worktree. This is full-stack proof, not per-PR-head proof.

Independent `codex review` results:

- PR 17 commit: found missing node-mode evidence in Gateway readiness.
- PR 18 selection commit: no actionable regression.
- PR 18 criteria commit: found mixed-case criterion normalization bug.
- PR 19 commit: no mechanical regression; the connected-target semantic issue
  above comes from manual review against the live node registry ownership path.
- RFC branch: found missing truth predicates for built-in criteria.
