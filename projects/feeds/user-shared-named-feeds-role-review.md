# User-Shared Named Feeds Role Review

Reviewed against `.craft/roles/claws` on 2026-06-29.

## Roles Used

- `founder`: community trust, portability, OpenClaw-native simplicity.
- `skill-author`: maker workflow, publishing friction, badge usefulness.
- `power-user`: operational control, diagnostics, script replacement.
- `new-hire`: first-five-minutes clarity and progressive disclosure.
- `cowork-ux-eng`: governance transparency in UX.
- `ciso`: security assurance, kill switch, audit evidence.
- `compliance`: auditor-grade evidence and tamper-aware history.
- `platform-eng`: fleet consistency, drift, and supportability.

## Findings

### Founder

The plan is directionally right because it avoids tenant-admin dependency and
keeps sharing user-led. The main risk is a Lobster-only sharing model that feels
like vendor lock-in. Named feeds need to remain portable feed documents with
stable ids, revisions, provenance, and no hidden dependency on one product UI.

Plan change: added portability requirements and a guardrail against making named
feeds Lobster-only when the feed document can remain portable across OpenClaw,
Scout, ClawHub, MOS3, and future clients.

### Skill Author

The author path is good if it stays simple: publish a useful collection, share
it, get installs. The plan should avoid requiring authors to learn governance
language before sharing. Badges must help users trust and install the author's
work, not bury it under admin ceremony.

Plan change: reinforced search-first UX and progressive disclosure. Source
labels explain why a result appeared and what action to take, without requiring
the user to understand the full feed model first.

### Power User

Following feeds into a personal effective feed is the right operational model,
but power users need diagnostics. They will ask why a result appeared, why it
disappeared, which revision supplied it, and whether a newer revision changed
behavior.

Plan change: added diagnostics for source feed, owner, revision, search scope,
trust labels, blocked/revoked reason, install selector, and last refresh time.

### New Hire

The plan has too many concepts if exposed all at once: named feed, personal
effective feed, tenant-visible, tenant-approved, follow latest, pin revision,
ACLs, source labels. The first-run path must be one obvious loop:

```text
Search -> install useful entry -> optionally follow the source feed
```

Plan change: added explicit progressive-disclosure guidance so ACLs, revision
pinning, tenant review, and policy controls stay behind details/settings.

### Cowork UX

The distinction between tenant-visible and tenant-approved is essential, but it
must be visible in the UI. Minimal labels are not enough if users cannot act on
them. Locked or blocked states need owner/policy source and a clear next step.

Plan change: made source labels actionable and added a guardrail against generic
blocked/locked errors.

### CISO

Viral sharing is acceptable only if tenant controls can block bad feeds,
publishers, owners, entries, or sources quickly. Runtime permission must remain
separate from feed visibility. Audit events must exist for share, follow,
install, publish, and admin promotion decisions.

Plan change: added emergency block controls, audit events, and explicit audit
event fields.

### Compliance

Tenant-visible sharing without evidence will create audit gaps. The plan needs
auditor-grade chronology: who published, who changed visibility, who followed,
who approved, which revision, and why.

Plan change: added audit-event requirements and an open question for minimum
audit export before broad tenant-visible sharing.

### Platform Eng

The plan needs fleet-level manageability. Tenant policy controls and emergency
blocks are not optional if named feeds become a broad distribution channel.
Diagnostics also need to support support tickets without manually reconstructing
effective-feed state.

Plan change: added audit/block/diagnostics as a dedicated PR slice before
artifact-type expansion.

## Resulting Direction

The reviewed shape is:

```text
/skills search is the normal-user surface.
Search results show actionable source labels.
Users can follow named feeds into their personal effective feed.
Following stores a feed reference, not a destructive copy.
Named feeds remain portable, versioned feed documents.
Tenant-visible is sharing, not endorsement.
Tenant approval promotes selected revisions or entries.
Audit, block, and diagnostics are required before broad rollout.
```

## MOS3-First Policy Check

Reviewed after confirming the current Lobster policy stack on 2026-06-29.

Current implementation evidence:

- Lobster policy artifact publishing packages policy JSONC and publishes it to
  MOS3 through the shared package publish path.
- The accepted policy baseline reference can carry `store=mos3`, MOS3 artifact
  id, artifact revision, artifact SHA-256, and attestation.
- OpenClaw does not fetch policy directly from MOS3 in this model; Lobster
  materializes the effective policy content into OpenClaw starts.
- Accepted personal baseline state, tenant feed-source selection, and effective
  policy state are still durable Lobster JSON state today.
- Tenant policy feed-source selection still reads a tenant-approved feed document
  from configured Lobster feed directories.

Role conclusions:

- `policy-steward`: policy entries in feeds should reference the MOS3-governed
  policy artifact and preserve OpenClaw comparison/evidence attestations. Do not
  create a second policy blob store in the feed system.
- `ciso` and `compliance`: MOS3 artifact id, revision, SHA-256, attestation,
  selected feed revision, selector, approver, and comparison result must remain
  audit-visible. The feed state cannot flatten this into "policy enabled."
- `platform-eng`: the product target should move selection/effective-state
  authority into MOS3 feed or collection state so policy, skills, and plugins
  share one fleet governance path. Lobster JSON state is acceptable as a bridge.
- `cowork-ux-eng`: `/policy` should keep showing the effective source and why
  it applies; `/feeds` can own tenant-admin selection, but the source must be
  traceable back to the MOS3 artifact and selected feed revision.

Plan adjustment: policy baselines are a first-class feed item type, but their
artifact bytes should be MOS3-backed when available. The remaining MOS3 contract
work is not policy artifact upload; it is named-feed/tenant-approved selection,
follow/search, admin promotion, and effective-state materialization.

## Remaining Decisions

- Does follow default to latest revision, pinned revision, or ask?
- Does tenant approval promote whole feed revisions, selected entries, or both?
- What audit export is mandatory before tenant-visible sharing is broadly
  enabled?
- Is MVP feed export user-facing, or only API-backed portability?
- Which M365 group identifier is the first supported ACL shape?
