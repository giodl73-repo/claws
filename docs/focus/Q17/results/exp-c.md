# exp-c: Compilation Host Daemon for Live Governance

**Question**: Q12q -- How should claws integrate with VS Code?
**Experiment**: Design the compilation host daemon (`claws serve`) that powers both `claws watch` and claws-lsp
**Method**: Design analysis (modeled on atom:compilation-host A185, atom:forest-session A205, atom:dependency-graph A187)
**Date**: 2026-04-11

---

## 1. Architecture Overview

The compilation host is a long-lived daemon that maintains a cached GovernanceIR and
recompiles incrementally when workspace files change. It serves two consumers:

1. **claws-lsp** (VS Code) -- diagnostics, completion, hover via LSP protocol
2. **claws watch** (CLI) -- terminal output of governance violations on file change

Both consumers share the same compilation pipeline. The daemon is the single source
of truth for the workspace's governance state.

```
                                ┌──────────────────────┐
  claws watch ─────────────────►│                      │
  (terminal consumer)           │  Compilation Host    │
                                │  ┌────────────────┐  │
  claws-lsp ──────────────────►│  │ GovernanceIR   │  │    FS watcher
  (LSP consumer)                │  │ (cached)       │  │◄──────────────
                                │  ├────────────────┤  │  file change
  claws serve API ────────────►│  │ DependencyGraph│  │   events
  (HTTP consumer)               │  │ SnapshotStore  │  │
                                │  │ TensionIndex   │  │
                                │  └────────────────┘  │
                                │                      │
                                │  PARSE → EXTRACT →   │
                                │  ANALYZE → notify    │
                                └──────────────────────┘
```

### Key Atoms Referenced

| Atom | ID | Role in compilation host |
|------|-----|--------------------------|
| `atom:compilation-host` | A185 | Per-process singleton with cached IR, invalidation, recompilation |
| `atom:compilation-snapshot` | A186 | Frozen GovernanceIR + compile receipt, queryable by consumers |
| `atom:dependency-graph` | A187 | File dependency tracking for targeted invalidation |
| `atom:emission-staging` | A188 | Atomic write layer for emit phase |
| `atom:language-service` | A189 | File-scoped diagnostics, code actions, go-to-definition |
| `atom:forest-session` | A205 | Long-lived handle for iterative recompilation |
| `atom:command-gate` | A207 | Structured command gating for session commands |

---

## 2. Core Data Structures

### 2.1 GovernanceIR Cache

The compilation host maintains a single GovernanceIR instance that represents the
current governance state of the workspace. This is the "hot" cache -- always up to date.

```typescript
interface CompilationHostState {
  /** Current GovernanceIR (latest successful compilation) */
  readonly currentIR: GovernanceIR | null;

  /** Previous GovernanceIR (for diff computation) */
  readonly previousIR: GovernanceIR | null;

  /** GovernanceAST (parsed workspace, pre-analysis) */
  readonly currentAST: GovernanceAST | null;

  /** File content hashes for incremental detection */
  readonly fileHashes: Map<string, string>;

  /** Compilation generation counter (monotonically increasing) */
  readonly generation: number;

  /** Timestamp of last successful compilation */
  readonly lastCompileTime: string;

  /** Diagnostics from the latest compilation */
  readonly diagnostics: readonly GovernanceDiagnostic[];

  /** Tensions from the latest cross-file analysis */
  readonly tensions: readonly GovernanceTension[];
}
```

### 2.2 Dependency Graph

Tracks which governance files depend on each other. When SOUL.md changes, the graph
knows that TOOLS.md and AGENTS.md need re-analysis (because deny-grant and delegation
tensions cross these file boundaries).

