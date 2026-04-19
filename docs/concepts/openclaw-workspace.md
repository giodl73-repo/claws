# `@openclaw/workspace`

<!-- atom:openclaw-workspace (C118) -->

## The short version

`@openclaw/workspace` is the single package holding everything that reads, addresses, or canonicalizes OpenClaw workspace content. It ships three tree-shakeable subpaths — `/path` for oc:// URIs and chunk contracts, `/ast` for PEG grammars and lossless parse/emit of the OC file family, `/canonicalize` for RFC 8785 JCS byte-stability. Policy, snap, and guardrails/audit all depend on it. One install, one version, zero runtime dependencies, published internally as `@bic/openclaw-workspace` and upstreamed as `@openclaw/workspace`.

---

## Why one package, not three

The three subpaths look independent until you notice the lock-step invariants.

| Invariant | Who relies on it | What happens if versions drift |
|-----------|------------------|-------------------------------|
| `policyId = sha256(canonicalize(PolicyIR \ {policyId}))` | `@openclaw/policy` at compile, `@openclaw/snap` at promote, `@openclaw/guardrails/audit` at verify | Policy hashes computed on the producer differ from hashes computed on the verifier — audit chain appears "tampered" on a healthy workspace |
| `emit(kind, parse(kind, content).ast) === content` | LSP edits, companion-app round-trip, migration tools | User edits a field in a UI, writes back, and the file diffs by whitespace / ordering — surprise merge conflicts on every save |
| `oc://{file}/...` resolves to the same AST node regardless of who parsed it | LSP diagnostics, audit entries, supervisor approvals, HTTP endpoints | An approval request names `oc://TOOLS.md/Tools/send-email` but the audit log names the same node differently — impossible to correlate |

Splitting `/canonicalize` from `/ast` lets the two drift independently. Splitting `/path` from `/ast` lets the URI schema and the file grammar contradict each other. The three concerns are shared utilities with a shared stability contract, so they ship together and version together. Consumers that only need one import from one subpath and tree-shake the rest.

**Strictest SemVer contract in the family.** Because `/canonicalize` carries byte-stability, the whole package bumps major on any output-byte change — even "bug fix" changes that bring output closer to RFC 8785 compliance, because they break `policyId` / `snapshotId` stability across versions. `/path` and `/ast` can be purely additive within a major.

---

## `/path` — oc:// URIs

The `oc://` URI scheme addresses a location inside an OC workspace. A single URI addresses the same thing in an editor diagnostic, an audit entry, a supervisor approval request, and an HTTP endpoint. No parallel naming schemes to keep in sync.

```ts
export interface OcPath {
  readonly file: string;         // e.g. 'TOOLS.md'
  readonly section?: string;     // H2 heading (e.g. 'Tools')
  readonly item?: string;        // item under section (e.g. 'send-email')
  readonly field?: string;       // field on item (e.g. 'args_from')
  readonly session?: string;     // optional ?session=... scope
}

export function parseOcPath(uri: string): OcPath;               // throws OcPathError
export function formatOcPath(path: OcPath): string;             // throws OcPathError
export function isValidOcPath(input: unknown): input is string; // never throws

export class OcPathError extends Error {
  readonly code: string;
  readonly input: string;
}
```

**Canonical form**: `oc://{file}[/{section}[/{item}[/{field}]]][?session={id}]`. Components nest strictly — `item` implies `section`, `field` implies `item`. Structural violations are rejected by `formatOcPath` with code `OC_PATH_NESTING`. The parser rejects missing scheme (`OC_PATH_MISSING_SCHEME`), empty file (`OC_PATH_EMPTY`), empty segments (`OC_PATH_EMPTY_SEGMENT`), and >4 segments (`OC_PATH_TOO_DEEP`). `code` is the stable machine-readable tag; downstream error handlers branch on it, never on `message`.

**Round-trip contract**: `formatOcPath(parseOcPath(s)) === s` for every valid path `formatOcPath` produces.

