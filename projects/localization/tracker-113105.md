RFC 0024 has product-direction approval and is driving implementation.

RFC: https://github.com/openclaw/rfcs/pull/42
Progressive delivery guidance: https://github.com/openclaw/rfcs/pull/49

## Goal

Adopt one localization contract while preserving surface ownership: one `LocalizationContext`, locale-invariant machine semantics, owner-local catalogs/rendering, shared per-repository validation and authoring machinery, and trusted translation refresh.

## Contributor loop

1. A contributor opens a ready PR with a reviewed English product-string change.
2. The credential-free gate identifies its registered owner surface and fails with the exact missing or stale locale targets.
3. For a same-repository PR targeting the default branch, a maintainer dispatches protected-`main` tooling against the exact PR head.
4. Trusted automation validates and commits one generated translation batch back to that unchanged PR under an exact-head lease.
5. The same PR reruns strict checks and merges only after required review.
6. Forks and cross-repository sources use one isolated generated follow-up PR because their branches cannot be updated safely.

Automation never approves or merges its output and never executes PR-supplied workflow code, scripts, actions, or dependencies with credentials.

## Delivery model

- Reuse one shared catalog gate, surface-disposition gate, and trusted refresh/publish workflow per repository; do not create one gate per owner slice.
- Each bounded slice registers its owner source in `localization/surfaces.json` and records an adopted catalog, conforming owner pipeline, or explicit blocker.
- Count an entry complete only after its owner runtime/artifact, required generated targets, validation, evidence, and named review land.
- Keep error codes, commands, identifiers, paths, structured output, and user-authored content locale-invariant.
- Require owner approval for Gateway metadata, safety copy, command/skill/plugin schema additions, and recipient-locale authority.

## Progressive implementation stack

1. Runtime foundation: #111541
2. Contributor ownership contract: #111543
3. Catalog gate and same-PR trusted refresh exemplar: #112784
4. New-surface disposition gate: #112801
5. Initial independent owner slices after the shared gates: updater #111542, TUI #111544, and Gateway/Control UI #111545
6. First bounded wizard owner slice: post-install migration offer #113427

These contributor branches are cumulative fork PRs targeting `main`, so a downstream PR temporarily includes its unmerged prerequisites. Review and land one dependency at a time, then restack the next branch onto current `main` and rerun its exact-head proof. This keeps every merged step usable while presenting each owner’s unique delta for final review.

## Initial rollout gate

After the authoring exemplar lands, supervise one maintainer-owned same-repository fixture PR through the complete loop: English drift fails the ready-PR gate, trusted protected-`main` refresh updates that exact PR head, strict checks turn green, and a human merges the combined English-plus-translation unit. Also prove the isolated generated-follow-up fallback once. Do not advance the next owner package if either publication path violates its lease, staging, validation, or review contract.

The projected registry contains 47 delivery slices grouped into 16 packages. Product completion remains 15 required surfaces × 21 translation targets = 315/315 complete cells.

Target roadmap completion: September 1, 2026.
