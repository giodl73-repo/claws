# exp-c: QueryIR -> openclaw-memory Target + DataFrame Inversion

**Question**: Q12m — How does claws-sdk compose on top of compiler-sdk + agent-sdk?
**Experiment**: Design the new QueryIR emit target for OC's memory API + DataFrame adapter inversion
**Method**: Design analysis (complete node mapping + materialization strategy)
**Date**: 2026-04-11

---

## Part 1: QueryIR -> openclaw-memory Emitter

### Current State

QueryIR emits to 5 targets via the `emitQuery()` function in `compiler-sdk/src/astro/query/emit.ts`:

| Target | API Pattern | Emitter Function |
|--------|-------------|-----------------|
| `odata` | `$filter=...&$select=...&$orderby=...` | `emitOData()` |
| `sql` | `SELECT ... FROM ... WHERE ...` | `emitSQL()` |
| `graphql` | `query { entity(...) { fields } }` | `emitGraphQL()` |
| `fetchxml` | `<fetch><entity><filter>...` | `emitFetchXML()` |
| `flash-local` | In-memory filter/sort/project | `emitFlashLocal()` |

claws adds target #6: `openclaw-memory`.

### OC Memory API Surface

OpenClaw's memory system provides:

```typescript
// OC memory API (from @openclaw/sdk)
interface MemoryClient {
  search(query: MemorySearchQuery): Promise<MemorySearchResult>;
  get(key: string): Promise<MemoryEntry | null>;
  set(key: string, value: unknown, options?: MemorySetOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: MemoryListOptions): Promise<MemoryEntry[]>;
}

interface MemorySearchQuery {
  text?: string;              // Free-text search
  filters?: MemoryFilter[];   // Structured filters
  fields?: string[];          // Projection
  limit?: number;             // Pagination
  offset?: number;            // Pagination
  orderBy?: MemoryOrderBy[];  // Sort
}

interface MemoryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: unknown;
}

interface MemoryOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}
```

### Node-to-OC Mapping

