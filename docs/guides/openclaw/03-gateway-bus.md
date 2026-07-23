# Gateway Bus

<!-- atom:openclaw-gateway-bus (OC-G03) -->

The gateway is OpenClaw's **everything-bus**. Channels (telegram, discord,
slack), agents (CLI, mobile, macOS), tools (browser, exec), MCP clients,
and mobile companion apps all converge in a single Node.js process. There
is no microservice mesh — subagent re-entry, plugin dispatch, and reply
routing all happen in-proc, scope-preserved via `AsyncLocalStorage`.

This guide answers the recurring question: **is the gateway extensible?**
The short answer: yes, in three precise seams — none of them hot-load.

---

## Macro shape

<!-- proof:compiled from="proof:tree kind=org" uri="" -->

```org
Gateway process (Node.js)
├── Frame dispatcher: TypeBox schemas, role and scope auth, rate limit
├── Plugin registry: built once at boot, frozen, repopulated on full reload
├── Hook runner: 35 typed hooks plus merge functions
├── Agent harness: context engine plus active memory
├── Tool execution: resolveExecTarget host vs sandbox vs node
├── Sandbox bridge: docker exec stdio
└── Diagnostic event bus: in-proc pub or sub with metadata.trusted gate
```

<!-- /proof:compiled -->

Clients connect via WebSocket (loopback `ws://` by default; private network
needs `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`; public uses `wss://` or a
tunnel). Channel adapters poll or webhook inbound. Sandbox runs below.
Observability flows out the right.

---

## Three extensibility seams

The gateway is extensible — but not in the "load arbitrary code into a hot
kernel" sense. It is closer to nginx (compile-time linked modules) than
Apache `mod_lua` (runtime hot-load). The constraint is deliberate per
`AGENTS.md`: _"manifest-first control plane; broad mutable registries
transitional."_

| Seam                                                  | Plugins register                      | Trust posture                                                          |
| ----------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| `api.registerGatewayMethod(name, handler)`            | a custom RPC method on the dispatcher | host-side, plugin-trusted                                              |
| `api.registerHttpRoute({path, auth, scope, handler})` | HTTP routes on the gateway server     | host-side; `auth: "gateway"` + `scope: "trusted-operator"` gate access |
| `api.on(gateway_*, handler)`                          | gateway lifecycle hooks               | `before_dispatch` is **claiming** — first `handled=true` wins          |

What you cannot do:

| Action                               | Why blocked                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| Add new frame envelope types         | The four (req, res, event, hello-ok) are frozen TypeBox; adding requires Swift codegen |
| Replace the dispatcher               | Single dispatcher, not pluggable                                                       |
| Inject methods at runtime after boot | Registry is built once, frozen, repopulated only on full reload                        |
| Skip the auth + scope matrix         | Roles and scopes are matrix-checked per method                                         |
| Skip the rate-limit budget           | Control-plane writes consume from a 3-per-60s budget per actor                         |

---

## Frames at a glance

The four wire envelopes defined at `src/gateway/protocol/schema/frames.ts:72-175`:

| Frame    | Discriminator      | Required fields                                                        |
| -------- | ------------------ | ---------------------------------------------------------------------- |
| Request  | `type: "req"`      | `id`, `method`, optional `params`                                      |
| Response | `type: "res"`      | `id`, `ok`, optional `payload`, optional `error`                       |
| Event    | `type: "event"`    | `event`, optional `payload`, optional `seq`, optional `stateVersion`   |
| HelloOk  | `type: "hello-ok"` | `protocol`, `server.*`, `features.*`, `snapshot`, `auth.*`, `policy.*` |

Method names are arbitrary strings — typos fail at dispatch, not at parse
time. There is no compile-time TypeScript union of method names, so adding
a method is cheap; verifying it is wired correctly is the reviewer's job.

---

## Dispatch flow

<!-- proof:compiled from="proof:tree kind=taxonomy" uri="" -->

```taxonomy
handleGatewayRequest()
├── Auth + scope check: roles operator vs node, scopes admin vs write
├── Lookup handler: coreGatewayHandlers or extraHandlers by method name
├── Rate-limit budget: control-plane writes only
├── Wrap in plugin scope: AsyncLocalStorage so subagents preserve context
└── Invoke handler: with GatewayRequestHandlerOptions
```

<!-- /proof:compiled -->

---

## Plugin re-entry

When a plugin tool spawns a subagent, it dispatches **back through the
gateway** as a child request. The child inherits the parent's
`GatewayRequestContext` via `AsyncLocalStorage`. This is what makes nested
agent calls work without context threading.

<!-- proof:compiled from="proof:tree kind=taxonomy" uri="" -->

```taxonomy
Plugin reaches gateway
├── subagent.run params: re-dispatch as child request
├── nodes.invoke: reach paired mobile or CLI nodes
├── channel methods: channel plugin runtime API
└── HTTP route: handler called for matching path
```

<!-- /proof:compiled -->

---

## Two non-WS entry points worth knowing

| Surface                           | Use                                                                                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Process-global fallback context   | Channel adapters that don't flow through `handleGatewayRequest` (Telegram poll, WhatsApp) — set via `setFallbackGatewayContextResolver()` |
| `openclaw mcp serve` stdio bridge | OpenClaw exposes its own MCP server; speaks stdio to MCP clients                                                                          |

---

## Related

- [`design/openclaw/gateway.md`](../../../design/openclaw/gateway.md) — runtime side
- [`design/openclaw/gateway-protocol.md`](../../../design/openclaw/gateway-protocol.md) — TypeBox schemas + Swift codegen
- [`design/openclaw/architecture.md`](../../../design/openclaw/architecture.md) — full ten architectural commitments
- [01 Plugin lifecycle](01-plugin-lifecycle.md) — what `api.register*` actually does
- [04 Turn anatomy](04-turn-anatomy.md) — what flows through the dispatcher
