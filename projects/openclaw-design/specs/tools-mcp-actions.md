# Tools, MCP, and External Actions Facilities

## Boundary

This portfolio makes tool capabilities discoverable and selectively available,
then mediates authorized invocation, side effects, results, and projections.

MCP is a transport and capability source. Tool-specific semantics and external
effects remain with their owner.

## Contracts

### Tool surface catalog

- core, plugin, MCP, client, and backend-native definitions;
- stable tool IDs, metadata, profiles, and sections;
- inert discovery without activation claims.

### Tool materialization

- per-run caller/model/runtime capability filtering;
- sandbox and policy filtering;
- schema adaptation and hook integration.

### MCP runtime transport

- server/requester/session lifecycle;
- catalog acquisition and refresh;
- list/read/call transport;
- timeout, retry guard, failure, and disposal.

### Execution authority

- binding identity;
- sandbox and host/node target;
- policy and approval;
- trusted target resolution;
- continuation after approval.

### Invocation and projection

- tool call ID;
- cancellation, timeout, and terminal result;
- side-effect owner;
- structured model result;
- progress, transcript, audit, and replay facts.

## Current Rule

Catalog membership does not prove run-time availability. Transcript projection
idempotency does not prove that an external side effect is replayable.

## Open Gaps

- Smaller owner modules around assembly, MCP lifecycle, binding, and
  projection.
- Explicit tool-owner declarations for retry and idempotency.
- Portable approval and continuation correlation across runtimes.
- Stable cross-backend result/error vocabulary without flattening
  tool-specific semantics.

Source audit: `../source-audit-tools-mcp-actions-2026-08-01.md`.

First bounded enterprise proof:
`../evidence-slices/authorized-external-action.md`.
