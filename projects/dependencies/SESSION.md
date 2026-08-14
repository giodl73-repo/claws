# OpenClaw Dependency Governance Session

## Agent Start

1. Read this file.
2. Read `README.md`, `frame.md`, and `rating-model.md`.
3. Check the exact OpenClaw baseline and all lockfile dirty state.
4. Keep Microsoft policy facts separate from WorkIQ precedent.

## Baseline

- Area: `dependencies`
- Primary repo: `openclaw/openclaw`
- Local worktree: `/root/src/openclaw-dependency-audit`
- Current branch: detached at `459891c035201a70863f66098dd6e2c03b2559e6`
- Main tracking file: `rating-model.md`
- Skills to use: `faces-development-loop`; use `xlsx` when publishing the
  inventory workbook

## Current Session

- Last updated: 2026-08-14
- Last agent: Copilot
- Current focus: analysis complete and published; land the first focused
  OpenClaw dependency-governance fixes while preserving owner approval for new
  metadata and trusted-release contracts
- Active branch / PR: OpenClaw PR #123694 adds Linux Cargo update coverage;
  PR #123695 enforces the existing dependency pin guard in required CI; and
  draft PR #123722 adds Dependabot discovery plus an atomic lock SHA,
  integrity, and version-pin synchronizer for the trusted ClawHub CLI. All
  three branches were restacked on current `main`.
- Known dirty state: `claws-hapi` has unrelated pre-existing changes; only
  `projects/dependencies/` and surgical index additions belong to this effort
- Blocking question: none for the analysis. The thirteen exact npm versions
  remain future control-closure gaps, not unfinished review work.

## Resume Checklist

- Run: open `artifacts/openclaw-dependency-governance.xlsx` and filter
  `Technical risk = High`
- Published copy:
  `https://microsoft.ghe.com/bic/lobster/tree/openclaw-dependency-governance-analysis/docs/openclaw-dependency-governance`
- Verify: confirm reachability and artifact entry for shipped pnpm and Linux
  Cargo findings
- Review: use WorkIQ queries from the pilot sheet to locate internal precedent
  and governing records
- Follow: apply the evidence-authority ladder in
  `role-review-2026-08-13.md`; do not treat feed presence as approval
- Confirmed: all five exact versions in `microsoft-evidence-2026-08-13.md` are
  available through the Microsoft-protected npm feed
- Update: record authoritative Microsoft dispositions and remediation owners

## Guardrails

- Do not collapse technical risk and Microsoft approval into one score.
- Do not call internal usage `approved` without an authoritative record.
- Rate exact package versions and usage paths, not package names in isolation.
- Separate runtime, optional/plugin, build/release, and test-only exposure.
- Record WorkIQ citations and conclusions, not copied private conversation.
- Keep implementation or remediation changes in an OpenClaw worktree.

## Open Threads

- Analysis is complete: all 2,624 dependency identities were reviewed and the
  Microsoft expectations ledger records the remaining control gaps.
- OpenClaw's existing Dependency Guard, vulnerability gate, release evidence,
  and container attestations are strong. The long-term upstream work is
  incremental and documented in `dependency-governance-rfc-outline.md`.
- Lobster owns the missing product-exact CFS/CG/attestation seam. A problem-led
  issue was filed as bic/lobster#8220 and is mirrored in
  `lobster-dependency-attestation-issue.md`.
- The updateable Microsoft-facing analysis and remediation tracker is
  bic/lobster#8223, mirrored in `lobster-dependency-governance-tracker.md`.
- The complete versioned baseline is published on Lobster branch
  `openclaw-dependency-governance-analysis`, including the canonical workbook,
  all 2,624 identities as CSV, the source inventory, controls, and evidence.
- Focused upstream issues are open:
  - #123687: enforce the dependency pin guard in required CI;
  - #123688: govern minimum-release-age exclusions;
  - #123689: atomically refresh the trusted ClawHub release lock and pins; and
  - #123690: add Linux Cargo update coverage.
- PR #123694 implements #123690. PR #123695 implements #123687 with 22 focused
  boundary-check tests passing and zero current pin violations across 616
  direct specs in 179 manifests. Both were restacked on current `main` on
  2026-08-14. PR #123695's only post-restack failure was an unrelated
  same-millisecond heartbeat assertion; the exact failed shard passed on
  rerun. PR #123694's post-restack suite hit an unrelated SQLite
  `database is locked` failure; its failed shard was rerun.
