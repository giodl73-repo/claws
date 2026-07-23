---
covers: [atom:WSP/defence-in-depth]
---

# How-to: defence-in-depth with `oc://` URIs

The WSP defence-in-depth rule: every `oc://` URI passes through THREE
independent validation layers before it touches the filesystem. A
bug in one layer is caught by another.

## Quick reference

| Layer            | Where                                                         | Catches                                                                      |
| ---------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **1 · Parser**   | `parseOcUri(raw)`                                             | Syntactic vectors (traversal, drive letter, null byte, non-ASCII, BOM, etc.) |
| **2 · Provider** | `FileIngestProvider.beforeIngest` re-validates `redirectPath` | Provider-forged paths                                                        |
| **3 · Runtime**  | `resolveFsPath(ocPath, workspaceRoot)`                        | Symlink escape, TOCTOU                                                       |

## Pattern: accept an `oc://` from untrusted input

```ts
import { parseOcUri, resolveFsPath, OcPathError } from "@bic/openclaw-workspace/path";

function safeOpen(raw: string, workspaceRoot: string): Uint8Array {
  // Layer 1
  const ocPath = parseOcUri(raw);
  // Layer 3
  const abs = resolveFsPath(ocPath, workspaceRoot);
  return fs.readFileSync(abs);
}
```

Note: layer 2 applies when the input comes from a provider — see
[../../guardrails/specs/GRF-file-ingest.md § redirectPath invariant](../../guardrails/specs/GRF-file-ingest.md).

## Pattern: never skip a layer

```ts
// ✗ WRONG — skips layer 3; caches the resolved path across requests
const cache = new Map<string, string>();
function openCached(raw: string, root: string) {
  if (!cache.has(raw)) {
    cache.set(raw, resolveFsPath(parseOcUri(raw), root));
  }
  return fs.readFileSync(cache.get(raw)!); // TOCTOU: attacker may have swapped target
}

// ✓ CORRECT — re-resolve every time
function openAlways(raw: string, root: string) {
  return fs.readFileSync(resolveFsPath(parseOcUri(raw), root));
}
```

`resolveFsPath` is fast. Re-running it on every syscall is cheaper
than the TOCTOU attack surface you open by caching.

## When to add a fourth layer

If your code path is security-sensitive beyond file IO (e.g., paying
money, granting permissions), consider adding a FOURTH layer at the
business-logic boundary: re-verify the resolved filesystem owner,
content hash, or signing key matches an expected value. See
`guardrails/specs/GRH-approval-handle.md` for the 7-tuple binding
that does this for approval handles.
