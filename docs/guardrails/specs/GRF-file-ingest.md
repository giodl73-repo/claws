# GRF — `FileIngestProvider` interface

**Sub-spec of**: [GR-guardrails.md](./GR-guardrails.md) · **Absorbs**: CL-07 Amendment A

## Interface

```ts
interface FileIngestProvider {
  readonly id: string;
  beforeIngest(ctx: IngestContext): Promise<HookResult>;
  postIngest(ctx: IngestContext, bytes: Uint8Array): Promise<void>;
}

interface IngestContext {
  readonly path: string; // oc:// URI
  readonly originalPath: string; // fs path as seen by host
  readonly size: number;
  readonly contentType: string | null;
  readonly caller: Principal;
  readonly snapshotId: string;
  readonly policyArtifactSha256: string;
  readonly correlationId: string;
  readonly host: HostContext;
}
```

## Decision vocabulary

Same four-verb vocabulary as `GuardrailProvider.preAuthorize`. Same
composition rule (deny > review > modify > allow).

For file ingest, `modify` carries a `redirectPath`:

```ts
{ kind: 'modify', redirectPath: 'oc://reviewed/<sha>/<name>' }
```

## `redirectPath` invariant

**Non-negotiable**: every `redirectPath` returned by a provider is
re-validated by the runtime with `parseOcUri` before any filesystem
syscall. Providers that forge a `redirectPath` with traversal sequences
or symlink targets do NOT bypass the workspace boundary.

Re-validation steps:

1. `parseOcUri(redirectPath)` → reject if malformed (12 rejection vectors, see
   `workspace/specs/WSP-path.md`).
2. `resolveFsPath(redirectPath, workspaceRoot)` → reject if symlink
   escapes workspace root.

If either step fails, the runtime raises `OcPathError`, does NOT apply
the redirect, AND emits a `DecisionEntry` with
`invalidReason: 'redirect-path-escape'` to the audit chain (see
[GRA-audit-chain.md](./GRA-audit-chain.md)).

See [../pitfalls/path-and-binding.md](../pitfalls/path-and-binding.md)
for the P-03 attack this invariant defeats.

## Stage lifecycle

`beforeIngest` runs BEFORE the bytes are read from disk. Providers that
need content (for scanning, classification, signing) return `review`
and receive the content on the supervisor side, NOT in `beforeIngest`.
This prevents providers from reading arbitrary bytes during
pre-authorization.

`postIngest` runs AFTER the bytes are successfully ingested and has
the bytes available. Postlaunch providers (DLP scanning, classification
tagging) use this stage.
