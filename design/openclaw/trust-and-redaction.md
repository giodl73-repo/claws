---
name: trust-and-redaction
description: Cross-cutting catalog of every trust gate, redaction pattern, cardinality cap, and prototype-pollution guard in openclaw-core
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Trust and redaction

## Why a cross-cutting spec

Trust and redaction are *not* one feature; they're a **pattern repeated
in many places**. The diagnostic event stream has its trust flag. The
diagnostics extensions have their cardinality caps. The manifest loader
has its prototype-pollution guards. The logging engine has its secret
redaction. Each has its own page; this spec is the *checklist* — the
single place a contributor consults before touching any code path that
handles event payloads, attributes, manifest fields, or user input.

## Trust gate — `metadata.trusted`

The boundary that separates core-runtime telemetry from plugin-emitted
telemetry on the diagnostic event stream
([`diagnostic-event-stream.md`](diagnostic-event-stream.md) covered the
event surface; this spec catalogues the gates).

### Producer side — `emitTrustedDiagnosticEvent()` callers

`src/infra/diagnostic-events.ts:723-725`. Trusted-only callers (i.e.,
events with `metadata.trusted = true`):

| Subsystem | File |
|---|---|
| Harness lifecycle | `src/agents/harness/v2.ts` |
| Model call diagnostics | `src/agents/pi-embedded-runner/run/attempt.ts`, `attempt.model-diagnostic-events.ts` |
| Tool execution | `src/agents/pi-tools.before-tool-call.ts` |
| Auto-reply runner | `src/auto-reply/reply/agent-runner.ts` |

Plugins do **not** call this function. Untrusted callers use
`emitDiagnosticEvent()` (`:719-721`) which sets `trusted: false`.

### Consumer side — filtering pattern

The public `onDiagnosticEvent()` listener at `:735-741` excludes trusted
events:

```ts
export function onDiagnosticEvent(listener) {
  return onInternalDiagnosticEvent((event, metadata) => {
    if (metadata.trusted || event.type === "log.record") return;
    listener(event);
  });
}
```

**Note the `log.record` exemption** — log records flow through regardless
of trust. Likely intentional for observability but worth auditing if you
care about strict isolation.

### WeakSet anti-spoof

`src/infra/diagnostic-events.ts:516, :633-637`:

```ts
const dispatchedTrustedDiagnosticMetadata = new WeakSet<object>();

function createDiagnosticMetadataForListener(metadata) {
  const listenerMetadata = Object.freeze({ ...metadata });
  if (listenerMetadata.trusted) {
    dispatchedTrustedDiagnosticMetadata.add(listenerMetadata);
  }
  return listenerMetadata;
}
```

Used at `:744-752` in `formatDiagnosticTraceparentForPropagation`:

```ts
if (!metadata.trusted || !dispatchedTrustedDiagnosticMetadata.has(metadata)) {
  return undefined;
}
return formatDiagnosticTraceparent(event.trace);
```

**A caller cannot fabricate a metadata object claiming `trusted: true`
and have it bypass the gate.** Real trust comes from the dispatcher
itself, recorded in the WeakSet at the moment of dispatch.

This is a small but high-leverage pattern. Any future cross-cutting
trust check on the claws side should replicate it.

### Object.freeze immutability

Listener metadata is frozen (`:633-637`). Listeners cannot mutate it
to escalate trust. Mutation throws a `TypeError`.

## Redaction engine — `redactSensitiveText`

Implementation: `src/logging/redact.ts:146-158`. Public re-export via
`packages/plugin-sdk/src/security-runtime.ts:33`.

### Default patterns (`redact.ts:13-45`)

