# PR Drafts (claws side)

**Source of truth lives in lobster-docs**, not here.

The canonical upstream proposal drafts are at:

```
/c/src/lobster-docs/project-lobster-vault/Tech/OpenClaw/specs/proposals/upstream/
```

…on branch `proposals/upstream-restructure-workspace-and-policy`.

## What lives where

| Package | Drafts (in lobster-docs) | Code (here in claws) |
|---|---|---|
| **oc-paths** | `oc-paths/upstream-pr1-workspace.md`, `pr2-oclint.md`, `pr3-ocdoctor.md` | `packages/oc-paths-{substrate,lint,doctor}/` |
| **lkg-recovery** | `lkg-recovery/upstream-pr1-lkg.md`, `pr2-lkg-git.md` | `packages/lkg-recovery-{substrate,git}/` |
| **policy-anchoring** | `policy-anchoring/upstream-pr1-policyir.md`, `pr2-hook-merger.md` | `packages/openclaw-policy/` |

## Why this directory still exists

Wave-internal drafts that don't (yet) belong in the public proposal
stack live here:

- `v2-lkg-contract.md` / `v2-policy-ir.md` — older drafts predating the
  3-package restructure. Kept for diff context; do not file.
- `superseded/` — every prior draft, named to explain why it was
  retired. New drafts that get superseded land there with the same
  naming convention (`<orig-name>-<reason>.md`).

## When to update which side

- **Implementation lands** → claws `packages/` + tests.
- **Implementation behavior changes the contract** → update the
  matching `lobster-docs` proposal draft.
- **Wave-internal scratch / WIP** → here.

If a doc you'd put here would also belong upstream, write it in
lobster-docs first and link from here.
