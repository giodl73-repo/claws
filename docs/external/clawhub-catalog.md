# ClawHub Registry Catalog

Comprehensive reference for claws governance compiler integration with ClawHub.
Source: `C:\src\openclaw-clawhub\` (commit snapshot, April 2026).

---

## 1. Architecture

ClawHub is a **Bun + Convex + React** monorepo deployed on Vercel (frontend) with Convex as the backend.

| Layer | Stack | Notes |
|-------|-------|-------|
| Frontend | React 19, TanStack Router, Vite 8, Tailwind 4 | SPA with Vercel hosting |
| Backend | Convex (serverless DB + functions) | Mutations, queries, actions, crons |
| Auth | `@convex-dev/auth` with GitHub OAuth | Token-based API auth for CLI |
| Search | Convex vector search + OpenAI embeddings | `text-embedding-3-small`, 1536 dimensions |
| Validation | ArkType (runtime schema validation) | Shared `clawhub-schema` package |
| CLI | Commander.js, published as `clawhub` on npm | Bun-native build, Node 20+ |
| Moderation | Static scan engine + VirusTotal + LLM eval (OpenAI) | Three-layer pipeline |

### Entry Points

- `convex/http.ts` -- HTTP router, all API routes
- `convex/schema.ts` -- Full Convex database schema
- `convex/skills.ts` -- Core skill mutations/queries
- `packages/clawhub/src/cli.ts` -- CLI entry point
- `packages/schema/src/index.ts` -- Shared types between CLI and API

### Packages (`packages/`)

| Package | Purpose |
|---------|---------|
| `clawhub` | CLI tool (`clawhub` / `clawdhub` commands) |
| `clawhub-schema` | Shared ArkType schemas, API route constants, types |

---

## 2. Skill Schema

Skills are the primary publishable entity. Each skill has a `skills` table row and associated `skillVersions`.

### Skills Table (`convex/schema.ts` line 228)

Required fields:
- `slug: string` -- lowercase url-safe identifier (`/^[a-z0-9][a-z0-9-]*$/`)
- `displayName: string`
- `ownerUserId: Id<"users">`
- `tags: Record<string, Id<"skillVersions">>` -- maps tag names (e.g., "latest") to version IDs
- `stats: { downloads, installsCurrent?, installsAllTime?, stars, versions, comments }`
- `createdAt: number`, `updatedAt: number`

Optional fields:
- `summary: string` -- auto-generated from SKILL.md content
- `ownerPublisherId: Id<"publishers">` -- org publisher
- `capabilityTags: string[]` -- derived from content analysis
- `badges: { redactionApproved?, highlighted?, official?, deprecated? }`
- `forkOf: { skillId, kind: "fork"|"duplicate", version?, at }`
- `softDeletedAt: number`
- All `moderation*` fields (see Section 5)
- `quality: { score, decision, trustTier, similarRecentCount, reason, signals }`

### Skill Versions Table (`convex/schema.ts` line 389)

- `skillId: Id<"skills">`
- `version: string` -- semver
- `changelog: string`
- `changelogSource: "auto" | "user"`
- `files: Array<{ path, size, storageId, sha256, contentType? }>`
- `parsed: { frontmatter, metadata?, clawdis?, moltbot?, license?: "MIT-0" }`
- `sha256hash: string` -- whole-version hash
- `vtAnalysis: { status, verdict?, analysis?, source?, checkedAt }`
- `llmAnalysis: { status, verdict?, confidence?, summary?, dimensions?, guidance?, findings?, model?, checkedAt }`
- `staticScan: { status, reasonCodes[], findings[], summary, engineVersion, checkedAt }`
- `capabilityTags: string[]`

### SKILL.md Structure

Every published skill requires a `SKILL.md` (or `skills.md`) file. The file contains:
- YAML frontmatter (parsed into `parsed.frontmatter`)
- Markdown body (used for summary generation, embedding, quality scoring)
- Frontmatter `metadata` field maps to `parsed.metadata`
- Frontmatter `always: true` triggers privileged-invocation scan flag

ClawDis metadata schema (`packages/schema/src/schemas.ts` line 407):
```typescript
type ClawdisSkillMetadata = {
  always?: boolean;       // persistent invocation
  skillKey?: string;
  primaryEnv?: string;
  emoji?: string;
  homepage?: string;
  os?: string[];          // platform constraints
  cliHelp?: string;
  requires?: { bins?, anyBins?, env?, config? };
  install?: SkillInstallSpec[];  // brew/node/go/uv
  nix?: NixPluginSpec;
  config?: ClawdbotConfigSpec;
  envVars?: EnvVarDeclaration[];
  dependencies?: DependencyDeclaration[];
  author?: string;
  links?: { homepage?, repository?, documentation?, changelog? };
};
```

**claws integration**: Governance metadata (badges, scan results, policy compliance) would extend
the `parsed.metadata` object or add new top-level fields to the skill/version schema.

---

## 3. Publish API

### V1 Multipart Publish (current)

**Endpoint**: `POST /api/v1/skills`
**Auth**: Bearer token (API token from `clawhub login`)
**Content-Type**: `multipart/form-data`

The CLI sends a `FormData` with:
- `payload` field: JSON string with publish metadata
- `files` field(s): file blobs with filenames as relative paths

Payload JSON (`CliPublishRequestSchema`):
```typescript
{
  slug: string;            // lowercase url-safe
  displayName: string;
  version: string;         // valid semver
  changelog: string;
  acceptLicenseTerms?: boolean;  // MIT-0
  tags?: string[];         // e.g., ["latest"]
  source?: {               // GitHub import provenance
    kind: "github";
    url: string; repo: string; ref: string;
    commit: string; path: string; importedAt: number;
  };
  forkOf?: { slug: string; version?: string };
  files: Array<{
    path: string; size: number;
    storageId: string; sha256: string;
    contentType?: string;
  }>;
}
```

**Response** (`ApiV1PublishResponseSchema`):
```json
{ "ok": true, "skillId": "...", "versionId": "..." }
```

### Publish Flow (`convex/lib/skillPublish.ts`)

1. Validate slug format, semver, displayName
2. Check GitHub account age requirement
3. Sanitize file paths, filter Mac junk files
4. Verify all files are text-based, check size limits
5. Require SKILL.md present
6. Parse frontmatter, extract ClawDis metadata
7. Generate summary (or use frontmatter description)
8. **Quality gate** (new skills only): score content quality, check trust tier, reject spam
9. **Static moderation scan** (`runStaticPublishScan`)
10. Generate embedding text and compute vector embedding
11. Derive capability tags
12. Hash files for fingerprint
13. Auto-generate changelog if not provided
14. Insert version + embedding into database
15. **Schedule async**: VirusTotal scan, LLM security evaluation, GitHub backup, Discord webhook

**claws integration point**: Step 9 is where `claws publish` governance badges would be injected.
The `parsed.metadata` field is extensible -- governance results could be stored there.
A new field like `governanceScan` on `skillVersions` could parallel `staticScan`/`vtAnalysis`/`llmAnalysis`.

### Legacy Publish (deprecated)

**Endpoint**: `POST /api/cli/publish`
Uses pre-uploaded files via `POST /api/cli/upload-url` then JSON body with storageIds.

### Package Publish (code-plugins, bundle-plugins)

**Endpoint**: `POST /api/v1/packages`
Uses `PackagePublishRequestSchema` with additional fields:
- `family: "skill" | "code-plugin" | "bundle-plugin"`
- `channel: "official" | "community" | "private"`
- `bundle?: { id?, format?, hostTargets? }`
- `manualOverrideReason?: string` (for trusted publisher override)

Supports trusted publisher auth via GitHub Actions OIDC tokens:
- `POST /api/v1/publish/token/mint` -- exchange OIDC for short-lived publish token

---

## 4. Search & Discovery

### Vector Search (`convex/search.ts`)

Search uses a **hybrid vector + lexical** approach:

1. **Embedding generation**: Query text is embedded using OpenAI `text-embedding-3-small` (1536 dimensions)
2. **Vector search**: Convex `vectorSearch` on `skillEmbeddings` table, filtered by `visibility: "latest" | "latest-approved"`, max 256 candidates
3. **Lexical matching**: Token-based exact/prefix matching on slug and displayName
4. **Lexical fallback**: Scans `skillSearchDigest` table (lightweight 800-byte projections)
5. **Scoring**: `vectorScore + lexicalBoost + popularityBoost`

Scoring constants:
```typescript
SLUG_EXACT_BOOST = 1.4
SLUG_PREFIX_BOOST = 0.8
NAME_EXACT_BOOST = 1.1
NAME_PREFIX_BOOST = 0.6
POPULARITY_WEIGHT = 0.08  // log1p(downloads)
```

### Search API

**V1**: `GET /api/v1/search?q=<query>&limit=<n>&nonSuspiciousOnly=<bool>&highlightedOnly=<bool>&capabilityTag=<tag>`

Response (`ApiV1SearchResponseSchema`):
```json
{
  "results": [{
    "slug": "...",
    "displayName": "...",
    "summary": "...",
    "version": "...",
    "score": 1.234,
    "updatedAt": 1234567890
  }]
}
```

### Indexing

Skills are embedded at publish time. The embedding text is built from:
- Frontmatter fields
- SKILL.md markdown body
- Contents of up to 40 additional text files

A `skillSearchDigest` denormalized table (~800 bytes per skill) accelerates search hydration.
An `embeddingSkillMap` lookup table (~100 bytes) avoids reading full 12KB embedding docs.

**claws integration**: Governance badges could influence search ranking. A governance-verified skill
could receive a ranking boost similar to `SLUG_EXACT_BOOST`. The `highlightedOnly` filter pattern
shows how badge-based filtering already works.

---

## 5. Moderation System

ClawHub has a **three-layer moderation pipeline** triggered at publish time:

### Layer 1: Static Scan Engine (`convex/lib/moderationEngine.ts`)

Runs synchronously during publish. Scans all file contents for:

| Check | Code | Severity | Scans |
|-------|------|----------|-------|
| Shell execution (child_process) | `suspicious.dangerous_exec` | critical | Code files |
| eval/new Function | `suspicious.dynamic_code_execution` | critical | Code files |
| Crypto mining patterns | `malicious.crypto_mining` | critical | Code files |
| WebSocket non-standard port | `suspicious.nonstandard_network` | warn | Code files |
| File read + network send | `suspicious.potential_exfiltration` | warn | Code files |
| process.env + network send | `suspicious.env_credential_access` | critical | Code files |
| Obfuscated payloads | `suspicious.obfuscated_code` | warn | Code files |
| Malicious install prompt | `malicious.install_terminal_payload` | critical | Markdown |
| Prompt injection patterns | `suspicious.prompt_injection_instructions` | warn | Markdown |
| Generated source template injection | `suspicious.generated_source_template_injection` | critical | Markdown |
| Exposed resource identifiers | `suspicious.exposed_resource_identifier` | critical | Markdown |
| URL shortener/raw IP installs | `suspicious.install_untrusted_source` | warn | Manifests |
| Privileged always:true | `suspicious.privileged_always` | warn | Frontmatter |
| Known blocked signature | `malicious.known_blocked_signature` | critical | Identity |

Engine version: `v2.4.0`. Findings are structured as `ModerationFinding`:
```typescript
{ code: string; severity: "info"|"warn"|"critical"; file: string; line: number; message: string; evidence: string }
```

### Layer 2: VirusTotal Scan (`convex/vt.ts`)

Runs asynchronously after publish. Builds a deterministic ZIP of skill files, submits to VT API.
Results stored in `skillVersions.vtAnalysis`.

### Layer 3: LLM Security Evaluation (`convex/llmEval.ts`)

Runs asynchronously after publish. Sends skill content to OpenAI Responses API with a security
evaluator system prompt. Produces multi-dimensional analysis:
```typescript
{
  status: "clean"|"suspicious"|"malicious"|"error";
  verdict: string;
  confidence: string;
  summary: string;
  dimensions?: Array<{ name, label, rating, detail }>;
  guidance?: string;
  findings?: string;
  model: string;
  checkedAt: number;
}
```

### Verdict Aggregation (`buildModerationSnapshot`)

The final moderation verdict combines all three layers:
- Static scan codes + VT status + LLM status
- When both VT and LLM report clean, certain static codes (e.g., `env_credential_access`) are suppressed
- Any `malicious.*` code forces `malicious` verdict
- Any remaining codes force `suspicious`
- Otherwise: `clean`

### Quality Gate (`convex/lib/skillQuality.ts`)

New skills from untrusted accounts go through a quality gate:
- Trust tiers: `low` (<30d or <10 skills), `medium` (<90d or <50), `trusted`
- Signals: body length, word count, uniqueness ratio, headings, bullets, template markers
- Decisions: `pass`, `quarantine`, `reject`
- Structural fingerprinting detects template spam

### Skill-Level Fields

```typescript
moderationVerdict: "clean" | "suspicious" | "malicious"
moderationReasonCodes: string[]
moderationEvidence: ModerationFinding[]
moderationSummary: string
moderationEngineVersion: string
moderationEvaluatedAt: number
moderationSourceVersionId: Id<"skillVersions">
manualOverride: { verdict: "clean", note, reviewerUserId, updatedAt }
isSuspicious: boolean  // denormalized for compound indexes
quality: QualityAssessment
```

**claws integration (G-SUPPLY)**: The static scan engine is the primary integration point.
claws could contribute governance-specific reason codes (e.g., `governance.policy_violation`,
`governance.supply_chain_risk`). The `ModerationFinding` structure maps directly to
claws's `StaticFinding` type. A new scan layer could run alongside the existing three.

---

## 6. CLI (`clawhub` command)

**Package**: `packages/clawhub/` (npm: `clawhub`, v0.10.0)
**Binary**: `clawhub` / `clawdhub`
**Built with**: Commander.js, published via Node ESM

### Subcommands

| Command | Description |
|---------|-------------|
| `login [--token]` | Browser OAuth or direct token |
| `logout` | Remove stored token |
| `whoami` | Validate token |
| `search <query>` | Vector search skills |
| `install <slug>` | Download into skills dir |
| `update [slug]` | Update installed skills |
| `uninstall <slug>` | Remove installed skill |
| `list` | List from lockfile |
| `explore` | Browse registry (sorted) |
| `inspect <slug>` | Fetch metadata/files |
| `publish <path>` | Publish skill from folder |
| `delete <slug>` | Soft-delete |
| `hide/unhide <slug>` | Toggle visibility |
| `sync` | Scan + publish new/updated |
| `star/unstar <slug>` | Highlight skills |
| `skill publish <path>` | Same as `publish` |
| `skill rename` | Rename with redirect |
| `skill merge` | Merge skills |
| `package explore` | Browse packages |
| `package inspect` | Package metadata |
| `package publish` | Publish code/bundle plugin |
| `package trusted-publisher get/set/delete` | Manage OIDC config |
| `transfer request/list/accept/reject/cancel` | Ownership transfer |
| `ban-user` | Admin: ban + delete |
| `set-role` | Admin: change role |

### Authentication

Token stored in global config (`~/.clawhub/config.json` or similar).
Sent as `Authorization: Bearer <token>` header.
Browser login flow creates API token via GitHub OAuth.

### Publish Flow (CLI side, `packages/clawhub/src/cli/commands/publish.ts`)

1. Resolve folder path, verify it's a directory (not a plugin)
2. Read auth token
3. Resolve registry URL
4. Derive slug from folder name (or `--slug`), display name from folder (or `--name`)
5. List all text files in folder (respecting `.gitignore`-style patterns)
6. Require SKILL.md
7. Build `FormData` with JSON payload + file blobs
8. `POST /api/v1/skills` with Bearer auth
9. Display result

---

## 7. Schema Package (`clawhub-schema`)

**Location**: `packages/schema/`
**Version**: 0.0.2 (private, workspace dependency)
**Validation**: ArkType (runtime + type-level)

### Exports

| Export | Contents |
|--------|----------|
| `clawhub-schema` (main) | All schemas, parse helpers, license constants |
| `clawhub-schema/licenseConstants` | MIT-0 license metadata |
| `clawhub-schema/routes` | `ApiRoutes` and `LegacyApiRoutes` constants |
| `clawhub-schema/textFiles` | Text file extension/content-type sets |

### Key Types

- `CliPublishRequest` -- publish payload from CLI
- `PackagePublishRequest` -- package publish payload
- `ClawdisSkillMetadata` -- skill frontmatter metadata
- `SecurityStatusSchema` -- `{ status, hasWarnings, checkedAt, model }`
- `PackageVerificationSummary` -- `{ tier, scope, summary, sourceRepo, sourceCommit, scanStatus }`
- `PackageStaticScan` -- `{ status, reasonCodes, findings[], summary, engineVersion, checkedAt }`
- `PackageLlmAnalysis` -- `{ status, verdict?, confidence?, summary?, dimensions?, model, checkedAt }`
- `ModerationFinding` (in moderation engine) -- `{ code, severity, file, line, message, evidence }`

---

## 8. API Surface

### V1 Routes (`packages/schema/src/routes.ts`)

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| GET | `/api/v1/search` | Search skills (vector + lexical) | No |
| GET | `/api/v1/resolve` | Resolve skill version by hash | No |
| GET | `/api/v1/download` | Download skill ZIP | No |
| GET | `/api/v1/skills` | List skills (paginated) | No |
| GET | `/api/v1/skills/{slug}` | Get skill detail | No |
| GET | `/api/v1/skills/{slug}/versions` | List versions | No |
| GET | `/api/v1/skills/{slug}/versions/{v}` | Get version detail | No |
| GET | `/api/v1/skills/{slug}/moderation` | Get moderation status | No |
| POST | `/api/v1/skills` | Publish skill (multipart) | Bearer |
| POST | `/api/v1/skills/{slug}/rename` | Rename skill | Bearer |
| POST | `/api/v1/skills/{slug}/merge` | Merge skills | Bearer |
| DELETE | `/api/v1/skills/{slug}` | Soft-delete skill | Bearer |
| GET | `/api/v1/packages` | List packages | No |
| GET | `/api/v1/packages/{name}` | Get package detail | No |
| GET | `/api/v1/packages/{name}/versions` | List releases | No |
| POST | `/api/v1/packages` | Publish package (multipart) | Bearer/OIDC |
| POST | `/api/v1/publish/token/mint` | Mint OIDC publish token | OIDC |
| GET | `/api/v1/plugins` | List plugins | No |
| GET | `/api/v1/code-plugins` | List code plugins | No |
| GET | `/api/v1/bundle-plugins` | List bundle plugins | No |
| GET | `/api/v1/whoami` | Current user info | Bearer |
| GET | `/api/v1/users` | Search users (admin) | Bearer |
| POST | `/api/v1/stars/{slug}` | Star skill | Bearer |
| DELETE | `/api/v1/stars/{slug}` | Unstar skill | Bearer |
| GET | `/api/v1/transfers/{dir}` | List transfers | Bearer |
| GET | `/api/v1/souls` | List souls | No |
| POST | `/api/v1/souls` | Publish soul | Bearer |

### Legacy Routes (deprecated, will be removed)

`/api/search`, `/api/skill`, `/api/skill/resolve`, `/api/cli/whoami`,
`/api/cli/upload-url`, `/api/cli/publish`, `/api/cli/telemetry/sync`,
`/api/cli/skill/delete`, `/api/cli/skill/undelete`

---

## 9. Versioning

### Semver Enforcement

- Versions must be valid semver (`semver.valid()` check at publish time)
- No pre-release filtering -- any valid semver string is accepted

### Tags

Skills use a `tags: Record<string, Id<"skillVersions">>` map.
Common tags: `"latest"`. The CLI defaults `--tags latest` on publish.
Tags point to version IDs, resolved at query time.

### Version Resolution

`GET /api/v1/resolve?slug=<slug>&hash=<sha256>` resolves a version by content hash.
Returns `{ match: { version } | null, latestVersion: { version } | null }`.

### Fingerprinting

Each version gets a `fingerprint` computed from `sha256` hashes of all files (sorted).
`skillVersionFingerprints` table tracks fingerprints per skill for deduplication.

### Dist Tags (Packages)

Package releases have `distTags: string[]` for npm-style tag management.

---

## 10. Extension Points for claws Integration

### A. Governance Badges in Publish Flow

**Where**: `convex/lib/skillPublish.ts`, after step 9 (static scan), before step 11 (insert).

**Approach**: Add a `governanceScan` field to `skillVersions` schema, parallel to `staticScan`:
```typescript
governanceScan: {
  status: "compliant" | "non-compliant" | "partial" | "not-run";
  policies: Array<{
    policyId: string;       // e.g., "G-SUPPLY-001"
    verdict: "pass" | "fail" | "warn";
    detail: string;
  }>;
  badges: string[];         // e.g., ["supply-chain-verified", "policy-compliant"]
  engineVersion: string;    // claws version
  checkedAt: number;
}
```

**Option A (API extension)**: ClawHub adds governance fields to `PackagePublishRequest`.
claws passes pre-computed governance results as part of the publish payload.

**Option B (Post-publish webhook)**: ClawHub fires a webhook after publish. claws's scan
service receives it, runs governance analysis, and calls back to update the version.

**Option C (External scan layer)**: Register claws as a fourth moderation layer alongside
static/VT/LLM. The `buildModerationSnapshot` function already aggregates multiple scan results.

### B. Governance Badges in Search Results

**Where**: `convex/search.ts` scoring function, `convex/lib/skillSearchDigest.ts`.

The `skillSearchDigest` denormalized table would need a `governanceBadges` field.
Search scoring could add a `GOVERNANCE_BOOST` constant (e.g., 0.5) for verified skills.
The existing `highlightedOnly` filter pattern provides the template for a `governanceVerified` filter.

### C. claws Security Scanning (G-SUPPLY)

**Where**: Parallel to `convex/lib/moderationEngine.ts`.

The `ModerationFinding` type is the exact shape claws needs:
```typescript
{ code: string; severity: "info"|"warn"|"critical"; file: string; line: number; message: string; evidence: string }
```

claws `StaticFinding` should align with this type. Governance reason codes would use a
`governance.*` prefix to avoid collision with ClawHub's `suspicious.*`/`malicious.*` namespace.

### D. Verification Tiers (Packages)

The packages system already has `PackageVerificationTier`:
```typescript
"structural" | "source-linked" | "provenance-verified" | "rebuild-verified"
```

claws governance could map to these tiers:
- `structural` -- basic schema/file checks pass
- `source-linked` -- governance policy references verified source
- `provenance-verified` -- full supply chain attestation
- `rebuild-verified` -- deterministic build reproduction confirmed

### E. Trusted Publisher Integration

`POST /api/v1/publish/token/mint` already supports GitHub Actions OIDC.
claws CI/CD integration could use the same OIDC flow to mint publish tokens
with governance attestations baked into the token claims.

### F. Required Schema Changes in ClawHub

To fully support claws integration, ClawHub would need:

1. **skillVersions**: Add `governanceScan` field (parallel to `staticScan`)
2. **skillSearchDigest**: Add `governanceBadges` field for search-time filtering
3. **packages schema**: Extend `verification` to include governance policy references
4. **API response schemas**: Include governance data in skill detail and version detail responses
5. **Search filter**: Add `governanceVerified` query parameter
6. **Moderation aggregation**: Include governance scan in `buildModerationSnapshot`
