# Trust Boundary

<!-- atom:openclaw-trust-boundary (OC-G05) -->

OpenClaw's trust model is a single boolean — `metadata.trusted` — defended
by a per-dispatch `WeakSet`. There is no JWT, no capability token, no
fine-grained per-claim attestation. The defense is structural: only metadata
objects that passed through the runtime dispatcher are recognized as
trusted, and a plugin can't forge that. Lightweight, but the small file has
a big footprint across the codebase.

---

## The gate

<!-- proof:compiled from="proof:tree kind=taxonomy" uri="" -->
```taxonomy
metadata.trusted gate
├── Producer side: emitTrustedDiagnosticEvent vs emitDiagnosticEvent
├── WeakSet anti-spoof: dispatchedTrustedDiagnosticMetadata holds passed-through objects
├── Object.freeze: listener metadata is frozen, mutation throws TypeError
├── Consumer side: if not metadata.trusted, return at the top of the handler
└── log.record exemption: log records bypass the trust filter for observability
```
<!-- /proof:compiled -->

Cite: `src/infra/diagnostic-events.ts:516, :633-637, :744-752`.

---

## Trusted vs untrusted producers

| Side | Function | Used by |
|------|----------|---------|
| trusted=true | `emitTrustedDiagnosticEvent()` | core runtime: harness, model call, run, tool execution, context assembly |
| trusted=false | `emitDiagnosticEvent()` | plugins, sandboxed processes, untrusted sources |

Plugins do not have access to `emitTrustedDiagnosticEvent()`. The trust
flag cannot be set externally — it is set by the dispatcher itself for
events it produces.

---

## Redaction surface

`redactSensitiveText()` lives at `src/logging/redact.ts:146-158`, re-exported
via `packages/plugin-sdk/src/security-runtime.ts:33`.

| Pattern class | Examples |
|---------------|----------|
| Env-style assignments | `KEY=...`, `TOKEN=...`, `SECRET=...`, `PASSWORD=...` |
| URL query params | `?access_token`, `?api_key`, `?secret` |
| JSON fields | `"apiKey"`, `"token"`, `"secret"`, `"password"` |
| CLI flags | `--api-key`, `--token`, `--password` |
| Authorization headers | `Authorization: Bearer ...`, standalone `Bearer <20+ chars>` |
| PEM blocks | `-----BEGIN/END PRIVATE KEY-----` whole-block |
| Token prefixes | `sk-`, `ghp_`, `github_pat_`, `xoxb-`, `gsk_`, `AIza`, `pplx-`, `npm_`, telegram bot ids |

Replacement: short tokens become `***`, long ones become `{first6}...{last4}`,
PEM blocks preserve first + last line and redact the interior. **This is
human-readable masking, not cryptographic destruction.**

---

## Cardinality + attribute caps

The diagnostics extensions cap attribute keys, values, count, and series
to prevent label explosion + abuse via crafted inputs.

| Cap | Value | Applies to |
|-----|-------|------------|
| `LOW_CARDINALITY_VALUE_RE` | `^[A-Za-z0-9_.:-]{1,120}$` | both OTel + Prometheus attribute values |
| `OTEL_LOG_ATTRIBUTE_KEY_RE` | `^[A-Za-z0-9_.:-]{1,96}$` | OTel log attribute keys |
| `MAX_OTEL_LOG_ATTRIBUTE_COUNT` | 64 | attrs per log record |
| `MAX_OTEL_LOG_ATTRIBUTE_VALUE_CHARS` | 4096 | chars per attr value |
| `MAX_OTEL_CONTENT_ATTRIBUTE_CHARS` | 4096 (4 KB) | content-class attrs |
| `MAX_PROMETHEUS_SERIES` | 2048 | hard cap, excess silently dropped |

`DROPPED_OTEL_ATTRIBUTE_KEYS` (always stripped before export):
`openclaw.callId`, `openclaw.runId`, `openclaw.sessionId`,
`openclaw.sessionKey`, `openclaw.spanId`, `openclaw.toolCallId`,
`openclaw.traceId`, `openclaw.parentSpanId`. Trace context propagates via
W3C traceparent (when authorized by the WeakSet check), but raw identifiers
never reach exported attributes.

---

## Prototype pollution guard

<!-- proof:compiled from="proof:tree kind=taxonomy" uri="" -->
```taxonomy
isBlockedObjectKey()
├── Blocked keys: __proto__, prototype, constructor
├── Producer side: diagnostic event enrichment, manifest provider IDs
├── Manifest normalization: every record-walker filters
└── Plugin loading: prevents prototype pollution via crafted manifest fields
```
<!-- /proof:compiled -->

Cite: `src/infra/prototype-keys.ts:1-5`. Three keys, every record-walker
checks the function. Easy to miss in new code paths.

---

## SecretRef pattern

Structured credential reference; decouples credential **location** from
credential **materialization**.

| Source | Resolution |
|--------|------------|
| `env` | environment variable lookup |
| `file` | filesystem path (e.g., `/providers/openai/apiKey`) |
| `exec` | subprocess execution result, with strict exec ID validation |

Resolved values **never** transit back into diagnostic events or OTel
exports. **OAuth-mode auth profiles cannot use SecretRef** — policy guard
at startup/reload.

---

## Sandbox boundary

| Origin | Trust on emitted events | Why |
|--------|-------------------------|-----|
| Gateway process (harness, tool execution wrapper) | trusted=true | dispatcher-stamped |
| Sandboxed subprocess output | trusted=false | comes through `docker exec` stdio |
| Plugin-emitted in any scope | trusted=false | plugins do not get trusted emit |

The sandbox-event boundary is enforced at the IPC seam. Sandboxed events
cannot hijack OTel propagation or influence cardinality budgets — they're
filtered at the consumer boundary and attribute sanitization layers.

---

## Related

- [`design/openclaw/trust-and-redaction.md`](../../../design/openclaw/trust-and-redaction.md) — full security checklist
- [`design/openclaw/diagnostic-event-stream.md`](../../../design/openclaw/diagnostic-event-stream.md) — bus + trust gate
- [`design/openclaw/sandbox.md`](../../../design/openclaw/sandbox.md) — trust at the sandbox IPC seam
- [02 Three channels](02-three-channels.md) — channel-specific trust posture
- [04 Turn anatomy](04-turn-anatomy.md) — when trust transitions in a turn