| Class | Examples |
|---|---|
| Env-style assignments | `KEY|TOKEN|SECRET|PASSWORD|PASSWD` with `=` or `:` |
| URL query params | `?access_token`, `?api_key`, `?secret`, `?password`, … |
| JSON fields | `"apiKey"`, `"token"`, `"secret"`, `"password"` in object literals |
| CLI flags | `--api-key VALUE`, `--token VALUE`, `--password VALUE` |
| Authorization headers | `Authorization: Bearer <token>`; standalone `Bearer <20+>` |
| PEM blocks | full `-----BEGIN/END PRIVATE KEY-----` blocks |
| Token prefixes | `sk-` (OpenAI), `ghp_` / `github_pat_` (GitHub PAT), `xox[baprs]-` / `xapp-` (Slack), `gsk_` (Anthropic), `AIza` (Google), `pplx-` (Perplexity), `npm_`, Telegram bot IDs `bot\d{6,}:...` |

### Masking (`redact.ts:84-111`)

| Length | Output |
|---|---|
| PEM block | preserve first + last line, interior `…redacted…` |
| Short token (<18 chars) | `***` |
| Long token | `{first6}…{last4}` (e.g., `sk-1Xpq99…7xQz`) |

**This is a human-readable hint, not a cryptographic destruction.** Do
not assume redacted output safely contains zero secret material. Use
real key destruction (zeroize) for credentials in memory.

### Configuration

`logging.redactSensitive` resolved at `redact.ts:123-129`:

| Value | Behavior |
|---|---|
| `"tools"` (default) | Redaction active on tool payloads + UI surfaces. |
| `"off"` | No redaction. |

Composable surfaces:

| Function | Purpose |
|---|---|
| `redactSensitiveText(text, opts?)` | Standalone redaction with optional override. |
| `redactToolDetail(detail)` | UI surface, respects config. |
| `redactToolPayloadText(text)` | Forces tools-mode and merges user patterns with defaults (`:171-182`). |
| `redactSensitiveLines(lines[], resolved)` | Batch with pre-resolved options. |

## Cardinality and attribute-shape controls

The diagnostics extensions (and downstream observability surfaces) cap
attribute keys, values, count, and series to prevent label explosion and
abuse via crafted inputs.

### OpenTelemetry — `extensions/diagnostics-otel/src/service.ts`

| Constant | Cite | Value | Purpose |
|---|---|---|---|
| `LOW_CARDINALITY_VALUE_RE` | `:42` | `/^[A-Za-z0-9_.:-]{1,120}$/u` | Reject control chars / newlines / weird strings; max 120 chars. |
| `OTEL_LOG_ATTRIBUTE_KEY_RE` | `:50` | `/^[A-Za-z0-9_.:-]{1,96}$/u` | Keys ≤ 96 chars. |
| `MAX_OTEL_LOG_ATTRIBUTE_COUNT` | `:46` | 64 | Max attrs per log record. |
| `MAX_OTEL_LOG_ATTRIBUTE_VALUE_CHARS` | `:47` | 4096 | Max chars per attr value. |
| `MAX_OTEL_CONTENT_ATTRIBUTE_CHARS` | `:43` | 4096 (4 KB) | Max for content-class attrs. |
| `DROPPED_OTEL_ATTRIBUTE_KEYS` | `:32-41` | set | High-cardinality identifiers dropped before export. |

`DROPPED_OTEL_ATTRIBUTE_KEYS` content: `openclaw.callId`,
`openclaw.parentSpanId`, `openclaw.runId`, `openclaw.sessionId`,
`openclaw.sessionKey`, `openclaw.spanId`, `openclaw.toolCallId`,
`openclaw.traceId`. Internal trace bookkeeping never lands in OTel
attrs — only redacted span context propagation.

`redactOtelAttributes()` (`:164-173`) and `lowCardinalityAttr()` (`:175-181`)
orchestrate the drops + redaction.

### Prometheus — `extensions/diagnostics-prometheus/src/service.ts`

