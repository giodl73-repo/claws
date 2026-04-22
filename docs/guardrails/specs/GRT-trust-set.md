# GRT — Trust set

**Sub-spec of**: [GR-guardrails.md](./GR-guardrails.md)

## Schema

```ts
interface TrustSet {
  readonly version: number;
  readonly keys: ReadonlyArray<TrustKey>;
  readonly loadedAt: number;
  readonly source: string;   // e.g. "file:///etc/claws/trust-set.json"
}

interface TrustKey {
  readonly id: string;           // keyId referenced by ApprovalHandle
  readonly material: string;     // base64-encoded HMAC key
  readonly principals: ReadonlyArray<string>;  // which approvers this key covers
  readonly notBefore: number;
  readonly notAfter: number;
}
```

The trust-set is the mapping from `keyId` → HMAC material used to
verify `ApprovalHandle.signature`. Without the trust set loaded,
guardrails rejects every handle as `unknown-key`.

## `fs.watch` reload

The trust set is reloaded from disk automatically when the source file
changes (detected via `fs.watch`). The reload is atomic:

1. Read the new file → parse → validate schema
2. Swap the in-memory reference (atomic in JS single-threaded model)
3. Write `TrustReloadEntry { success: true }` to the audit chain

If step 1 fails (malformed JSON, invalid schema), the in-memory
reference is NOT swapped. The existing trust set continues serving
requests. A `TrustReloadEntry { success: false, reason }` is written
to the chain.

See [../how-tos/reload-trust-set.md](../how-tos/reload-trust-set.md)
for the operator workflow.

## Reload failure modes

| Mode | Behaviour |
|------|-----------|
| File removed mid-watch | Existing set stays active; `TrustReloadEntry { success: false, reason: 'file-missing' }` |
| Parse error | Existing set stays active; `reason: 'parse-error'` |
| Schema violation (missing `notAfter`, etc.) | Existing set stays active; `reason: 'schema-invalid'` |
| All keys expired | New set LOADS (valid schema); every `ApprovalHandle` verification fails with `unknown-key` or `ttl-expired` |

The critical property: a malformed reload NEVER leaves guardrails
without a trust set. It leaves the PREVIOUS trust set active. This is
the fail-safe default.

## Never silently retry

The watcher does NOT retry a failed parse. If you want the reload to
take effect after fixing the file, touch the file again (the watcher
fires on every write). This is intentional — retry loops masked
real failures in prior designs.
