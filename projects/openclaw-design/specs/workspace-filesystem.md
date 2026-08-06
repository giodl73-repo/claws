# Workspace and Filesystem Ownership Facilities

## Boundary

This portfolio owns OpenClaw's workspace, sandbox-visible paths, runtime state
roots, transcript storage, skill sources, and temporary/retained artifacts.

It does not imply one virtual filesystem or universal artifact owner.

## Owner Contracts

### Workspace owner

- agent ID;
- workspace directory and key;
- bootstrap/context files;
- onboarding and attestation state;
- workspace-local memory and skills.

### Sandbox owner

- scope and backend;
- workspace access mode;
- workspace root;
- allowed bind roots;
- seed, recreate, and remote-canonical behavior.

### State-path owner

- state root;
- config and SQLite paths;
- credential and delivery-queue directories;
- owner-specific recovery.

### Transcript owner

- session key and session ID;
- canonical transcript store;
- export and archive paths;
- cleanup and migration.

### Skill and artifact owners

- source and precedence;
- realpath/symlink policy;
- temporary or retained path;
- TTL, cleanup, export, and disclosure.

## Current Rule

An export path is not the canonical store. Workspace precedence is not
installation trust. Sandbox path containment is not enterprise data
classification.

## Enterprise Extensions

- tenant/project scope and delegated administration;
- classification, DLP, residency, and private transfer;
- encryption/KMS;
- retention, legal hold, eDiscovery, export, and deletion;
- malware/content scanning;
- governed remote workspace providers;
- fleet generation, drift, and attestation;
- storage quotas and chargeback.

These extensions should bind to the existing owner paths and evidence rather
than replace them.

Source audit:
`../source-audit-workspace-filesystem-2026-08-01.md`.