```typescript
interface DependencyGraph {
  /** Forward edges: file → set of files that depend on it */
  readonly dependents: Map<string, Set<string>>;

  /** Reverse edges: file → set of files it depends on */
  readonly dependencies: Map<string, Set<string>>;

  /** Edge types for targeted invalidation */
  readonly edgeTypes: Map<string, DependencyEdgeType>;
}

type DependencyEdgeType =
  | 'deny-grant'       // SOUL.md ↔ TOOLS.md (constraint vs tool grant)
  | 'tier-override'    // TOOLS.md ↔ AGENTS.md (tier vs delegation)
  | 'obo-scope'        // IDENTITY.md ↔ SKILL.md (OBO boundary)
  | 'budget-aggregate' // SOUL.md ↔ skills/* (budget ceiling vs aggregate)
  | 'memory-retention' // MEMORY.md ↔ SOUL.md (retention vs constraint)
  | 'a2a-trust'        // AGENTS.md ↔ IDENTITY.md (delegation vs trust)
  | 'workflow-gate'    // *.workflow.yaml ↔ SOUL.md (step vs gate)
  | 'skill-manifest';  // SKILL.md ↔ TOOLS.md (tool provision vs authorization)

// Static dependency rules (always present regardless of content)
const STATIC_DEPENDENCIES: Array<[string, string, DependencyEdgeType]> = [
  ['SOUL.md',      'TOOLS.md',        'deny-grant'],
  ['TOOLS.md',     'AGENTS.md',       'tier-override'],
  ['IDENTITY.md',  'skills/*/SKILL.md', 'obo-scope'],
  ['SOUL.md',      'skills/*/SKILL.md', 'budget-aggregate'],
  ['MEMORY.md',    'SOUL.md',         'memory-retention'],
  ['AGENTS.md',    'IDENTITY.md',     'a2a-trust'],
];
```

### 2.3 Snapshot Store

Snapshots are frozen copies of the GovernanceIR at a point in time. Used for diff
computation ("what changed since last compile?") and governance history.

```typescript
interface GovernanceSnapshot {
  /** Unique snapshot identifier */
  readonly id: string;

  /** Monotonically increasing generation number */
  readonly generation: number;

  /** ISO 8601 timestamp */
  readonly timestamp: string;

  /** SHA-256 of the serialized GovernanceIR */
  readonly hash: string;

  /** The frozen GovernanceIR */
  readonly ir: GovernanceIR;

  /** Diagnostics at snapshot time */
  readonly diagnostics: readonly GovernanceDiagnostic[];

  /** Tensions at snapshot time */
  readonly tensions: readonly GovernanceTension[];
}

class SnapshotStore {
  private snapshots: GovernanceSnapshot[] = [];
  private readonly maxSnapshots: number;

  constructor(maxSnapshots = 20) {
    this.maxSnapshots = maxSnapshots;
  }

  /** Take a snapshot of the current state */
  capture(state: CompilationHostState): GovernanceSnapshot {
    const snapshot: GovernanceSnapshot = {
      id: `snap-${state.generation}`,
      generation: state.generation,
      timestamp: new Date().toISOString(),
      hash: hashIR(state.currentIR!),
      ir: structuredClone(state.currentIR!),
      diagnostics: state.diagnostics,
      tensions: state.tensions,
    };
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
    return snapshot;
  }

  /** Diff two snapshots */
  diff(a: GovernanceSnapshot, b: GovernanceSnapshot): GovernanceDiff {
    return computeGovernanceDiff(a.ir, b.ir);
  }

  /** Get the most recent snapshot */
  latest(): GovernanceSnapshot | null {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }
}
```

---

## 3. Incremental Recompilation

### 3.1 Invalidation Strategy

When a file changes, the compilation host:

1. **Hash check**: Compare the file's new SHA-256 against `fileHashes`. If unchanged,
   skip (idempotent save).

2. **Parse changed file only**: Run PARSE on the single changed file. Update the
   `currentAST` with the new parsed node for that file.

3. **Dependency expansion**: Query the `DependencyGraph` for files that depend on the
   changed file. Mark them for re-analysis (not re-parse).

