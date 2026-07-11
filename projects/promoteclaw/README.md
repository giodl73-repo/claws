# PromoteClaw Project

Use this area for the Lobster process that regularly promotes the OpenClaw
version baked into the Lobster OpenClaw container.

PromoteClaw is not Scout feed work. It tracks the upstream OpenClaw release
candidate that clears Galin's 7-day LTS/quarantine feed, then prepares the
Lobster PR that bumps the pinned OpenClaw version and carries forward only the
Lobster patches still needed on that release.

## Active Notes

| Area | File |
| --- | --- |
| Session handoff | `SESSION.md` |
| Feed discovery | `feed-discovery.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| `bic/lobster` | TBD | TBD | Planning | Regularly update `src/openclaw_container` to the latest quarantine-cleared OpenClaw release. |

## Promotion Process

1. Read Galin's LTS/quarantine feed and identify the newest OpenClaw release
   that has cleared the 7-day hold.
2. Compare that release with Lobster's current pin in
   `src/openclaw_container/package.json`.
3. If a newer acceptable release exists, create a Lobster branch and bump:
   - `src/openclaw_container/package.json` `openclaw`
   - related OpenClaw packages such as `@openclaw/diagnostics-otel` when they
     follow the same release train
   - `src/openclaw_container/Dockerfile` `OPENCLAW_SRC_REF`
   - patch documentation base tags
   - upstream hash files for templates/docs overlays
4. Validate the Lobster patch set:
   - check whether each Lobster patch is already upstream in the target release;
   - drop patches that are fully upstream;
   - reapply/rebase leftover Lobster-only patches onto the new tag;
   - keep patch numbering and README descriptions current;
   - run the patch drift gate.
5. Run focused OpenClaw container validation:
   - package install/build checks;
   - OpenClaw image build path;
   - Gateway startup smoke;
   - brokered Teams/msteams patch smoke;
   - version visibility proof;
   - any release-specific regression checks.
6. Open/update the Lobster PR with:
   - target OpenClaw version;
   - quarantine-feed evidence and age;
   - patch carry-forward/drop summary;
   - validation proof;
   - known risks and rollback plan.

## Guardrails

- Do not promote a release before the 7-day quarantine clears unless Omar/Galin
  explicitly approve an exception.
- Do not blindly replay all patches. First verify whether each patch landed
  upstream; carry forward only what remains necessary.
- Do not fake a green promotion when patch drift or image build validation is
  blocked.
- Do not manually queue Lobster ADO while pools are exhausted unless the user
  explicitly names the PR/branch and asks for it.

## Related Areas

- `projects/lobster/README.md`
- `projects/prs/README.md`
- `projects/feeds/README.md`
