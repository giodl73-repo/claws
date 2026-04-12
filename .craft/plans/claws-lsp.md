---
slug: claws-lsp
preset: "claws"
plan: "2 headlines: editing TOOLS.md shows governance diagnostics in SOUL.md within 200ms, risk-level coloring shows R5 tools in red"
area: claws
status: Draft
phase: thoth
atoms: [atom:claws-lsp, atom:latency-budget, atom:hook-lifecycle]
specs: [CL-05, CL-04, CL-07]
---

# claws-lsp — VS Code Language Server

## Headlines

1. **H1: Editing TOOLS.md shows governance diagnostics in SOUL.md within 200ms** — The claws-lsp Language Server embeds a CompilationHost with cached GovernanceIR. On every file save, the host incrementally recompiles changed files (SHA-256 hash comparison) and publishes diagnostics across the entire workspace. Cross-file tension detection is the differentiating feature: editing a TOOLS.md entry triggers reanalysis of SOUL.md deny intents, AGENTS.md delegation graphs, and MEMORY.md data labels. A 300ms batch window collects multiple rapid saves into a single compile pass.
   - Validation: LSP test client edits TOOLS.md to add an R5 tool -> diagnostic appears on SOUL.md deny intent within 200ms
   - Validation: LSP test client saves 3 files within 100ms -> only 1 compile pass runs (batch window)
   - Validation: CompilationHost cache hit: unchanged file re-save triggers no recompile (hash check)

2. **H2: Risk-level coloring shows R5 tools in red, R1 in green across all workspace files** — Semantic token provider assigns governance-specific token types mapped to risk levels (R1=green, R2=blue, R3=yellow, R4=orange, R5=red). Tool names in TOOLS.md, AGENTS.md, and lobster.yaml are colored by their R-level classification. OBO declarations are underlined. Code lens shows aggregate governance summaries per file section (e.g., "3 tools: 1xR3, 2xR5 | 2 OBO boundaries | 1 tension").
   - Validation: Semantic tokens for an R5 tool name in TOOLS.md return the `governance.risk.r5` token type
   - Validation: Code lens on a TOOLS.md section with 3 tools shows correct aggregate summary
   - Validation: OBO declaration in USER.md receives the `governance.obo` token type with underline modifier

## Summary

The claws-lsp package is a standalone Language Server Protocol server that wraps the claws-sdk compilation pipeline for editor integration. It provides 6 provider features: diagnostics (10 categories mapping to governance rules), completions (RELAX expressions + policy templates), hover (risk R1-R5 classification + OBO status), code actions (auto-fix violations), semantic tokens (risk-level coloring), and code lens (aggregate governance summaries). The compilation host maintains a cached GovernanceIR for sub-200ms response times. The LSP-first architecture means the same server works in VS Code, JetBrains, Neovim, and Zed with zero rewrite.

## Coverage Contract

### Specs
- [ ] CL-05 -- VS Code extension: claws-lsp, compilation host, incremental compilation, 6 providers
- [ ] CL-04 -- GovernanceIR consumption: cached IR, incremental recompile on file change
- [ ] CL-07 -- Tension analysis: cross-file conflict detection in editor, 7 cluster mappings

### Concept Guides
- [ ] docs/claws/editor/lsp-architecture.md -- NEW: CompilationHost, cache strategy, batch window
- [ ] docs/claws/editor/providers.md -- NEW: 6 provider features with examples

### Scenario Coverage
- [ ] lsp/cross-file-tension -- edit TOOLS.md, see diagnostic in SOUL.md
- [ ] lsp/incremental-recompile -- change 1 file in 9-file workspace, only 1 re-parsed
- [ ] lsp/batch-window -- rapid multi-save batched into single compile pass
- [ ] lsp/completion-relax -- RELAX expression completion in claws.json policy field
- [ ] lsp/hover-risk-class -- hover over tool name shows R-level + OBO + capabilities
- [ ] lsp/code-action-fix -- violation diagnostic offers auto-fix code action
- [ ] lsp/semantic-tokens-risk -- R5 tool colored red, R1 colored green
- [ ] lsp/code-lens-summary -- section-level governance aggregate

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 20 | Per-provider (6x2), CompilationHost cache (3), batch window (2), semantic token mapping (3) |
| L1 integration | 8 | Cross-file tension pipeline (3), incremental recompile (2), provider→CompilationHost wiring (3) |
| L2 e2e | 4 | Full LSP lifecycle: initialize → open → edit → diagnostics → shutdown on fixture workspace |
| L3 acceptance | 2 | Manual VS Code extension smoke test with fixture workspace |

## Scope

- `claws-lsp/src/server.ts` (NEW) -- LSP server entry: initialize, capabilities, document lifecycle
- `claws-lsp/src/compilation-host.ts` (NEW) -- Cached GovernanceIR, incremental recompile, SHA-256 hash map, 300ms batch window
- `claws-lsp/src/providers/diagnostic.ts` (NEW) -- 10 diagnostic categories from governance rules, cross-file tension diagnostics
- `claws-lsp/src/providers/completion.ts` (NEW) -- RELAX expression completion, policy template snippets, tool name completion
- `claws-lsp/src/providers/hover.ts` (NEW) -- Risk classification (R1-R5), OBO status, capability list on tool hover
- `claws-lsp/src/providers/code-action.ts` (NEW) -- Auto-fix code actions for governance violations (add frontmatter, fix risk level, add elicitation)
- `claws-lsp/src/providers/semantic-tokens.ts` (NEW) -- Risk-level token types (governance.risk.r1-r5), OBO token type, tension underline
- `claws-lsp/src/providers/code-lens.ts` (NEW) -- Per-section aggregate summaries (tool count, risk breakdown, OBO count, tension count)
- `claws-lsp/src/tension/cross-file.ts` (NEW) -- Cross-file tension detection: 7 conflict categories mapped to diagnostic locations

