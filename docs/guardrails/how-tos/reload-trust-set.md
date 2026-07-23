---
covers: [atom:GRT/fs-watch-reload]
---

# How-to: safely reload the trust set

The trust set (see [../specs/GRT-trust-set.md](../specs/GRT-trust-set.md))
watches its source file via `fs.watch` and reloads on every change.
Most of the time this is automatic. This guide covers the cases where
operators need to intervene.

## Automatic reload

1. Edit the trust-set file on disk (new keys, removed keys, revised
   `notAfter`).
2. `fs.watch` fires a change event.
3. Guardrails parses + validates the new file.
4. **Success path**: atomic in-memory swap, `TrustReloadEntry { success:
true }` appended to the audit chain. Next `ApprovalHandle`
   verification uses the new keys.
5. **Failure path**: existing trust set stays active,
   `TrustReloadEntry { success: false, reason }` appended. Next
   handle still verifies against the OLD keys.

## Watch for failure reasons

Grep the audit chain:

```bash
grep '"type":"trust-reload"' /var/log/claws/audit.ndjson \
  | jq 'select(.success == false)'
```

Common reasons: `parse-error` (JSON malformed), `schema-invalid`
(missing required field), `file-missing` (deleted before we could
read it), `all-keys-expired` (loaded OK but no key passes the
`notAfter` check against current time).

## Force a reload without editing

`fs.watch` fires on every write, not every content change. To force a
reload of the existing file content, `touch` it:

```bash
touch /etc/claws/trust-set.json
```

The watcher fires; the parser re-reads identical content; the swap
is a no-op (same bytes → same keys). `TrustReloadEntry { success: true,
changed: false }` is appended. Useful for confirming the watcher is
alive.

## Watcher outage

If `fs.watch` itself stops firing (platform-specific; seen on NFS and
on some Windows file-sharing drivers), edits to the trust set will
NOT reload. Guardrails does NOT poll as fallback — it relies on the
watcher.

Detection: the audit chain shows no `TrustReloadEntry` in a window
you know had edits. Mitigation: restart the host process; trust set
loads fresh on boot.

## Never silently retry

A failed parse does NOT retry automatically (by design — retry loops
mask real errors). To try again after fixing the file, save it again;
the watcher fires fresh.

See [../pitfalls/path-and-binding.md § Trust-set hot-reload](../pitfalls/path-and-binding.md)
for the retry-loop anti-pattern this policy prevents.
