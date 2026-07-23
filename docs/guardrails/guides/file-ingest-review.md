---
covers: [atom:GRF]
---

# File-ingest review (package view)

The authoritative walkthrough lives at
[../../governance/file-ingest-review.md](../../governance/file-ingest-review.md).
This page is a package-scoped summary for `FileIngestProvider` authors.

## When `beforeIngest` runs

```
    oc://ws/skills/new.md  ──read──▶  host ──before_workspace_file_ingest──▶  beforeIngest
                                                                                   │
                                                                                   ├─▶ allow
                                                                                   ├─▶ deny
                                                                                   ├─▶ review (+ handle)
                                                                                   └─▶ modify (+ redirectPath)
```

`beforeIngest` runs BEFORE the bytes are read. Providers that need
content return `review` and receive the content on the supervisor
side, not in `beforeIngest`. See [GRF § Stage lifecycle](../specs/GRF-file-ingest.md).

## The `redirectPath` invariant

If a provider returns `{ kind: 'modify', redirectPath: 'oc://...' }`:

1. Runtime re-parses `redirectPath` with `parseOcUri` (12 rejection
   vectors, see `../../workspace/specs/WSP-path.md`)
2. Runtime re-resolves with `resolveFsPath(redirectPath,
workspaceRoot)` (symlink escape check)
3. If either step fails, the redirect is discarded, the ingest is
   denied, and a `DecisionEntry` with
   `invalidReason: 'redirect-path-escape'` is written to the chain

The runtime NEVER trusts provider path output. See
[../pitfalls/path-and-binding.md § P-03](../pitfalls/path-and-binding.md).

## Post-ingest stage

`postIngest(ctx, bytes)` runs after successful ingest with bytes
available. DLP scanners, classifiers, and provenance taggers go here.
Failures in `postIngest` do NOT roll back the ingest (the bytes are
already on disk) — they emit a `DecisionEntry` with the finding and
let downstream consumers decide.

## Cross-references

- [../specs/GRF-file-ingest.md](../specs/GRF-file-ingest.md) — full
  interface + lifecycle
- [../specs/GRG-guardrail-provider.md](../specs/GRG-guardrail-provider.md) —
  peer tool-call path
- [../../workspace/specs/WSP-path.md](../../workspace/specs/WSP-path.md) —
  the 12 URI rejection vectors re-validated at Layer 2
- [../../governance/file-ingest-review.md](../../governance/file-ingest-review.md) —
  full walkthrough
