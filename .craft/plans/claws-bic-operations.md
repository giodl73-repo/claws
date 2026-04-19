---
slug: claws-bic-operations
preset: "claws"
plan: "After Horus filter-repos claws into bic/claws, stand up the long-term operational shape: CI/CD that green-gates every PR, CODEOWNERS so reviews route cleanly, branch protection on main, a release playbook that maps commit → GHE Package publish, contributor-workflow docs, and release cadence. Result: bic/claws isn't just a landing zone — it's a repo a team can run indefinitely."
area: claws
status: Draft
phase: horus
atoms: [atom:claws-repo-boundary, atom:claws-publish]
---

# claws bic/claws Operations — Long-Term Maintenance Shape

## Headlines

1. **H1: Every PR to `bic/claws` is gated by a green CI matrix before merge.** Linux/Windows/macOS × build / unit / integration / e2e / coverage. No merge without green. Branch protection on `main` enforces it at the GitHub level. A failing CI is self-serve to debug — logs are preserved, artifacts attach to the run, and the CI config is readable (no opaque composite actions from outside the repo).

2. **H2: Reviewers route automatically via CODEOWNERS + a release playbook maps commit → GHE publish with no tribal knowledge.** CODEOWNERS names owners per-package (the 4 packages listed in §Package inventory: `guardrails`, `workspace`, `policy`, `snap`) and per-subpath for the security-sensitive ones (`guardrails/audit`, `guardrails/approvals`, `guardrails/identity`). Release playbook documents: when to cut a version, how versions bump, what triggers a GHE publish, who signs off, how rollbacks work. A new engineer can ship a release by reading the playbook — no shoulder-tapping.

3. **H3: Contributor-workflow docs make outside-the-team contribution possible.** `CONTRIBUTING.md` covers: how to open an issue, how to open a PR, coding standards, test expectations, commit message format, how to request a review. `README.md` is accurate and gets a new reader to "hello world" in under 5 minutes. `docs/MIGRATION.md` stays current as a reference for what filter-repo produced.

## Scope

### CI / CD

