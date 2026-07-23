# DEPRECATED — `@bic/openclaw-lkg`

**Superseded by**: [`@openclaw/lkg`](../lkg-recovery-substrate/)
**Status**: deprecating; do NOT import in new code
**Removal target**: after `v2-prototype` and `openclaw-lkg-git` migrate

## Why

The new `@openclaw/lkg` package is the upstream-shaped
prototype for the LKG contract that lands at `openclaw/openclaw` per
`lobster-docs/Tech/OpenClaw/specs/proposals/upstream/lkg-recovery/upstream-pr1-lkg.md`.
It carries:

- The same `LKGStore` / `LKGTracker<TParsed, TIssue>` contract
- A reference filesystem-backed impl (companion `.lkg` files +
  `.clobbered.<ts>` preservation, mirroring `recoverConfigFromLastKnownGood`)
- The per-kind reference tracker pack (`mdTracker` / `jsoncTracker` /
  `jsonlTracker` / `yamlTracker`) tied to the oc-paths workspace manifest
- A `registerOpenClawWorkspace(store, manifest)` consumer for the
  canonical openclaw artifact set
- Sentinel-guard, AbortSignal threading, err-message scrub, ocPath audit
  envelope integration, plus a complete W-NNN/L-NNN PITFALLS taxonomy

`@bic/openclaw-lkg` (this package) is the pre-restructure shape and
remains in the tree only because two consumers still import from it:

- `@bic/openclaw-lkg-git` (also deprecating; migrating to
  `@openclaw/lkg-git`)
- `@bic/v2-prototype` (dev/exploration sandbox; will migrate as part of
  the v2-prototype consolidation)

## Migration

Replace imports:

```ts
// before
import { FsLKGStore, type LKGTracker } from "@bic/openclaw-lkg";

// after
import { FsLKGStore } from "@openclaw/lkg/fs";
import type { LKGTracker } from "@openclaw/lkg";
```

The contract types are byte-compatible at the shape level; the new
package adds `ocPath?` threading, `signal?: AbortSignal` on
`LKGObserveOptions`, `requires.sdkVersion` on trackers, and the
`shouldRecover` snapshot's `parsed: TParsed` field. All optional /
backward-compatible.

For workspace-wide tracker registration, the new package ships
`registerOpenClawWorkspace(store, manifest)` and
`registerOpenClawWorkspaceFromDir(store, dir)` — see
`packages/lkg-recovery-substrate/src/trackers/openclaw-workspace.ts`.
