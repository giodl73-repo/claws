# Partner Center

Track Lobster Partner Center registration and package-submission work here.

## Current Position

Partner Center registration should not be blocked by the final durable storage
decision for admin spaces. The submission needs accurate setup and support
materials, and any admin storage story used in testing must be described as
testing/bootstrap/projection state unless it is backed by the selected durable
authority.

## Submission Inputs

| Area | Notes |
| --- | --- |
| Package metadata | App name, publisher, descriptions, icons, support links. |
| Permissions | Microsoft Graph and app permissions needed for setup and operation. |
| Admin setup flow | How deployment or tenant admins authorize Lobster features. |
| Privacy/support | Privacy statement, terms, support contact, escalation path. |
| Validation evidence | Screenshots, setup proof, runtime validation, policy/admin behavior notes. |

## Admin Settings Roadmap

- Deployment/global admin chooses default managed policy baseline behavior.
- Tenant admin can choose an equal-or-stricter tenant policy baseline.
- Exemptions should be explicit, auditable, and reversible.
- Feed settings can later follow the same global-floor plus tenant-subset model.