- Restore `push` and `pull_request` triggers on the scaffold workflow (un-gate the `if: false` placeholder currently committed)
- Expand matrix to cover the 4 packages from §Package inventory below. No standalone `claws-cli` package — the internal `claws` CLI (bic/claws's private OpenClaw-equivalent binary) hosts two flat subcommand groups sourced from `policy` and `snap` package handlers: `claws policy {check, generate, watch, comply, test, sim, report, verify, diff}` (9 verbs) and `claws snap {stage on/off, status, diff --staged, discard --stage, upload, list, diff, checkout, promote, rollback, discard, serve}` (11 verbs). `claws doctor` / `claws upgrade` absorb policy-aware checks globally (no `claws policy doctor` duplication). Default stage posture: off (opt-in).
- Coverage gate per-package at the 95/90/95/95 threshold (stmts / branches / funcs / lines) per the monorepo convention
- GHE Packages publish workflow: tag-triggered, signed, with provenance metadata

### Branch protection

- `main` protected: requires PR, requires green CI, requires ≥1 approving review
- No force-push on `main`
- Linear history preferred (squash or rebase merge); no merge commits on main

### CODEOWNERS

- Per-package ownership assigned
- Repo-wide fallback: the claws-release-eng role
- Security-sensitive paths (guardrail-spec, audit-chain, approval-events) require 2 approvers

### Release playbook

- Semver policy documented
- Version bump triggers (minor for additions, major for breaking, patch for fix-only)
- Publish flow: tag on main → CI triggers publish → package appears on GHE Packages
- Rollback flow: deprecate-then-republish, with a reason comment on the deprecation

### Contributor workflow

- `CONTRIBUTING.md` — how to contribute
- `CODE_OF_CONDUCT.md` — standard template
- PR template — matches the house style (ties into Peter-observed preference once we're upstreaming: Root Cause + Human Verification sections)
- Issue templates — bug, feature, question

### Docs maintenance

- `README.md` re-read and corrected against the post-migration state
- `docs/MIGRATION.md` stays authoritative for the filter-repo story
- Link checker in CI to catch broken cross-references after any doc change

## Package inventory (final)

bic/claws ships **4 packages** post-Horus:

1. `@bic/openclaw-guardrails` — governance interfaces (GuardrailProvider + FileIngestProvider) plus six runtime-primitive subpaths: `/audit`, `/approvals`, `/budget`, `/identity`, `/siem`, `/secrets`
2. `@bic/openclaw-workspace` — shared OC-file-format utilities: `/path` (oc:// URIs), `/ast` (PEG grammars + typed AST + emitters), `/canonicalize` (RFC 8785 JCS — the single canonicalizer shared by policy, snap, guardrails/audit)
3. `@bic/openclaw-policy` — generator + operational helpers (scenarios, mock gateway, rubric evaluator, report render, audit verify); subpaths `/runtime` + `/types`
4. `@bic/openclaw-snap` — snapshot registry + HTTP server

The internal `claws` CLI binary (bic/claws's private OpenClaw-equivalent) hosts the `policy` and `snap` subcommand groups, with handlers living in packages #3 and #4 respectively. No separate CLI package.

## Deliverables

- [ ] `.github/workflows/ci.yml` — matrix for every PR. Split gates: **per-PR**: unit tests across all 4 packages on Linux + Windows (target <5 minutes). **Nightly + tag**: full matrix (unit + integration + e2e + 95/90/95/95 per-file coverage) across Linux + Windows + macOS.
- [ ] `.github/workflows/publish.yml` — tag-triggered GHE Packages publish
- [ ] `.github/CODEOWNERS` — per-package reviewers
- [ ] Branch protection rules on `main` (configured via settings, documented in repo)
- [ ] `CONTRIBUTING.md`
- [ ] `CODE_OF_CONDUCT.md`
- [ ] `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] `.github/ISSUE_TEMPLATE/` — bug + feature + question
- [ ] `docs/RELEASE.md` — release playbook. Must document: (a) independent package versioning for 9 runtime libs; (b) coordination matrix for `PolicyIR.version × @openclaw/policy × @openclaw/snap × snap /v1/` when policy bumps a major; (c) tag format; (d) rollback procedure.
- [ ] `docs/LTS.md` — LTS policy. Which branches get LTS status, back-port cadence, sunset criteria, who owns back-port review. TBD content at first — the file's existence forces the conversation with Peter before any package doc promises "LTS alignment follows X."
- [ ] `docs/SCOPE-HANDOVER.md` — process for `@bic/openclaw-*` (GHE) → `@openclaw/*` (public npm) publishing if/when Peter greenlights the `@openclaw/` scope. Microsoft public-release process gating, npm publish automation, name-squat recovery if needed.
- [ ] `README.md` validated post-migration; opens with a 5-minute quickstart
- [ ] Link checker in CI

## Out of scope

- Actual code changes to claws packages (that's claws-pre-extraction-packaging or claws-repo-migration)
- The filter-repo run itself (that's claws-repo-migration)
- Public distribution / external contributor onboarding (separate future decision — bic/claws is internal for the Horus horizon)
- Fancy CI features: deployment previews, canary releases, release-train automation — can come later

## Dependencies / blocks

- Blocks on `claws-repo-migration` (the repo has to exist in its migrated state before we can configure branch protection etc.)
- Blocks on `claws-pre-extraction-packaging` (the package list has to be final before CI matrix + CODEOWNERS can name them)

## Success criteria

- A new engineer, handed only the `bic/claws` README + CONTRIBUTING, can make a one-line doc-fix PR and land it without help
- A release-eng can publish a new version of any claws package by following `docs/RELEASE.md` — no Slack asking
- CI on `main` is green continuously; any red triggers an alert to the owners
- No `if: false` or `# TODO: un-gate` markers remain in workflows after close
