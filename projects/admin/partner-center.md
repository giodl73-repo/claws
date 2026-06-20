# Partner Center

Track Lobster Partner Center registration and package-submission work here.

## Current Position

Partner Center registration should not be blocked by the final durable storage
decision for admin spaces. The submission needs accurate setup and support
materials, and any admin storage story used in testing must be described as
testing/bootstrap/projection state unless it is backed by the selected durable
authority.

PR #2211 is enough to start Partner Center registration because it establishes
the runtime authorization boundary for deployment and tenant admins. PR #2275
and #2270 are roadmap items for managed OpenClaw policy baselines and workspace
bootstrap; do not make the registration depend on them.

## Registration Basis

| Item | Value |
| --- | --- |
| Primary proof PR | `https://microsoft.ghe.com/bic/lobster/pull/2211` |
| Registration prep PR | `https://microsoft.ghe.com/bic/lobster/pull/2422` |
| Merged commit | `a45e8328caf8566868dce1253d84b907b704c0c6` |
| Merged date | 2026-06-04 |
| Runtime PR validation | `Lobster-Runtime-PullRequest` build `166755560` passed |
| Runtime build validation | `Lobster-Runtime-Build-Validation` build `166805394` passed |
| Admin claim supported | Lobster has runtime primitives for deployment admin, tenant admin, tenant reader, tenant/deployment scope checks, user vs app principal assignments, and delegated-user vs app-only token handling. |
| Storage claim allowed | Admin storage is not finalized. Redis may be used only for testing/bootstrap/projection state until a durable authority is selected. |

## Submission Inputs

| Area | Notes |
| --- | --- |
| Package metadata | App name, publisher, descriptions, icons, support links. |
| Permissions | Microsoft Graph and app permissions needed for setup and operation. |
| Admin setup flow | How deployment or tenant admins authorize Lobster features. |
| Privacy/support | Privacy statement, terms, support contact, escalation path. |
| Validation evidence | Screenshots, setup proof, runtime validation, policy/admin behavior notes. |

## Microsoft Submission Checklist

Official docs to use while assembling the package:

- Teams Store preparation checklist:
  `https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/prepare/submission-checklist`
- Microsoft 365 app publishing overview:
  `https://learn.microsoft.com/en-us/microsoftteams/platform/m365-apps/publish`
- Teams app validation tool:
  `https://dev.teams.microsoft.com/validation`
- Partner Center:
  `https://partner.microsoft.com/dashboard`

Required packet:

1. App package: Teams/Microsoft 365 app package with manifest, color icon, and
   outline icon. Validate before submission.
2. Listing: short name, full name, one-sentence short description, long
   description, category, screenshots, optional demo video, support URL,
   privacy URL, and terms URL.
3. Test tenant: tenant configured for validation with any allow-listing,
   feature flags, external service setup, or license state already applied.
4. Test accounts: at least one admin account and non-admin accounts for the
   personas validation must exercise.
5. Test notes: precise setup and validation steps, including first-run sign-in,
   admin setup, user workflow, and any event or notification triggers.
6. Permissions: Graph/app permissions and consent flow documented in plain
   language for tenant admins.
7. Publisher verification and attestation: prepare the security, data handling,
   and compliance answers; new apps complete formal attestation after listing
   exists.

## #2211 Admin Setup Language

Use this as the first Partner Center admin/control-plane statement:

```text
Lobster separates deployment-level and tenant-level administration. Deployment
admins manage deployment-owned defaults and cross-tenant settings; tenant
admins manage settings scoped to their tenant; tenant readers can inspect
tenant-scoped state without mutating it. Runtime authorization checks evaluate
the caller principal, token kind, tenant/deployment scope, and assignment role
before admin operations are accepted. The initial registered package uses this
admin boundary for setup and validation; managed OpenClaw policy baselines and
workspace bootstrap are follow-on capabilities in the admin roadmap.
```

## Validation Notes To Provide

Use #2211 as implementation proof and keep the instructions testable:

```text
Validation focus:
1. Sign in as an admin account in the configured validation tenant.
2. Complete app setup and consent.
3. Verify the admin-facing setup path recognizes an authorized deployment or
   tenant admin.
4. Sign in as a non-admin account and verify the user path works without admin
   mutation privileges.
5. Attempt the admin setup path as a non-admin account and verify access is
   denied or blocked by the expected admin boundary.

Implementation proof:
- Runtime admin authorization primitives merged in bic/lobster#2211.
- Merged commit: a45e8328caf8566868dce1253d84b907b704c0c6.
- CI proof: Lobster-Runtime-PullRequest build 166755560 and
  Lobster-Runtime-Build-Validation build 166805394 passed.
```

## Open Fields To Fill

- Final app short name and full name.
- Publisher display name.
- Privacy statement URL.
- Terms of use URL.
- Support URL and escalation alias.
- Production or validation tenant id.
- Admin test account and non-admin test accounts.
- Exact Graph permissions and admin consent screen wording.
- Screenshots and demo video URL.

## Registration Prep PR

PR #2422 adds `docs/partner-center-registration.md` to the Lobster repo. It
copies repo-backed values from the canonical identifiers, first-party app, auth,
privacy, internal access, and admin docs, while marking final Partner Center
submission fields that still need owner confirmation.

## Admin Settings Roadmap

- Deployment/global admin chooses default managed policy baseline behavior.
- Tenant admin can choose an equal-or-stricter tenant policy baseline.
- Exemptions should be explicit, auditable, and reversible.
- Feed settings can later follow the same global-floor plus tenant-subset model.
