# exp-b: claws-lsp Language Server Protocol Design

**Question**: Q12q -- How should claws integrate with VS Code?
**Experiment**: Design the LSP server for governance IntelliSense (diagnostics, completion, hover, code actions)
**Method**: Design analysis (modeled on compiler-sdk/src/astro/lsp/ and relax/lsp/ patterns)
**Date**: 2026-04-11

---

## 1. Architecture Overview

The claws-lsp server is a Node.js process that speaks the Language Server Protocol. It
wraps the claws compilation pipeline (PARSE/EXTRACT/ANALYZE from Q12j exp-a) and exposes
governance analysis through standard LSP features.

```
VS Code                          claws-lsp                       claws compile
┌──────────┐  stdio/LSP  ┌─────────────────────┐           ┌──────────────────┐
│ Extension │◄───────────►│  Protocol Handler   │           │ PARSE            │
│ Client    │             │  ┌───────────────┐  │           │ EXTRACT          │
│           │             │  │ DocumentCache  │  │──────────►│ ANALYZE          │
│           │             │  │ ProjectIndex   │  │           │                  │
│           │             │  │ TensionIndex   │  │◄──────────│ → GovernanceIR   │
│           │             │  └───────────────┘  │           │ → Diagnostics    │
│           │             │  ┌───────────────┐  │           └──────────────────┘
│           │             │  │ CompilHost     │──┘
│           │             │  │ (cached IR)    │
│           │             │  └───────────────┘
└──────────┘             └─────────────────────┘
```

### Key design decisions

1. **Server process model**: Single-process Node.js via stdio. Matches the Astro LSP
   model (`createConnection(ProposedFeatures.all)` from `server.ts`). No separate
   daemon needed for v1 -- the LSP server IS the compilation host.

2. **Incremental compilation**: Uses file content hashing (SHA-256, matching
   `SourceFile.hash` from GovernanceAST in Q12j). Only re-parses changed files.
   Full ANALYZE phase runs on every change because cross-file analysis requires
   the complete workspace context, but PARSE is incremental.

3. **Debounce**: 300ms debounce on `didChange` events, with generation counter to
   discard stale analysis. Directly reuses the pattern from `server.ts` lines 126-144.

4. **AbortSignal**: Per-URI AbortController for cancellation of in-flight analysis
   when a new edit arrives. Same pattern as FORMA Phase 1 in `server.ts`.

---

## 2. LSP Capabilities

### 2.1 Server Initialize Response

```typescript
{
  capabilities: {
    textDocumentSync: {
      openClose: true,
      change: TextDocumentSyncKind.Incremental,
      save: { includeText: false },
    },
    diagnosticProvider: {
      interFileDependencies: true,   // cross-file governance conflicts
      workspaceDiagnostics: true,    // workspace-wide tension detection
    },
    completionProvider: {
      triggerCharacters: ['.', ':', '"', ' '],
      resolveProvider: true,         // deferred documentation loading
    },
    hoverProvider: true,
    codeActionProvider: {
      codeActionKinds: [
        'quickfix',                  // fix governance violations
        'refactor.rewrite',          // rewrite constraints for clarity
        'source.fixAll.claws',       // fix all claws issues
      ],
    },
    definitionProvider: true,        // navigate SOUL.md constraint → TOOLS.md tool
    codeLensProvider: {
      resolveProvider: true,
    },
    semanticTokensProvider: {        // risk-level color coding
      full: true,
      legend: {
        tokenTypes: ['variable', 'function', 'keyword', 'string',
                     'type', 'enum', 'property'],
        tokenModifiers: ['risk-r1', 'risk-r2', 'risk-r3',
                         'risk-r4', 'risk-r5', 'obo-boundary',
                         'deny', 'elicit'],
      },
    },
    executeCommandProvider: {
      commands: ['claws.pinch', 'claws.build', 'claws.test',
                 'claws.showGovernanceIR', 'claws.diffGovernance'],
    },
  },
}
```

---

## 3. Feature Design: textDocument/diagnostic

### 3.1 Governance Diagnostics

When a governance file is opened or saved, the LSP server runs the claws compilation
pipeline (PARSE/EXTRACT/ANALYZE) and publishes diagnostics. Diagnostic codes map to
the claws diagnostic registry (Q12j exp-a).

#### Diagnostic Code Categories