4. **Full ANALYZE**: Run the ANALYZE phase on the full workspace AST. ANALYZE must
   see all files to detect cross-file tensions. But PARSE is incremental.

5. **Snapshot**: If the GovernanceIR changed (different hash), capture a snapshot.

```typescript
async function onFileChange(filePath: string, content: string): Promise<void> {
  const hash = sha256(content);
  const previousHash = state.fileHashes.get(filePath);

  // 1. Hash check — skip if unchanged
  if (hash === previousHash) return;
  state.fileHashes.set(filePath, hash);

  // 2. Incremental PARSE
  const fileKind = classifyFile(filePath);
  if (!fileKind) return; // not a governance file
  const parsedNode = parseGovernanceFile(filePath, content, fileKind);

  // 3. Update AST
  updateAST(state.currentAST, filePath, parsedNode);

  // 4. Full ANALYZE (cross-file tensions require complete context)
  const analysisResult = analyzeGovernance(state.currentAST);

  // 5. Update state
  const newIR = analysisResult.ir;
  const irChanged = hashIR(newIR) !== hashIR(state.currentIR);

  state.previousIR = state.currentIR;
  state.currentIR = newIR;
  state.diagnostics = analysisResult.diagnostics;
  state.tensions = analysisResult.tensions;
  state.generation++;
  state.lastCompileTime = new Date().toISOString();

  // 6. Snapshot if IR changed
  if (irChanged) {
    snapshotStore.capture(state);
  }

  // 7. Notify consumers
  notifyConsumers({
    generation: state.generation,
    changedFile: filePath,
    diagnostics: state.diagnostics,
    tensions: state.tensions,
    irChanged,
  });
}
```

### 3.2 Invalidation Performance

| Workspace size | PARSE (incremental) | ANALYZE (full) | Total | Acceptable? |
|---------------|-------------------|---------------|-------|-------------|
| Small (5 files, 0 skills) | <10ms | <30ms | <40ms | Yes |
| Medium (9 files, 10 skills) | <10ms | <80ms | <90ms | Yes |
| Large (9 files, 50 skills) | <10ms | <200ms | <210ms | Marginal |
| XL (9 files, 200 skills) | <10ms | <500ms | <510ms | Needs optimization |

For XL workspaces, optimization strategies:
- **Skill manifest caching**: Parse skill manifests once, re-parse only on SKILL.md change
- **Tension partitioning**: Only re-analyze tension categories affected by the changed file
- **Deferred workspace analysis**: Immediate per-file diagnostics, deferred cross-file tensions

---

## 4. Governance Snapshot Diff

### 4.1 Diff Model

The snapshot diff shows what changed in the GovernanceIR between two compilations.
This powers the "Governance Diff View" in VS Code and the `claws diff` CLI command.

```typescript
interface GovernanceDiff {
  /** Summary of changes */
  readonly summary: string;

  /** New diagnostics (not in previous snapshot) */
  readonly addedDiagnostics: readonly GovernanceDiagnostic[];

  /** Resolved diagnostics (in previous but not current) */
  readonly resolvedDiagnostics: readonly GovernanceDiagnostic[];

  /** New tensions */
  readonly addedTensions: readonly GovernanceTension[];

  /** Resolved tensions */
  readonly resolvedTensions: readonly GovernanceTension[];

  /** Changed tool classifications */
  readonly classificationChanges: readonly ClassificationChange[];

  /** Changed policy rules */
  readonly policyChanges: readonly PolicyChange[];

  /** Changed trust tier assignments */
  readonly tierChanges: readonly TierChange[];
}

interface ClassificationChange {
  readonly tool: string;
  readonly previousTier: string;   // e.g., "R2"
  readonly currentTier: string;    // e.g., "R4"
  readonly reason: string;
}

interface TierChange {
  readonly target: string;
  readonly previousTier: string;
  readonly currentTier: string;
  readonly cause: string;          // which file change caused this
}
```

### 4.2 Diff Computation