| Constant | Cite | Value | Purpose |
|---|---|---|---|
| `LOW_CARDINALITY_VALUE_RE` | `:49` | `/^[A-Za-z0-9_.:-]{1,120}$/u` | **Identical to OTel.** |
| `MAX_PROMETHEUS_SERIES` | `:50` | 2048 | Hard cap. Excess silently dropped, counted in `openclaw_prometheus_series_dropped_total` (`:107-119`). |
| `safeErrorMessage()` | `:210-216` | function | Redacts → strips null bytes → normalizes line breaks → caps 500 chars. |
| `lowCardinalityLabel()` | `:53-59` | function | Apply regex + `redactSensitiveText` before labeling. |

Both extensions share the cardinality regex value (good — consistent).
The 2048-series cap is the bigger pin.

## Prototype pollution guards

`src/infra/prototype-keys.ts:1-5`:

```ts
const BLOCKED_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function isBlockedObjectKey(key: string): boolean {
  return BLOCKED_OBJECT_KEYS.has(key);
}
```

Three keys, every place that walks object input checks the function.

### Producer-side application

| Site | Cite | Purpose |
|---|---|---|
| Diagnostic event enrichment | `src/infra/diagnostic-events.ts:686-690` | Skip blocked keys when cloning user-supplied event input. |
| Manifest provider IDs | `src/plugins/manifest.ts:424-425` | Skip blocked provider IDs in manifest normalization. |
| Manifest record normalization | manifest.ts (multiple) | `normalizeStringListRecord`, `normalizeStringRecord`, `normalizeMediaUnderstandingCapabilityRecord`, `normalizeMediaUnderstandingPriorityRecord` — every record-walker filters. |

**The pattern is consistent but easy to miss in new code paths.** Anywhere
a user-supplied object's keys are iterated to build a runtime record,
`isBlockedObjectKey()` should gate.

## SecretRef pattern

Structured credential reference; decouples credential **location** from
credential **materialization**.

Schema (`src/gateway/protocol/primitives.secretref.test.ts:7-12`):

```ts
{ source: "env" | "file" | "exec", provider: string, id: string }
```

| Source | Resolution |
|---|---|
| `env` | Environment variable lookup. |
| `file` | Filesystem path lookup (e.g., `/providers/openai/apiKey`). |
| `exec` | Subprocess execution (with strict exec ID validation). |

Canonical surface document: `docs/reference/secretref-credential-surface.md`.
Targets 100+ config paths — model provider keys, channel tokens, TLS
certs, auth headers, proxy creds. Auth-profile targets:
`profiles.*.keyRef`, `profiles.*.tokenRef`.

**Important policy:** OAuth-mode auth profiles **cannot** use SecretRef.
Enforced at startup/reload. Resolved values **never** transit back into
diagnostic events or OTel exports.

## `configContracts.secretInputs` and `dangerousFlags`

Manifest fields that mark sensitive paths. From
[`manifest-schema.md`](manifest-schema.md), enforced at:

- `src/plugins/manifest.ts:202-249` — definitions.
- `src/plugins/config-contracts.ts:37-188` — `collectPluginConfigContractMatches()` walks dot-separated path patterns with wildcard support.
- Bundled plugins can override enablement via `bundledDefaultEnabled` (`:145-163`).

`dangerousFlags`:

```ts
dangerousFlags?: { path: string; equals: string | number | boolean | null }[]
```

Flags unsafe values (e.g., `permissionMode: "approve-all"`).

`secretInputs`:

```ts
secretInputs?: {
  bundledDefaultEnabled?: boolean;
  paths: { path: string; expected?: "string" }[];
}
```

Declares paths containing user-supplied secrets, enabling SecretRef
surface mapping and audit coverage.

## Channel auth + credential storage

From `AGENTS.md`:

| Path | Contents |
|---|---|
| `~/.openclaw/credentials/` | Channel-specific cached state, OAuth artifacts (Matrix, WhatsApp, …). |
| `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` | Model auth profiles (API keys, OAuth durable tokens). |
| `~/.openclaw/openclaw.json` | Config file with **SecretRef markers**, not resolved values. |

### Isolation enforcement

