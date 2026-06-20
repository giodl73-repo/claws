# Policy Admin PR Stack

Status: planning note, not filed

Last checked: 2026-06-19

## Current Read

The feeds work changed the shape of the policy-admin stack. Lobster now has the
Scout feed contract, tenant-approved feed hosting, personal feed projection,
local/MOS3 personal-feed publishing, approved-feed publishing workflow, policy
baseline state primitives, OpenClaw policy bootstrap, and initial Scout policy
preview in `main`. The next stack should keep using feeds and MOS3 as the
governed distribution path.

Existing admin policy PRs:

| PR | State | Read |
| --- | --- | --- |
| `bic/lobster#2275` | Merged 2026-06-19 | Baseline state primitive layer with optional MOS3 artifact metadata while keeping Lobster materialization and OpenClaw local evaluation. |
| `bic/lobster#2270` | Merged 2026-06-19 | OpenClaw policy bootstrap with current package shape and policy plugin materialization. |
| `bic/lobster#3355` | Merged 2026-06-19 | Adds `scout policy preview` for tenant-approved feeds, package-defense state, MOS3 block-status metadata, and text/JSON preview output. |
| `bic/lobster#3383` | Merged 2026-06-20 at merge commit `af6bfa7c`; final head `ccb87b2ef` | Polish follow-up after #3355: scope-before-attestation error ordering, sanitized readable reason text, and read-only help text. |
| `bic/lobster#3388` | Merged 2026-06-20 at merge commit `f9278926`; final head `0b9f4af53` | Personal policy baseline state: MOS3-backed personal policies accepted only when equal-or-stricter than the tenant-effective baseline. |
| `bic/lobster#3391` | Open against `main`, head `65c516900`; ADO `168815951`/`168815950` green; GitOps PoP failed; review required after retarget | URL-gated Policy UX preview with section/scope controls, strictness comparison, generated policy JSON, and disabled MOS3 save path. |

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
   - Land #3391.
   - Keep the route hidden unless `?enablePolicyUx=1` is present.
   - Use the current descriptor registry to shape sections, scopes, and
     generated policy JSON with Jesse/admin reviewers.
   - Keep MOS3 persistence disabled until the save path can call the strictness
     acceptance flow from #3388.

4. **Personal policy upload/admin endpoint**
   - Add the live user/admin workflow that uploads or selects the personal
     policy artifact and calls the #3388 acceptance path.
   - Keep endpoint authorization and MOS3 upload mechanics separate from
     strictness semantics.

5. **Feed policy source selection**
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

Watch the open stack in order:

1. #3391: base is now `main`; ADO builds `168815951` and `168815950` are green.
   Get refreshed formal review after retarget, clear GitOps PoP, then merge.