| Prefix | Category | Severity | Example |
|--------|----------|----------|---------|
| `G-PARSE` | Parse errors | Error | `G-PARSE-001`: Malformed markdown heading in SOUL.md |
| `G-SOUL` | SOUL.md constraints | Warning/Info | `G-SOUL-VAGUE`: Constraint too vague for extraction |
| `G-CLASS` | Tool classification | Warning | `G-CLASS-R5`: Tool classified at R5 (highest risk) |
| `G-ELICIT` | Elicitation gates | Warning | `G-ELICIT-MISS`: OBO tool lacks elicitation annotation |
| `G-BOUND` | OBO boundary | Error | `G-BOUND-CROSS`: Tool crosses impersonation line |
| `G-CONFLICT` | Cross-file tension | Error | `G-CONFLICT-DENY-GRANT`: SOUL denies what TOOLS grants |
| `G-BUDGET` | Budget limits | Warning | `G-BUDGET-OVER`: Token budget exceeds ceiling |
| `G-A2A` | Agent-to-agent | Warning | `G-A2A-UNTRUST`: Delegated agent has no trust entry |
| `G-POLICY` | Policy rules | Error | `G-POLICY-VIOLATE`: Policy rule violated |
| `G-WORKFLOW` | Workflow governance | Warning | `G-WORKFLOW-UNGOV`: Workflow step has no governance |

#### Diagnostic Pipeline

```typescript
async function analyzeAndPublish(uri: string, document: TextDocument): Promise<void> {
  // 1. Build workspace context from all open documents
  const workspace = buildWorkspaceFromCache(cache);

  // 2. Run incremental PARSE (only changed files)
  const ast = incrementalParse(workspace, changedFiles);

  // 3. Run EXTRACT (mechanical intent extraction from all files)
  const intents = extractIntents(ast);

  // 4. Run ANALYZE (cross-file conflict detection + policy compilation)
  const analysisResult = analyzeGovernance(ast, intents);

  // 5. Map diagnostics to source locations
  const diagnostics = analysisResult.diagnostics
    .filter(d => d.source === uri || d.crossFileOrigin === uri)
    .map(d => governanceDiagToLsp(d));

  // 6. Publish to client
  connection.sendDiagnostics({ uri, diagnostics });

  // 7. Publish workspace-level diagnostics for cross-file tensions
  for (const tension of analysisResult.tensions) {
    for (const affectedUri of tension.affectedFiles) {
      connection.sendDiagnostics({
        uri: affectedUri,
        diagnostics: tensionToDiagnostics(tension, affectedUri),
      });
    }
  }
}
```

#### Latency Targets

| Operation | Target | Strategy |
|-----------|--------|----------|
| Single-file PARSE | <50ms | Incremental: only re-parse changed file |
| Full EXTRACT | <100ms | Cache previous extractions, re-extract changed |
| ANALYZE | <150ms | Cached GovernanceIR, delta analysis |
| Total diagnostic round-trip | <200ms | Within VS Code's "responsive" threshold |

### 3.2 Cross-File Tension Diagnostics

The unique capability: claws-lsp detects tensions ACROSS files.

#### The 7 Cross-File Conflict Categories (from Q12j)

| ID | Conflict | File A | File B | Diagnostic |
|----|----------|--------|--------|-----------|
| C1 | Deny-Grant | SOUL.md denies | TOOLS.md grants | `G-CONFLICT-DENY-GRANT` (error) |
| C2 | Tier-Override | TOOLS.md sets R2 | AGENTS.md delegates R4 | `G-CONFLICT-TIER-OVERRIDE` (warning) |
| C3 | OBO-Clash | IDENTITY.md limits OBO | skill.SKILL.md allows OBO | `G-CONFLICT-OBO-CLASH` (error) |
| C4 | Budget-Exceed | SOUL.md sets budget | skill aggregate exceeds | `G-CONFLICT-BUDGET-EXCEED` (warning) |
| C5 | Memory-Retention | MEMORY.md sets retention | SOUL.md implies different | `G-CONFLICT-MEMORY-RETENTION` (info) |
| C6 | A2A-Untrust | AGENTS.md delegates | no trust entry in IDENTITY | `G-CONFLICT-A2A-UNTRUST` (warning) |
| C7 | Workflow-Bypass | workflow skips a gate | SOUL.md requires that gate | `G-CONFLICT-WORKFLOW-BYPASS` (error) |

#### Tension Detection Implementation