| QueryIR Node | OC Memory Mapping | Notes |
|-------------|-------------------|-------|
| **FilterNode** | `MemoryFilter` in `query.filters[]` | Direct operator mapping (eq/ne/gt/lt/ge/le/contains -> eq/ne/gt/lt/gte/lte/contains). `in`/`not_in` supported. `startswith`/`endswith` -> lossy (converted to `contains` + client-side filter). `isof`/`has` -> lossy. |
| **ProjectionNode** | `query.fields[]` | Direct mapping. Computed projections are lossy (OC memory doesn't support computed fields server-side). |
| **AggregationNode** | **Client-side** | OC memory has no server-side aggregation. Emit as `memory.search()` + client-side reduce. Flag lossy=true for COUNT/SUM/AVG. |
| **NavigationNode** | **Multi-query** | OC memory is flat (no relationships). `expand` mode -> sequential queries with client-side join. `existential` mode -> sequential query + filter. |
| **SortNode** | `query.orderBy[]` | Direct mapping. `SortField.field` -> `MemoryOrderBy.field`, `direction` preserved. |
| **PaginationNode** | `query.limit` + `query.offset` | Direct mapping. `skip` -> `offset`, `top` -> `limit`. |
| **SearchNode** | `query.text` | Direct mapping. OC memory supports free-text search. |
| **ComputeNode** | **Client-side** | No server-side computation. Emit compute as post-query transformation. |
| **CastNode** | **Client-side** | No server-side casting. Emit cast as post-query type coercion. |
| **LogicalNode** | **Decomposed** | `and` -> multiple filters in `query.filters[]`. `or` -> multiple queries + client-side union. `not` -> client-side filter inversion. |

### The Emitter

```typescript
// claws-sdk/src/emit/query-oc-memory.ts

import type {
  QueryIR, QueryNode, QueryResult,
  FilterNode, ProjectionNode, AggregationNode,
  NavigationNode, PaginationNode, SortNode,
  ComputeNode, SearchNode, CastNode, LogicalNode,
} from '@craftworks/compiler-sdk/astro/types/query-ir';

/**
 * Emit QueryIR as OC memory search code.
 *
 * Returns TypeScript code that calls ctx.memory.search() with compiled
 * query parameters, plus client-side post-processing for aggregation,
 * navigation, compute, and cast nodes.
 */
export function emitOCMemory(query: QueryIR): QueryResult {
  const searchParams: string[] = [];
  const postProcess: string[] = [];
  let lossy = false;

  // Collect filters
  const filters = extractFilters(query.nodes);
  if (filters.length > 0) {
    searchParams.push(`filters: ${JSON.stringify(filters)}`);
  }

  // Projection -> fields
  const projections = nodesOfKind(query.nodes, 'projection');
  if (projections.length > 0) {
    const fields = projections.flatMap(p => p.fields);
    searchParams.push(`fields: ${JSON.stringify(fields)}`);
  }

  // Sort -> orderBy
  const sorts = nodesOfKind(query.nodes, 'sort');
  if (sorts.length > 0) {
    const orderBy = sorts.flatMap(s =>
      s.fields.map(f => ({ field: f.field, direction: f.direction }))
    );
    searchParams.push(`orderBy: ${JSON.stringify(orderBy)}`);
  }

  // Pagination -> limit + offset
  const paginations = nodesOfKind(query.nodes, 'pagination');
  for (const p of paginations) {
    if (p.top != null) searchParams.push(`limit: ${p.top}`);
    if (p.skip != null) searchParams.push(`offset: ${p.skip}`);
  }

  // Search -> text
  const searches = nodesOfKind(query.nodes, 'search');
  if (searches.length > 0) {
    searchParams.push(`text: ${JSON.stringify(searches[0].term)}`);
  }

  // Aggregation -> client-side reduce
  const aggregations = nodesOfKind(query.nodes, 'aggregation');
  if (aggregations.length > 0) {
    lossy = true;
    for (const agg of aggregations) {
      postProcess.push(emitClientSideAggregation(agg));
    }
  }

  // Navigation -> multi-query
  const navigations = nodesOfKind(query.nodes, 'navigation');
  if (navigations.length > 0) {
    lossy = true;
    for (const nav of navigations) {
      postProcess.push(emitMultiQuery(nav));
    }
  }

  // Build output
  const searchCall = `const results = await ctx.memory.search({\n  ${searchParams.join(',\n  ')}\n});`;
  const output = postProcess.length > 0
    ? `${searchCall}\n\n${postProcess.join('\n\n')}`
    : searchCall;

  return {
    target: 'openclaw-memory' as any, // Extended target
    output,
    parameters: [],
    lossy,
  };
}
```

### Complete Example: "Find all tools with risk > R3"

**Input QueryIR**:

```typescript
const query: QueryIR = {
  entity: 'tools',
  dialect: 'markdown',
  nodes: [
    {
      kind: 'filter',
      field: 'riskLevel',
      operator: 'gt',
      value: 'R3',
      negate: false,
      position: 'pre',
    },
    {
      kind: 'projection',
      fields: ['name', 'riskLevel', 'description', 'owner'],
    },
    {
      kind: 'sort',
      fields: [{ field: 'riskLevel', direction: 'desc' }],
    },
  ],
};
```

**Generated TypeScript (emitted by `emitOCMemory`)**:

```typescript
// Compiled query: find all tools with risk > R3
const results = await ctx.memory.search({
  filters: [
    { field: 'riskLevel', operator: 'gt', value: 'R3' },
  ],
  fields: ['name', 'riskLevel', 'description', 'owner'],
  orderBy: [{ field: 'riskLevel', direction: 'desc' }],
});
```

This is a direct, clean mapping. The generated code uses OC's native `memory.search()` API.

---

## Part 2: DataFrame Adapter Inversion

### The Problem

In Craftworks, DataFrames are the host calling external adapters:

```
CRAFTWORKS (we are the host):
  DataFrame.query("tools.where(risk > R3)")
    → our adapter
    → our resolver
    → Dataverse / SQL / in-memory
```

In OC, the Gateway is the host. Generated skills must call OC's helpers:

```
OPENCLAW (OC is the host):
  generatedSkill()
    → needs data
    → OC memory.search() / config.get() / skills.list()
```

The adapter interface needs to flip.

### The Three Data Access Patterns

Generated skills need three distinct data access patterns:

#### Pattern 1: Compile-Time Materialization

Static data known at `claws compile` time is embedded as const objects in generated code.
No runtime queries needed.

**When to use**: Tool classification tables, risk level mappings, policy rule sets,
tier definitions, section templates.

**Example — tool classification**:

```typescript
// Generated by claws compile — materialized from workspace analysis
export const TOOL_CLASSIFICATION = {
  'send-email':   { risk: 'R5', tier: 'T3', obo: true,  mechanical: false },
  'read-file':    { risk: 'R1', tier: 'T0', obo: false, mechanical: true  },
  'web-search':   { risk: 'R2', tier: 'T1', obo: false, mechanical: false },
  'db-query':     { risk: 'R3', tier: 'T2', obo: false, mechanical: true  },
  'deploy-prod':  { risk: 'R5', tier: 'T4', obo: true,  mechanical: true  },
} as const;

export type ToolName = keyof typeof TOOL_CLASSIFICATION;
```

This is the DataFrame -> const inversion. At compile time, claws evaluates the
DataFrame query and embeds the result. No runtime cost.

**Craftworks source**: `craftworks-sdk/src/adapters/` (42+ DataFrame projections
across Tiers 3-7 with MaterializationRegistry). claws's compile-time materialization
is the same operation, but the result is emitted into the generated code instead of
cached in memory.

#### Pattern 2: Runtime Query via OC Memory

Dynamic data that changes at runtime must be queried via OC's memory API. The QueryIR
emitter (Part 1) generates these calls.

**When to use**: Agent state, session context, user preferences, recent actions,
memory entries, dynamic configuration.

**Example — agent state query**:

```typescript
// Generated by claws compile — runtime query via OC memory
export async function getRecentActions(
  ctx: SkillContext,
  since: string,
): Promise<MemoryEntry[]> {
  return ctx.memory.search({
    filters: [
      { field: 'type', operator: 'eq', value: 'action' },
      { field: 'timestamp', operator: 'gte', value: since },
    ],
    orderBy: [{ field: 'timestamp', direction: 'desc' }],
    limit: 50,
  });
}
```

#### Pattern 3: Runtime Config via OC Config API

Configuration that can be changed by administrators without recompilation uses OC's
config API.

**When to use**: Policy overrides, budget limits, feature flags, org-level settings.

**Example — policy config**:

```typescript
// Generated by claws compile — runtime config access
export async function getMaxBudget(ctx: SkillContext): Promise<number> {
  const config = await ctx.config.get('claws.governance.maxBudget');
  return config ?? 10000; // Default if not configured
}
```

### Decision Matrix: Materialize vs Query

| Data Category | Changes at Runtime? | Size | Pattern | Rationale |
|--------------|-------------------|------|---------|-----------|
| Tool classifications | No (recompile to change) | Small (10-100 entries) | Materialize | Static analysis result |
| Risk level definitions | No | Tiny (5 entries) | Materialize | Enum-like |
| Policy rules | No (recompile to change) | Medium (10-50 rules) | Materialize | Compiled rule set |
| Tier boundaries | No | Tiny | Materialize | Static thresholds |
| Section templates | No | Small | Materialize | Pre-compiled templates |
| Agent state | Yes | Variable | Runtime Query | Changes per session |
| User preferences | Yes | Small | Runtime Config | Admin-configurable |
| Budget usage | Yes | Tiny | Runtime Query | Changes per action |
| Memory entries | Yes | Large | Runtime Query | Dynamic content |
| Session context | Yes | Medium | Runtime Query | Per-session |
| Feature flags | Yes | Tiny | Runtime Config | Admin-togglable |
| Org-level settings | Yes | Small | Runtime Config | Cross-workspace |

### The OC-Native Adapter Interface

```typescript
// claws-sdk/src/adapter/oc-data-adapter.ts

import type { SkillContext } from '@openclaw/sdk';

/**
 * OC-native data adapter — wraps OC's runtime APIs for generated skills.
 *
 * This is the INVERSE of Craftworks' DataFrameAdapter:
 *   Craftworks: host calls adapter.fetch() -> external system
 *   OC:         generated skill calls adapter -> OC runtime APIs
 */
export interface OcDataAdapter {
  /** Search OC memory (wraps ctx.memory.search) */
  search(query: OcSearchQuery): Promise<OcSearchResult>;

  /** Get config value (wraps ctx.config.get) */
  getConfig<T = unknown>(key: string): Promise<T | null>;

  /** List skills (wraps ctx.skills.list) */
  listSkills(filter?: OcSkillFilter): Promise<OcSkillInfo[]>;

  /** Get workspace metadata (wraps ctx.workspace.info) */
  getWorkspaceInfo(): Promise<OcWorkspaceInfo>;
}

/** Search query — maps from compiled QueryIR */
export interface OcSearchQuery {
  text?: string;
  filters?: Array<{ field: string; operator: string; value: unknown }>;
  fields?: string[];
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  offset?: number;
}

export interface OcSearchResult {
  entries: unknown[];
  total: number;
  hasMore: boolean;
}
```

**This adapter is NOT shipped to OC**. It lives inside claws-sdk as a compile-time
abstraction. The generated code calls OC APIs directly (ctx.memory.search, ctx.config.get).
The adapter is used during code generation to map DataFrame operations to the correct
OC API calls.

### Compile-Time Materialization Pipeline

```
CREST workspace → PARSE
  → DataFrames populated (tool list, tier table, policy rules)
  → EXTRACT (mechanical intents)
  → ANALYZE (governance rules applied)
  → OPTIMIZE
    → DataFrame.materialize() evaluates static queries
    → Results embedded as const objects
  → EMIT
    → Static data: const objects in generated .ts
    → Dynamic data: ctx.memory.search() calls in generated .ts
    → Config data: ctx.config.get() calls in generated .ts
```

The OPTIMIZE phase decides which DataFrames can be materialized (static data known at
compile time) vs which must remain as runtime queries. The decision is based on the
"changes at runtime?" column in the decision matrix above.

---

## Part 3: Client-Side Aggregation for OC Memory

Since OC memory doesn't support server-side aggregation, QueryIR aggregation nodes
compile to client-side reduce operations:

```typescript
// Client-side aggregation — generated by claws for COUNT
const allTools = await ctx.memory.search({
  filters: [{ field: 'type', operator: 'eq', value: 'tool' }],
});
const countByRisk = allTools.entries.reduce((acc, tool) => {
  const risk = tool.riskLevel as string;
  acc[risk] = (acc[risk] ?? 0) + 1;
  return acc;
}, {} as Record<string, number>);

// Client-side aggregation — generated by claws for AVG
const avgRisk = allTools.entries.reduce(
  (sum, tool) => sum + (tool.riskScore as number),
  0,
) / allTools.entries.length;
```

This is flagged as lossy in the QueryResult because:
1. All data must be fetched to the client before aggregation
2. Large datasets may exceed memory limits
3. Pagination complicates aggregation (must fetch ALL pages)

The generated code includes a warning comment:

```typescript
// WARNING: Client-side aggregation — all matching entries are fetched.
// For large datasets (>1000 entries), consider using OC's analytics API instead.
```

---

## Summary

The QueryIR -> openclaw-memory emitter follows the same pattern as the existing 5 emitters:
a pure function `(QueryIR) -> QueryResult` that translates IR nodes to target-specific
output. The OC-specific constraints (no server-side aggregation, flat memory model, no
relationships) mean some nodes compile to client-side post-processing with lossy=true.

The DataFrame adapter inversion produces three clean patterns: compile-time materialization
(static data -> const objects), runtime query (dynamic data -> memory.search()), and
runtime config (admin settings -> config.get()). The decision of which pattern to use
is made at compile time based on data volatility.
