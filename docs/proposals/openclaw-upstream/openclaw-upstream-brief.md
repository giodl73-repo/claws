# OpenClaw Upstream Contribution — Brief

**To**: Omar Shahine
**From**: Gio Della-Libera
**Status**: Ready for review
**Date**: 2026-04-18

---

## Summary

We've built a governance layer on OpenClaw — hooks, audit, a policy generator, a snapshot registry — and it's the right time to contribute the foundations upstream. Four packages, all OC-native, zero `@microsoft/*` imports. Contributing now locks in the interfaces we rely on and puts Microsoft at the table as OpenClaw standardizes governance.

### The 4 packages

| Package | What it does | Subpaths |
|---------|--------------|----------|
| `@openclaw/guardrails` | Governance interfaces (GuardrailProvider + FileIngestProvider) + runtime primitives | `/audit`, `/approvals`, `/budget`, `/identity`, `/siem`, `/secrets` |
| `@openclaw/workspace` | Everything that reads, addresses, or canonicalizes OC workspace content | `/path` (oc:// URIs), `/ast` (PEG grammars), `/canonicalize` (RFC 8785 JCS) |
| `@openclaw/policy` | Generator that turns workspace files into enforcement artifacts + operational helpers | `/runtime`, `/types` |
| `@openclaw/snap` | Content-addressable snapshot registry + HTTP server | — |

Plus two subcommand-group contributions (`openclaw policy`, `openclaw snap`) to the existing `openclaw` CLI.

---

## What we'd contribute

### 1. `@openclaw/guardrails` — governance interfaces + runtime primitives

Two decision moments matter: when the agent calls a tool, and when it reads or writes a workspace file. Two peer interfaces — `GuardrailProvider` (tool execution) and `FileIngestProvider` (file ingest) — with the same decision vocabulary and composition rules (`deny > review > modify > allow`).

Alongside the interfaces, six subpaths ship the runtime primitives every adopter needs:

- `/audit` — hash-chained, tamper-evident audit log
- `/approvals` — human-in-the-loop approval schema (handles, TTL, categories)
- `/budget` — token + cost controls with threshold alerts
- `/identity` — OIDC/SAML agent identity
- `/siem` — CEF / NDJSON / syslog export
- `/secrets` — pattern + entropy leak detection

One install, one version, each subpath independently tree-shakable.

### 2. `@openclaw/workspace` — OC-file-format utilities

A single package covering everything that reads, addresses, or canonicalizes OC workspace content:

- `/path` — the `oc://` URI scheme + workspace file classifier
- `/ast` — PEG grammars + typed AST + emitters (lossless round-trip) for SOUL.md, TOOLS.md, AGENTS.md, etc.
- `/canonicalize` — RFC 8785 JCS helper, the single canonicalizer that policy, snap, and audit all agree on

A single URI — `oc://TOOLS.md/Tools/send-email/args_from` — addresses the same thing in an editor diagnostic, an audit entry, a supervisor approval request, and an HTTP endpoint. No parallel naming schemes to keep in sync.

### 3. `@openclaw/policy` — the generator

Reads OC workspace source files and writes three artifacts into `.openclaw/policy/` inside the workspace:

1. **PolicyIR** — content-addressable, versioned intermediate representation
2. **Gateway plugin** — executable TypeScript that registers with OC's plugin hook surface to enforce the generated policy at runtime
3. **Audit manifest** — declared event taxonomy, mapped to OC's exec-approval categories

SOUL.md deny rules, TOOLS.md provenance declarations, and AGENTS.md boundaries become enforceable, not aspirational. Deterministic: same inputs produce byte-identical output. Governance invariants are enforced at generation time — the generator refuses to produce artifacts that would break them.

Contribution to the `openclaw` CLI is a flat `policy` subcommand group — nine verbs: `check`, `generate`, `watch`, `comply`, `test`, `sim`, `report`, `verify`, `diff`.

### 4. `@openclaw/snap` — the snapshot registry

Captures workspaces as content-addressable snapshots, serves them over HTTP, promotes them to "current," rolls back. A host can run snap without the generator (auditing, backup, staging) or run the generator without snap (local dev). Both packages share the `@openclaw/workspace/canonicalize` helper so `snap promote`'s PolicyIR self-consistency check produces byte-identical output with what the generator wrote.

Contribution to the `openclaw` CLI is a flat `snap` subcommand group — eleven verbs covering stage toggle, working tree, registry, and daemon. Git-parallel where the concept maps.

---

## Why this matters

1. **Standardizes the governance interfaces we depend on.** Every enterprise host re-implements pre/post hook composition, chain semantics, and approval handles. A shared spec locks in the shapes we've built against.
2. **Community hosts benefit too.** Audit integrity, secret scanning, budget caps aren't only enterprise concerns — every adopter hits them. Shipping the primitives upstream makes them reachable for hosts that couldn't write them from scratch.
3. **Additive at the OC core.** Six of seven required OC-core patches are pure-additive; one (OC-7, `requireApproval` envelope stickiness) is a minor-version-bump field widening with a clean migration. No shadow APIs, no parallel type hierarchies.
4. **Portable by construction.** Zero `@microsoft/*` imports. CI-enforced. Any fork or third-party adopter inherits a clean dependency surface.
5. **Puts Microsoft at the table.** OpenClaw's governance story is still being shaped. Contributing now means our interfaces become the interfaces; waiting means adapting to someone else's.

---

## Proposed sequencing

| Phase | Contribution |
|-------|--------------|
| 1 | Governance spec PR (GuardrailProvider + FileIngestProvider as peer interfaces). Land `@openclaw/guardrails`. |
| 2 | `@openclaw/workspace` (path + ast + canonicalize subpaths). |
| 3 | `@openclaw/policy` + `@openclaw/snap`, plus two subcommand-group contributions (`openclaw policy`, `openclaw snap`) to the existing `openclaw` CLI. |
| 4 | OC-core wiring PRs (OC-1..OC-7), LTS alignment, ongoing maintenance. |

Total surface: 4 packages, 7 required OC-core patches, 3 optional patches for a first-class-metadata path (OC-8..OC-10), 9-verb `openclaw policy` group, 11-verb `openclaw snap` group. Paced to match OpenClaw's review bandwidth — at most two PRs open against `openclaw/openclaw` at a time.

---

## What we need from you

1. **Sponsorship signal.** Confirmation that upstream contribution is the right strategic direction now, not six months from now.
2. **Scope sign-off.** The 4-package shape + seven OC-core patches, or a reduced initial subset if you want to pilot smaller.
3. **Review support.** Someone senior on the Microsoft side when we approach Peter / the OpenClaw maintainers — signals that this is a real contribution, not a drive-by.
4. **Public release process.** Packages publish under `@openclaw/*` once Peter greenlights the scope; we'll use the standard Microsoft public-release path. Internal distribution stays on `@bic/openclaw-*` until then.
5. **Timeline.** We'd like to approach Peter within the next 2-3 weeks. That gives us one round of internal polish and the meeting time of year he tends to be available.

Happy to walk through any piece in depth, or take the deck on the road to whatever forum makes sense.