### Worked examples

| URI | What it addresses |
|-----|-------------------|
| `oc://SOUL.md` | The whole SOUL.md file |
| `oc://SOUL.md/Boundaries` | The "Boundaries" H2 section of SOUL.md |
| `oc://SOUL.md/Boundaries/deny-rule-1` | A specific deny rule under the Boundaries section |
| `oc://TOOLS.md/Tools/send-email/args_from` | The `args_from` field of the `send-email` tool |
| `oc://mcp-db/query/requires_approval` | The `requires_approval` field of the `query` tool on the `mcp-db` MCP server |
| `oc://TOOLS.md/Tools/send-email?session=cron:daily` | Same tool, scoped to the daily cron session |
| `oc://skills/email-drafter` | A skill (virtual root — `skills/` is a directory in the workspace registry) |

### Who uses it

| Consumer | How it uses oc:// URIs |
|----------|------------------------|
| LSP (`claws lsp`) | Diagnostics reference source via `oc://` so that a PatchError surfaces at the exact field in VS Code / Cursor |
| Serve + CAP API | Every chunk's `writeBack.url` and every governance warning carries an `oc://` path so the UI knows what to highlight |
| `claws serve` HTTP endpoints | Error responses include `oc://` paths in the `path` field — no file/line/column tuples on the wire |
| Supervisor companion apps | Approval requests name the target via `oc://`, so the same URI appears on the supervisor's phone and in the audit log |
| Audit chain | Every `AuditEntry` records the governance target as an `oc://` path, making cross-log queries trivially joinable |
| Migration tools | Pre-extraction migration rewrites MD paths to `oc://` for cross-tool portability |

### Workspace file registry

`/path` also ships the single authoritative list of files that make up an OC workspace on disk:

```ts
export const OC_WORKSPACE_FILES: readonly OcWorkspaceFile[]; // 9 entries
export const OC_PARSED_FILES: readonly OcParsedFile[];       // 7 markdown files surfaced on WorkspaceState
```

`OC_WORKSPACE_FILES` (9): `SOUL.md`, `TOOLS.md`, `AGENTS.md`, `MEMORY.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `skills/`, `lobster.yaml`. `OC_PARSED_FILES` (7) is the subset the parser surfaces as typed `SectionBase` fields on `WorkspaceState`.

### Chunk contracts

`/path` exports the authoritative wire shape for the Layer 2 CAP integration API — the JSON blob a CAP partner renders 1:1 as a UI component:

```ts
export const CHUNK_TABS: readonly ChunkTab[];               // 9 entries
export type Chunk<K extends ChunkTab = ChunkTab>;
export type ChunkAssemblyResult;                            // 9 chunks + snapshotStale flag
export type RiskClassification;                             // R1 read / R2 write / R3 communicate / R4 execute / R5 transact
export type ItemLock;                                       // source: 'r5' | 'fleet' | 'governance' | ...
export type ChunkGovernance;                                // risk + trustTier + warnings + violations
```

`CHUNK_TABS` is the ordered set: `general`, `preferences`, `connections`, `memory`, `groups`, `entitlements`, `trust`, `schedule`, `workqueue`. Per-tab data shapes (`GeneralData`, `ConnectionsData`, `MemoryData`, etc.) are exported alongside. Partners depend on these typed shapes — the TypeScript interface is the contract, scenario examples are illustrative and may drift.

**What is NOT exposed from `/path`**: `assembleChunks` itself — the serve-layer runtime that produces `Chunk<K>` values from a `WorkspaceState` + `GovernanceIR`. That lives inside `claws-sdk` because it depends on `GovernanceIR`, `CapabilityManifest`, and `FleetOverride` — types that belong in the compiler-side family, not in `@bic/openclaw-workspace`. `/path` ships the typed *contracts*; `claws-sdk/src/workspace/chunk-assembler.ts` ships the *runtime assembler* and imports its type contract from `@bic/openclaw-workspace/path`.

---

## `/ast` — parse, inspect, mutate, emit

```ts
export function parse<K extends WorkspaceFileKind>(
  kind: K,
  content: string,
): { ast: WorkspaceAst; diagnostics: readonly Diagnostic[] };