- `src/agents/auth-profiles/credential-state.ts:72-112` — `evaluateStoredCredentialEligibility()` validates stored creds separately from config-sourced ones.
- Plugins **cannot read credentials directly.** They use contract APIs (`collectRuntimeConfigAssignments`, `secretTargetRegistryEntries`) to *declare* needs; the host resolves and supplies values.
- Bundled-channel example: `src/secrets/channel-contract-api.ts` shows the contract API surface.

## Sandbox trust boundary

When agent code runs in a sandbox (execution target = `"sandbox"`):

- Events emitted from sandboxed processes use `emitDiagnosticEvent()` → `trusted: false`.
- Core harness + model processing within the gateway process use `emitTrustedDiagnosticEvent()` → `trusted: true`.

Evidence:

- `src/agents/acp-spawn-parent-stream.test.ts` — all spawned-subprocess system events are marked `trusted: false`.
- `src/agents/pi-tools.before-tool-call.ts` — tool execution from harness is trusted; subprocess output is not.

**Implication:** Trace context and high-cardinality identifiers from
sandboxed code cannot hijack OTel propagation or influence cardinality
budgets — they're filtered at the consumer boundary and attribute
sanitization layers.

## Surprises and footguns

1. **Async diagnostic queue silently drops at 10K** (`diagnostic-events.ts:514`). Background tasks emitting at high rate can lose events.
2. **`log.record` events bypass trust filtering** in the public listener. Worth auditing if strict isolation matters.
3. **Redaction is a hint, not destruction.** Token masking like `sk-1Xpq…7xQz` is human-readable — useful for logs, doesn't zero secret material in memory.
4. **WeakSet prevents replay, not creation of fake metadata.** A malicious *listener* cannot forge metadata that passes the WeakSet check, but listeners *do* see real trusted events. Design assumes listeners are code-trusted; data-untrust handled separately.
5. **Custom proprietary token prefixes slip through default redaction.** Add to user patterns or extend `redactSensitiveText` defaults.
6. **Cardinality cap silently drops Prometheus metrics** at 2048 series. No alert; operators must monitor `openclaw_prometheus_series_dropped_total`.
7. **`isBlockedObjectKey()` checks must be at every record traversal.** Missing one allows prototype pollution. Pattern is consistent today; new code can break it.
8. **Sandbox-emitted events are untrusted by construction.** Bridges to OTel traceparent propagation will silently no-op for them. Intentional, but new contributors expect propagation to "just work" everywhere.

## Files I'd link from any trust/redaction PR

1. `src/infra/diagnostic-events.ts:516, :633-752` — `metadata.trusted`, WeakSet, freeze.
2. `src/logging/redact.ts:1-198` — full redaction engine.
3. `extensions/diagnostics-otel/src/service.ts:32-181` — OTel caps + dropped keys + redaction.
4. `extensions/diagnostics-prometheus/src/service.ts:49-216` — Prom caps + safe error format.
5. `src/infra/prototype-keys.ts:1-5` — `isBlockedObjectKey()`.
6. `src/plugins/manifest.ts:202-670` — `configContracts.dangerousFlags`/`.secretInputs`.
7. `src/plugins/config-contracts.ts:37-188` — contract walker + match.
8. `src/gateway/protocol/primitives.secretref.test.ts:7-12` — SecretRef shape.
9. `docs/reference/secretref-credential-surface.md` — canonical SecretRef target list.
10. `src/agents/auth-profiles/credential-state.ts:72-112` — credential eligibility.
11. `src/secrets/channel-contract-api.ts` — channel contract API.

## Read next

- [`diagnostic-event-stream.md`](diagnostic-event-stream.md) — full pub/sub bus and producer sites.
- [`manifest-schema.md`](manifest-schema.md) — `configContracts.*` field reference.
- [`hook-engine-typed.md`](hook-engine-typed.md) — `before_tool_call` is the lone fail-closed hook (security gate at the runtime boundary).
