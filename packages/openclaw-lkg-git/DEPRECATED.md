# DEPRECATED — `@bic/openclaw-lkg-git`

**Superseded by**: [`@bic/lkg-recovery-git`](../lkg-recovery-git/)
**Status**: deprecating; do NOT import in new code
**Removal target**: after `v2-prototype` migrates

## Why

`@bic/lkg-recovery-git` is the upstream-shaped prototype for the
git-backed LKG impl that lands at `openclaw/openclaw` per
`lobster-docs/Tech/OpenClaw/specs/proposals/upstream/lkg-recovery/upstream-pr2-lkg-git.md`.
It implements the same `LKGStore` contract as the FS-backed reference,
plus:

- Sentinel-guard defense-in-depth on HEAD bytes (refuses to restore
  from a poisoned commit)
- AbortSignal threading through observe + readLastKnownGood
- Error-message scrub on parse / validate throws
- ocPath audit-envelope integration
- Bounding-box round-trip across md/jsonc/jsonl/yaml
- G-NNN PITFALLS taxonomy

Only consumer remaining: `@bic/v2-prototype` (dev/exploration sandbox).

## Migration

Replace imports:

```ts
// before
import { GitLKGStore } from '@bic/openclaw-lkg-git';

// after
import { GitLKGStore } from '@bic/lkg-recovery-git';
```

The contract types are byte-compatible at the shape level; the new
package adds `ocPath?` threading, `signal?: AbortSignal`, `requires`,
and the `parsed` field on `shouldRecover`. All optional /
backward-compatible.

The low-level `git` / `gitBinary` invokers are NOT exported from the
new package (D1 surface narrowing). Callers that need to shell out to
git directly use `node:child_process` (or a vetted wrapper) directly.
