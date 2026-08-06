# Policy Admin PR Stack

Status: planning note, not filed

Last checked: 2026-06-24

## Current Read

The feeds work changed the shape of the policy-admin stack. Lobster now has the
Scout feed contract, tenant-approved feed hosting, personal feed projection,
local/MOS3 personal-feed publishing, approved-feed publishing workflow, policy
baseline state primitives, OpenClaw policy bootstrap, and initial Scout policy
preview in `main`. The next stack should keep using feeds and MOS3 as the
governed distribution path.

Existing admin policy PRs:

| PR                 | State                                                                | Read                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bic/lobster#2275` | Merged 2026-06-19                                                    | Baseline state primitive layer with optional MOS3 artifact metadata while keeping Lobster materialization and OpenClaw local evaluation.         |
| `bic/lobster#2270` | Merged 2026-06-19                                                    | OpenClaw policy bootstrap with current package shape and policy plugin materialization.                                                          |
| `bic/lobster#3355` | Merged 2026-06-19                                                    | Adds `scout policy preview` for tenant-approved feeds, package-defense state, MOS3 block-status metadata, and text/JSON preview output.          |
| `bic/lobster#3383` | Merged 2026-06-20 at merge commit `af6bfa7c`; final head `ccb87b2ef` | Polish follow-up after #3355: scope-before-attestation error ordering, sanitized readable reason text, and read-only help text.                  |
| `bic/lobster#3388` | Merged 2026-06-20 at merge commit `f9278926`; final head `0b9f4af53` | Personal policy baseline state: MOS3-backed personal policies accepted only when equal-or-stricter than the tenant-effective baseline.           |
| `bic/lobster#3391` | Merged 2026-06-20 at head `a07e8915e`                                | URL-gated Policy UX preview with section/scope controls, strictness comparison, generated policy JSON, and disabled MOS3 save path.              |
| `bic/lobster#3555` | Merged 2026-06-24 at head `44cc96c6`                                 | MAC / Partner Center registration guidance refresh aligned with MOS3 catalog/governance boundaries.                                              |
| `bic/lobster#3585` | Draft                                                                | Live authenticated personal-policy accept route requiring durable policy state, MOS3 artifact metadata, and OpenClaw comparison attestation.     |
| `bic/lobster#3586` | Draft, stacked on #3585                                              | Policy UX save wiring to the personal-policy accept API using selected MOS3 artifact metadata.                                                   |
| `bic/lobster#3588` | Draft, stacked on #3586                                              | Policy-specific MOS3 publish backend and Policy UX publish-before-accept save flow.                                                              |
| `bic/lobster#3590` | Draft, stacked on #3588                                              | Effective policy baseline projection into OpenClaw gateway start env for container materialization.                                              |
| `bic/lobster#3603` | Draft, stacked on #3590                                              | Review fixes: durable publish gate, trusted comparison attestation verification, pending response wire shape, and locked temp-file state writes. |
| `bic/lobster#3607` | Draft, stacked on #3603                                              | Tenant-admin-selected attested tenant-approved feed policy sources recorded in durable policy state.                                             |

## Proposed Stack

1. **Policy preview polish**
   - Land #3383.
   - Keep it intentionally small: error ordering, human-readable reason text,
     and read-only command help.

2. **Personal policy MOS3 state slice**
   - Land #3388.
   - Validate it with OpenClaw strictness comparison against the effective
     tenant/global baseline.
   - Reject policies that weaken required controls.
   - Store accepted artifacts in MOS3 and record artifact id, revision, hash,
     and attestation metadata in Lobster state.
   - Materialize the accepted policy locally into OpenClaw.

3. **Gated Policy UX preview**
   - Landed as #3391.
   - Keep the route hidden unless `?enablePolicyUx=1` is present.
   - Use the current descriptor registry to shape sections, scopes, and
     generated policy JSON with Jesse/admin reviewers.
   - Keep MOS3 persistence disabled until the save path can call the strictness
     acceptance flow from #3388.

4. **Personal policy upload/admin endpoint**
   - Opened as #3585 through #3603.
   - Keep endpoint authorization, MOS3 upload mechanics, strictness semantics,
     and trusted comparison attestation verification explicit.

5. **Feed policy source selection**
   - Opened as #3607.
   - Add admin state for selecting tenant-approved feed sources as the governed
     plugin/skill distribution input.
   - Use the landed Scout approved-feed publishing workflow as the concrete
     source of tenant effective feed artifacts.
   - Keep source registration separate from making entries installable.

6. **Quarantine enforcement slice**
   - Build on the preview behavior landed in #3355.
   - Add an explicit policy/admin model for package defense outcomes.
   - Treat `quarantined` and `failed` package defense states as blocked for new
     discovery and new install unless an explicit tenant or Microsoft exception
     outcome is present.
   - Preserve warning state as visible only when the feed outcome says it is
     searchable/installable.
   - Record reason metadata so admins can explain whether a block came from
     vulnerability, malware signal, publisher trust, stale scan, or source
     revocation.

7. **Policy preview**
   - Add dry-run/preview output before publishing policy changes.
   - Preview should show entries becoming visible, hidden, blocked, drifted,
     stale, quarantined, or failed.

## Quarantine Contract

The quarantine policy should align with the feed notes:

- `projects/feeds/mos3-feed-contract-standard.md` says package defense state
  should distinguish `unscanned`, `scanning`, `passed`, `warning`,
  `quarantined`, `failed`, and `recheck required`.
- Clients should treat `quarantined` or `failed` as blocked for new discovery
  and new install unless the feed carries an explicit exception outcome.
- `projects/feeds/mos3-feed-client-conformance.md` requires clients to reject
  install for quarantined or failed package defense unless an explicit allowed
  exception exists.
- `projects/feeds/mos3-feed-admin-experience.md` calls out quarantine reasons,
  recheck requirements, policy preview, and admin explainability.

## Recommended Next Action

Start the quarantine enforcement slice on top of #3607. It should consume the
tenant-selected feed policy source, preserve the #3355 preview semantics, and
block new discovery/install for `quarantined` or `failed` package-defense/MOS3
block-status outcomes unless an explicit tenant or Microsoft exception outcome
is present.