- PR #123692 was closed. A generic Dependabot update can change the ClawHub
  package and lock, but `scripts/materialize-clawhub-cli.sh` correctly rejects
  mismatched lock SHA-256, integrity, or version pins. #123689 now tracks an
  owner-reviewed atomic refresh flow instead. Draft PR #123722 implements the
  mechanical portion: daily update discovery, a maintainer-invoked atomic pin
  sync, required CI drift detection, and data-derived invariant tests. After
  ClawSweeper identified that identity checks alone could miss a changed CLI
  command contract, the draft added a dedicated no-secret PR check and reused
  the same verifier in the release workflow. The exact committed lock now
  proves `package trusted-publisher set`, `--repository`, and
  `--workflow-filename` before merge. Release and security owners still need to
  approve the trusted update boundary, but no known mechanical proof gap
  remains. The dedicated `ClawHub CLI Contract` workflow passed on exact head
  `4cd6672c84fb`.
- Official run `176596891` is not valid control-closure evidence. It staged an
  OpenClaw `2026.8.1` remediation lock while Lobster installed `2026.5.28`.
  The experimental Lobster pipeline PR #8174 was closed.
- Identify the Microsoft authority and required evidence for OSS intake.
- Prepared P0/P1 remediation commit `0d39d1f86a8`:
  - `js-yaml@4.3.1`;
  - `@aws-sdk/core@3.977.6`;
  - ClawHub `0.23.3` with `undici@7.29.0`;
  - `werift@0.24.3`, removing `rx.mini`, with transient WebRTC disconnect
    recovery aligned to werift's current consent lifecycle.
- Prepared image-provenance commit `39b18ffbe4f`, pinning the live-media
  runner's Ubuntu base to the repository's existing immutable digest.
- The frozen lock and focused OpenAI WebRTC test pass. The broad extension
  gate remains blocked because CFS exposes `@openclaw/fs-safe@0.5.2`, not the
  required `0.5.5`; do not bypass or downgrade.
- Resolve four Blacksmith action procurement/license records, unlicensed
  `rx.mini@1.4.0`, and the Cloudflare promoted-image digest placeholder.
- The remaining image and direct-dependency remediations are documented in
  `remediation-plan-2026-08-13.md`; do not implement or publish them without
  separate authorization.
- The complete inventory review is closed: 2,624 reviewed, zero automated
  rows, 33 High, 1,707 Moderate, 878 Low, and six Unknown.
- Use `microsoft-controls.json` and the workbook `Microsoft Controls` sheet as
  the authoritative check-off queue. Ordinary OSS closes through reconciled
  CFS plus CG evidence, not individual package approvals.
- The 2026-08-14 exact recheck reduced the CFS gap from fourteen to thirteen:
  `@nolyfill/domexception@1.0.28`, the actual package behind the
  `node-domexception` alias, is now admitted with matching integrity.
- The remaining exact packages are upstream-present and currently align with
  the seven-day npm minimum-release hold; upstream tag timestamps place all but
  `ws@8.21.3` inside the window, and `ws` crossed it only hours before recheck.
  Recheck daily; use `terrapineng@microsoft.com` or Global Helpdesk only for
  versions that remain absent after the hold.
- Resolve CFS admission for `@openclaw/fs-safe@0.5.5`; do not bypass the
  protected feed or downgrade the security boundary without validation.
- Resolve CFS admission for `@trycua/cua-driver@0.19.3`; CFS currently exposes
  `0.19.0`, and no bypass or unvalidated downgrade is authorized.
- Resolve the unavailable `@openclaw/uirouter@0.1.1` artifact; it is present
  upstream but still held from CFS despite an integrity-pinned baseline lock
  entry. Do not bypass the protected feed.
- Resolve the remaining exact npm feed gaps recorded in the workbook:
  six `@trycua/cua-driver` platform packages, `eventsource-parser@3.1.1`,
  `hono@4.13.2`, `nanoid@3.3.18`, and `ws@8.21.3`.
- The generated inventory now derives 212 direct npm identities from pnpm
  importers and release roots; 90 stale direct flags were corrected.
- Plan small remediations for the reviewed pnpm, Linux Cargo, and release-tool
  findings without changing governed registrations.
- Keep `vitest` development-only; it is installed as AIMock's optional peer
  in the QA Lab graph but is not imported by the QA Lab runtime source.

## Session Checkpoints

Detailed session handoffs live in `sessions/` and are created with
`.agents/skills/project-session/scripts/checkpoint-session.mjs`.
