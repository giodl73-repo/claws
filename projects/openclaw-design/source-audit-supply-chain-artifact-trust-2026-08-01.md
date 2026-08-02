# Supply-Chain and Artifact Trust Source Audit - 2026-08-01

## Source Baseline

- Worktree: `C:\src\openclaw-design-audit`
- Head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Finding

OpenClaw has a substantial extension and package lifecycle:

- canonical plugin manifests and capability metadata;
- source/origin discovery with explicit precedence;
- realpath, containment, hardlink, and archive safety;
- npm, git, local, bundled, ClawHub, skill, and Claw package paths;
- preflight install policy and dependency-tree scanning;
- immutable integrity metadata and drift checks;
- managed npm generations, rollback snapshots, and quarantine/rebuild;
- durable plugin and Claw install/provenance records;
- explicit preview/apply/update/remove planning; and
- runtime registry and activation planning.

The missing enterprise capability is signed publisher/build provenance,
attestation/SBOM evidence, organization policy, portable revocation, and
fleet-wide promotion state. Source precedence and successful installation must
not be mistaken for trust.

## Current Architecture

```text
publisher/source
   bundled / workspace / config / npm / git / ClawHub / local package
        |
        v
artifact resolution
   exact version/ref + bytes + digest + source metadata
        |
        v
validation and trust evidence
   manifest + path/archive safety + policy + scan + dependency tree
        |
        v
install admission and transaction
   preview/consent + target + rollback snapshot + quarantine
        |
        v
durable install/provenance record
        |
        v
activation and runtime registration
        |
        v
update / disable / remove / revoke / promote / rollback evidence
```

These are related contracts with different owners. A registry may describe or
moderate an artifact, but the installer, configuration owner, runtime registry,
and semantic extension owner retain separate authority.

## Plugin Manifest and Package Identity

The canonical plugin manifest is `openclaw.plugin.json`:

- `src/plugins/manifest.ts:1-260`.

Manifest loading:

- bounds manifest size;
- opens within the plugin root;
- rejects unsafe paths and hardlinks where required;
- parses JSON/JSON5 compatibility input;
- requires a plugin ID and config schema;
- reserves core IDs; and
- normalizes dependencies, platforms, providers, commands, activation, setup,
  model metadata, secret-provider integrations, and other capabilities.

Plugin install records are typed and durably committed:

- `src/config/types.plugins.ts:1-62`;
- `src/plugins/install-persistence.ts:1-260`;
- `src/plugins/install-record-commit.ts:1-220`;
- `src/plugins/installed-plugin-index-records.ts`; and
- `src/plugins/clawhub-install-records.ts:1-90`.

An installed record is not the artifact itself. It relates source identity,
resolved version/integrity, trust metadata, install location, activation
selection, and lifecycle evidence.

## Discovery, Origins, and Path Safety

Plugin discovery defines roots and origin precedence:

- `src/plugins/discovery.ts:1-270,470-640`;
- `src/plugins/manifest-registry.ts:110-124`;
- `src/plugins/bundled-sources.ts:1-120`; and
- `src/plugins/install-paths.ts:1-190`.

Current origins include configuration, workspace, global/user, bundled, npm,
git, local path, and ClawHub-derived sources. The registry ranks origins for
selection and shadowing.

Discovery validates:

- lexical path containment;
- realpath containment;
- root ownership;
- hardlink policy;
- plugin ID/path mapping; and
- bundled process-stable roots.

Tests include:

- `src/plugins/discovery.test.ts:1250-1338`;
- `src/plugins/bundled-dir.test.ts:415-590`; and
- `src/plugins/install-paths.test.ts:1-107`.

Precedence answers which definition wins. It does not prove publisher identity,
artifact provenance, scan freshness, or organization approval.

## Install Sources and Resolution

Install orchestration and source-specific resolution are distributed across:

- `src/cli/plugins-install-command.ts:1-220`;
- `src/cli/plugins-install-preflight.ts`;
- `src/cli/plugins-install-hook-fallback.ts`;
- `src/plugins/install-package.ts:1-220`;
- `src/plugins/install-installed-package.ts:1-220`;
- `src/plugins/install-npm.ts:1-220`;
- `src/plugins/install-npm-metadata.ts:1-220`;
- `src/plugins/git-install.ts:1-220`; and
- `src/plugins/install-shared.ts:1-120`.

The paths preserve source-specific semantics:

- npm package/version/integrity and peer dependency behavior;
- immutable git refs and repository trust/redaction;
- local path/development identity;
- bundled ownership;
- ClawHub family/channel/trust metadata; and
- package/archive extraction.

One universal artifact resolver would erase important differences in mutability,
publisher, credentials, network, extraction, dependency, and rollback behavior.

## Security Policy, Scanning, and Unsafe Inputs

Install security checks are explicit pre-activation gates:

- `src/plugins/install-security-scan.ts:1-170`;
- `src/plugins/install-security-scan.runtime.test.ts:77-246`; and
- `src/security/install-policy.js` through the typed policy boundary imported
  by the scanner.

