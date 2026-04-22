# bic/claws — Documentation Index

Top-level navigation for the per-package doc tree. Each package and
domain directory follows the same layout: `README.md`, `ATOMS.md`,
`CHANGELOG.md` at root; content in typed subdirectories (`specs/`,
`guides/`, `tutorials/`, `how-tos/`, `pitfalls/`, `scenarios/`).

## Package directory map

### Incubating openclaw-* (upstream-bound)

| Code | Package | Description | README |
|------|---------|-------------|--------|
| **WS** | `@bic/openclaw-workspace` | Typed AST, `oc://` URIs, canonicalizer, lossless emitter | [./workspace/README.md](./workspace/README.md) |
| **GR** | `@bic/openclaw-guardrails` | GuardrailProvider, audit chain, approval handle, host adapters | [./guardrails/README.md](./guardrails/README.md) |
| **PO** | `@bic/openclaw-policy` | Workspace → PolicyIR compilation pipeline | [./policy/README.md](./policy/README.md) |
| **SN** | `@bic/openclaw-snap` | Snapshot lifecycle daemon, HTTP API, non-uplift rules | [./snap/README.md](./snap/README.md) |
| **LS** | `@bic/openclaw-lsp` | LSP server: diagnostics, hover, governance badge | [./lsp/README.md](./lsp/README.md) |

### Internal claws-* (never upstream)

| Code | Package | Description | README |
|------|---------|-------------|--------|
| **CX** | `@bic/claws` | CLI binary (`init`, `doctor`, `snap`, `policy` groups) | [./cli/README.md](./cli/README.md) |
| **AC** | `@bic/claws-action` | GitHub Action: SARIF pipeline + severity gate | [./action/README.md](./action/README.md) |
| **SK** | `@bic/claws-sdk` | Enterprise SDK + compiler internals (29 G-rules) | [./sdk/README.md](./sdk/README.md) |
| **SV** | `@bic/claws-serve` | 43-route HTTP + SSE daemon, Cap-surface integration | [./serve/README.md](./serve/README.md) |
| **KT** | `@bic/claws-skill-kit` | Skill authoring SDK, three-rings adoption model | [./skill-kit/README.md](./skill-kit/README.md) |
| **TX** | `@bic/claws-test` | Accept-runner, 17-code doc gate, no-craftworks gate | [./test/README.md](./test/README.md) |

## Domain dirs

| Code | Domain | Description | README |
|------|--------|-------------|--------|
| **SM** | security | Threat model, R1-R5 tiers, injection defences, compliance | [./security/README.md](./security/README.md) |
| **UG** | upstream | Contribution roadmap, R5 pre-merge guard, scope-flip | [./upstream/README.md](./upstream/README.md) |
| **RB** | repo | Package location rules, dependency DAG, oracle invariants | [./repo/README.md](./repo/README.md) |

## How to navigate

- **Looking for a spec**: start in `{package}/specs/` — every spec has
  a 2- or 3-letter code you can cite
- **Looking for how-to guidance**: start in `{package}/guides/` or
  `{package}/how-tos/` — guides are conceptual, how-tos are task-oriented
- **Adding a new atom**: see [upstream/guides/contribution-workflow.md](./upstream/guides/contribution-workflow.md)
  + the package's own `ATOMS.md`

## Structure rules

Every package and domain directory is validated against four oracle
invariants by `devtools/repo-ops/src/check.ts` (see
[repo/specs/RB-repo-boundary.md § 4 oracle invariants](./repo/specs/RB-repo-boundary.md)):

1. **atoms registry authority** — every atom has its `Needs` met
2. **doc-validation authority** — top-level files are exactly
   `README.md + ATOMS.md + CHANGELOG.md`; no extras; required subdirs
   present
3. **accept-test authority** — every `scenarios/{CODE}/` has a
   manifest entry + meets min-count
4. **no-craftworks gate** — no references to craftworks-internal paths

Violations block CI. Run `tsx devtools/repo-ops/src/check.ts --docs-dir
docs/` locally before pushing.

## Code registry

Two-letter codes (packages + domains):

| Code | Meaning | Upstream target |
|------|---------|-----------------|
| WS | workspace package | `@openclaw/workspace` |
| GR | guardrails package | `@openclaw/guardrails` |
| PO | policy package | `@openclaw/policy` |
| SN | snap package | `@openclaw/snap` |
| LS | lsp package | none (internal) |
| CX | cli binary | none (internal) |
| AC | claws-action | none (internal) |
| SK | claws-sdk | none (internal) |
| SV | claws-serve | none (internal) |
| KT | claws-skill-kit | none (internal) |
| TX | claws-test | none (internal) |
| SM | security model | (internal reference, absorbs CL-02) |
| UG | upstream governance | (internal reference, extends CL-11) |
| RB | repo boundary | (internal reference, absorbs CL-13) |

Three-letter sub-spec codes use the package's two-letter code as
prefix (e.g., WSP, WSC, WSA, WSE under WS).

## Legacy

Legacy narrative guides from the Horus wave live at
`docs/{concepts,governance,testing,host-presets,contributing}/`.
These are retained verbatim as reference; the per-package docs
above are canonical for implementation guidance.

Retired CL-NN specs in `docs/specs/` carry explicit
`Status: Retired` headers pointing at their successor in the
per-package tree. See [repo/specs/RB-repo-boundary.md](./repo/specs/RB-repo-boundary.md).
