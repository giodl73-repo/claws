# Policy Feed Admin Plan

## Goal

Separate policy authoring from policy feed distribution and selection:

- `/policy` is the policy design, validation, preview, and effective-policy
  inspection surface.
- `/feeds` is the tenant-admin governed-artifact control plane. It can publish
  and select policy feed sources, but it should not become the policy editor.

Feeds provide source identity, tenant approval, revision/hash provenance, and
admin distribution. Policy enforcement remains policy-shaped, not a generic
feed install.

## PR Plan

### PR 1: Backend Policy Source Selection

Current PR: Lobster #3685, branch `user/giodl/lobster-policy-feed-sources-v2`.

Purpose:

- Add `POST /v1/policy/feed-sources/select`.
- Persist the active tenant policy feed source in durable policy baseline
  state.
- Validate tenant admin authorization, tenant-approved feed attestation, caller
  tenant hash, and exact source identity.

Remaining review-driven changes:

- Add cross-tenant feed isolation route test.
- Add tests for non-tenant-approved feed scope, `sha256` mismatch, and
  durable-storage disabled.
- Document `LOBSTER_POLICY_ADMIN_ASSIGNMENTS_PATH` and
  `LOBSTER_POLICY_TENANT_APPROVED_FEED_DIR`.
- Emit a success-path audit/operational log after selection is saved.

### PR 2: Policy Source Selection UX

Current PR: Lobster #3695, branch `user/giodl/lobster-policy-source-selection-ux`.

Purpose:

- Let a tenant admin select the active policy feed source from the Policy UX.
- Display selected feed id, revision, hash, and effective state.

Remaining review-driven changes:

- Send the displayed feed `sha256` when selecting the policy source.
- Require/hash-check that `sha256` on the backend contract from PR 1.
- Keep this as active source selection, not policy editing.

### PR 3: Policy Sources Lane In Feeds

Future PR.

Purpose:

- Add a tenant-admin-only `Policy sources` lane/tab/section under `/feeds`.
- Show policy-capable tenant-approved feed entries and provenance.
- Add `Set as active policy source`, backed by PR 1.

Boundary:

- `/feeds` manages governed artifact distribution and active source selection.
- `/policy` remains the effective-policy and authoring/preview surface.

### PR 4: Effective Policy Source View

Future PR.

Purpose:

- Show current active policy source in `/policy`: feed id, revision, hash,
  selected time/actor when available, and effective status.
- Link tenant admins to `/feeds` for source management.

### PR 5: Policy Authoring And Publish Design

Future docs/design PR.

Purpose:

- Specify policy draft/edit/validate/review/publish flow.
- Define how a validated policy becomes a governed artifact/feed entry.
- Define rollback/history and approval requirements.

### PR 6+: Policy Authoring UX

Future implementation.

Purpose:

- Add policy draft/edit/validate/publish controls.
- Add review/approval flow as needed.
- Preserve the separation between editing policy and selecting active feed
  source.
