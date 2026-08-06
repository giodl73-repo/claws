# Lobster Collaboration and Ownership Opportunities

Prepared 2026-07-27 from Omar's China-team slide, current Feeds, Admin, Policy,
and Staffing context, and live PR state.

Each linked document is self-contained so it can be shared with people who do
not have access to this repository. The documents present a vision, work areas,
partners, completed and in-flight work, remaining opportunities, and possible
ownership slices. They are conversation starters rather than fixed work
assignments; a receiving team can choose an area that fits its charter and
capacity.

## Image transcription

| Role                                 | Job                                                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extensibility                        | Build the platform for plugins, skills, UX extensions, governance, ratings, versioning, tenant controls, and 1P/community contribution.            |
| Admin & Governance                   | Own tenant/global settings, policy, permissions, approvals, audit/override state, Partner Center, marketplace governance, and M365 auth decisions. |
| Frontend Product Engineering         | Close the cloud UX/product polish gap and make Scout feel coherent, fast, and high quality.                                                        |
| Infrastructure & Engineering Systems | Own quality harnesses, E2E verification, reliability, developer velocity, and engineering systems.                                                 |
| Operations & TPM                     | Drive the last 10%: decisions, coordination, follow-through, launch readiness, and cross-workstream execution.                                     |
| Security                             | Provide embedded security depth across policy, permissions, marketplace, local execution, and M365 auth.                                           |
| Data Science & Insights              | Own instrumentation, usage/community signals, analysis, and product insights.                                                                      |
| Technical Community Manager          | Engage the 16k-person community, identify patterns, route issues, and surface extension opportunities.                                             |

## Primary opportunity briefs

1. [Extensibility and Feeds](extensibility-feeds.md): help finish Lobster Scout
   feeds, restore publisher feeds, and make MOS3 a real feed composition and
   distribution platform.
2. [Admin and Governance](admin-governance.md): collaborate on native MAC/MOS3 Scout
   availability, Partner Center/M365 integration, tenant/global controls,
   permissions, approvals, audit, and marketplace governance.
3. [Policy and Compliance](policy-compliance.md): extend Lobster policy
   enforcement and add durable, centrally visible compliance state, warnings,
   evidence, and remediation.

The role-based review and resulting revisions are recorded in
[Role Review](role-review.md).

## Shareable Word documents

These shorter executive documents are designed to be sent directly. Each one
contains enough context for recipients without repository access and points to
the corresponding detailed engineering brief as optional companion material.

- [Extensibility and Feeds Word brief](word/Extensibility-and-Feeds-Collaboration-Opportunities.docx)
- [Admin and Governance Word brief](word/Admin-and-Governance-Collaboration-Opportunities.docx)
- [Policy and Compliance Word brief](word/Policy-and-Compliance-Collaboration-Opportunities.docx)

The editable HTML sources and `build-word-docs.ps1` are kept in the same
directory so the `.docx` files can be regenerated after content changes.

The other image roles are natural partners across these three briefs: Frontend
helps shape the finished UX; Infrastructure supports E2E and reliability;
Operations drives decisions and rollout; Security reviews authorization and
enforcement boundaries; Data Science owns adoption/compliance signals; and
Community turns publisher-feed and marketplace activity into a contribution
loop.

## Suggested collaboration principles

- Audit current source and live state before choosing a slice. Do not assume an
  old PR body still matches `main`.
- Gio and current reviewers can transfer context or share ownership of viable
  branches. A stale branch can be replaced by a smaller PR against current
  `main` rather than being adopted wholesale.
- Preserve the boundary: OpenClaw owns generic runtime primitives; Lobster owns
  Microsoft hosting, MOS3/MAC integration, tenant composition, and the Scout
  product experience.
- Keep PRs independently reviewable and prove real behavior. For Lobster, the
  required gates are `GitOps/GitHubPop` and `Lobster-Runtime-PullRequest`.
- Do not enable production flags or broaden access until the stated E2E exit
  gates pass.
- Write down product or platform decisions instead of hiding uncertainty in
  implementation details. Escalate MOS3, MAC, Partner Center, and M365 auth
  prerequisites to their owning teams with exact app IDs, request IDs, and
  trace headers when available.
