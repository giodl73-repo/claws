---
covers: [atom:WSP, atom:WSP/defence-in-depth]
---

# URI handling: defence-in-depth

`oc://` URIs look like filesystem paths, but they are NOT filesystem
paths. They are symbolic references into the workspace tree. Treating
them as paths — passing them to `fs.readFile()` or `path.join()`
directly — defeats the isolation `oc://` gives you.

## The three layers

Every `oc://` reference passes through three validation layers before
it touches the filesystem.

### Layer 1: parser

```ts
import { parseOcUri, OcPathError } from "@bic/openclaw-workspace/path";

try {
  const ocPath = parseOcUri(userInput);
} catch (e) {
  if (e instanceof OcPathError) {
    console.error(`rejected: ${e.reason}`);
  }
}
```

The parser catches malformed input (traversal, null bytes, non-ASCII,
etc.) before it becomes an `OcPath` object. If you accept `oc://`
strings from any untrusted source (user input, plugin output, HTTP
request), always route them through `parseOcUri` first.

## Layer 2: provider

If your code accepts an `oc://` redirect from a plugin (e.g.,
`FileIngestProvider.beforeIngest` returning a `redirectPath`), **do
not trust the plugin's output**. Re-validate:

```ts
const result = await provider.beforeIngest(ingestContext);
if (result.modify?.redirectPath !== undefined) {
  // Never trust plugin output — re-parse.
  const validatedPath = parseOcUri(result.modify.redirectPath);
  // ... proceed with validatedPath
}
```

This is the P-03 mitigation from `guardrails/pitfalls/path-and-binding.md`.

## Layer 3: runtime

Before any actual syscall, `resolveFsPath(ocPath, workspaceRoot)`
resolves the `oc://` path to an absolute filesystem path and asserts
the result is strictly under `workspaceRoot`:

```ts
const abs = resolveFsPath(ocPath, workspaceRoot);
// If ocPath follows a symlink that escapes workspaceRoot,
// resolveFsPath throws OcPathError { reason: 'symlink-escape' }.
```

The symlink check is the last line of defence against a TOCTOU attack
where an attacker swaps a benign target for a symlink mid-decision.

## Summary rule

> An `oc://` URI is trusted only after parseOcUri + resolveFsPath
> have both succeeded, on every layer that sees it.

If you skip a layer — say, caching the `OcPath` object across requests
and reusing it without re-resolving — you lose the TOCTOU guarantee.
See [../pitfalls/path-handling.md](../pitfalls/path-handling.md) for the
failure mode.
