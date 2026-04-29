---
name: gateway-protocol
description: The gateway protocol surface — TypeBox schema registry, frame envelopes, method-name discovery, version negotiation, and the Swift codegen pipeline at scripts/protocol-gen-swift.ts
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Gateway protocol

## Why this is its own spec

[`gateway.md`](gateway.md) covered the *runtime* — the dispatcher, auth,
plugin seam. This spec covers the *wire format* and the *codegen pipeline*
that turns it into Swift for the macOS/iOS/Android companion apps. Both
sides matter, but the wire format has its own contract surface — additive-
first, drift-resistant, regen-gated — that deserves a focused page.

`AGENTS.md` is explicit at `src/gateway/protocol/AGENTS.md:20-21`:
*"Treat schema changes as protocol changes, not local refactors. Prefer
additive evolution."*

## Protocol surface inventory

22 TypeScript schema files under `src/gateway/protocol/`. Grouped:

**Frame envelopes + core types**

| File | Cite | Purpose |
|---|---|---|
| `frames.ts` | `:5-176` | `RequestFrame`, `ResponseFrame`, `EventFrame`, `GatewayFrame` (discriminated union), `HelloOk`, `ConnectParams`, `ErrorShape`, `TickEvent`, `ShutdownEvent` |
| `primitives.ts` | full | `NonEmptyString`, `GatewayClientIdSchema`, `GatewayClientModeSchema`, `SecretRefSchema` |

**Method-specific param/result schemas** (registered into `ProtocolSchemas`)

| File | Domain |
|---|---|
| `agent.ts` | Agent lifecycle: send, poll, message-action, identity, wait |
| `agents-models-skills.ts` | Agent CRUD, skills, models, tool catalogs |
| `channels.ts` | Talk config, realtime relay, channel login/status |
| `commands.ts` | Command list params/results |
| `config.ts` | get/set/apply/patch, schema lookup, update status |
| `cron.ts` | Cron job management |
| `devices.ts` | Device pairing, token rotate/revoke |
| `exec-approvals.ts`, `plugin-approvals.ts` | Approval request/resolve |
| `nodes.ts` | Node pairing, presence, invoke, pending queue |
| `sessions.ts` | Session create/send, compaction, patching |
| `logs-chat.ts` | Chat history/send/abort/inject, logs tail |
| `secrets.ts` | Secret resolution params |
| `snapshot.ts` | Presence entries, state versions |
| `plugins.ts` | Plugin UI descriptors |
| `push.ts` | Push test params/results |
| `wizard.ts` | Wizard start/next/cancel/status |
| `error-codes.ts` | Enumerated error codes |

**Tests & validation**

`channels.schema.test.ts`, `connect-error-details.test.ts`,
`cron-validators.test.ts`, `exec-approvals-validators.test.ts`,
`primitives.secretref.test.ts`, `push.test.ts`,
`talk-config.contract.test.ts`, `index.test.ts`. Drift-prevention layer.

**Governance**

`src/gateway/protocol/AGENTS.md` (sibling `CLAUDE.md` symlinks it). Boundary
rules live here, not buried in code.

## TypeBox patterns

All schemas use TypeBox's fluent builder. Patterns the codebase leans on:

- **`Type.Object({ … }, { additionalProperties: false })`** — strict shape; unknown keys fail validation. Used everywhere (`frames.ts:137-145`, `primitives.ts:24-36`).
- **`Type.Literal("req"|"res"|"event")`** — discriminator fields (`frames.ts:139, :149, :160`).
- **`Type.Union([...], { discriminator: "type" })`** — `GatewayFrame` (`frames.ts:172-175`). The `discriminator` is a hint to the Swift codegen, not a TypeBox-enforced check.
- **`Type.Optional(...)`** — optional fields (`frames.ts:142, :153, :163-164`).
- **`Type.Enum(...)`** — closed sets (`primitives.ts:35`).
- **`Type.Record(...)` / `Type.Unknown()`** — untyped maps for forward compat (`frames.ts:142` `params`; `error-codes.ts` `details`).
- **`Type.Unsafe(...)`** — escape hatch for `anyOf`/`allOf` patterns (`primitives.ts:58-69` for secret refs).

