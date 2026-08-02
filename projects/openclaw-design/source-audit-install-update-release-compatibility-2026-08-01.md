# Install, Update, Release, and Compatibility Source Audit - 2026-08-01

## Scope

This audit covers how OpenClaw:

- selects install modes, versions, and channels;
- stages and activates package or source updates;
- coordinates a running Gateway and its service manager;
- migrates config, databases, and managed plugins;
- detects incompatible downgrades;
- recovers from failed package and git updates;
- proves release candidates and published artifacts; and
- preserves compatibility across core, plugins, data, and mixed versions.

Audited OpenClaw source:

- worktree: `C:\src\openclaw-design-audit`
- commit: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Frame

### Working owner systems

OpenClaw already has several strong owners:

- package managers own package acquisition and their global layouts;
- git owns source history and checkout identity;
- the updater owns local selection, preflight, mutation, and recovery;
- Doctor and database owners own migration and repair semantics;
- plugin lifecycle owners own plugin convergence and compatibility;
- service managers own process supervision;
- release workflows own candidate proof, publication, and promotion;
- operators own whether and when a target should be rolled out.

The missing shared capability is not one universal release controller. It is a
portable contract connecting immutable release identity, target compatibility,
local activation, recovery evidence, and optional fleet rollout policy.

### Falsifiable thesis

OpenClaw should describe install/update/release compatibility as a portfolio of
owner-shaped contracts. The design is disproved if it:

- makes npm, git, Docker, native apps, plugins, or databases translate into one
  fake transaction;
- treats a mutable channel as immutable release identity;
- claims code rollback also rolled back data or external effects;
- makes local OpenClaw require a fleet control plane; or
- duplicates Doctor, readiness, supply-chain, or service-manager ownership.

## Current Contract Inventory

### 1. Install ownership and target selection

`src/infra/update-channels.ts` defines four user-facing channels:

- `stable`;
- `extended-stable`;
- `beta`; and
- `dev`.

Channel resolution preserves the difference between:

- a configured channel;
- a git tag;
- a git branch;
- the installed version; and
- a default.

`stable`, `beta`, and `extended-stable` resolve package selectors. `dev` maps
to a moving source checkout. Extended-stable is package-only and fails closed
instead of falling back to another channel.

`src/cli/update-cli/update-command.ts` and adjacent modules detect package,
git, and unknown installs; support dry-run and structured output; prompt before
downgrade; and keep one-off `--tag` selection distinct from persisted channel
intent.

**Contract fact**: source, channel, selector, exact version, package root,
service root, and running process are different identities.

### 2. Package candidate staging and activation

`src/infra/package-update-steps.ts`:

- validates pnpm isolated-global ownership before mutation;
- refuses ambiguous or shared pnpm global groups;
- stages npm candidates in a temporary prefix when possible;
- validates package version, inventory, lifecycle completion, and runtime
  entrypoints before activation;
- retries failed optional-native dependency installation with
  `--omit=optional`;
- swaps the staged candidate into the live root;
- backs up and restores npm command shims around a failed swap; and
- cleans temporary candidate roots.

`src/cli/update-cli/update-command-package.ts` runs the candidate's own Doctor
entrypoint after package verification. The installed target version is carried
into compatibility checks instead of using the old process version.

**Failure posture**:

- candidate acquisition or verification failure leaves the old npm install
  active;
- filesystem swap failure restores the old package and shims;
- a later Doctor, plugin, restart, or readiness failure is reported as a
  post-activation failure and may require explicit code rollback.

Package replacement is therefore locally transactional only through verified
activation. It is not a transaction over migrated state, plugin side effects,
or the running Gateway.

### 3. Source-checkout mutation and rollback

`src/infra/update-runner-git.ts`:

- requires a clean checkout outside generated Control UI output;
- fetches and resolves the selected branch, tag, or target SHA;
- preflights the target before mutation;
- installs dependencies, builds, checks source cleanliness, verifies UI assets,
  and runs the target Doctor;
- records the prior branch, SHA, and package version;
- resets, cleans update-created paths, restores the prior branch/SHA, and
  verifies `HEAD` on failure; and
- rebuilds the rolled-back runtime after a failed live build.

The updater refuses to call service restart safe when source rollback or
runtime rebuild cannot be proven.