export function emit<K extends WorkspaceFileKind>(
  kind: K,
  ast: WorkspaceAst,
): string;

export function classify(path: string): WorkspaceFileKind | null;

export const grammars: Record<WorkspaceFileKind, string>; // raw PEG source
export const WORKSPACE_FILE_KINDS: readonly WorkspaceFileKind[];

export type WorkspaceFileKind =
  | 'agents' | 'config' | 'entities' | 'governance' | 'memory'
  | 'roles'  | 'skills' | 'soul'     | 'tasks'      | 'tools' | 'workflows';
```

Each `WorkspaceFileKind` has a concrete AST type (`SoulAst`, `ToolsAst`, `AgentsAst`, `GenericAst`); `WorkspaceAst` is the discriminated union. Every AST extends `BaseAst`, which carries `frontmatter`, `preamble`, H2-delimited `blocks`, and — critically — a byte-identical `raw` copy of the original source.

### The lossless round-trip

**Invariant**: for any `ast` produced by `parse(kind, content)` with pristine input, `emit(kind, ast) === content`, byte for byte.

The emitter implements this by preferring `ast.raw` whenever it's present. Structurally-aware emission is only used for newly-authored AST (no `raw`), which produces a canonical form: CRLF → LF, trailing whitespace stripped, single trailing newline. Callers that mutate a parsed AST and want byte-stability for unchanged regions should preserve `raw` on untouched blocks.

This matters because OC files are hand-edited. A supervisor opens TOOLS.md in VS Code, a companion app rewrites a single field through the CAP API, a migration tool rewrites paths — any of these that lose whitespace, re-order frontmatter keys, or drop foreign content will create a merge conflict on the next human edit. The round-trip invariant is how we guarantee that doesn't happen.

### The parse → mutate → emit loop

```ts
import { classify, parse, emit } from '@bic/openclaw-workspace/ast';
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'TOOLS.md';
const kind = classify(path);                        // 'tools' | null
if (kind === null) throw new Error(`not an OC workspace file: ${path}`);

const content = readFileSync(path, 'utf8');
const { ast, diagnostics } = parse(kind, content);  // typed ToolsAst

for (const d of diagnostics) {
  console.warn(`${path}:${d.line}: ${d.severity}: ${d.message}`);
}

// Mutate — add a new tool under the "Tool Guidance" section.
const mutated = {
  ...ast,
  raw: '',                                          // opt out of raw preservation
  tools: [...ast.tools, { tool: 'new-tool', guidance: 'usage prose' }],
};

