# Supply-Chain and Artifact Trust

## Boundary

This portfolio connects artifact identity, manifest declarations, source
resolution, trust evidence, install admission, installation, activation,
revocation, and release promotion.

It does not make a registry the semantic owner of installed plugins, skills,
Claws, providers, tools, native apps, or host bundles.

## Status and Sources

- Status: current local integrity/install lifecycle; enterprise signed
  provenance and fleet trust incomplete.
- Source audit:
  `../source-audit-supply-chain-artifact-trust-2026-08-01.md`.

## Observed Objects

- artifact/package identity;
- source coordinate and publisher/workload identity;
- manifest and capability declaration;
- digest, signature, provenance, SBOM, scan, and moderation evidence;
- admission decision and reviewed plan;
- install transaction, lifecycle lease, rollback snapshot, and quarantine;
- durable install/provenance record;
- activation/runtime binding;
- revocation/removal record; and
- release/fleet promotion state.

## Capabilities

- resolve exact immutable artifacts from bounded sources;
- validate manifests, paths, archives, dependencies, and compatibility;
- verify digest, publisher, provenance, signature, transparency, and SBOM
  evidence where available;
- apply organization/user install policy and explicit consent;
- preview and transactionally install with rollback/quarantine;
- bind installed artifacts to accepted runtime generations;
- update, disable, revoke, uninstall, and reconcile partial state; and
- prove candidate, active, previous, quarantined, and retired fleet state.

## Contracts

### Artifact identity

- family and semantic owner;
- name, version/ref, and schema version;
- immutable digest and byte length;
- artifact kind/format;
- source registry/repository/path;
- release/channel/tag as mutable discovery metadata only; and
- canonical identity renewal on byte or manifest change.

### Manifest and capability declaration

- extension/package ID;
- manifest schema version;
- dependencies and compatibility range;
- declared capabilities and setup/activation metadata;
- required privileges/network/data access;
- owner and publisher assertions; and
- unknown-field and migration rules.

### Source resolution

- source kind and exact coordinates;
- publisher/workload identity;
- credential and network binding;
- immutable selection result;
- fetch and cache behavior;
- path/archive containment and extraction limits;
- dependency resolution/lock state; and
- offline/private registry trust roots.

### Trust evidence

- subject digest;
- publisher/signer/workload identity;
- builder, source, commit, workflow, and materials;
- signature/certificate and transparency receipt;
- SBOM/dependency evidence;
- scan/moderation result, policy, freshness, and verifier;
- retained warnings/exceptions; and
- disclosure/retention behavior.

### Install admission

- principal and tenant/workspace/agent scope;
- artifact and trust-evidence generations;
- governing policy and compatibility requirement;
- allow, review, block, or quarantine result;
- required consent/approval;
- bounded override authority, reason, and expiry; and
- preview/plan integrity.

### Install transaction and record

- install ID and lifecycle generation;
- target roots and owner state;
- exact artifact and reviewed plan;
- dry-run effects;
- rollback snapshot and cleanup;
- dependency-tree verification;
- quarantine/rebuild behavior;
- committed, partial, failed, or rolled-back result; and
- durable ownership/provenance record.

### Activation/runtime binding

- installed artifact digest/install ID;
- selected config and registry generation;
- runtime capability surface;
- credentials/policy/network bindings;
- health/readiness;
- admitted run generations pinned to the artifact; and
- replacement/drain behavior.

### Update, removal, and revocation

- current and target artifact identities;
- compatibility and migration plan;
- retained references and owner effects;
- disable/uninstall/revoke authority;
- rollback target and state compatibility;
- quarantine and diagnostic retention;
- terminal convergence result; and
- late or offline fleet member behavior.

### Release and fleet promotion

- exact candidate artifact/build/provenance;
- quarantine, scan, validation, and soak receipts;
- candidate/active/previous/retiring/quarantined roles;
- mixed-version and state-compatibility evidence;
- staged rollout, rollback, and convergence;
- old-path/install inventory;
- revocation/kill propagation; and
- deterministic reclamation/removal blockers.

## Relationships and Non-Ownership

- Catalogs and registries describe and distribute; they do not prove runtime
  activation or own extension semantics.
- Source precedence is not trust.
- Tags and package names are discovery identifiers, not immutable identity.
- Signatures and attestations prove origin/process claims, not safety by
  themselves.
- Install policy gates the installer; runtime policy still applies at the
  semantic operation boundary.
- Installation does not imply activation, authorization, readiness, or health.
- Existing admitted runs retain their pinned runtime generation until the
  owning lifecycle replaces or drains them.
- No universal artifact base type or mandatory central marketplace is required.

## Fleet and Evolution

- bind evidence to exact digests and artifact/build identities;
- support private/offline registries and trust roots;
- expose missing, stale, unsupported, revoked, quarantined, and partial state;
- retain old versions until rollback and state-compatibility budgets pass;
- compare installed, selected, active, and observed runtime generations;
- prevent failed candidates from automatically becoming rollback targets;
- prove convergence before removing compatibility paths; and
- retain revocation history without erasing provenance evidence.

## Enterprise Obligations

- Criticality: **E4**.
- Obligations: `A I D O N E R X U`.
- Current coverage: **C2**.
- Blocking gaps: federated publisher identity, signed provenance,
  signatures/transparency, SBOMs, org-approved sources, private trust roots,
  portable revocation, fleet inventory/convergence, and support/removal
  windows.

## Current Gaps

- no first-class SLSA-style provenance contract;
- no common signature/transparency verification;
- no portable SBOM/dependency attestation;
- no organization publisher/source allowlist contract;
- no cross-family quarantine/revocation identity;
- no fleet-wide installed-artifact and active-generation evidence;
- no common emergency disable convergence result; and
- no complete release support/deprecation/removal policy.

## Promotion Candidates

- artifact/trust evidence schema using digest identity;
- trusted publishing and signed provenance for OpenClaw packages;
- SBOM and dependency attestation ingestion;
- org/private-registry trust policy;
- portable quarantine/revocation record;
- installed-to-active runtime attestation;
- fleet artifact inventory and emergency disable proof; and
- release promotion/removal ledger tied to exact conformance evidence.
