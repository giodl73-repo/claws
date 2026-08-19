# LobsterClaw Project

Use this area for the private BIC OpenClaw distribution: exact upstream release
bases, Lobster patch provenance, deterministic reconstruction, validation, and
patch retention, rebuild, or removal across upgrades.

LobsterClaw is intentionally simpler than EnterpriseClaw. Git commits are
immutable generations, and one manifest is the ordered patch ledger.

## Support Contract

Lobster owns which OpenClaw versions are Active, Candidate, and retained for
rollback. LobsterClaw must publish and continuously qualify an immutable,
fully patched generation for every OpenClaw version that Lobster supports.

Lobster pins exact LobsterClaw generation commits and may advance those pins
only after the replacement generations are published and qualified. Moving a
pin must not require rebuilding or mutating an older generation. LobsterClaw
must retain the prior supported generation until Lobster explicitly removes
that version from its support set.

The Lobster consumer integration therefore needs version-to-generation pins,
not one repository-wide generation pointer. PR and release image validation
must resolve each supported image lineage to its own exact LobsterClaw
generation and use that generation identity for provenance and caches.

## Patch And Promotion Workflow

1. Add or rebuild the logical patch on every Lobster-supported OpenClaw release
   that requires the behavior. Never modify an already published generation;
   publish a new immutable generation on each affected release lineage.
2. Preserve patch provenance and qualify each new generation against its exact
   upstream base. A generation is not consumable until its required source,
   package, test, and platform lanes pass.
3. Open a separate Lobster PR that changes only the affected
   version-to-generation pins and related generated lock or provenance data.
4. Lobster builds and integration-tests every supported image lineage from the
   proposed pins. Merge only when Active, Candidate, and any retained rollback
   lineage remain valid.
5. Retain the prior LobsterClaw generations so Lobster can roll back by
   reverting pins without reconstructing or republishing source.

Not every logical patch must have identical bytes on every release. It may be
retained unchanged, rebuilt for that base, or omitted only when the replacement
behavior is proven and recorded for that lineage.

## Supported-Lineage CI Gate

Every LobsterClaw patch change must declare a stable logical patch ID and its
coverage across the complete Lobster-supported version set. CI must reject the
change unless every supported lineage records exactly one valid disposition:

- `applied`: the patch is present and qualified on that release;
- `rebuilt`: equivalent release-specific patch bytes are present and qualified;
- `satisfied`: the base or another recorded patch already provides the behavior,
  with named evidence;
- `not-applicable`: the affected surface does not exist on that release, with a
  machine-checkable reason.

The gate must fail for a missing lineage, an unqualified replacement
generation, stale provenance, or an unsupported silent omission. It must compare
against Lobster's checked-in supported-version manifest so adding Active,
Candidate, or rollback support automatically expands the required coverage set.

This is a two-sided contract:

- LobsterClaw CI verifies that every generation it publishes has complete
  logical-patch coverage and qualification evidence for its release lineage.
- Lobster CI is the decisive synchronization gate. It verifies that Lobster's
  supported-version manifest has an exact qualified LobsterClaw pin for every
  Active, Candidate, and rollback lineage, and that no required logical patch is
  missing from any pinned generation.

Lobster remains authoritative for which versions are supported; LobsterClaw is
authoritative for the patched source and qualification evidence behind each
generation.

## Active Notes