writeFileSync(path, emit(kind, mutated));           // canonical emission
```

`diagnostics` are warnings and errors the parser surfaces without throwing — `AgentsAst` has no diagnostics, `ToolsAst` flags a malformed table separator, generic kinds run the base parser only. AST-level diagnostics replace the removed `diagnose(kind, content)` helper from earlier drafts; there is no separate diagnose function on `/path`.

`classify(path)` maps a filesystem path or basename to its `WorkspaceFileKind`. It handles both basename lookups (`SOUL.md` → `'soul'`, `lobster.yaml` → `'config'`, `IDENTITY.md` → `'entities'`) and directory prefixes (`skills/*` → `'skills'`, `workflows/*` → `'workflows'`, `roles/*` → `'roles'`). Returns `null` for anything outside the registry.

### Who consumes `/ast`

| Consumer | Why it uses parse/emit |
|----------|------------------------|
| `claws serve` workspace loader | Load all 7 parsed files into a typed `WorkspaceState` |
| LSP (`claws lsp`) | Structural highlighting, autocomplete, diagnostics surfaced via `parse(...).diagnostics` |
| `@openclaw/policy` Parse + Extract phases | Read SOUL / TOOLS / AGENTS to derive PolicyIR |
| `claws-sdk/workspace/chunk-assembler.ts` | Read AGENTS / IDENTITY / USER sections to build `Chunk<K>` values |
| CAP workspace-edit endpoints | Round-trip edits — parse, mutate one field, emit byte-identically for everything else |
| Supervisor companion apps | Round-trip when users edit policy via phone / tablet |
| Migration tools | Rewrite pre-extraction workspaces to current grammar without losing foreign content |
| Linters / CI guards | Validate structural shape and run diagnostics in PR checks |

**`WorkspaceFileKind` is owned here**; `/path` imports it type-only, re-exporting as a convenience for path-layer consumers that need to associate a file with its grammar. The dependency is one-directional: `ast` is a pure library with no imports from `/path`.

**`grammars`** exports all 11 `openclaw-*.peg` grammar strings verbatim. This is authority-of-record reference for grammar tooling and downstream PEG-compatible parsers; the runtime `parse` function uses a handwritten parser, not a PEG interpreter.

---

## `/canonicalize` — one function, every hash

```ts
export function canonicalize(value: unknown): string;
export function canonicalHash(value: unknown): string;
export function computeStrippedHash(obj: object, omit: readonly string[]): string;
export function safeParse(bytes: Uint8Array | string, options: { maxDepth: number }): unknown;
export const CANONICALIZER_VERSION: string;
export const CanonicalizeErrorCode: { NON_FINITE, UNDEFINED_IN_ARRAY, BIGINT, ... };
export class CanonicalizeError extends Error { readonly code: CanonicalizeErrorCodeValue; }
```

One canonicalizer, shared across the family. Every hash that matters on an OC workspace flows through this function.

| Consumer | What gets canonicalized |
|----------|------------------------|
| `@openclaw/policy` | `PolicyIR` → `policyId = canonicalHash(PolicyIR \ {policyId})` via `computeStrippedHash(ir, ['policyId'])` |
| `@openclaw/snap` | Workspace files → `snapshotId`. Promote-time re-canonicalizes PolicyIR for self-consistency |
| `@openclaw/guardrails/audit` | Each `AuditEntry` before hashing into the chain |
| `@openclaw/snap` upload / promote | `safeParse(bytes, { maxDepth: 100 })` at the tokenizer boundary before handing parsed JSON to `canonicalize` |
| `@openclaw/guardrails/audit.verify()` | Same — `safeParse` on persisted entries before re-canonicalizing |

### Byte-parity matrix

RFC 8785 compliance alone is not enough. The extended rules (C-1 through C-15 in the workspace.md proposal) make the contract explicit enough that three independent implementations written against them produce identical bytes for every valid input. CI enforces this by running the fixture vector set against every PR:

| Dimension | Matrix |
|-----------|--------|
| OS | Linux x64, Windows x64 (blocking); macOS arm64 (nightly against trunk) |
| Node | 20 LTS, 22 LTS (blocking); 18 LTS (nightly — legacy compatibility) |
| Consumer | `@openclaw/policy` generate, `@openclaw/snap` promote, `@openclaw/guardrails/audit` verify |
| Gate | `canonicalize-stability` CI job runs fixture vectors against merge-base `canonicalize.ts` AND the PR's — any vector producing different bytes without a major-bump fails the PR |

Bun and Deno are tracked as non-blocking informational matrix only. Their `Number.prototype.toString` historically differs from V8 for subnormals and large-exponent edge cases; we do not declare support until the full fixture set plus 500 randomly-generated `AuditEntry` variants pass under the alternate runtime.

### Why this rule-by-rule

RFC 8785 alone is insufficient to guarantee cross-consumer byte-parity — it defers number formatting to ECMAScript and is silent on error handling, depth limits, and non-JSON JavaScript values. The extended rules close those gaps:

| Rule | Why it matters |
|------|----------------|
| C-1 | Keys that are NFC-stable but collapse under NFKC (e.g. `ﬁle` vs `file`) throw `E_NFKC_COLLAPSIBLE`. Without this, a filesystem-layer or IdP-layer consumer that normalizes NFKC after we hash opens a cross-layer forgery window. |
| C-2 | UTF-16 code-unit key sorting per RFC 8785 §3.2.3. Not byte-wise, not locale-aware. |
| C-3 | UTF-8 output, no BOM, no trailing newline. |
| C-4 | `NaN` / `±Infinity` throw `E_NON_FINITE`. Never silently become `null` — that's a chain-forgery vector. |
| C-5 | Integer doubles in ±2⁵³ serialize without `.0`. `-0` serializes as `0`. |
| C-6 | Non-integer finite doubles use ES6 shortest-round-trip stringification. |
| C-7 | Subnormals round-trip as shortest form. No flush-to-zero. |
| C-8 | Arrays preserve order. No sorting. |
| C-9 | `{}` / `[]` emit exactly two bytes. |
| C-10 | Depth > 100 throws `E_DEPTH`. DoS defense for the audit verifier. |
| C-11 | `undefined` in object drops the key; `undefined` in array throws `E_UNDEFINED_IN_ARRAY`. |
| C-12 | `BigInt`, `Symbol`-keyed entries, class instances throw typed codes per kind. |
| C-13 | `Date` objects throw `E_NON_PLAIN_OBJECT` — callers serialize to ISO-8601 `Z` strings first. |
| C-14 | Two keys that collapse to the same NFC form throw `E_DUPLICATE_KEY_AFTER_NFC`. Silent merge is a chain-forgery vector. |
| C-15 | Callers MUST invoke `safeParse(bytes, { maxDepth: 100 })` at the tokenizer boundary before handing untrusted JSON to `canonicalize()`. `JSON.parse` has no depth ceiling and a depth-10⁶ input stack-overflows V8 before C-10 ever runs. |

### `canonicalHash` output format

`canonicalHash(obj)` returns a prefixed string: `sha256-<base64url>`. The prefix is load-bearing. Any future algorithm change (SHA-3, BLAKE3) is a major version bump AND produces a visually distinguishable prefix, so orphaned-vs-current hashes are obvious in logs. `canonicalHash` never emits a bare hex digest.

`computeStrippedHash(obj, omit)` is the one helper shared across the family — `@openclaw/policy` (PolicyIR → policyId, omitting `policyId`) and `@openclaw/snap` (promote-time PolicyIR self-consistency) both call it, so a drift in one implementation never desyncs the other.

### What to tell the auditor

The hash under every `policyId`, every `snapshotId`, and every `AuditEntry` signature is produced by a single canonicalizer. CI proves that every supported runtime (Node 20 + Node 22, on Linux and Windows per-PR) produces identical bytes for the same logical input. The canonicalizer has a strict SemVer contract: any output-byte change — even bug fixes that bring output closer to RFC 8785 compliance — is a major version bump, caught by a fixture-vector gate on every PR. An auditor verifying a chain from a different machine with a different OS gets byte-for-byte the same hashes, or CI fails before merge.

---

## See also

- [Upstream Contribution Strategy](upstream-contrib.md) — how `@openclaw/*` packages are stabilized, extracted, and upstreamed
- [`@openclaw/policy`](openclaw-policy.md) — policyId derivation via `computeStrippedHash(ir, ['policyId'])`
- [`@openclaw/snap`](openclaw-snap.md) — snapshotId + promote-time PolicyIR self-consistency
- [`@openclaw/guardrails`](openclaw-guardrails.md) — audit-chain entries hashed through `canonicalize`
- [Audit Chain](audit-chain.md) — hash-chained governance decisions; every entry flows through this canonicalizer
- [Snapshot Integrity](snapshot-integrity.md) — byte-stability contract seen from the snap side
