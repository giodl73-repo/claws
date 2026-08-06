# Config Admin Session Context

## Agent Start

1. Read this file.
2. Read `projects/config-admin/README.md`.
3. Read related context as needed:
   - `projects/admin/README.md`
   - `projects/ux-state/README.md`
   - `projects/policy/policy-settings-config-bindings.md`
   - `projects/feeds/README.md`
   - `projects/lobster/feeds-scout.md`
4. Check live Lobster and OpenClaw worktree state before acting.

## Baseline

- Area: Shared Lobster/OpenClaw admin-config UX framework.
- Primary repo: `bic/lobster`.
- Related repo: `openclaw/openclaw`.
- Local worktree: choose or create a Lobster worktree when implementation starts.
- Current branch: none yet.
- Main tracking file: `projects/config-admin/README.md`.
- Skill to use: `lobster-pr-ops` for Lobster PR state; use policy/feed skills when work touches those stacks.

## Current Session

- Last updated: 2026-07-28.
- Last agent: Copilot CLI.
- Current focus: Evaluate making OpenClaw Control UI the primary Lobster UI, with Lobster-owned hosting/auth and secure lockdown of operator settings.
- Active branch / PR: Lobster draft PR
  [bic/lobster#6041](https://microsoft.ghe.com/bic/lobster/pull/6041),
  `user/giodl/control-ui-hosting-design` at `1613e3d7be`.
- Known dirty state: `claws-hapi` has this new project area and index updates; `C:\src\lobster` was already on unrelated dirty branch `user/giodl/openclaw-copilot-dev-validation`.
- Blocking question: none.

## 2026-07-28 Control UI Hosting Audit

- OpenClaw Control UI is a separately built static application served by the
  Gateway. It supports a configured base path, relative assets, SPA fallback,
  bootstrap configuration, and a same-path WebSocket endpoint.
- Lobster already proxies the OpenClaw Gateway protocol at
  `/v1/openclaw-gateway`, but that runtime route is WebSocket-only. A hosted
  Control UI proof needs authenticated HTTP proxying for assets/bootstrap plus
  the existing WebSocket relay, ideally under one same-origin base path.
- Lobster's current browser transport already identifies as
  `openclaw-control-ui` and deliberately sends `auth: {}`. The Lobster runtime
  JWT/origin boundary and loopback-only container Gateway are therefore the
  existing trust seam; do not add a second browser auth system for the proof.
- OpenClaw already has coarse `operator.read`, `operator.write`, and
  `operator.admin` scopes. `config.set`, `config.patch`, and `config.apply` are
  admin-only, so removing admin yields a credible all-config-read-only mode.
- Selective settings-page lockdown is not securely supported by route hiding
  alone. The settings navigation is static, and all config writes share the
  broad admin scope. A real selective mode must enforce field/source authority
  in OpenClaw and project that provenance into disabled or hidden UI controls.
- Reuse the Managed Configuration contract rather than adding Lobster-side
  payload parsing or a second settings registry: Lobster selects host and
  operator sources; OpenClaw owns schema meaning, write preflight, authority
  rejection, effective config, and inspection.
- Cheapest evidence slice: mount the unmodified Control UI at a Lobster route,
  proxy HTTP + WebSocket to the selected user's Gateway, issue a non-admin
  operator connection, and prove config remains inspectable while every config
  mutation fails server-side. A later slice can render authority-derived locks
  for selected fields.
- Published the complete design in Lobster draft PR 6041. Review through the
  gateway, container/reliability, operator UX, CISO, and founder roles reduced
  delivery from ten PRs to one disposable proof plus six PRs.
- The revised series has two generic OpenClaw implementation PRs and four
  Lobster PRs, with no RFC dependency. A route/mutation manifest and opaque
  WebSocket ticket are conditional fallback mechanisms, not V1 requirements.

## Resume Checklist

- Run: inspect current Lobster Policy UX and Scout feeds admin surfaces before choosing a branch.
- Verify: which PR stack should receive the first descriptor-registry slice.
- Review: OpenClaw `openclaw config schema`, `config.schema.lookup`, `doctor --lint`, policy strictness, and Scout CLI contracts for reusable UX language.
- Update: this session file after a branch or PR is created.

## Guardrails

- Do not build implementation prototypes in `claws-hapi`.
- Keep this area focused on the shared admin/config UX framework; feature-specific policy, feed, and Partner Center work stays in their existing project areas.
- Preserve the boundary: `/policy` authors and previews policy, `/feeds` governs feed/source selection, Scout provides CLI/feed tooling, Lobster persists governed state, and OpenClaw evaluates local conformance.
- Prefer small PR slices over a universal settings-console rewrite.

## Open Threads

- Decide whether Lobster replaces its current shell at `/` or first mounts the
  Control UI at a gated route such as `/openclaw`; prefer the gated route for
  lifecycle, auth, and cold-start proof.
- Define the minimum authenticated HTTP proxy needed for Control UI static
  assets and bootstrap config without duplicating Gateway serving behavior.
- Decide the operator experience for unavailable pages: hide only irrelevant
  surfaces; show governed settings read-only with lock owner and reason.
- Decide whether the first Lobster slice starts from Policy UX control registry or a shared admin settings package.
- Define the descriptor contract: setting id, section, scope, OpenClaw policy/config path, generated value/state, doctor/check id, exposure, apply mode, owner surface, and save contract.
- Decide how much OpenClaw schema metadata Lobster should consume directly versus snapshot into a Lobster registry.
- Shape a common findings model for validation errors, strictness failures, repair previews, and blocked saves.
- Align hosted Scout mutations with CLI-style `--dry-run`, `--json`, and `verify` semantics.
