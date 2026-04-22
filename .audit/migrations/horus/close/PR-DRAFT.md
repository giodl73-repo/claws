# Phase 5 — Wave XCVI: Horus the Heir (bic/claws side)

> **Before Horus**, the four `@bic/openclaw-*` upstream-shape packages (workspace,
> guardrails, policy, snap) and the `@bic/openclaw-lsp` sibling were ready to leave
> the craftworks monorepo. Ra had done the structural work: zero `@craftworks/*`
> runtime imports, byte-parity canonicalize across three consumers, subpath exports,
> integrity-pinned SDK, `clawc-sdk/FILTER-REPO-MANIFEST.md` enumerating every
> filter-repo rule. But `clawc` the binary was still named `clawc`, the packages
> were still under `c:\src\craftworks\clawc-sdk\packages\`, there was no new repo,
> no CI, no daemon to run the governance model end-to-end, no proof that the
> HostAdapter contract held across the four host shapes the upstream proposal
> targets, and the specs were 14 monolithic `CL-01..CL-14` files describing
> a 14-package product.
>
> **After Horus**, `bic/claws` is a standalone repo. The binary is `claws`. Eleven
> packages sit at `packages/*/` with zero craftworks refs and zero stale `clawc`
> refs outside the retained CL-NN archive (each retired spec carries an explicit
> `Status: Retired` header + successor pointer). An end-to-end hybrid-fidelity sim
> harness proves the governance contract — decide/track/enforce+review — holds
> across four `HostAdapter` shapes: `OpenClawAdapter` (in-process), `LobsterAdapter`
> (MCP over stdio), `AetherAdapter` (gRPC/mTLS), `ClawsServiceAdapter` (HTTP+SSE).
> The monolithic spec tree is superseded by **14 per-package doc trees** with a
> four-way atoms oracle that enforces `atom ↔ need-file ↔ scenario-series`
> consistency on every PR. 77 pulses, 7 checkpoints (CP-7 moved to Wepwawet), 94
> atoms, 17 scenarios, 60 new tests, zero oracle orphans.

---

## Three acts

### 1 · Extraction (CP-1 through CP-4)

The filter-repo lift. `packages/*` in `c:\src\craftworks\clawc-sdk\` becomes
`packages/*` in `c:\src\claws\`. Every `clawc` reference in emitted code, bin
scripts, and TOOLS.md examples becomes `claws`. The 3-pass residue-grep at
`scripts/residue-grep.sh` runs in CI (`.github/workflows/no-craftworks.yml`) and
catches any re-introduction of `@craftworks/` or `clawc-` homoglyphs. Zero hits
today.

Package inventory on `bic/claws` after the lift:

```
packages/
  openclaw-workspace/      (WS)  — 14 src / 14 test files
  openclaw-guardrails/     (GR)  — 30 src / 11 test files
  openclaw-policy/         (PO)  — 42 src / 31 test files
  openclaw-snap/           (SN)  — 24 src / 21 test files
  openclaw-lsp/            (LS)  — 8 providers, 8 test files
  claws/                   (CX)  — the renamed CLI binary
  claws-sdk/               (SK)  — enterprise SDK + compiler internals
  claws-serve/             (SV)  — 43-route HTTP+SSE daemon
  claws-action/            (AC)  — GitHub Action (SARIF + severity gate)
  claws-skill-kit/         (KT)  — skill authoring SDK (runtime + build + three-rings)
  claws-test/              (TX)  — accept-runner + doc-validation + no-craftworks gate
```

`bic` operations scaffolded in CP-4: CODEOWNERS, branch protection, release
playbook, cross-platform CI matrix (ubuntu / windows / macos × node 20/22).

### 2 · Proof — E2E simulation harness (CP-5 through CP-6)

The upstream-proposal contract — `decide / track / enforce+review` with an
async `approvalHandle` binding — gets exercised end-to-end in
`test/e2e/harness/` with **real `snap serve` + real generated plugin + real
`claws` CLI** under in-process host + companion mocks.

#### `HostAdapter` — the 4-method contract, 4 concrete implementations

```ts
// docs/guardrails/specs/GRD-host-adapter.md
interface HostAdapter {
  readonly id: string;
  extractIdentity(req: HostRequest): Principal;
  routePolicy(req: HostRequest, workspace: WorkspaceAST): PolicyIR;
  getApprovalSink(): ApprovalSink;
  shapeResponse(result: ExecutionResult, req: HostRequest): HostResponse;
}
```

Four methods, four adapters, four `GRD/SC-*.md` scenarios that prove the shape
holds for each host:

| Adapter | Host | Wire | Identity signal | Approval sink |
|---------|------|------|-----------------|---------------|
| `OpenClawAdapter` | OpenClaw core (in-process hook) | direct call | HostContext | `InMemorySink` |
| `LobsterAdapter` | Lobster editor MCP | stdio | MCP session | bespoke MCP channel |
| `AetherAdapter` | Aether (Workday-grade gateway) | HTTPS / gRPC | mTLS subject CN | gRPC streaming sink |
| `ClawsServiceAdapter` | `claws serve` standalone | HTTP + SSE | bearer / session cookie | SSE channel |

The harness wires `enforce()` against each adapter in turn, fires a real review
decision, lets the companion mock respond, verifies the audit-chain cross-links
(decision → approval → execution) through `correlationId` and `policyArtifactSha256`,
and asserts the 7-tuple `ApprovalHandle` binding holds under every attack vector
in the test matrix.

#### The 17 scenarios landed this wave

```
workspace/scenarios/
  WSP/ (3 URI rejection vectors)
    SC-01-traversal.md           — oc://..//etc/passwd
    SC-02-drive-letter.md        — oc://C:/secrets
    SC-03-symlink-escape.md      — symlink resolves outside workspaceRoot
  WSC/ (3 canonicalizer byte-identity)
    SC-01-byte-identity.md       — 3-consumer agreement (policy, snap, audit)
    SC-02-cross-platform.md      — ubuntu/windows/macos byte-identical
    SC-03-version-mismatch.md    — canonicalizerVersion mismatch detection

guardrails/scenarios/
  GRD/ (4 HostAdapter shapes)
    SC-01-openclaw.md, SC-02-lobster.md, SC-03-aether.md, SC-04-claws-service.md
  + audit-chain corruption scenarios (correlation-mismatch, chain-gap, hash-mismatch)
  + ApprovalSink conformance suite (2 reference sinks)

snap/scenarios/
  SNP/ (3 non-uplift semantics)
    SC-01-promote-happy.md        — atomic swap, SSE event order
    SC-02-non-uplift.md           — Rule 1: in-flight decisions complete against pre-promote snapshot
    SC-03-drain-timeout.md        — DrainEntry timeout + abort + rollback
```

Plus parallel-execution hardening: `test/e2e/vitest.config.ts` now sets
`fileParallelism: false` on integration + accept projects so real-process-spawning
tests serialize (fixes flakes under full-sweep load).

#### The 7-tuple `ApprovalHandle` binding

R5 reviews stall the call with a signed `ApprovalHandle`. The binding validator
at `packages/openclaw-guardrails/src/handle-binding/` checks **all seven fields
in a first-failing order** before accepting the associated `ApprovalEntry`:

```ts
interface ApprovalHandle {
  readonly providerId: string;       // 1. which GuardrailProvider
  readonly contentHash: string;      // 2. sha256 over canonicalized args
  readonly sequenceNumber: number;   // 3. per-chain monotonic
  readonly approverPrincipal: string;// 4. who can approve
  readonly keyId: string;            // 5. HMAC key identifier
  readonly ttl: number;              // 6. absolute epoch ms
  readonly nonce: string;            // 7. 32-byte base64url, one-shot
  readonly signature: string;        // HMAC-SHA256 over 1..7
}
```

Each field defends a specific replay vector — `contentHash` blocks arg
substitution, `sequenceNumber` blocks cross-handle replay, `nonce` blocks
in-scope replay, `ttl` blocks captured-and-held attacks. Every failure
returns a distinct `invalidReason` code surfaced through the audit chain.

### 3 · Per-package spec reboot + oracle (CP-8)

The monolithic `docs/specs/CL-01..CL-14` tree described a 14-package product
with 14 top-level specs. That model scales poorly. Horus replaces it with
**one doc directory per package or domain**, each following the same three-file
root convention (`README.md` + `ATOMS.md` + `CHANGELOG.md`) and typed content
subdirectories (`specs/`, `guides/`, `pitfalls/`, `scenarios/`, optional
`how-tos/` and `tutorials/`).

---

## The 14 package + domain doc trees

### Incubating `@bic/openclaw-*` (upstream-bound)

```
docs/workspace/          (WS)  — typed AST + oc:// URIs + canonicalizer + lossless emitter
  specs/   WS-workspace · WSP-path · WSC-canonicalize · WSA-ast · WSE-emitter
  guides/  getting-started · uri-handling
  how-tos/ defence-in-depth
  pitfalls/ path-handling · canonicalize
  scenarios/ WSP/* · WSC/*

docs/guardrails/         (GR)  — GuardrailProvider + audit chain + approval handle + host adapter
  specs/   GR-guardrails · GRG-guardrail-provider · GRF-file-ingest · GRA-audit-chain
           GRH-approval-handle · GRD-host-adapter · GRT-trust-set · GRR-runtime
  guides/  approval-flow · file-ingest-review · decision-vocabulary · host-adapter-contract
  how-tos/ inject-clock (P-17) · reload-trust-set
  pitfalls/ composition · path-and-binding
  scenarios/ GRD/*

docs/policy/             (PO)  — workspace → PolicyIR compilation pipeline (public surface)
  specs/   PO-policy · POI-policy-ir · POC-compiler
  guides/  using-the-compiler
  tutorials/ first-policy
  pitfalls/ failmode

docs/snap/               (SN)  — snapshot lifecycle daemon (state machine, HTTP API, non-uplift)
  specs/   SN-snap · SNS-state-machine · SNA-api · SNP-promote
  guides/  snapshot-lifecycle
  pitfalls/ promote
  scenarios/ SNP/*

docs/lsp/                (LS)  — LSP server + governance badge + WHAT+HOW+WHERE error contract
  specs/   LS-lsp · LSP-protocol · LSB-governance-badge · LSE-error-contract
  guides/  badge-lifecycle · error-messages
  pitfalls/ badge
```

### Internal `@bic/claws-*` (never upstream)

```
docs/cli/                (CX)  — the `claws` CLI binary
  specs/   CX-cli · CXS-command-surface (4/18/40 progressive disclosure)
           CXJ-claws-json (three-layer merge) · CXP-platform-detection (7-platform matrix)
  guides/  command-groups · platform-matrix
  pitfalls/ config

docs/action/             (AC)  — GitHub Action (SARIF + severity gate + cache)
  specs/   AC-action · ACS-sarif-pipeline · ACC-action-cache
  guides/  github-action-setup
  pitfalls/ severity

docs/sdk/                (SK)  — enterprise SDK + 29 G-rule compiler internals
  specs/   SK-sdk · SKA-public-api · SKG-graduation · SKI-subpath-imports
           SKC-compiler-internals · SKF-fleet-runtime · SKR-relax-engine
  guides/  graduation-criteria · pass-ordering
  pitfalls/ imports · cache

docs/serve/              (SV)  — 43-route HTTP+SSE daemon (Cap-surfaces + trust escalation)
  specs/   SV-serve · SVR-rest-api · SVI-workspace-introspect · SVC-cap-surfaces
  guides/  cap-integration · session-model
  pitfalls/ trust

docs/skill-kit/          (KT)  — skill authoring SDK (runtime + build + three-rings)
  specs/   KT-skill-kit · KTR-skill-runtime · KTB-skill-build · KTA-three-rings
  guides/  adoption-path
  tutorials/ first-skill
  pitfalls/ build

docs/test/               (TX)  — accept-runner + 17-code doc gate + no-craftworks gate
  specs/   TX-test · TXA-accept-runner · TXD-doc-validation · TXN-no-craftworks
  guides/  accept-test-system · no-craftworks
  pitfalls/ validation
```

### Cross-cutting domains

```
docs/security/           (SM)  — threat model, R1-R5 tiers, OBO boundary, 16 injection rules
docs/upstream/           (UG)  — contribution roadmap, R5 pre-merge guard, scope-flip mechanics
docs/repo/               (RB)  — package location rules, DAG, 4 oracle invariants, 11-layer enum
```

### 8 CL-NN specs retired, 2 promoted

Retired specs stay in place at `docs/specs/CL-*.md` with explicit
`Status: Retired` headers + successor pointers. They are reference-only;
content is preserved for provenance + historical-discussion value.

| Retired | Successor |
|---------|-----------|
| CL-03 runtime-enforcement | `guardrails/specs/GR-guardrails.md` + `GRR-runtime.md` |
| CL-04 compilation-pipeline | `policy/specs/PO-policy.md` + `POI-policy-ir.md` + `POC-compiler.md` |
| CL-06 platform-ecosystem | per-package primary specs |
| CL-07 deep-integration | `guardrails/specs/GRG` + `GRD` + `GRF` + `snap/specs/SNP` (Horus amendments A+B merged pulse 73) |
| CL-08 freemium-boundary | `sdk/specs/SK-sdk.md` + `upstream/specs/UG-upstream.md` |
| CL-09 oc-workspace-format | `workspace/specs/WS` + `WSA` + `WSE` + `WSP` + `WSC` |
| CL-12 approval-event-schema | `guardrails/specs/GRA-audit-chain.md` |
| CL-14 emitter-architecture | `workspace/specs/WSE-emitter.md` |

**Promoted** from pulse-73 drafts to canonical v1.0 specs:

- **CL-15 canonicalizer** — byte-identical RFC 8785 JCS across 3 consumers on
  ubuntu/windows/macos; algorithm version field; pre-hashing contract
- **CL-16 oc-uri-canonical** — `oc://` URI grammar + 12 rejection vectors +
  defence-in-depth 3-layer validation

---

## The atoms oracle

The per-package `ATOMS.md` files are the authoritative atom registry — no
monolithic inventory. The oracle at `tools/atoms-oracle/bidirectional-sweep.ts`
enforces **four invariants** simultaneously per CL-13 v1.8 §N.1:

```
  atom ──▶ need-satisfying file (spec-prefix-match or covers: frontmatter)
    │
    ├──▶ scenario-series (scenarios/{CODE}/ with covers: frontmatter)
    │
  covers-reference ──▶ atom (every covers: [atom:X] must be declared)
    │
  series-dir ──▶ atom (every scenarios/{CODE}/ must map to a declared atom)
```

Run against the shipped tree:

```
$ npx tsx tools/atoms-oracle/bidirectional-sweep.ts --docs-dir docs/
atoms-oracle sweep: 94 atoms, 0 orphans (66ms)
```

Evidence sidecar at `.audit/migrations/horus/close/atoms-oracle-sweep-evidence.json`.

---

## Tooling landed this wave

Four `devtools/` + `tools/` suites, 60 tests:

### `devtools/repo-ops/` (27 tests)

Single-binary doc validator with four passes:

- **doc-structure** — required files (README/ATOMS/CHANGELOG), required subdirs
  (specs/guides/scenarios), no extra top-level `.md`
- **atom-coverage** — every atom's declared `Needs` met by a spec-prefix match
  or a doc file with `covers: [atom:X]` frontmatter
- **readme-reachability** — every `.md` reachable from the root `README.md`
  link chain
- **accept-runner** — manifest-driven scenario discovery: every
  `scenarios/{CODE}/` dir matches a manifest entry + meets its min-count;
  unregistered runners emit WARN (not BLOCK) so implementation pulses can
  stage scenarios ahead of the runner

### `tools/atoms-oracle/` (9 tests)

Load-registry + bidirectional sweep + evidence emitter. Keyed cache
(`AtomsRegistryCache`) so multiple `--check` invocations in one `claws doctor`
run share a single parse (P-08 mitigation).

### `tools/doc-sync/` (6 tests)

Drift detection between `docs/specs/README.md` and `CL-*.md` files on disk;
between `docs/README.md` and per-package `ATOMS.md` directories on disk.
Reports missing-in-index and stale-in-index findings with precise paths.

### `tools/guide-deploy/` (18 tests)

Idempotent migration driver + three link-rewrite rules:

1. same-subdir siblings: `./concepts--atoms-registry.md` → `./atoms-registry.md`
2. cross-subdir siblings: `./governance--approval-flow.md` (from concepts) →
   `../governance/approval-flow.md`
3. unprefixed: `./host-adapter-contract.md` — unchanged from concepts source,
   `../concepts/host-adapter-contract.md` from elsewhere

Plus bare-filename + absolute-style + spec-draft-citation rewrites.
`verify-links.ts` walks `docs/**.md` and asserts every relative `.md` target
resolves. Idempotent — second run writes zero files.

---

## CI wiring (6 workflows on `.github/workflows/`)

| Workflow | Scope | Matrix |
|----------|-------|--------|
| `ci.yml` | build + `npm test` + per-package tsc + CLI boot smoke | ubuntu + windows |
| `acceptance.yml` | L3: unit/integration/e2e/accept on packages/claws + residue-grep | ubuntu/windows/macos × node 20/22 |
| `canonicalizer-ci.yml` | 3-consumer byte-identity + parallel-canonicalizer guard + canonical-bytes artifact | ubuntu/windows/macos |
| `no-craftworks.yml` | 3-pass residue-grep (CL-13 v1.7) with auto-comment on violation | ubuntu |
| `test-e2e.yml` | full test/e2e: unit + integration + scenario + accept | ubuntu/windows/macos |
| **`repo-ops.yml`** (NEW) | **CP-8 tooling: 60 tests hard + atoms-oracle live-gate hard + repo-ops/verify-links informational** | **ubuntu + windows** |

The `repo-ops.yml` workflow has three jobs:

1. **`tests`** (hard) — 60 tests across the four tool suites on ubuntu + windows
2. **`live-gate-hard`** — atoms-oracle sweep must report 0 orphans;
   verify-indexes must report 0 drift; atoms-oracle evidence uploaded as
   artifact for audit
3. **`live-gate-informational`** — repo-ops check.ts + verify-links on the
   full `docs/` tree with `continue-on-error`. Reports the ~1,100 pre-existing
   BLOCK findings in legacy content (`docs/concepts/fleet-*`,
   `docs/traces/*`, `docs/proposals/openclaw-upstream/*`,
   `docs/getting-started/tutorial.md`, `docs/architecture/`) — out of
   Horus scope per pulse 74 §Key Constraints. Follow-on wave reconciles
   legacy and promotes these gates to hard

---

## Stats

| Metric | Count |
|--------|-------|
| Pulses committed | 77 (CP-1..CP-6 + CP-8; CP-7 moved to Wepwawet) |
| Checkpoints landed | 7 |
| Per-package doc dirs seeded | 14 (5 openclaw-* + 6 claws-* + 3 domains) |
| Atoms in registry | 94 |
| Oracle orphans (all 4 invariants) | 0 |
| CL-NN specs retired | 8 |
| CL-NN specs promoted | 2 (CL-15, CL-16) |
| Amendments merged (pulse 73) | 5 drafts → 3 canonical specs |
| New test cases (CP-8 tooling) | 60 (27 repo-ops + 9 atoms-oracle + 6 doc-sync + 18 guide-deploy) |
| Scenarios landed this wave | 17 (3 WSP + 3 WSC + 4 GRD + 3 SNP + 4 audit-chain/conformance) |
| HostAdapter shapes proven | 4 (OpenClaw, Lobster, Aether, ClawsService) |
| CI workflows | 6 (5 existing + 1 new `repo-ops.yml`) |
| `@craftworks/*` runtime imports | 0 (CI-guarded) |
| Stale `clawc` references | 0 outside retained CL-NN archive |

---

## Security posture

| Surface | Mitigation |
|---------|------------|
| R5 fail-closed | Pre-merge registry guard rejects any R5 tool with `failMode: 'open'` at policy-compile time; runtime backstop denies at invocation |
| Approval handle | 7-tuple binding validator checks providerId / contentHash / sequenceNumber / approverPrincipal / keyId / ttl / nonce in first-failing order; HMAC-SHA256 signature over canonical bytes |
| Audit chain | Hash-linked entries + correlationId cross-links (decision → approval → execution); 3 granular invalidReason codes for verifier findings (correlation-mismatch, chain-gap, hash-mismatch) |
| Nonce scope | Per-(keyId, snapshotId) consume-once semantics; replay across snapshots detected by audit cluster inspection |
| File-ingest redirect | `redirectPath` re-validated by `parseOcUri` + `resolveFsPath` at runtime — provider output never trusted |
| `oc://` URI path | 12 rejection vectors caught at three independent layers (parser, provider re-validation, runtime symlink check) |
| Canonicalizer byte-identity | CI matrix enforces ubuntu/windows/macos agreement on 20-vector fixture; divergence blocks merge |
| TOCTOU race | `resolveFsPath` runs inside syscall boundary with O_NOFOLLOW / REPARSE_POINT flags on platforms that support them |
| Trust-set reload | fs.watch failure path keeps prior set active — malformed reload NEVER leaves guardrails without a trust set |
| No-craftworks gate | 3-pass residue-grep CI gate + homoglyph detection (NFKC normalise + ASCII fold) catches Cyrillic-а attempts |

---

## Test Plan

### Local (captured in `.audit/migrations/horus/close/l3-acceptance-evidence.json`)

- [x] `npm run build` — all 11 packages build clean
- [x] `cd devtools/repo-ops && vitest run` — 27/27
- [x] `vitest run tools/atoms-oracle/` — 9/9
- [x] `vitest run tools/doc-sync/` — 6/6
- [x] `vitest run tools/guide-deploy/` — 18/18
- [x] `tsx tools/atoms-oracle/bidirectional-sweep.ts --docs-dir docs/` — 94 atoms, 0 orphans
- [x] `tsx tools/doc-sync/verify-indexes.ts --docs-dir docs/` — 0 drift findings

### CI matrix (on merge to main — workflows register once the workflow files land on default branch)

- [ ] `npm ci && npm run build` on ubuntu / windows / macos
- [ ] `tsc --noEmit` per-package
- [ ] `vitest run --coverage` — per-file 95/90/95/95 across all packages
- [ ] Canonicalizer byte-identity (CL-15) green on all 3 OSes
- [ ] `repo-ops.yml` tests job green on ubuntu + windows
- [ ] `repo-ops.yml` live-gate-hard: atoms-oracle 0 orphans + verify-indexes 0 drift
- [ ] `no-craftworks.yml` residue-grep clean
- [ ] `claws --help` + `claws policy --help` boot clean through the real binary

---

## Evidence (`.audit/migrations/horus/close/`)

| File | Pulse | What it captures |
|------|-------|------------------|
| `spec-merge-evidence.json` | 73 | 5 drafts → 3 canonical specs with version bumps |
| `guide-rewrite-evidence.json` | 74 | 18 guides deployed; per-guide source+dest SHAs + rewrite rules |
| `doctor-check-docs-output.txt` | 74 | `claws doctor` captured output |
| `atoms-oracle-sweep-evidence.json` | 75 | 94 atoms, 0 orphans, per-package breakdown |
| `index-reconciliation-evidence.json` | 76 | Indexes updated + tooling landed + tests passed |
| `PR-DRAFT.md` | 77 | this PR body |
| `l3-acceptance-evidence.json` | 77 | Horus-new tooling gate outcome |

---

## Reviewers — CP-8 panel

Cross-cluster tension model:

- `claws-repo-steward` — cross-repo state consistency, index surface taxonomy,
  FLAIR counts match evidence sidecars
- `claws-release-eng` — CI matrix alignment, coverage threshold compliance
  (per-file 95/90/95/95), L3 gate correctness
- `architect` — sub-spec boundaries (GRG/GRF/GRA/GRH/GRD/GRT/GRR partition
  guardrails without gaps), ATOMS.md parent/sub-atom relationships valid,
  no orphan parents
- `compliance` — SM captures all CL-02 R1-R5 rules; UG captures R5 pre-merge
  guard; RB captures CL-13 v1.8 oracle invariants; every evidence sidecar
  complete
- `testing` — manifest completeness, every scenario exercised, runner
  execution count matches manifest, no `describe.skip` / `it.skip`

---

## Hand-off

**Wepwawet (XCVII)** — next wave — consumes the E2E sim contract this PR
locks in. Its CP-1 is `claws-sim-host-presets` (moved from Horus CP-7),
scope reduced to 2 adapters (`AetherAdapter` + `ClawsServiceAdapter`)
wiring real integrations. The other 2 shapes (OpenClaw vanilla, Lobster)
stay sim-only for now.

**Later upstream wave** (TBD — gated on Peter greenlight) scope-flips
`@bic/openclaw-*` → `@openclaw/*`. The incubating packages are Alpha-stable
and ready for external review; `upstream/specs/UG-upstream.md` captures the
graduation roadmap + R5 pre-merge guard that will gate contribution PRs.

## What's NOT in this PR

Per pulse 74 §Key Constraints, this PR is not the place for:

- Legacy `docs/concepts/fleet-*`, `docs/traces/*`, `docs/architecture/`,
  `docs/proposals/openclaw-upstream/*`, `docs/getting-started/tutorial.md`
  reconciliation (~1,100 pre-existing BLOCK findings in pre-Horus content)
- Real aether / lobster / openclaw integration (Wepwawet's charter)
- Public scope-flip to `@openclaw/*` (future upstream wave)

The wave stays closed once this lands. Follow-on work happens in Wepwawet
or later, never by re-opening Horus.

---

*77 pulses. 7 checkpoints. 14 per-package doc trees. 94 atoms. 0 orphans.
4 HostAdapter shapes proven. 60 new tests. 8 specs retired, 2 promoted.
Zero craftworks refs. The binary is claws.*

🤖 Generated with [Claude Code](https://claude.com/claude-code)