```typescript
function computeGovernanceDiff(prev: GovernanceIR, curr: GovernanceIR): GovernanceDiff {
  // Classification changes: compare tool risk tiers
  const classificationChanges: ClassificationChange[] = [];
  for (const [tool, currClass] of curr.classifications) {
    const prevClass = prev.classifications.get(tool);
    if (!prevClass || prevClass.tier !== currClass.tier) {
      classificationChanges.push({
        tool,
        previousTier: prevClass?.tier ?? 'unclassified',
        currentTier: currClass.tier,
        reason: currClass.reason,
      });
    }
  }

  // Diagnostic diff
  const prevDiagIds = new Set(prev.diagnostics.map(d => d.id));
  const currDiagIds = new Set(curr.diagnostics.map(d => d.id));
  const addedDiagnostics = curr.diagnostics.filter(d => !prevDiagIds.has(d.id));
  const resolvedDiagnostics = prev.diagnostics.filter(d => !currDiagIds.has(d.id));

  // Tension diff
  const prevTensionIds = new Set(prev.tensions.map(t => t.id));
  const currTensionIds = new Set(curr.tensions.map(t => t.id));
  const addedTensions = curr.tensions.filter(t => !prevTensionIds.has(t.id));
  const resolvedTensions = prev.tensions.filter(t => !currTensionIds.has(t.id));

  return {
    summary: buildDiffSummary(classificationChanges, addedDiagnostics, resolvedDiagnostics),
    addedDiagnostics,
    resolvedDiagnostics,
    addedTensions,
    resolvedTensions,
    classificationChanges,
    policyChanges: computePolicyChanges(prev, curr),
    tierChanges: computeTierChanges(prev, curr),
  };
}
```

---

## 5. `claws serve` API

### 5.1 Overview

`claws serve` starts the compilation host as a daemon with an HTTP API for programmatic
access. This serves three use cases:

1. **CI/CD integration**: CI pipelines query `claws serve` for governance state
2. **Gateway runtime**: OC Gateway polls for governance updates (hot reload)
3. **Custom tooling**: Third-party tools query governance state

### 5.2 API Endpoints

```
POST   /compile           Trigger a full recompilation
GET    /status             Current compilation state (generation, timestamp, health)
GET    /diagnostics        All current diagnostics
GET    /diagnostics/:file  Diagnostics for a specific file
GET    /tensions           All cross-file tensions
GET    /classify/:tool     Classification for a specific tool
GET    /ir                 Full GovernanceIR (JSON)
GET    /snapshot           Latest snapshot
GET    /diff               Diff between latest and previous snapshot
GET    /diff/:gen1/:gen2   Diff between two specific generations
POST   /invalidate/:file   Invalidate a specific file (trigger re-parse)
GET    /health             Health check (daemon alive, workspace loaded)
WS     /events             WebSocket stream of compilation events
```

### 5.3 Event Stream (WebSocket)

The `/events` endpoint provides a real-time stream of compilation events. Consumers
subscribe and receive events as the compilation host processes changes.

```typescript
type CompilationEvent =
  | { type: 'compile-start'; generation: number; trigger: string }
  | { type: 'compile-end'; generation: number; durationMs: number; irChanged: boolean }
  | { type: 'diagnostic-added'; diagnostic: GovernanceDiagnostic }
  | { type: 'diagnostic-resolved'; diagnosticId: string }
  | { type: 'tension-added'; tension: GovernanceTension }
  | { type: 'tension-resolved'; tensionId: string }
  | { type: 'classification-changed'; change: ClassificationChange }
  | { type: 'snapshot-captured'; snapshotId: string; generation: number }
  | { type: 'file-changed'; path: string; kind: SourceKind };
```

### 5.4 Example: CI/CD Pre-Merge Check