### The `ProtocolSchemas` registry — single source of truth

`src/gateway/protocol/schema/protocol-schemas.ts:217-403`:

```ts
export const ProtocolSchemas = {
  ConnectParams: ConnectParamsSchema,
  HelloOk: HelloOkSchema,
  RequestFrame: RequestFrameSchema,
  // … 100+ entries keyed by camelCase type name
} satisfies Record<string, TSchema>;
```

Every public protocol type must be registered here. **Adding a new method** means:

1. Define `*ParamsSchema` and `*ResultSchema` in the appropriate domain file.
2. Import them into `protocol-schemas.ts`.
3. Add entries to `ProtocolSchemas`.
4. Wire the runtime handler under `src/gateway/server-methods/` (different file).
5. Run `npm run protocol:gen:swift` and commit both Swift outputs.

The schema map drives both AJV validators and Swift codegen — registering
once gives both sides for free.

## Frames — annotated walkthrough

### `RequestFrame` — `frames.ts:137-145`

| Field | Type | Required | Purpose |
|---|---|---|---|
| `type` | literal `"req"` | yes | discriminator |
| `id` | NonEmptyString | yes | client-assigned, echoed by ResponseFrame |
| `method` | NonEmptyString | yes | runtime lookup key (`"agent"`, `"config.get"`, `"node.invoke"`) |
| `params` | Unknown | no | method-specific payload, validated downstream |

### `ResponseFrame` — `frames.ts:147-156`

| Field | Type | Required | Purpose |
|---|---|---|---|
| `type` | literal `"res"` | yes | discriminator |
| `id` | NonEmptyString | yes | echoes RequestFrame.id |
| `ok` | Boolean | yes | success/failure |
| `payload` | Unknown | no | present iff `ok=true` |
| `error` | ErrorShape | no | present iff `ok=false` |

### `EventFrame` — `frames.ts:158-167`

| Field | Type | Required | Purpose |
|---|---|---|---|
| `type` | literal `"event"` | yes | discriminator |
| `event` | NonEmptyString | yes | event name (`"tick"`, `"agent.created"`) |
| `payload` | Unknown | no | event-specific data |
| `seq` | Integer ≥ 0 | no | ordering hint for streams |
| `stateVersion` | StateVersion | no | presence/health bump metadata |

### `GatewayFrame` — `frames.ts:172-175`

Discriminated union of `req | res | event`. Codegen emits a tight Swift
`enum`, not a struct with optional sub-fields.

### `HelloOk` — `frames.ts:72-124`

Server's response to the `connect` method. Carries the entire negotiated
session state.

| Field | Required | Purpose |
|---|---|---|
| `type: "hello-ok"` | yes | discriminator |
| `protocol` | yes | integer ≥ 1; current is `3` |
| `server.version`, `server.connId` | yes | server identity |
| `features.methods: string[]`, `features.events: string[]` | yes | advertised capability lists, built at server startup (~100+ methods) |
| `snapshot` | yes | initial presence/state snapshot |
| `canvasHostUrl` | no | UI canvas |
| `auth.deviceToken` | no | post-connect re-auth |
| `auth.role`, `auth.scopes` | yes | authz |
| `auth.deviceTokens[]` | no | multi-device list (each `{deviceToken, role, scopes, issuedAtMs}`) |
| `policy.maxPayload`, `maxBufferedBytes`, `tickIntervalMs` | yes | server flow-control policy |

`features.methods`/`features.events` are the closest thing to an exported
"method registry" — see next section.

### `ErrorShape` — `frames.ts:126-135`

| Field | Type | Required | Purpose |
|---|---|---|---|
| `code` | NonEmptyString | yes | enumeration (`"NOT_LINKED"`, `"INVALID_REQUEST"`, …); see `error-codes.ts` |
| `message` | NonEmptyString | yes | human-readable |
| `details` | Unknown | no | code-specific structured context |
| `retryable` | Boolean | no | client retry hint |
| `retryAfterMs` | Integer ≥ 0 | no | backoff guidance |