## Deliverables

### Specs & Design
- [ ] CL-05 amendment -- LSP provider inventory finalized, CompilationHost cache contract documented

### SDK Logic (claws-lsp)
- [ ] claws-lsp/src/server.ts -- LSP server with vscode-languageserver, capability registration
- [ ] claws-lsp/src/compilation-host.ts -- GovernanceIR cache, hash-based invalidation, batch window timer
- [ ] claws-lsp/src/providers/diagnostic.ts -- 10 governance diagnostic categories + cross-file tension diagnostics
- [ ] claws-lsp/src/providers/completion.ts -- RELAX completions, policy templates, tool name completions
- [ ] claws-lsp/src/providers/hover.ts -- Risk classification, OBO status, capability hover cards
- [ ] claws-lsp/src/providers/code-action.ts -- Auto-fix code actions (6 fix types)
- [ ] claws-lsp/src/providers/semantic-tokens.ts -- Token legend with governance-specific types
- [ ] claws-lsp/src/providers/code-lens.ts -- Section aggregate summaries
- [ ] claws-lsp/src/tension/cross-file.ts -- Tension cluster mapping (A-G) to file:line diagnostics
- [ ] claws-lsp/tests/providers/diagnostic.unit.test.ts -- diagnostic emission, severity mapping
- [ ] claws-lsp/tests/providers/completion.unit.test.ts -- RELAX completion items, template snippets
- [ ] claws-lsp/tests/providers/hover.unit.test.ts -- risk card content, OBO display
- [ ] claws-lsp/tests/providers/code-action.unit.test.ts -- fix action generation, edit application
- [ ] claws-lsp/tests/providers/semantic-tokens.unit.test.ts -- token type mapping, modifier flags
- [ ] claws-lsp/tests/providers/code-lens.unit.test.ts -- aggregate calculation, display format
- [ ] claws-lsp/tests/compilation-host.unit.test.ts -- cache hit/miss, hash invalidation, batch window
- [ ] claws-lsp/tests/tension/cross-file.integration.test.ts -- multi-file tension detection pipeline
- [ ] claws-lsp/tests/server.e2e.test.ts -- full LSP lifecycle on fixture workspace
- [ ] claws-lsp/tests/fixtures/tension-workspace/ -- workspace with cross-file tensions for testing
- [ ] claws-lsp/package.json -- workspace package with vscode-languageserver dependency
- [ ] claws-lsp/tsconfig.json -- extends monorepo base, imports from claws-sdk only
- [ ] claws-lsp/vitest.config.ts -- test configuration with coverage gating

### Infrastructure Reuse
- [ ] Reuse `compiler-sdk/src/astro/lsp/server.ts` patterns -- document cache, project index, capability registration
- [ ] Reuse `compiler-sdk/src/astro/lsp/document-cache.ts` pattern -- SHA-256 hashing, incremental invalidation
- [ ] Reuse `compiler-sdk/src/astro/relax/lsp/completion-provider.ts` patterns -- RELAX expression completion
- [ ] Reuse `compiler-sdk/src/astro/relax/lsp/diagnostic-provider.ts` patterns -- RELAX diagnostic emission
- [ ] Reuse `compiler-sdk/src/astro/relax/lsp/hover-provider.ts` patterns -- RELAX hover cards

### CLI Wiring
- None (claws-lsp is a standalone binary, not a claws-cli command)

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Out of Scope

- VS Code extension package (claws-vscode) -- thin client that starts claws-lsp (separate plan)
- `claws serve` HTTP API daemon (that's claws-serve plan)
- Tree view, status bar, command palette contributions (VS Code extension concern)
- JetBrains / Neovim / Zed adapter plugins (community-driven, LSP-first means zero rewrite)
- Multi-workspace VS Code support (CL-05 open question #6, deferred)
- claws-base-cli -- LSP does NOT import claws-base-cli (no terminal output in a language server)

## Notes

- CompilationHost pattern follows `compiler-sdk/src/astro/lsp/project-index.ts` for workspace-wide analysis with per-file caching
- RELAX completion provider adapts `compiler-sdk/src/astro/relax/lsp/completion-provider.ts` with governance-specific RELAX method registry
- Cross-file tension detection uses the tension model (atom:tension, A192) with 7 clusters (A-G) mapped to file:line diagnostics per CL-07
- Diagnostic provider reuses `compiler-sdk/src/astro/relax/lsp/diagnostic-provider.ts` pattern for RELAX expression validation in policy fields
- Semantic tokens use LSP SemanticTokensLegend with governance-specific token types; VS Code theme contributions map them to R-level colors
- 200ms latency budget (atom:latency-budget, C86) covers PARSE (incremental) + ANALYZE (full workspace) + diagnostic publishing
- PARSE is incremental (only changed files), ANALYZE runs on full workspace AST (cross-file tensions require complete context) per CL-05
- This plan has ZERO imports from craftworks-sdk -- enforced by tsconfig.json paths
- claws-lsp does NOT import claws-base-cli per ARCHITECTURE.md dependency rules
- Depends on all Phase 1 plans (claws-sdk must exist with compile pipeline before LSP can wrap it)