```typescript
// Modeled on agent-sdk/src/runtime/tension-negotiation.ts
// but applied at compile-time to governance files

interface GovernanceTension {
  readonly id: string;              // e.g., "C1-tools-3-soul-14"
  readonly category: ConflictCategory;
  readonly severity: 'error' | 'warning' | 'info';
  readonly fileA: { uri: string; line: number; text: string };
  readonly fileB: { uri: string; line: number; text: string };
  readonly explanation: string;
  readonly suggestedResolution: string;
}

// The TensionIndex tracks all detected tensions across the workspace
class TensionIndex {
  private tensions: Map<string, GovernanceTension> = new Map();

  update(analysisResult: AnalysisResult): void {
    this.tensions.clear();
    for (const t of analysisResult.tensions) {
      this.tensions.set(t.id, t);
    }
  }

  getForFile(uri: string): GovernanceTension[] {
    return [...this.tensions.values()].filter(
      t => t.fileA.uri === uri || t.fileB.uri === uri
    );
  }
}
```

#### Example: Deny-Grant Conflict (C1)

```
SOUL.md:
  14 | Never access production databases           ← DenyIntent { scope: 'tool', pattern: 'prod-*' }

TOOLS.md:
   3 | - tool: query-production-db                 ← ToolGrant { name: 'query-production-db' }
       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       error[G-CONFLICT-DENY-GRANT]: Tool 'query-production-db' is granted in TOOLS.md
       but denied by SOUL.md constraint "Never access production databases" (line 14).
       Consider: remove the tool from TOOLS.md, or add an elicitation annotation
       in SOUL.md to allow it with user confirmation.
```

---

## 4. Feature Design: textDocument/completion

### 4.1 Completion Contexts

The completion provider detects context from cursor position and provides governance-aware
completions. Modeled on the RELAX completion provider (`relax/lsp/completion-provider.ts`).

#### Context Detection

| File type | Cursor context | Completions provided |
|-----------|---------------|---------------------|
| SOUL.md | After governance keyword ("never", "always", ...) | Constraint templates |
| SOUL.md | Inside constraint sentence | Scope nouns, tool patterns |
| TOOLS.md | After `- tool:` | Available tool names from skill manifest |
| TOOLS.md | After `trust_tier:` | R1, R2, R3, R4, R5 with descriptions |
| AGENTS.md | After `delegation:` | Delegation patterns (allow, deny, elicit) |
| AGENTS.md | After `tools:` | Tool list from TOOLS.md |
| *.workflow.yaml | Inside `where:` expressions | RELAX expression completions |
| *.workflow.yaml | Inside `condition:` | Policy rule templates |
| SKILL.md | After `## Tools` | Registered tool names |

#### RELAX Expression Completion (Reuse)

For governance files that contain RELAX expressions (policy YAML, workflow YAML), the
completion provider delegates to the RELAX completion infrastructure from `relax/lsp/`.

```typescript
// Direct reuse of RELAX completion for policy expressions
import { provideCompletions } from '@craftworks/compiler-sdk/astro/relax/lsp/completion-provider';
import { mapYamlToExpression } from '@craftworks/compiler-sdk/astro/relax/lsp/yaml-offset-mapper';
import { RelaxMethodRegistry } from '@craftworks/compiler-sdk/astro/relax/lsp/relax-method-registry';

function handleCompletion(params: CompletionParams): CompletionList {
  const uri = params.textDocument.uri;
  const fileType = classifyGovernanceFile(uri);

  switch (fileType) {
    case 'policy-yaml':
    case 'workflow-yaml':
      // Delegate to RELAX completion with governance schema context
      return handleRelaxCompletion(params, governanceSchemaContext);

    case 'soul':
      return handleSoulCompletion(params);

    case 'tools':
      return handleToolsCompletion(params);

    case 'agents':
      return handleAgentsCompletion(params);

    default:
      return { isIncomplete: false, items: [] };
  }
}
```

#### Constraint Template Completions (SOUL.md)

When editing SOUL.md and typing a governance keyword, offer constraint templates:

```typescript
const CONSTRAINT_TEMPLATES: CompletionItem[] = [
  {
    label: 'never-tool',
    kind: CompletionItemKind.Snippet,
    detail: 'Deny a tool or tool pattern',
    insertText: 'Never ${1:access} ${2:tool-pattern}',
    insertTextFormat: InsertTextFormat.Snippet,
    documentation: 'Produces a DenyIntent targeting tools matching the pattern.',
  },
  {
    label: 'always-confirm',
    kind: CompletionItemKind.Snippet,
    detail: 'Require confirmation before action',
    insertText: 'Always ${1:ask for confirmation} before ${2:action}',
    insertTextFormat: InsertTextFormat.Snippet,
    documentation: 'Produces an ElicitIntent requiring user confirmation.',
  },
  {
    label: 'limit-resource',
    kind: CompletionItemKind.Snippet,
    detail: 'Set a resource budget limit',
    insertText: 'Limit ${1:tool calls} to ${2:50} per ${3:task}',
    insertTextFormat: InsertTextFormat.Snippet,
    documentation: 'Produces a LimitIntent capping the specified resource.',
  },
  {
    label: 'require-audit',
    kind: CompletionItemKind.Snippet,
    detail: 'Require audit logging for actions',
    insertText: 'All ${1:web searches} must be ${2:logged}',
    insertTextFormat: InsertTextFormat.Snippet,
    documentation: 'Produces a RequireIntent mandating audit for the action.',
  },
  {
    label: 'classify-data',
    kind: CompletionItemKind.Snippet,
    detail: 'Classify data with a label',
    insertText: 'Treat all ${1:customer data} as ${2:confidential}',
    insertTextFormat: InsertTextFormat.Snippet,
    documentation: 'Produces a LabelIntent classifying data.',
  },
];
```

---

## 5. Feature Design: textDocument/hover

### 5.1 Hover Contexts

Modeled on the RELAX hover provider (`relax/lsp/hover-provider.ts`). Each file type
provides different hover information.

#### TOOLS.md: Tool Risk Classification Hover

```
Hovering over: query-production-db
┌──────────────────────────────────────────────────┐
│ **query-production-db**: Risk R4 (High)          │
│                                                  │
│ Classification: data-access (production)         │
│ Trust tier: R4                                   │
│ OBO status: No (direct execution)                │
│ Elicitation: Required (SOUL.md line 14)          │
│                                                  │
│ Governance chain:                                │
│   TOOLS.md:3 → grants tool                       │
│   SOUL.md:14 → "Never access production..."      │
│   ⚠ CONFLICT: deny-grant tension                 │
│                                                  │
│ Risk factors:                                    │
│   - Accesses production data (R3+)               │
│   - Database mutation possible (R4)              │
│   - No read-only annotation                      │
└──────────────────────────────────────────────────┘
```

#### SOUL.md: Constraint Extraction Hover

```
Hovering over: "Never access production databases"
┌──────────────────────────────────────────────────┐
│ **Extracted constraint** (confidence: 0.95)      │
│                                                  │
│ Type: DenyIntent                                 │
│ Scope: tool                                      │
│ Pattern: prod-*                                  │
│                                                  │
│ Affects 2 tools:                                 │
│   - query-production-db (TOOLS.md:3)             │
│   - deploy-production (TOOLS.md:7)               │
│                                                  │
│ Policy rule: G-POLICY-001                        │
│ Enforcement: fail-closed (R4+ tools blocked)     │
└──────────────────────────────────────────────────┘
```

#### AGENTS.md: Delegation Analysis Hover

```
Hovering over: research-agent
┌──────────────────────────────────────────────────┐
│ **research-agent**: Delegated agent               │
│                                                  │
│ Trust level: Trusted (IDENTITY.md entry)         │
│ Delegated tools: 5 (3 R1, 1 R2, 1 R3)           │
│ OBO capability: No                               │
│ Budget: 10,000 tokens (from SOUL.md)             │
│                                                  │
│ A2A verification: PASS                           │
│ Cluster: B (reasoning)                           │
│ Tension: favors thoroughness over speed          │
└──────────────────────────────────────────────────┘
```

### 5.2 Implementation Pattern

```typescript
// Reuses hover provider pattern from relax/lsp/hover-provider.ts
function handleHover(params: HoverParams): Hover | null {
  const uri = params.textDocument.uri;
  const fileType = classifyGovernanceFile(uri);
  const doc = cache.get(uri);
  if (!doc) return null;

  const word = extractWordAtPosition(doc, params.position);
  if (!word) return null;

  // Look up in the compiled GovernanceIR
  const ir = compilationHost.getLatestIR();
  if (!ir) return null;

  switch (fileType) {
    case 'tools':
      return hoverToolClassification(word, ir);
    case 'soul':
      return hoverConstraintExtraction(word, params.position, ir);
    case 'agents':
      return hoverDelegationAnalysis(word, ir);
    case 'skill':
      return hoverSkillGovernance(word, ir);
    default:
      return null;
  }
}
```

---

