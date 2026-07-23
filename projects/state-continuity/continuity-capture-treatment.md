# Continuity Capture Treatment

## Decision

Archived must use a dedicated capture treatment built on the native backup
substrate. It must not relabel or restore an ordinary backup archive.

The dedicated path stays simple for operators:

```text
continuity.level = archived
  -> classify required state
  -> capture owner snapshots
  -> remove external/reconstructable credential state from copies
  -> reject unresolved inputs
  -> publish one immutable recovery point
```

The complexity remains inside OpenClaw because only OpenClaw can distinguish
authoritative state, reconstructable state, and external dependencies.

## Source-Backed Treatment

| Surface                                          | Continuity treatment              | Required behavior                                                                                                                                         |
| ------------------------------------------------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global `auth_profile_stores`                     | External                          | Delete from the copied SQLite snapshot. Never mutate the live database.                                                                                   |
| Per-agent `auth_profile_store`                   | External                          | Delete from the copied SQLite snapshot. Re-resolve credentials through the configured owner on restore.                                                   |
| Global/per-agent `auth_profile_state`            | Reconstructed                     | Delete from copied snapshots and rebuild profile order, last-good, cooldown, and failure metadata from available destination profiles.                    |
| OAuth credentials directory                      | External                          | Omit the directory from continuity capture even when it is beneath the state root.                                                                        |
| Root config and included fragments               | Captured with external references | Preserve valid SecretRefs and environment placeholders exactly; reject literal sensitive values. Enumerate and classify the complete `$include` closure.  |
| SQLite session/transcript rows                   | Captured                          | Use the native per-agent SQLite snapshot.                                                                                                                 |
| Legacy `.jsonl`/`.log` transcripts               | Blocking                          | Fail continuity capture when authoritative legacy transcript files remain. Do not run Doctor migration as a checkpoint side effect.                       |
| Current outbound/session delivery queues         | Captured                          | Capture authoritative queue rows through the shared SQLite snapshot.                                                                                      |
| Legacy delivery-queue JSON and delivered markers | Blocking                          | Fail continuity capture until the existing migration moves authoritative entries into shared SQLite. Do not silently apply the volatile backup exclusion. |
| Installed plugin source and manifest             | Captured                          | Preserve plugin-owned source and manifest files plus the shared SQLite install index.                                                                     |
| Installed plugin dependency trees                | Reconstructed                     | Keep excluding `extensions/**/node_modules`; record a plugin-owner reinstall/readiness obligation rather than claiming the plugin is runnable.            |
| Logs, sockets, PIDs, and temp files              | Ephemeral                         | Keep existing backup exclusions and recreate only through normal owner startup.                                                                           |

## Why Redacted Config Is Not A Restore Artifact

`redactConfigSnapshot` is a diagnostics/UI boundary. It deliberately replaces
literal secrets and SecretRef IDs with `__OPENCLAW_REDACTED__`, and may discard
raw text when safe textual redaction cannot be proved. The write path can
restore those placeholders only because it still has the original live config.

A recovery artifact does not have that original. Serializing the redacted
snapshot would therefore lose the SecretRef identity needed for destination
resolution and could not support a clean restore.

Continuity must instead classify the authored config:

1. preserve canonical SecretRef objects and supported environment placeholders;
2. reject literal sensitive values rather than redact and continue;
3. enumerate `$include` files through the existing guarded include resolver;
4. reject unresolved plugin/extension sensitivity metadata; and
5. record external secret dependencies without placing secret bytes in the
   manifest.

## Failure Posture

Capture remains blocked when any of these are true:

- a legacy transcript file is authoritative;
- an OAuth or auth-store exclusion cannot be proved on the copied artifact;
- a config-sensitive value is literal;
- the complete include closure is unavailable or escapes its allowed roots;
- plugin sensitivity metadata is unavailable;
- copy sanitation or post-sanitation verification fails.

No blocker may be converted into a warning. Ordinary backup behavior remains
unchanged.

## Smallest Implementation Sequence

1. Add a read-only config dependency classifier that distinguishes SecretRefs,
   environment placeholders, literal sensitive values, include closure, and
   unknown plugin metadata.
2. Add copy-only SQLite sanitation with post-sanitation row-count proof for all
   global and per-agent auth tables.
3. Add a continuity-specific archive plan that omits OAuth paths even when
   nested under state and rejects legacy transcripts.
4. Replace the current ordinary-backup blockers only when the resulting
   artifact independently proves each exclusion.

## Disproof Gate

Do not implement continuity archive creation if owner schema metadata cannot
classify every captured config fragment without resolving secret bytes. In that
case Archived remains ineffective and the blocker stays visible.