## Method-name registry

There is **no master enum**. Method names live as:

1. Keys in `GatewayRequestHandlers` — runtime record of handlers.
2. Discovered by plugin manifest scan during boot.
3. String literals in tests and client code.

**Build-time discovery** — `server.impl.ts:432-449`:

- `prepareGatewayPluginBootstrap()` returns `baseGatewayMethods: string[]`.
- Channel plugin methods appended at `:472-478` via `listActiveGatewayMethods()`.
- The flat de-duplicated list is advertised to clients in `HelloOk.features.methods` at `message-handler.ts:1424`.

**The footgun.** `RequestFrame.method` is an arbitrary string. AJV
validation only checks the *envelope*, not method-name validity. A typo
silently fails at dispatch with `"method not found"`, not at parse time.

To add a new method, add the schema (above) AND the handler (different
file). The schema doesn't fail-closed if the handler is missing.

## Versioning posture

**Single global version, not per-method.**

| Constant | Value (audit baseline) | Location |
|---|---|---|
| `PROTOCOL_VERSION` | `3` | `src/gateway/protocol/schema/protocol-schemas.ts:405` |

Emitted in:

- Swift codegen header: `public let GATEWAY_PROTOCOL_VERSION = 3` (`scripts/protocol-gen-swift.ts:30`).
- `HelloOk.protocol` to clients during handshake.

**Handshake negotiation** (`frames.ts:20-70`):

1. Client sends `ConnectParams.minProtocol` and `maxProtocol` (e.g., `2..3`).
2. Server picks the best match within both ranges, returns it in `HelloOk.protocol`.
3. No overlap → connection fails.

**Additive-first doctrine** from `AGENTS.md:20-21`:

- New optional fields: `Type.Optional(...)` — clients can ignore.
- Removing fields or adding required ones is incompatible — bump version, coordinate server + client follow-through.
- Contract tests (e.g., `talk-config.contract.test.ts`) anchor backward-compat guarantees.

## Swift codegen pipeline

`scripts/protocol-gen-swift.ts` — ~1400 LOC, self-contained TS transformer,
no external codegen toolchain.

**Invocation.** `npm run protocol:gen:swift`. Manual; **no CI gate** as of
audit baseline. Developer responsibility to regenerate and commit when
schemas change. Code review is the only enforcement.

### Algorithm — `protocol-gen-swift.ts:268-306`

1. **Load registry** (`:269`) — iterate `Object.entries(ProtocolSchemas)`.
2. **Register named schemas** (`:271-272`) — build two lookup tables:
   - `schemaNameByObject` — object identity → name.
   - `schemaNameBySignature` — JSON-canonical schema → name. Detect duplicates so we don't generate identical structs twice.
3. **Emit header** (`:276`) — `GATEWAY_PROTOCOL_VERSION` + `ErrorCode` enum (`String, Codable, Sendable`).
4. **Emit string enums** (`:283-285`) — for each `{ type: "string", enum: [...] }` schema, emit a Swift enum with `String, Codable, CodingKey` mapping (e.g., `case notLinked = "NOT_LINKED"`).
5. **Emit structs** (`:288-295`) — for each `{ type: "object" }` schema:
   - Public `let` properties from required/optional flags.
   - `init(...)` with optional params.
   - `CodingKeys: String, CodingKey` enum mapping JSON keys to Swift identifiers.
6. **Emit `GatewayFrame`** (`:298`) — special discriminated-union enum with custom decoder/encoder:
   ```swift
   public enum GatewayFrame: Codable, Sendable {
     case req(RequestFrame)
     case res(ResponseFrame)
     case event(EventFrame)
     case unknown(type: String, raw: [String: AnyCodable])
   }
   ```
7. **Write to disk** (`:301-304`) — loop over the two output paths, write byte-identical content.