```bash
# Start daemon in CI (background, auto-exit after idle)
claws serve --port 8720 --idle-timeout 60 &

# Trigger compilation
curl -X POST http://localhost:8720/compile

# Check for errors
ERRORS=$(curl -s http://localhost:8720/diagnostics | jq '[.[] | select(.severity == "error")] | length')
if [ "$ERRORS" -gt 0 ]; then
  echo "Governance compilation failed: $ERRORS errors"
  curl -s http://localhost:8720/diagnostics | jq '.[] | select(.severity == "error")'
  exit 1
fi

# Check for high-risk tensions
TENSIONS=$(curl -s http://localhost:8720/tensions | jq '[.[] | select(.severity == "error")] | length')
if [ "$TENSIONS" -gt 0 ]; then
  echo "Cross-file governance tensions detected: $TENSIONS"
  exit 1
fi

echo "Governance check passed"
```

### 5.5 Example: Gateway Hot Reload

```typescript
// OC Gateway plugin subscribes to compilation events
const ws = new WebSocket('ws://localhost:8720/events');

ws.on('message', (data: string) => {
  const event: CompilationEvent = JSON.parse(data);

  if (event.type === 'compile-end' && event.irChanged) {
    // Hot reload governance rules
    const response = await fetch('http://localhost:8720/ir');
    const newIR = await response.json();
    governanceEngine.updateRules(newIR);
    console.log(`Governance rules reloaded (generation ${event.generation})`);
  }
});
```

---

## 6. Consumer Architecture

### 6.1 Consumer Interface

All consumers (LSP, CLI watch, HTTP API) implement the same notification interface:

```typescript
interface CompilationConsumer {
  /** Called when compilation completes */
  onCompileComplete(result: CompileResult): void;

  /** Called when a diagnostic is added or removed */
  onDiagnosticChange(change: DiagnosticChange): void;

  /** Called when a tension is detected or resolved */
  onTensionChange(change: TensionChange): void;

  /** Consumer identifier (for logging) */
  readonly id: string;
}

// LSP consumer: publishes diagnostics via connection.sendDiagnostics()
class LspConsumer implements CompilationConsumer {
  constructor(private connection: Connection) {}

  onCompileComplete(result: CompileResult): void {
    for (const [uri, diags] of result.diagnosticsByFile) {
      this.connection.sendDiagnostics({ uri, diagnostics: diags.map(toLspDiag) });
    }
  }

  // ...
}

// CLI consumer: prints to terminal with color
class WatchConsumer implements CompilationConsumer {
  onCompileComplete(result: CompileResult): void {
    console.clear();
    console.log(`\x1b[36mclaws watch\x1b[0m — generation ${result.generation}`);
    for (const d of result.diagnostics) {
      const color = d.severity === 'error' ? '\x1b[31m' : '\x1b[33m';
      console.log(`${color}${d.severity}\x1b[0m[${d.code}]: ${d.source}:${d.line} — ${d.message}`);
    }
    if (result.diagnostics.length === 0) {
      console.log('\x1b[32mNo governance violations\x1b[0m');
    }
  }

  // ...
}

// HTTP consumer: stores results for API queries
class ApiConsumer implements CompilationConsumer {
  private latestResult: CompileResult | null = null;

  onCompileComplete(result: CompileResult): void {
    this.latestResult = result;
    this.broadcastWebSocket({ type: 'compile-end', ...result });
  }

  // ...
}
```

### 6.2 Process Model

```
Scenario 1: claws-lsp only (VS Code)
┌────────────────────┐
│  VS Code process   │
│  └── claws-lsp     │ ← LSP server started by extension
│      └── CompHost  │ ← compilation host lives inside LSP process
└────────────────────┘

Scenario 2: claws watch (terminal)
┌────────────────────┐
│  Terminal process   │
│  └── claws watch   │ ← CLI watch command
│      └── CompHost  │ ← compilation host lives inside watch process
└────────────────────┘

Scenario 3: claws serve (shared daemon)
┌────────────────────┐    HTTP/WS    ┌────────────────────┐
│  claws serve       │◄────────────►│  VS Code (LSP)     │
│  └── CompHost      │              └────────────────────┘
│  └── HTTP server   │◄────────────►┌────────────────────┐
│  └── WS server     │              │  CI pipeline       │
└────────────────────┘              └────────────────────┘
                       ◄────────────►┌────────────────────┐
                                     │  OC Gateway        │
                                     └────────────────────┘

Scenario 4: Hybrid (LSP with claws serve fallback)
┌────────────────────┐               ┌────────────────────┐
│  VS Code (LSP)     │──local IPC──►│  claws serve       │
│  └── claws-lsp     │  (if found)  │  └── CompHost      │
│      └── CompHost  │              └────────────────────┘
│      (fallback if  │
│       no serve)    │
└────────────────────┘
```

**Default recommendation**: Scenario 1 for v0.1 (simplest -- LSP embeds CompHost).
Scenario 3 for v0.3+ when CI/CD and Gateway integration land. Scenario 4 as the
eventual production model.

---

## 7. File System Watcher

### 7.1 Watch Patterns

```typescript
const GOVERNANCE_WATCH_PATTERNS = [
  'SOUL.md',
  'TOOLS.md',
  'AGENTS.md',
  'IDENTITY.md',
  'USER.md',
  'MEMORY.md',
  'HEARTBEAT.md',
  'skills/*/SKILL.md',
  '*.workflow.yaml',
  'lobster.yaml',
  '.claws/policies/*.yaml',    // custom policy files
];
```

### 7.2 Debounce Strategy

```
File change event
       │
       ▼
   ┌───────────┐
   │ Debounce  │  300ms (matches LSP didChange debounce)
   │ per-file  │
   └─────┬─────┘
         │
         ▼
   ┌───────────┐
   │ Batch     │  Collect all changed files within the debounce window
   │ window    │
   └─────┬─────┘
         │
         ▼
   ┌───────────┐
   │ Compile   │  Single compilation pass for all changed files
   │ batch     │
   └─────┬─────┘
         │
         ▼
   ┌───────────┐
   │ Notify    │  Push results to all registered consumers
   │ consumers │
   └───────────┘
```

The batch window means that if SOUL.md and TOOLS.md are both saved within 300ms
(common with "save all"), only one compilation pass runs with both changes.

---

## 8. `claws watch` Command Design

### 8.1 CLI Interface

```
claws watch [workspace-path]

Options:
  --format <format>   Output format: text (default), json, sarif
  --severity <level>  Minimum severity: error, warning, info (default: warning)
  --no-clear          Don't clear terminal on recompile
  --quiet             Only show summary (error/warning counts)
  --port <port>       Also start HTTP API on this port (becomes claws serve)
```

### 8.2 Terminal Output

```
  claws watch — C:\projects\my-agent (generation 12, 45ms)

  error[G-CONFLICT-DENY-GRANT] TOOLS.md:3
    Tool 'query-production-db' is granted in TOOLS.md but denied by
    SOUL.md constraint "Never access production databases" (line 14).

  warning[G-ELICIT-MISS] TOOLS.md:7
    Tool 'send-email' has OBO capability but no elicitation annotation.
    Add: "Always ask before sending email" to SOUL.md.

  warning[G-CLASS-R5] skills/deploy/SKILL.md:12
    Tool 'deploy-production' classified at R5 (critical risk).

  ───────────────────────────────────────────────────────────
  1 error, 2 warnings | 8 tools (R1:3, R2:2, R3:1, R4:1, R5:1)
  Watching for changes...
```

---

## 9. `claws serve` Command Design

### 9.1 CLI Interface

```
claws serve [workspace-path]

Options:
  --port <port>       HTTP API port (default: 8720)
  --host <host>       Bind address (default: 127.0.0.1)
  --idle-timeout <s>  Auto-exit after N seconds of no activity (0 = never)
  --cors              Enable CORS for browser-based consumers
  --auth <token>      Require Bearer token for API access
  --log-level <level> Logging: debug, info, warn, error (default: info)
```

### 9.2 Startup Sequence

```
1. Parse workspace path
2. Discover governance files (GOVERNANCE_WATCH_PATTERNS)
3. Initial full compilation (PARSE → EXTRACT → ANALYZE)
4. Capture initial snapshot
5. Start file system watcher
6. Start HTTP server
7. Start WebSocket server
8. Print "claws serve running on http://127.0.0.1:8720"
9. Enter event loop
```

### 9.3 Graceful Shutdown

On SIGINT/SIGTERM:
1. Stop accepting new HTTP connections
2. Close WebSocket connections with 1001 (Going Away)
3. Stop file system watcher
4. Flush any pending compilation
5. Capture final snapshot
6. Exit with code 0

---

## 10. Findings

### F-C1: The compilation host should live inside the LSP server for v0.1

For the initial release, embedding the CompilationHost inside the LSP server process
avoids the complexity of inter-process communication, service discovery, and process
lifecycle management. The LSP server already has the file watching, debounce, and
document cache infrastructure. Adding GovernanceIR caching and incremental compilation
is a natural extension.

### F-C2: `claws serve` is the decoupled version for production

When CI/CD pipelines, OC Gateway, and custom tooling need governance state, `claws serve`
provides an HTTP API backed by the same CompilationHost. The LSP server can optionally
delegate to `claws serve` if it is running, avoiding duplicate compilation in the
VS Code + CI scenario.

### F-C3: Incremental PARSE + full ANALYZE is the right tradeoff

PARSE is per-file (cheap, incremental). ANALYZE is workspace-wide (must see all files
for cross-file tensions). The optimization is: skip PARSE for files whose content hash
has not changed, but always run ANALYZE. For workspaces with fewer than 50 skills,
full ANALYZE completes in under 200ms. For larger workspaces, introduce tension
partitioning (only re-analyze tension categories affected by the changed file type).

### F-C4: Snapshot diffing enables a novel "governance changelog" experience

By capturing snapshots on every IR change and providing a diff API, claws enables
developers to see "what changed in governance since my last edit." This powers the
VS Code governance diff view and the `claws diff` CLI command. No other governance
tool provides temporal governance analysis.

### F-C5: The dependency graph eliminates redundant work

Static dependency rules (SOUL.md always relates to TOOLS.md via deny-grant) mean the
compilation host knows exactly which files need re-analysis when a specific file changes.
This is more efficient than re-analyzing everything and more correct than only analyzing
the changed file.

### F-C6: Consumer interface decouples protocol from compilation

The `CompilationConsumer` interface means the same compilation host serves LSP, CLI,
and HTTP consumers with no protocol-specific logic in the compilation pipeline. Adding
a new consumer (e.g., VS Code Copilot integration, Slack notifications) requires only
implementing the consumer interface.

### F-C7: `claws serve` with `--idle-timeout` is a CI-native pattern

CI pipelines can start `claws serve` as a background process, run checks against the
HTTP API, and let it auto-exit after idle timeout. This avoids the overhead of
re-compiling on every CI step while keeping the daemon lifecycle managed.

---

## 11. Confidence

**Architecture feasibility**: 0.90 -- the compilation host pattern is well-established
(atom:compilation-host A185 and atom:forest-session A205 provide the design foundation).
The Astro LSP server proves the LSP embedding model works.

**Incremental compilation performance**: 0.85 -- the <200ms target is achievable for
medium workspaces (up to 50 skills). Larger workspaces may need tension partitioning.

**API completeness**: 0.80 -- the 12-endpoint HTTP API covers the core use cases.
Advanced features (batch classification, policy rule testing, multi-workspace) are v2.

**Consumer model correctness**: 0.95 -- the CompilationConsumer interface is clean and
proven by the three concrete consumers (LSP, CLI watch, HTTP API).