**Contract fact**: git rollback restores source/build ownership, not databases,
config changes already committed by migration owners, or remote effects.

### 4. Service handoff and running-process safety

`src/gateway/server-methods/update.ts` does not replace a global package inside
the running Gateway:

- managed installs start a detached update helper;
- the Gateway records a handoff identity and restart sentinel;
- the current process schedules its own exit only after handoff creation;
- a second concurrent handoff is rejected;
- externally supervised installs return an explicit operator-required result;
- missing durable supervisor identity produces a safe command rather than an
  in-process mutation; and
- package updates without a viable restart path are skipped before mutation.

`src/cli/update-cli/update-command-service.ts` and
`update-command-post-update.ts` preserve service ownership:

- only a positively matched service root may be rewritten;
- an ambiguous or foreign service may be restored but not redefined;
- service metadata is refreshed only when ownership is proven;
- restart is followed by version and health verification; and
- a failed mutable update restarts the prior service only when a runnable
  installation is proven.

**Contract fact**: install ownership, service ownership, supervisor ownership,
and activation authority are independent.

### 5. Config and migration ownership

The updater snapshots authored config before mutation, but runs migration and
repair in the newly installed process:

- `update-command-resume.ts` invokes the new Doctor before plugin convergence;
- update-phase environment flags bound which config writes, service repairs,
  activation, and plugin-install repairs Doctor may perform;
- dropped pre-update channel intent is restored after migration;
- migration owners can repair retired keys before strict plugin validation;
- structured Doctor results distinguish blocking and advisory findings; and
- `src/commands/doctor/shared/deprecation-compat.ts` retains migration
  compatibility independently from runtime compatibility removal.

The source correctly avoids having the old updater process interpret new
migration semantics.

### 6. Database schema compatibility and downgrade refusal

The root package publishes:

```json
{
  "openclaw": {
    "schemaVersions": {
      "state": 6,
      "agent": 16
    }
  }
}
```

`src/state/openclaw-database-preflight.ts` reads the global state database and
every registered agent database without mutation. It reports:

- a database schema newer than the candidate supports;
- the writer application version where available; and
- an indeterminate result when an existing database cannot be inspected.

`src/cli/update-cli/update-command-git.ts` checks target schema support before
and after stopping a managed service. It refuses both incompatible and
indeterminate targets before source mutation.

Gateway startup independently refuses newer schemas, so manual package-manager
downgrades still fail closed even when they bypass updater preflight.

Current migrations are forward-only. Documentation explicitly states that
binary rollback does not downgrade data, and older releases may require:

- a pre-update backup;
- a separate state directory;
- restoration of archived legacy session artifacts; or
- an explicit unsupported offline schema downgrade.

### 7. Plugin convergence and compatibility

After core activation:

- a fresh process owns post-core migration and plugin convergence;
- official package plugins can follow the exact extended-stable core version;
- user pins, non-latest tags, third-party sources, and non-npm sources remain
  owner-controlled;
- dev/package channel switches restore the appropriate bundled or package
  source;
- plugin update failures are retained in structured post-update results;
- target host version is used during downgrade compatibility checks; and
- incompatible newer plugins can be disabled before restart.

Plugin packages may declare:

- `openclaw.install.minHostVersion`; and
- `openclaw.compat.pluginApi`.

`src/plugins/compat/registry.ts` and
`src/commands/doctor/shared/deprecation-compat.ts` separately track runtime
compatibility windows and migration-reader obligations.

**Gap**: core/plugin compatibility has strong local seams but no complete
portable release-component manifest covering all apps, nodes, plugins,
protocols, schemas, and retained migrations.

### 8. Automatic update policy

`src/infra/update-startup.ts` keeps auto-update off by default.

When enabled:

- stable waits six hours plus deterministic per-install jitter of up to twelve
  hours;
- beta checks on an hourly policy and applies immediately;
- extended-stable remains read-only hints;
- dev does not auto-apply;
- `OPENCLAW_NO_AUTO_UPDATE` blocks application;
- externally supervised Gateways delegate update ownership;
- repeated attempts for the same version are throttled; and
- first-seen, last-attempt, and last-success evidence is persisted.

This is a bounded single-install rollout policy, not fleet orchestration.

### 9. Release identity and publication

`docs/reference/RELEASING.md` and release workflows distinguish:

- Code SHA;
- Release SHA;
- immutable signed git tag;
- exact package version;
- npm dist-tag/channel;
- package tarball digest;
- plugin publication set;
- Docker image digest and architecture set;
- native application assets; and
- workflow run ID and attempt.

The release flow:

- uses beta-first validation;
- freezes an exact source SHA;
- runs full release validation at that SHA;
- permits only a changelog-only transition to Release SHA;
- preflights exact npm bytes;
- binds publication to prior validation and preflight evidence;
- publishes official plugins and core through explicit plans;
- verifies registry readback and provenance;
- keeps GitHub releases draft until downstream publication succeeds;
- promotes Docker aliases by digest without rebuilding; and
- resumes immutable successful children after partial pipeline failure rather
  than republishing an existing version.

Mutable aliases are intentionally separated from immutable release identity.

### 10. Upgrade-survivor evidence

The repository has explicit package and Docker evidence lanes for:

- package self-update through authenticated `update.run`;
- package-to-git and git-to-package channel switching;
- managed Gateway restart without caller-owned auth;
- plugin dependency migration cleanup;
- dirty user state survival;
- health, readiness, and RPC status after update; and
- published baseline-to-candidate migration matrices.

The release validation portfolio also covers cross-OS install checks, Docker,
native apps, plugins, package acceptance, performance, and live channel proof.

## Contract Decomposition

The facility should be split into these child contracts:

1. **release identity** - immutable source, artifact, version, and provenance;
2. **channel intent** - mutable discovery/promotion pointer and policy source;
3. **installation owner** - package manager, git checkout, image runtime, app
   updater, or external supervisor;
4. **compatibility envelope** - runtime, protocol, plugin API, schema, platform,
   and migration-reader bounds;
5. **update plan** - exact target, affected roots, required downtime,
   migrations, risks, and recovery preconditions;
6. **candidate activation** - stage, verify, swap, load, restart, and prove;
7. **migration ledger** - ordered owner-specific state transitions and retained
   downgrade obligations;
8. **rollback/recovery** - code rollback, state restoration, retry, quarantine,
   and certainty;
9. **release proof** - candidate, publication, registry, install, upgrade, and
   post-publish evidence;
10. **rollout intent** - optional ring, maintenance window, hold, pause, abort,
    health gate, and promotion policy; and
11. **fleet convergence** - installed/active versions, exceptions, drift,
    failures, and evidence completeness.

## Enterprise Need by Design Layer

| Layer | Enterprise need | Current coverage | Gap |
| ----- | --------------- | ---------------- | --- |
| Owner domain | Immutable releases, component manifests, channels, migration ledgers, rollout policies, and fleet targets | Strong local release/update owners | Portable multi-component release manifest and organization rollout intent |
| Runtime relationship | Installer/service ownership, identity, maintenance windows, rings, network mirrors, restart/drain, and health gates | Strong single-install ownership and restart handoff | Tenant/fleet policy, air-gapped mirrors, canary cohorts, approval, and cross-instance coordination |
| Evidence contract | Candidate proof, prior/target identity, migration outcome, rollback certainty, health, publication, and convergence | Strong CI and local structured results | Durable per-target fleet evidence, partial convergence, exception expiry, and automatic abort evidence |
| Projection | Local status, dry-run, Doctor, release summaries, and workflow evidence | Strong operator-local and maintainer views | Fleet inventory, rollout progress, safeguard holds, drift, blast radius, and role-specific approval views |

## External Comparison

### Reuse

- Kubernetes separates desired revision, rolling availability bounds,
  readiness, progress deadlines, pause/resume, history, and rollback.
- Google SRE canary practice compares version-specific health before widening a
  rollout and rolls back early on objective regression.
- TUF separates trusted role metadata, target hashes, monotonically increasing
  versions, expiration, and threshold signatures.
- Uptane adds per-device installed-version manifests and director-selected
  targets for intermittently connected fleets.
- Windows update rings and safeguard holds separate cohort scheduling from
  known-issue exclusion.
- npm distinguishes immutable package versions and provenance from mutable
  dist-tags.
- Expand/contract migration practice keeps old and new application versions
  compatible during staged rollout.

### Adapt

- Use rollout rings only as optional operator intent; local installs must not
  require a central controller.
- Use TUF/Uptane concepts for channel freshness, rollback/freeze protection,
  and installed-state evidence without replacing npm, git, OCI, or native
  signing.