The scanner supports:

- unpacked bundle scanning;
- package source and executable metadata scanning;
- installed dependency-tree scanning;
- npm preflight;
- git preflight;
- skill dependency-install policy; and
- bounded safety overrides.

Unsafe archive, path, dependency, and source behavior is covered by:

- `src/plugins/install.npm-spec.test.ts:797-929`;
- `src/plugins/install.test.ts:382-525,1157-1210`;
- `src/plugins/install.npm-spec.e2e.test.ts:857-976`;
- `src/plugins/install-security-scan.runtime.test.ts:189-246`;
- `src/plugins/manifest.test.ts`; and
- `qa/scenarios/plugins/plugin-manifest-contract-health.yaml`.

Policy can return stable blocked or failed scan outcomes. An override is a
distinct explicit authority and must not silently rewrite the evidence.

## Managed npm Generations, Rollback, and Quarantine

Managed npm installation has transaction-like safety:

- `src/plugins/install-managed-npm.ts:1-280`;
- `src/plugins/install-managed-npm-state.ts:1-320`;
- `src/plugins/install-npm-resolution.ts:1-60`; and
- `src/plugins/plugin-lifecycle-lease.ts:1-120`.

The flow:

1. resolves the managed root and generation;
2. runs policy preflight;
3. supports dry-run planning;
4. snapshots the managed npm root;
5. updates dependencies and peer state;
6. verifies installed resolution;
7. scans the installed dependency tree;
8. commits the install record; and
9. rolls back on failure.

Corrupt or incomplete managed npm state may be quarantined and rebuilt once.
The quarantine preserves diagnostic/recovery evidence rather than treating
deletion as repair.

Generation-specific paths and install-root ownership are tested in
`src/plugins/install-paths.test.ts:1-107`.

## ClawHub Trust and Integrity

ClawHub-derived install records retain:

- registry URL and package/family/channel;
- trust disposition;
- scan and moderation state;
- trust reasons, pending/stale state, and acknowledgement time;
- resolved/installed time;
- artifact kind and format;
- npm integrity/shasum/tarball name; and
- Clawpack SHA-256, manifest SHA-256, version, and size.

See `src/plugins/clawhub-install-records.ts:1-90`.

Current trust dispositions include clean, review-recommended, review-required,
and blocked. This is meaningful registry evidence, but it does not replace
installer policy or runtime authorization.

Skill installation is covered by:

- `src/cli/skills-cli.clawhub-install.e2e.test.ts:1-240`;
- `qa/scenarios/plugins/clawhub-skill-installs.yaml`;
- `qa/scenarios/plugins/skill-install-hot-availability.yaml`;
- `docs/cli/skills.md`; and
- `docs/tools/skills.md`.

Workspace and plugin skill precedence remains a separate definition-selection
relationship, not a trust score.

## Claw Package Provenance and Lifecycle

Claw packages have stronger current ownership and integrity records:

- `src/claws/provenance.ts:1-260`;
- `src/claws/update-plan.ts:1-240`;
- `src/claws/update-apply.ts`;
- `src/claws/package-update.ts`;
- `src/claws/package-update-provenance.ts`;
- `src/claws/package-update.test.ts`; and
- `src/claws/update-apply.test.ts`.

A persisted Claw install record includes:

- source kind, name, and version;
- package/manifest paths;
- artifact or development-snapshot integrity;
- byte length and manifest schema version;
- reviewed plan integrity;
- agent/workspace ownership;
- agent config digest;
- owned paths;
- lifecycle status; and
- timestamps.

Partial or nonmatching prior attempts cannot be silently overwritten. A later
remove/Doctor lifecycle must reconcile them.

Update planning is read-only and compares:

- installed source identity and integrity;
- target manifest/source;
- current owned state;
- package preflight results;
- workspace/agent collisions;
- manual/unsafe/pending/failed state;
- desired config digest; and
- capability changes.

This is a strong consent and ownership pattern: preview binds exact artifact
and plan integrity before mutation.

## Activation and Runtime Registration

Runtime activation is separate from installation:

- `src/plugins/registry.ts:1-120`;
- `src/plugins/activation-context.ts:1-320`; and
- `src/plugins/activation-planner.ts:1-286`.

The runtime registry resolves selected definitions and capabilities for an
accepted configuration/runtime generation. Installation success does not prove
that a plugin is selected, compatible, authorized, healthy, or active.

Agent runs pin prepared config/plugin/runtime facts through the Agent Execution
and Configuration Activation contracts. An artifact update must not mutate the
meaning of an already admitted run without explicit generation replacement.

## Update, Disable, Remove, and Compatibility

Plugin update and removal paths include:

- `src/cli/plugins-update-command.ts:1-240`;
- `src/cli/plugins-uninstall-command.ts:1-220`;
- `src/plugins/uninstall.ts`;
- `src/plugins/uninstall-claw-references.ts`;
- `src/plugins/install-npm-metadata.ts:1-220`;
- `src/plugins/install.npm-spec.e2e.test.ts:349-1299`;
- `src/infra/update-check.ts`;
- `src/infra/update-runner-git-recovery.ts`; and
- `src/infra/update-managed-service-handoff.ts`.

Operational disable/remove exists, but portable revocation is incomplete:

- no cross-source revocation identity;
- no signed revocation statement;
- no fleet-wide installed-artifact query;
- no common emergency disable/kill result; and
- no retained support window/removal gate across every package family.

## External Comparison

Official supply-chain precedents converge on:

- SLSA/in-toto provenance binding artifact digest to builder, build type,
  source, and materials;
- Sigstore keyless identity, short-lived certificates, and transparency logs;
- OCI digest-addressable manifests and attached referrers;
- npm trusted publishing and provenance through workload OIDC;
- GitHub artifact attestations and SBOM linkage;
- Kubernetes admission before persistence; and
- Microsoft scanning, signature validation, policy, and certificate revocation.

The reusable chain is:

```text
publisher/workload identity
-> immutable artifact digest
-> signed provenance and dependency evidence
-> scan/moderation evidence
-> owner policy and consent
-> install transaction
-> activation
-> retained revocation and fleet evidence
```

Signatures alone do not prove that an artifact is safe. Tags/names are not
immutable identity. CI-only scanning is insufficient without install/runtime
admission.

## Enterprise Validation

### Covered

- canonical manifests and capability metadata;
- source origin and precedence;
- path, realpath, hardlink, and archive safety;
- npm/git/local/bundled/ClawHub source-specific resolution;
- exact version/ref and multiple integrity fields;
- preflight install policy;
- source and installed dependency-tree scanning;
- dry-run/preview and consent-bound apply;
- rollback snapshots and quarantine/rebuild;
- durable plugin and Claw install/provenance records;
- update, disable, uninstall, and removal paths;
- activation/runtime registration separation; and
- extensive unsafe-input and lifecycle tests.

### Partial or missing

- first-class publisher/workload identity across registries;
- signed SLSA-style build provenance;
- signature/transparency verification;
- SBOM and transitive dependency attestations;
- organization-approved source and publisher policy;
- private/offline registry trust bundles;
- portable quarantine/revocation statements;
- fleet inventory, emergency disable, and convergence evidence;
- artifact-to-running-generation attestation;
- supported-version and deprecation/removal windows;
- cross-family policy for plugins, skills, Claws, models, native apps, and host
  bundles; and
- public ecosystem transparency guarantees.

## Separation Decision

Document nine child contracts:

1. **Artifact identity**: family, name, version/ref, immutable digest, format,
   size, and source coordinates.
2. **Manifest/capability declaration**: schema version, extension identity,
   dependencies, capabilities, compatibility, and owner.
3. **Source resolution**: registry/repository/path, publisher/source identity,
   credentials/network, exact selection, fetch, and safe extraction.
4. **Trust evidence**: provenance, signature, transparency, SBOM/dependencies,
   scan/moderation result, freshness, and verifier.
5. **Install admission**: policy generation, principal, scope, consent,
   override, allow/review/block result, and reason.
6. **Install transaction/record**: target, preview/plan integrity, lifecycle
   lease, rollback snapshot, quarantine, commit, partial state, and ownership.
7. **Activation/runtime binding**: installed artifact to accepted config,
   runtime registry generation, capability surface, and health.
8. **Update/removal/revocation**: replacement, disable, uninstall, retained
   references, revocation authority, rollback, and terminal evidence.
9. **Release/fleet promotion**: exact artifact/build, quarantine/soak,
   candidate/active/previous state, mixed-version support, convergence, and
   removal blockers.

These contracts compose. They must not become one universal artifact base type
or one central marketplace trust owner.

## Revised Rubric

| Dimension | Score | Reason |
| --------- | ----- | ------ |
| Ownership | 3 | Registry, resolver, installer, config, runtime, package, skill, and Claw owners exist but overlap. |
| Object model | 4 | Manifests, origins, digests, trust dispositions, scans, plans, generations, install records, quarantine, and activation objects are concrete. |
| Contract completeness | 3 | Discovery, validation, install, rollback, update, removal, and activation are substantial; signed provenance/revocation/fleet contracts are missing. |
| Separation/cohesion | 2 | Discovery and install modules remain broad, and package families use distinct partially overlapping paths. |
| Evidence | 4 | Extensive source, unit/E2E tests, QA scenarios, records, and lifecycle proofs support current behavior. |
| Evolution/operations | 3 | Update, rollback, quarantine, partial state, compatibility, and removal exist; fleet promotion/revocation and support windows are incomplete. |

**Total: 19/24 (B), high confidence for the audited paths.**

Enterprise contract coverage is **C2**: strong local integrity, policy,
transaction, and lifecycle evidence exists, while signed provenance,
organization trust, revocation, and fleet promotion remain incomplete.
