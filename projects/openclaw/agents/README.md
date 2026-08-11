# OpenClaw development agent catalog

This directory defines portable OpenClaw development **roles** and records
which hosts can materialize them. It does not store live OpenClaw state,
credentials, transcripts, or worktrees.

The canonical role list is `catalog.yaml`. Refer to a runtime instance as:

```text
<role-id>@<host-id>
```

For example:

```text
openclaw-builder@primary-wsl
openclaw-reviewer@team-cloud
openclaw-merger@primary-wsl
```

The role ID can be the same on several Gateways because each Gateway has its
own state. The qualified name is required in cross-machine notes.

## Initial roles

| Role | Purpose | Default write posture |
| --- | --- | --- |
| `openclaw-builder` | Investigate and implement one bounded OpenClaw task in an isolated worktree | Worktree write; public actions human-gated |
| `openclaw-reviewer` | Independently review a branch, evidence, and best-fix shape | Read-only |
| `openclaw-merger` | Run the complete maintainer-authorized prepare, verify, merge, and cleanup flow | PR-head write and merge mutation for one explicitly authorized PR |
| `openclaw-windows-validator` | Run Windows-native or Windows-node validation | Read-only unless the task explicitly authorizes a fix branch |

Keep the roster small. Add a role only when it needs a meaningfully different
workspace contract, tool policy, platform, or trust boundary. Create sessions
for individual issues and projects; do not create a new configured agent role
for each task.

## Merger contract

`openclaw-merger` owns one safety-critical landing transaction. It does not
mean "run the final merge command."

For one explicitly authorized PR, it must:

1. refresh and read the private `openclaw/maintainers` workflow;
2. verify live PR, review, ClawSweeper, proof, and required-check state;
3. use the maintainer sequence `review-pr -> prepare-pr -> merge-pr`;
4. run `scripts/pr-prepare run <PR>` when preparation is required;
5. rebase only when relevant main drift, a real conflict, required checks, or
   maintainer direction requires it;
6. run `scripts/pr-merge verify <PR>`;
7. pause for maintainer judgment when evidence, scope, or risk changed;
8. run `scripts/pr-merge run <PR>`;
9. confirm GitHub reports `MERGED`, then report merge SHA, attribution, comment,
   and cleanup outcome.

The role must not use `gh pr merge --auto`, push directly, merge without
head-SHA pinning, or treat wrapper success as a substitute for maintainer
judgment.

Do not split verifier or rebaser into separate roles yet. Verification and
rebase decisions affect the exact head that is authorized to merge and belong
inside the merger's transaction. `openclaw-reviewer` remains separate because
independent review is a useful trust boundary. Add narrower roles later only if
throughput data shows a real need and the artifact handoff stays deterministic.

## Portable definitions

The intended packaging mechanism is an OpenClaw **Claw**:

- `CLAW.md` carries the stable agent ID, portable identity, and workspace
  instructions.
- `profiles/openclaw.yml` carries the OpenClaw tool and memory policy.
- credentials, providers, bindings, host paths, and live memory stay local to
  each Gateway.

Claws are currently experimental. The catalog remains the stable source of
intent while the package schema evolves. A catalog entry must not claim a Claw
package is ready until `openclaw claws validate` and `openclaw claws dev`
succeed against the intended OpenClaw version.

## Hosts

`hosts.yaml` records non-secret host capabilities and stable IDs. It is an
inventory, not a remote-control surface.

Do not commit:

- Gateway tokens or URLs containing credentials;
- provider or channel credentials;
- absolute private data paths;
- raw machine logs;
- OpenClaw state directories;
- session transcripts.

## Claim tasks, not agents

A role is a reusable template and can be materialized on more than one host.
The exclusive unit is a **task checkout**.

Create one file under `claims/active/` from `claims/template.yaml` before
starting a writing session. The claim names:

- task or issue;
- role and host;
- repository and base ref;
- intended branch;
- session URL/key when available;
- claim time and expiry;
- current status.

The claim becomes active only after it is committed and pushed. Before starting
work, pull again and confirm no competing active claim appeared.

Git is coordination, not a distributed lock. If two claims race, stop both
writers and resolve ownership explicitly. Never merge competing work by letting
two agents continue to write the same branch or checkout.

Read-only review and validation sessions can share a task when they use
separate checkouts and the claim records their distinct role.

## Claim lifecycle

1. Pull the latest `claws-hapi` main branch.
2. Select a role from `catalog.yaml` and a compatible host from `hosts.yaml`.
3. Add and push an active claim.
4. Pull again and confirm the claim remains unique.
5. Create the OpenClaw session and managed worktree.
6. Add the session, worktree, branch, and head SHA to the claim.
7. Keep the claim current when ownership or status changes materially.
8. On closeout, move the claim to `claims/completed/` with its PR or terminal
   result, or delete an abandoned claim after recording why.

Claims should expire after 24 hours unless renewed. An expired claim does not
authorize another writer automatically: inspect the branch, session, and
worktree first, then record an explicit takeover.
