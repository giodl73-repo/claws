---
checkpoint: 4
name: "Editor + Server — LSP, HTTP API, WebSocket"
pulse_range: [33, 42]
depends_on_cp: 3
review_panel: [craft:architect, claws:founder, claws:platform-eng, craft:testing]
tag: thoth-cp-4
---

# Checkpoint 4: Editor + Server

## Scope

LSP server (compilation host, diagnostics, completion/hover, code actions/tokens,
code lens/tensions) and HTTP API server (foundation, compile/IR, diagnostics/tensions,
snapshot/diff, WebSocket streaming). Two parallel tracks with independent foundations.

**Pulses**: 33–42 (10 pulses)
**Plans**: claws-lsp, claws-serve
**Packages**: claws-sdk, claws-cli

## Dispatch Plan

### Batch 1 — Two independent tracks (parallel)

| Pulse | Slug | Depends On | Track |
|-------|------|-----------|-------|
| 33 | lsp-compilation-host | — | LSP |
| 38 | serve-foundation | — | Serve |

### Batch 2 — Depends on track roots (parallel)

| Pulse | Slug | Depends On | Track |
|-------|------|-----------|-------|
| 34 | lsp-diagnostics | 33 | LSP |
| 39 | serve-compile-ir | 38 | Serve |

### Batch 3 — Mid-track features (parallel)

| Pulse | Slug | Depends On | Track |
|-------|------|-----------|-------|
| 35 | lsp-completion-hover | 33, 34 | LSP |
| 36 | lsp-code-actions-tokens | 33, 34 | LSP |
| 40 | serve-diagnostics-tensions | 38, 39 | Serve |
| 41 | serve-snapshot-diff | 38, 39 | Serve |

### Batch 4 — Track capstones (parallel)

| Pulse | Slug | Depends On | Track |
|-------|------|-----------|-------|
| 37 | lsp-code-lens-tensions | 33–36 | LSP |
| 42 | serve-websocket | 38–41 | Serve |

**Checkpoint gate**: Pulse 42 (`checkpoint_gate: true`)

## Review Panel

| Role | Cluster | Focus |
|------|---------|-------|
| craft:architect | design | LSP protocol compliance, HTTP API surface, WebSocket contracts |
| claws:founder | product | Editor experience, API usability, real-time streaming |
| claws:platform-eng | platform | Compilation host caching, rate limiting, graceful shutdown |
| craft:testing | quality | L0–L3 coverage, LSP protocol tests, HTTP integration tests |

## Coverage Requirements

- **Unit**: 95/90/95/95 per-file
- **Integration**: 85/70/80/85 whole-package (mandatory)
- **Gate command**: `cd claws-sdk && npx vitest run --project unit --coverage && npx vitest run --project integration --coverage`

## Exit Criteria

- [ ] All 10 pulses committed and passing
- [ ] `npm run build` succeeds from repo root
- [ ] `npx tsc --noEmit` passes in claws-sdk and claws-cli
- [ ] Per-file unit coverage thresholds met
- [ ] Integration coverage at or above 85/70/80/85
- [ ] Review panel finds no Major issues
- [ ] `node claws-cli/bin/claws.js --help` runs without error
- [ ] LSP smoke test: compilation host initializes and returns diagnostics
- [ ] Serve smoke test: `curl http://localhost:{port}/health` returns 200
