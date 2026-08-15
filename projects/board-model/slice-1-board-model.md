# Board Model Slice 1

## Thesis

The existing `GatewayBoardProvider` can become an optional Gateway Client model
without changing the board protocol or presentation.

## Scope

1. Move the selected-session refresh/reconnect/mutation state machine into a
   browser-safe Gateway Client subpath.
2. Expose immutable `getSnapshot()` and `subscribe()` behavior.
3. Preserve `board.get`, `board.changed`, mutation snapshots, widget revision,
   instance identity, and view-ticket lifetime semantics.
4. Keep localized built-in widgets and all rendering in Control UI.
5. Adapt Control UI to the new model.

## Proof

- initial empty and populated board;
- `board.changed` refresh;
- event during in-flight refresh;
- reconnect and retired-client event rejection;
- failed mutation followed by authoritative refresh;
- stale widget grant rejection;
- ticket preservation only for the same widget revision and instance; and
- no UI/framework import in the model graph.

## Deletion Target

Delete the equivalent reconciliation implementation from
`ui/src/lib/board/gateway-provider.ts` after Control UI adoption.

## Lobster Follow-Up

After a board-capable LobsterClaw generation is qualified, adapt the shared
snapshot into Lobster navigation and a native renderer registry. Unknown HTML
or MCP widgets remain sandboxed rather than becoming trusted React.