## 6. Feature Design: textDocument/codeAction

### 6.1 Code Action Registry

Modeled on the CodeActionEngine from `compiler/code-actions.ts` and the RELAX code
actions from `relax/lsp/diagnostic-provider.ts`.

| Diagnostic code | Code action(s) | Kind |
|----------------|----------------|------|
| `G-SOUL-VAGUE` | "Rewrite as mechanical constraint" | `refactor.rewrite` |
| `G-ELICIT-MISS` | "Add elicitation annotation" | `quickfix` |
| `G-CONFLICT-DENY-GRANT` | "Remove tool from TOOLS.md" / "Add exception in SOUL.md" | `quickfix` |
| `G-CLASS-R5` | "Add justification comment" / "Downgrade to R4 with mitigation" | `quickfix` |
| `G-BOUND-CROSS` | "Add OBO gate" / "Remove impersonation capability" | `quickfix` |
| `G-A2A-UNTRUST` | "Add trust entry in IDENTITY.md" | `quickfix` |
| `G-BUDGET-OVER` | "Increase budget ceiling" / "Split into sub-tasks" | `quickfix` |
| `G-WORKFLOW-BYPASS` | "Add governance step to workflow" | `quickfix` |
| `G-POLICY-VIOLATE` | "Fix policy violation" (context-dependent) | `quickfix` |

#### Example: G-ELICIT-MISS Code Action

```typescript
// When a tool is OBO-capable but has no elicitation annotation
{
  title: 'Add elicitation annotation for send-email',
  kind: CodeActionKind.QuickFix,
  diagnostics: [diagnostic],
  isPreferred: true,
  edit: {
    changes: {
      [soulUri]: [{
        range: { start: { line: insertLine, character: 0 }, end: { line: insertLine, character: 0 } },
        newText: '- Always ask for confirmation before sending email on behalf of the user\n',
      }],
    },
  },
}
```

---

## 7. Feature Design: Semantic Tokens (Risk-Level Coloring)

### 7.1 Token Modifiers for Risk Levels

claws-lsp provides semantic tokens that VS Code themes can colorize by risk level.

| Modifier | Meaning | Suggested color |
|----------|---------|----------------|
| `risk-r1` | Minimal risk (read-only, sandboxed) | Green |
| `risk-r2` | Low risk (reversible writes) | Blue |
| `risk-r3` | Medium risk (external calls, data access) | Yellow |
| `risk-r4` | High risk (production access, financial) | Orange |
| `risk-r5` | Critical risk (impersonation, deletion) | Red |
| `obo-boundary` | Crosses impersonation line | Red underline |
| `deny` | Denied by policy | Strikethrough |
| `elicit` | Requires user confirmation | Italic |

### 7.2 Applied to TOOLS.md

```markdown
## Tools
- tool: read-local-file          ← green (R1)
- tool: search-web               ← yellow (R3)
- tool: query-production-db      ← orange (R4) + strikethrough (denied)
- tool: send-email-as-user       ← red (R5) + red-underline (OBO)
```

---

## 8. Feature Design: Code Lens

### 8.1 Governance Summary Lenses

Code lenses appear above governance sections to show aggregate information.

```markdown
// In TOOLS.md:
[5 tools | R1: 2, R3: 1, R4: 1, R5: 1 | 1 denied, 1 elicit]    ← code lens
## Tools
- tool: read-local-file
...

// In SOUL.md:
[8 constraints | 6 extracted (avg confidence: 0.87) | 2 vague]   ← code lens
## Constraints
...

// In AGENTS.md:
[3 agents | 2 trusted, 1 untrusted | 7 delegated tools]          ← code lens
## Delegated Agents
...
```

---

## 9. Feature Design: textDocument/definition

### 9.1 Cross-File Navigation

Navigate between related governance entries across files.

| Source | Target | Trigger |
|--------|--------|---------|
| SOUL.md constraint mentioning a tool | TOOLS.md tool entry | Ctrl+Click on tool name |
| TOOLS.md tool entry | SKILL.md that provides it | Ctrl+Click on tool name |
| AGENTS.md delegation | IDENTITY.md trust entry | Ctrl+Click on agent name |
| Workflow step | Governance gate that governs it | Ctrl+Click on step name |
| Policy rule reference | Policy definition | Ctrl+Click on policy ID |

Implementation reuses the `resolveDefinition` pattern from `lsp/forma-go-to-def.ts`.

---

## 10. Watched Files + Triggers

### 10.1 File Watching Strategy