### TypeBox → Swift type mapping (`swiftType()` at `:129-156`)

| TypeBox | Swift |
|---|---|
| `Type.String()` | `String` |
| `Type.Integer()` | `Int` |
| `Type.Number()` | `Double` |
| `Type.Boolean()` | `Bool` |
| `Type.Array(itemSchema)` | `[swiftType(itemSchema)]` (recursive) |
| `{enum: [...]}` | `String` (raw) — typed enums get separate emission |
| `{patternProperties: {...}}` | `[String: AnyCodable]` |
| `Type.Object(...)` (if not registered as named struct) | `[String: AnyCodable]` |
| `Type.Unknown()` | `AnyCodable` |
| (optional field) | `T?` (trailing `?`) |

`AnyCodable` is the forward-compat escape hatch. Schema evolution can add
fields without breaking decoders.

### Reserved-word handling — `safeName()` at `:73`

```ts
function safeName(name: string) {
  const cc = camelCase(name.replace(/-/g, "_"));  // kebab → snake → camelCase
  if (/^\d/.test(cc)) return `_${cc}`;            // digit prefix
  if (reserved.has(cc)) return `_${cc}`;          // Swift keyword
  return cc;
}
```

Swift keywords (`class`, `func`, `var`, `protocol`, `enum`, …) at `:36-61`
get a leading `_`. The JSON key stays canonical via `CodingKeys`.

### JSON canonicalization — `stableJson()` at `:89`

```ts
function stableJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record).toSorted().map(key => [key, stableJson(record[key])])
    );
  }
  return value;
}
```

Recursively sorts object keys to produce stable schema signatures. Two
schemas that differ only in property order get deduplicated.

### Output validation

The codegen script doesn't run tests itself. Validation relies on:

- TypeScript compilation of the Swift output (via Swift toolchain, not in this repo).
- iOS/macOS app-side `Codable` round-trip tests (in `apps/macos/...` and `apps/shared/...`).
- AGENTS.md discipline + code review.

## Two Swift output destinations

| Path | LOC (audit) |
|---|---|
| `apps/macos/Sources/OpenClawProtocol/GatewayModels.swift` | ~4895 |
| `apps/shared/OpenClawKit/Sources/OpenClawProtocol/GatewayModels.swift` | ~4895 |

**Byte-identical.** MD5 hashes match (`c6c08f5dcb7c4511fd2106d6867d2703`).
The script writes the same content to both paths in a loop (`:301-304`).

**Why two?** Two consumer surfaces — the native macOS app and the shared
OpenClawKit Swift package. Each `Package.swift` target imports from its
local source tree. Splitting avoids a build-time dependency between
unrelated targets at the cost of one regen run touching both files.

## Where Swift ends and Codable begins

The generated Swift is 100% `Codable` and `Sendable`:

- Every struct conforms to `Codable, Sendable`.
- Every enum (including `GatewayFrame`) conforms to `Codable, Sendable`.
- `CodingKeys` maps JSON property names to Swift identifiers.
- `GatewayFrame` ships a custom `init(from:)` decoder for the discriminated union.

Client decode is plain Foundation:

```swift
let frame = try JSONDecoder().decode(GatewayFrame.self, from: jsonData)
switch frame {
case .req(let req): // …
case .res(let res): // …
case .event(let evt): // …
case .unknown(let type, let raw): // forward-compat fallback
}
```

`AnyCodable` (assumed present from a stdlib or community shim — not defined
in the generated file) handles untyped fields.

## Footguns and gotchas