- Use expand/contract only where mixed-version operation is a product
  requirement. Single-instance forward-only owners may retain simpler
  migration semantics with explicit downgrade refusal.

### Avoid

- Do not call a mutable dist-tag, branch, or fleet alias a release.
- Do not automatically roll back code after a state migration unless the state
  recovery point and compatibility are proven.
- Do not infer rollout success from artifact publication.
- Do not treat process health as semantic migration or channel health.
- Do not make one release train force every plugin, node, native app, or host
  to share one version number.

## `.craft/roles` Evaluation

### Release engineer

Installability is already treated as a release contract through exact package
preflight, package acceptance, published-artifact verification, and upgrade
survivor tests. The blocking gap is a compact public release-component manifest
and a durable partial-publication recovery ledger across every published
surface.

### Gateway engineer

Detached handoff, single-flight update, ownership checks, restart verification,
and no in-process package replacement are strong. Automatic fleet rollback
must not be added to the Gateway event loop; the Gateway should expose bounded
status and accept owner-authorized local plans.

### Platform engineer

The local update engine is mature, but there is no first-class fleet desired
release, cohort/ring, maintenance window, safeguard hold, partial convergence,
or per-target retry contract. Fleet behavior belongs in an optional external
controller consuming local contracts.

### CISO and compliance

Release workflows have substantial provenance and validation evidence. An
enterprise contract still needs organization approval, target identity,
exception/hold reason, installed-to-active evidence, revocation status, and
tamper-evident export retained independently from mutable workflow pages.

### Founder and new hire

`openclaw update`, `--dry-run`, channels, Doctor, and explicit rollback remain
the correct default experience. Enterprise rollout objects must be optional
and must not turn a personal install into a deployment platform.

### Container operator

Readiness after migration, package/image identity, drain/restart ownership, and
state compatibility need explicit ordering. An image being pulled or a process
being alive does not prove the updated Gateway is ready.

## Maturity Assessment

Dimensions use `assessment-rubric.md`.

| Dimension | Score | Evidence |
| --------- | ----: | -------- |
| Ownership clarity | 4 | Package, git, updater, Doctor, plugin, service, database, release, and operator owners are distinct. |
| Lifecycle clarity | 4 | Selection, preflight, stage, mutation, migration, convergence, restart, verification, recovery, and promotion are explicit. |
| Contract precision | 4 | Structured results, schema versions, target identity, service ownership, exact releases, and evidence bindings are implemented. |
| Separation quality | 3 | Source is well split, but release, compatibility, migration, and fleet concepts remain distributed across many surfaces. |
| Evidence quality | 4 | Unit, E2E, upgrade-survivor, package acceptance, full release validation, and post-publish evidence are extensive. |
| Extension readiness | 3 | Local seams are strong; portable component manifests and optional fleet rollout/convergence contracts are incomplete. |

**Total: 22/24 (A), high confidence for the audited paths.**

Enterprise assessment:

- **Criticality**: `E4`
- **Contract coverage**: `C3`
- **Obligations**: `A I D O N E R X U`

## Required Design Changes

1. Publish a release-component manifest that can name core, official plugins,
   schemas, protocols, native apps, nodes, and required migration readers
   without forcing lockstep versions.
2. Make update-plan output portable: current/target identity, install owner,
   compatibility result, migration set, downtime, recovery point, and expected
   proof.
3. Distinguish package swap rollback, runtime restart recovery, plugin
   convergence recovery, and state restoration in every result.
4. Define an optional rollout-intent contract for rings, windows, health gates,
   holds, pause/resume, abort, and promotion.
5. Define fleet convergence evidence with complete, partial, blocked, deferred,
   exempted, rolled-back, and unknown outcomes.
6. Preserve local `openclaw update` as the default owner. Fleet controllers
   submit bounded plans and consume evidence; they do not replace local
   package, service, Doctor, or readiness semantics.

## Cheapest Next Test

Use one published baseline and one current candidate to emit a single
machine-readable evidence bundle containing:

- immutable target identity;
- local install/service ownership;
- schema/plugin compatibility;
- migration and restart outcomes;
- final active version and readiness; and
- recovery certainty.

Then prove an external harness can classify one success and one blocked
incompatible downgrade without parsing console prose or controlling the
package manager directly.