| Event | Trigger | Action |
|-------|---------|--------|
| `didOpen` (governance file) | User opens SOUL.md etc | Full PARSE + ANALYZE for that file |
| `didChange` (governance file) | User types in SOUL.md etc | 300ms debounced PARSE + delta ANALYZE |
| `didSave` (governance file) | User saves | Full PARSE + ANALYZE + GovernanceIR snapshot |
| `didChange` (SKILL.md in skills/) | Skill file edited | Re-EXTRACT skill manifest + ANALYZE |
| `workspace/didChangeWatchedFiles` | File created/deleted | Re-scan workspace for new/removed governance files |

### 10.2 Analysis Cascade

When SOUL.md changes, the analysis must also re-check TOOLS.md (for deny-grant tensions),
AGENTS.md (for delegation impacts), and IDENTITY.md (for OBO boundary changes). This is
the same cascade pattern as `ProjectIndex.getCallers()` in `project-index.ts` lines 204-215.

```typescript
// Cascade: when fileA changes, re-analyze all files that have tensions with fileA
function cascadeAnalysis(changedUri: string): void {
  const tensions = tensionIndex.getForFile(changedUri);
  const affectedUris = new Set<string>();

  for (const t of tensions) {
    if (t.fileA.uri !== changedUri) affectedUris.add(t.fileA.uri);
    if (t.fileB.uri !== changedUri) affectedUris.add(t.fileB.uri);
  }

  for (const uri of affectedUris) {
    analyzeAndPublish(uri, cache.get(uri)!);
  }
}
```

---

## 11. Findings

### F-B1: The Astro LSP server is a near-perfect architectural template

The `createAstroLspServer()` factory function in `server.ts` provides the exact patterns
claws-lsp needs: factory function (not auto-starting) for testability, 300ms debounce with
generation counter, per-URI AbortController cancellation, two-phase analysis (per-keystroke
+ on-save), DocumentCache with LRU eviction, ProjectIndex for cross-file queries. claws-lsp
should mirror this architecture with governance-specific analysis replacing Astro analysis.

### F-B2: The RELAX LSP providers are directly reusable for policy expressions

`relax/lsp/completion-provider.ts`, `hover-provider.ts`, and `diagnostic-provider.ts` provide
schema-aware completions, type-checked hover, and compile-on-save diagnostics -- exactly what
claws needs for RELAX expressions inside governance YAML files. The `YamlOffsetMapper` handles
the tricky mapping between YAML positions and expression-internal offsets.

### F-B3: Cross-file tension detection is the differentiating LSP feature

Standard LSPs provide single-file diagnostics. claws-lsp's unique value is cross-file
tension detection: editing SOUL.md produces diagnostics in TOOLS.md. This requires
`interFileDependencies: true` in the diagnostic capability and a workspace-level
TensionIndex (analogous to ProjectIndex).

### F-B4: Semantic tokens for risk-level coloring create instant visual feedback

By marking tool names with risk-level token modifiers (R1-R5), claws-lsp makes governance
visible without requiring the developer to hover or read diagnostics. This is a novel
VS Code feature that no other governance tool provides.

### F-B5: The compilation pipeline must complete in under 200ms for responsiveness

VS Code considers diagnostics "responsive" when they appear within 200ms of typing.
The 300ms debounce gives claws 500ms total (300ms debounce + 200ms compile). The
PARSE phase must be incremental (only re-parse changed files), and the ANALYZE phase
must use a cached GovernanceIR with delta computation.

### F-B6: Code actions bridge the gap from "problem found" to "problem fixed"

Every governance diagnostic should have at least one code action. The pattern from
RELAX's `provideCodeActions()` (attaching `CodeActionData` to diagnostics) is the
right model. claws-lsp should register code actions for all 10 diagnostic categories,
providing multi-file edits when fixing cross-file tensions.

---

## 12. Confidence

**Feature completeness**: 0.90 -- the 6 LSP features (diagnostics, completion, hover,
code actions, semantic tokens, code lens) cover the core governance IntelliSense
experience. Advanced features (rename, workspace symbols) are Phase 2.

**Pattern reuse accuracy**: 0.95 -- the Astro LSP and RELAX LSP patterns are concrete
and well-tested. The architectural transplant is straightforward.

**Latency feasibility**: 0.80 -- the 200ms target for full workspace analysis is
aggressive. May need to fall back to per-file-only analysis with deferred workspace
analysis for large workspaces (50+ skills).