1. **"Do not edit by hand" is unenforced.** Generated header says it; nothing in CI catches a hand-edit. Discipline only.
2. **Method-name typos fail at runtime, not parse time.** `RequestFrame.method` is a free string; AJV checks the envelope, not the method's existence in the registry. Trailing whitespace, case mismatch, etc. all silent-fail.
3. **`discriminator: "type"` is a codegen hint, not TypeBox enforcement.** A malformed `type` field falls through to `.unknown` in the Swift decoder, not a hard fail. Server-side AJV does enforce because of the literal-discriminator schema, but the Swift side is more lenient.
4. **`Type.Optional` + null payload.** Foundation `Codable` treats `null` → `nil` for optional fields. A client sending `{"foo": null}` for an optional field decodes as absent.
5. **`patternProperties` lose strict validation in Swift.** They become `[String: AnyCodable]` — any keys accepted. Used by secret refs; intentional but worth knowing.
6. **Reserved-word leading underscore.** A field named `class` in JSON becomes Swift property `_class`. CodingKeys handles the wire-side mapping, but anyone writing the JSON manually needs the wire name; anyone writing Swift uses the underscored form. Document both at the boundary.
7. **Duplicate-schema silencing.** `stableJson()`-based dedup means structurally identical schemas get the same generated Swift type. If two unrelated schemas happen to have the same shape, only one type is emitted; renames don't propagate across hidden duplicates. Run a TypeScript compile after any schema rename to catch this.

## Contract tests and drift prevention

Three layers keep the protocol coherent.

### Layer 1 — AJV validators (`index.ts:343-591`)

```ts
export const validateRequestFrame  = ajv.compile<RequestFrame>(RequestFrameSchema);
export const validateResponseFrame = ajv.compile<ResponseFrame>(ResponseFrameSchema);
export const validateEventFrame    = ajv.compile<EventFrame>(EventFrameSchema);
// … 100+ per-schema validators
```

Compiled validators reject malformed frames at dispatch time.

### Layer 2 — contract fixture tests (`talk-config.contract.test.ts:36-75`, etc.)

```ts
describe("talk.config contract fixtures", () => {
  for (const fixture of fixtures.selectionCases) {
    it(fixture.id, () => {
      const payload = { config: { talk: buildTalkConfigResponse(fixture.talk) } };
      if (fixture.payloadValid) {
        expect(validateTalkConfigResult(payload)).toBe(true);
      }
      // … assertions on resolved values
    });
  }
});
```

Reads fixture JSON, validates against schema, asserts business semantics.
Catches schema/logic divergence in CI.

### Layer 3 — TypeScript type re-exports (`index.ts:777-914`)

```ts
export type {
  GatewayFrame, RequestFrame, ResponseFrame, EventFrame,
  // … 100+ exported types
};
```

Server code imports types here. Compile errors catch drift before runtime.

### What's still manual

- `npm run protocol:gen:swift` is **not** wired to CI. Missing regen is caught only in PR review.
- Adding a method without registering its schema in `ProtocolSchemas` works at runtime (handlers are independent) but skips Swift codegen entirely. The client can't decode it.

## Files I'd link from any protocol-touching PR

1. `src/gateway/protocol/schema/frames.ts:72-175` — frame definitions.
2. `src/gateway/protocol/schema/protocol-schemas.ts:217-405` — registry + `PROTOCOL_VERSION`.
3. `src/gateway/protocol/schema/error-codes.ts` — error code enumeration.
4. `scripts/protocol-gen-swift.ts:268-306` — codegen main loop.
5. `scripts/protocol-gen-swift.ts:129-156` — type mapping table (TS source).
6. `scripts/protocol-gen-swift.ts:213-266` — `GatewayFrame` enum generation.
7. `src/gateway/server.impl.ts:432-478` — method registry bootstrap + channel extension.
8. `src/gateway/protocol/AGENTS.md` — versioning + boundary rules.
9. `src/gateway/protocol/index.test.ts` — validator integration tests.
10. `src/gateway/protocol/talk-config.contract.test.ts` — fixture-driven contract test pattern.

## Read next

- [`gateway.md`](gateway.md) — the runtime side: dispatch, auth, plugin seam.
- [`plugin-loader.md`](plugin-loader.md) — how method registration plugs in via `api.registerGatewayMethod()`.
- A8 in [`TOUR.md`](TOUR.md) — ACP. Adjacent protocol surface, not yet specced.
