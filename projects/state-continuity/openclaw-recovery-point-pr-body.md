Related RFC: https://github.com/openclaw/rfcs/pull/46

Umbrella outcome: https://github.com/openclaw/openclaw/issues/114145

Non-normative host follow-on evidence (Microsoft access): https://microsoft.ghe.com/giodl/lobster/pull/51

Stacked follow-up: https://github.com/openclaw/openclaw/pull/112865

Exact reviewed head: `062f4d937b3aef0aa5474a9fe214444b95b14b77`

## What Problem This Solves

A verified RFC 0013 SQLite snapshot represents one owner database, not one
complete OpenClaw recovery point. Recovery orchestration needs one exact
identity spanning the complete owner-selected global and per-agent inventory,
with credentials, reconstruction requirements, and accepted bytes represented
without ambiguity.

This is the application-consistency layer a per-user or event-driven host needs
before it can safely replace Gateway compute. It deliberately does not define
the host's retained ingress, wake, persistence destination, or compute policy.

## Why This Change Was Made

This draft adds a private aggregate-manifest evidence slice above the existing
`SqliteSnapshotProvider`. It:

- re-verifies owner snapshots and fences owner-manifest byte rewrites;
- requires a closed runtime-state-owner inventory receipt during composition
  and verification, binding owner, source runtime generation, inventory
  revision, and the exact selected-agent set into recovery-point identity;
- exports one shared schema and verifier for every stacked consumer, rejecting
  invalid, duplicate, traversal-shaped, or non-canonical agent inventories;
- binds owner-manifest and artifact digests and sizes;
- labels ordinary snapshot composition `host-protected`;
- validates a closed obligation kind/owner/treatment vocabulary;
- canonicalizes component, inventory, and obligation ordering; and
- derives deterministic recovery-point and logical acceptance-set identities.

The acceptance set identifies canonical aggregate-manifest bytes plus every
exact owner-manifest and artifact byte sequence. It intentionally does not
standardize a tarball, directory layout, object key, or storage provider.

The V1 slice supports only the already-shipped global and agent SQLite owners.
Config, workspace, plugin-source capture, portability receipts, upload,
lifecycle, restored admission, CLI, and plugin APIs remain out of scope until
their owners and the RFC sidecars are accepted.

## User Impact

No user-visible behavior changes. This remains a draft for reviewing the
smallest internal recovery-point contract before any public command or host
integration is proposed.

## Real behavior proof

- Behavior exercised: composition and re-verification of real manifest files
  through mocked RFC 0013 owner providers, including exact inventory closure,
  owner-revision and source-generation binding, deterministic identities,
  closed obligations, and rewrite-race rejection.
- Real environment tested: Ubuntu 24.04 WSL, Node/Vitest repository harness;
  no live Gateway, CLI, Lobster, or storage provider is involved in this slice.
- Exact command: `node scripts/run-vitest.mjs src/snapshot/recovery-point.test.ts`.
- Evidence after fix: one file passed, eight tests passed.
- Additional checks: targeted Oxfmt passed; targeted Oxlint passed with zero
  warnings and zero errors; `pnpm tsgo:core` passed; `codex review
  --uncommitted` returned no actionable correctness findings.
- Broad-gate exception: delegated `node scripts/check-changed.mjs` reached
  Blacksmith Testbox `tbx_01ky50qwp8m408m77hc2g5w061` but stopped on the
  unrelated current-main max-lines baseline, which requires removing entries
  for `src/agents/cli-backends.test.ts` and
  `src/system-agent/agent-turn.test.ts` before it runs this patch's lanes.
- What is not tested: credential-free projection, durable host acceptance,
  final handoff, restore, restored admission, and operator-visible wiring.

## Draft Review Gate

This PR is ready for owner review but must not merge before maintainers accept
the ownership split in openclaw/rfcs#46. In particular, the runtime state owner
must confirm which activation-pinned source produces the inventory receipt;
this private composition slice validates and binds that receipt but does not
invent the production owner lookup. Snapshot owners must also define any
credential-free portability receipt. This PR deliberately adds no second
snapshot implementation, storage-provider contract, Gateway pause API, or
restore framework.
