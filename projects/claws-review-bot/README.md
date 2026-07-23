# Claws Review Bot Project

Use this area for project/session notes around the existing
`@bic/claws-review-bot` package.

The package already has a primary job: Lobster PR review through
`claws-review-bot-job`. The ClawPilot issue classifier is a separate,
experimental lane for focused issue-assessment comments and should not be
confused with the main Lobster reviewer behavior.

## Anchors

| Name       | Value                       |
| ---------- | --------------------------- |
| Package    | `@bic/claws-review-bot`     |
| Local path | `packages/claws-review-bot` |
| Azure job  | `claws-review-bot-job`      |

## Active Notes

| Area                    | File         |
| ----------------------- | ------------ |
| Session handoff         | `SESSION.md` |
| Initial operating rules | `rules.md`   |

## Active Work

| Repo          | Scope            | Status      | Purpose                                                                        |
| ------------- | ---------------- | ----------- | ------------------------------------------------------------------------------ |
| `bic/lobster` | Lobster PRs      | primary     | Main reviewer lane for PR assessment.                                          |
| `gim-home/m`  | ClawPilot issues | exploratory | Define a narrow issue-classifier lane for issue quality and regression triage. |

## Related Areas

- `packages/claws-review-bot/README.md`
- `.agents/maintainer-notes/claws-review-bot-azure.md`
- `projects/clawpilot/README.md`
- `projects/prs/README.md`
- `.agents/skills/clawpilot-issue-loop/SKILL.md`