| Area | File |
| ---- | ---- |
| Current session and resume state | `SESSION.md` |
| Integration candidate intake | `.lobsterclaw/integration-candidates.json` in each active LobsterClaw release branch |
| Definitive RFC and upstream PR portfolio | `integration-portfolio-2026-08-18.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| ---- | ---------- | ------ | ------ | ------- |
| `bic/LobsterClaw` | #1 | `lobsterclaw/provenance-v1` | Merged | Add the simple provenance manifest, verifier, and retain/rebuild/remove rule with zero patches imported. |
| `bic/LobsterClaw` | #2 | `lobsterclaw/2026.6.33-7055-v2` | Merged | Import Lobster #7055's 39 exact source-backed patches. |
| `bic/LobsterClaw` | #3 | `lobsterclaw/repository-governance-default` | Merged | Add BIC `CODEOWNERS` and 1ES repository identity to the unrelated default branch. |
| `bic/LobsterClaw` | #4 | `lobsterclaw/repository-governance-release-2026.6.33` | Merged | Replace upstream owners and add the same repository identity to the active release lineage. |
| `bic/LobsterClaw` | #5 | `azure-pipelines` | Merged | Establish branch-aware ADO CI on bootstrap `main`; validate governance identity there and generation contracts on release branches. |
| `bic/LobsterClaw` | #6 | `lobsterclaw/upstream-ref-provenance` | Merged | Add machine-validated upstream PR lifecycle references to the active release lineage. |
| `bic/LobsterClaw` | #7 | `lobsterclaw/generation-acceptance-ci` | Merged | Add non-blocking exact-generation acceptance and register the verified v2026.6.33 installed dependency graph with Component Governance. |
| `bic/LobsterClaw` | #9 | `lobsterclaw/release-qualification-2026.6.33` | Merged at `e2026496bf` | Add version-bound OpenClaw CI-equivalent source qualification lanes for the immutable 6.33 generation. The initial lanes remain non-blocking until inherited failures are classified. |
| `bic/LobsterClaw` | #10 | `lobsterclaw/patch-repair-lineage` | Merged at `9d37a536fa` | Record qualification-discovered repair patches against the prior patch IDs they correct, including explicit attribution for existing repair patch 0040. |
| `bic/LobsterClaw` | #11 | `lobsterclaw/2026.5.28-active` | Merged at `4737fde39a` | Publish the exact signed OpenClaw 5.28 base plus Lobster Active's 35-patch queue on the new `release/2026.5.28` lineage for pinned fallback-image construction. |
| `bic/LobsterClaw` | #12 | `lobsterclaw/release-qualification-2026.5.28` | Merged at `81fca69ef0` | Add exact-generation dependency evidence, focused generation acceptance, and five non-blocking OpenClaw CI-equivalent source qualification lanes for the 5.28 fallback lineage. |
| `bic/LobsterClaw` | #13 | `lobsterclaw/repair-qualification-harness-2026.6.33` | Merged at `af305684b1` | Route pnpm through the approved mirror, disable unavailable release-age metadata checks, and retain the fast PR/full release qualification split. |
| `bic/LobsterClaw` | #14 | `lobsterclaw/repair-qualification-harness-2026.5.28` | Merged at `9f40f304a1` | Apply the same qualification network repair and fast/full split to the Active/fallback lineage. |
| `bic/LobsterClaw` | #15 | `lobsterclaw/2026.6.33-7055-final` | Merged at `a485a37194` from `efdd83ec4f` | Publish the exact final 40-patch 2026.6.33 generation on top of the merged qualification harness. |
| `bic/LobsterClaw` | #16 | `lobsterclaw/qualify-release-2026.6.33` | Merged at `cc5732b7f8` | Qualify the exact 40-patch 2026.6.33 source tree in a deterministic metadata-free checkout, extend shrinkwrap qualification time to 30 minutes, and keep deployment-role assignment in Lobster. |
| `bic/LobsterClaw` | #17 | `lobsterclaw/qualify-release-2026.5.28` | Merged at `4320a8dca1` | Qualify the exact 35-patch 2026.5.28 source tree in a deterministic metadata-free checkout, treating dependency-evidence `.gitignore` entries as repository metadata and keeping deployment-role assignment in Lobster. |
| `bic/LobsterClaw` | #18 | `lobsterclaw/qualify-release-2026.6.33` | Merged at `566fd90276` | Accept Azure DevOps' short PR target branch form and isolate qualification tests from ambient CI branch variables. |
| `bic/LobsterClaw` | #19 | `lobsterclaw/release-coverage-contract` | Merged at `0f3a5a42c0` from `39904959c1` | Add the central release-keyed admission gate with credential-free generation-tag, commit, manifest-blob, and coverage-snapshot binding. CI rejects silent one-release omissions, duplicate stable behavior IDs, deployment-role keys, and unsupported or unevidenced dispositions. |
| `bic/LobsterClaw` | #21 | `user/giodl/control-model-2026.6.33` | Merged at `4ef987f51a` | Publish immutable strict-parity v3 with the exact current 42-patch Lobster queue and source tree `c008883632`. |
| `bic/LobsterClaw` | #22 | `user/giodl/admit-control-model-generation` | Merged at `67b5350d30` | Admit strict-parity v3 into the release support contract. |
| `bic/LobsterClaw` | #20 | `lobsterclaw/release-lifecycle-fixture` | Merged at `bb850ee098` | Rehearse import, publication, admission, promotion, rollback, adoption, and tamper rejection. |
| `bic/LobsterClaw` | #23 | `lobsterclaw/transition-parity` | Merged at `23d0fd3ceb` into its stacked fixture base | Bind the 75-patch legacy-to-LobsterClaw transition receipt; its delta still requires #24 to reach `main`. |
| `bic/LobsterClaw` | #24 | `lobsterclaw/release-lifecycle-fixture` | Merged at `9f1747e2ab` | Publish #23's six-file transition-parity validator, tests, receipts, CI registration, and README alignment onto `main`. |
| `bic/LobsterClaw` | #25 | `user/giodl/qualification-parity-2026.6.33-v4` | Merged at `9fabe287b6` | Publish immutable strict-parity v5 with 46 patches and the repaired qualification harness. |
| `bic/LobsterClaw` | #26 | `user/giodl/integration-portfolio-v2` | Merged at `d2035cf1e7` | Make LobsterClaw the definitive machine-readable and human-readable RFC, upstream PR, and incubation portfolio. |
| `bic/LobsterClaw` | #27 | `user/giodl/generated-release-artifact-gate` | Open at `6661f2dac5` | Run OpenClaw's generated-release artifact gate against the exact reconstructed generation on every LobsterClaw PR. |
| `bic/lobster` | #7055 | `promoteclaw/openclaw-2026.6.33` | Merged at `ed6a864f9a` from `584e8b2080` | Own the authoritative final 6.33 patch queue. The merged queue has 40 patches and differs from the currently published 39-patch LobsterClaw generation. |
| `bic/lobster` | #8363 | `user/giodl/lobsterclaw-consumer` | Open at `f8d3dfd431`; mergeable but blocked | Builds independent 5.28 Active and strict-parity v3 6.33 Candidate generations without Docker-time replay. The 37-test consumer gate validates 42 current patch bytes, 42 historical source receipts, and 75-patch transition parity. Inspektor approved the exact head; Galin review refresh, GitHubPop, and both required runtime contexts remain. |
| `bic/lobster` | #9364 | `user/giodl/openclaw-633-qualification-repairs` | Open at `ced2c62702`; mergeable, review required, hosted contexts pending | Runs OpenClaw's native generated release-artifact gate against the exact patched source, adds mirror-safe shrinkwrap normalization, records reviewed config/Plugin SDK baselines and budgets, and protects custom `web_fetch` header values as sensitive. |

## Related Areas

- `../enterpriseclaw/README.md`
- `../promoteclaw/README.md`
- `../lobster/README.md`
