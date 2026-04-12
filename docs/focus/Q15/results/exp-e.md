# exp-e: Adoption Path for Existing 5,198 Skills

**Question**: Q12o -- How does claws help makers create skills?
**Experiment**: Design the incremental adoption path for the existing OC skill ecosystem
**Method**: Design analysis
**Date**: 2026-04-11

---

## Ecosystem Snapshot

The OC skill ecosystem has 5,198 published skills on ClawHub. These skills were built
without governance, without typed frameworks, and without standardized testing. claws
must meet them where they are.

The adoption path is incremental: no skill needs a rewrite to benefit from claws. Three
tiers provide increasing governance coverage with increasing effort.

---

## Three-Tier Adoption Model

```
Effort ─────────────────────────────────────────────────────────────── ▶

  Tier 1                    Tier 2                    Tier 3
  ──────────                ──────────                ──────────
  Governance                Import                    Full claws
  Frontmatter               @bic/claws-skill-kit          Build

  3 lines YAML              15 min refactor           claws import
  Zero code change          Minor code change         Full rewrite

  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
  │ SKILL.md    │           │ SKILL.md    │           │ SKILL.md    │
  │ + governance│           │ + governance│           │ + governance│
  │             │           │ handler.ts  │           │ src/        │
  │             │           │ uses skill()│           │  handler.ts │
  │             │           │             │           │  types.ts   │
  │             │           │             │           │ tests/      │
  │             │           │             │           │ dist/       │
  │             │           │             │           │ .claws-     │
  │             │           │             │           │  manifest   │
  └─────────────┘           └─────────────┘           └─────────────┘

  Badge: DECLARED            Badge: TYPED               Badge: VERIFIED
```

---

## Tier 1: Governance Frontmatter Only

### What changes

Add a `governance:` block to SKILL.md frontmatter. No code changes. No new
dependencies. No new files. The skill continues to work exactly as before.

### Effort

| Metric | Value |
|--------|-------|
| Time | 2-5 minutes |
| Code changes | 0 |
| New dependencies | 0 |
| New files | 0 |
| Risk of breakage | Zero |

### How to do it

```diff
 ---
 name: my-skill
 description: A useful skill
 version: 1.0.0
+governance:
+  risk: R2
+  capabilities:
+    - READ
+  data:
+    - INTERNAL
 ---
```

That's it. Three to six lines of YAML. The existing OC runtime ignores unrecognized
frontmatter fields, so this change is backward-compatible.

### What you get

| Benefit | Description |
|---------|-------------|
| **Governance badge** | ClawHub shows "R2 - READ - INTERNAL" on the skill page |
| **Risk visibility** | Enterprise admins can filter by risk level |
| **Fleet scan coverage** | `claws scan` detects and reports this skill |
| **`claws pinch` baseline** | `claws pinch` validates the declared governance |
| **Install-time check** | `claws install` warns if risk exceeds workspace policy |

### Governance badge: DECLARED

```
┌──────────────────────────────────────┐
│  my-skill v1.0.0                     │
│  ★★★★☆ (120 installs)               │
│                                      │
│  ◑ claws governance: DECLARED        │
│  Risk: R2 (READ)                     │
│  Data: INTERNAL                      │
│  OBO: none                           │
│  Audit: not enabled                  │
│  Supply chain: not verified          │
│                                      │
│  clawhub install my-skill            │
└──────────────────────────────────────┘
```

The half-filled circle (DECLARED) indicates the skill has governance metadata but
it hasn't been machine-verified. Enterprise admins can trust the declaration for
low-risk skills and require Tier 2+ for higher risk.

### Migration guide

1. Determine your skill's risk level:
   - R1: Read-only (search, lookup, summarize)
   - R2: Read + network (API calls, web search)
   - R3: Read + write/communicate (file writes, email sending)
   - R4: Execute + delegate (shell commands, sub-agent dispatch)
   - R5: Admin + production (deployment, system changes)

2. List capabilities your tools use:
   - READ: reads files, searches, queries
   - WRITE: writes files, creates records
   - COMMUNICATE: sends emails, messages
   - EXECUTE: runs commands, scripts
   - NETWORK: makes HTTP calls, API requests
   - ADMIN: changes settings, manages users

3. List data classification:
   - PUBLIC: no sensitive data
   - INTERNAL: company data, not customer PII
   - CONFIDENTIAL: customer data, PII
   - RESTRICTED: financial, health, legal data

4. Add the frontmatter and publish:
   ```
   clawhub publish --bump patch
   ```

### Automation: `claws annotate`

For skill authors who want help determining their governance metadata:

```
$ claws annotate my-skill/

  Analyzing my-skill...

  Detected:
    Tools: search-kb, get-document (2 tools)
    Capabilities: READ (file reads, searches)
    Risk suggestion: R1 (read-only, no writes, no network)
    Data suggestion: INTERNAL (no PII patterns detected)
    OBO suggestion: none (no write/send actions)

  Proposed frontmatter:
    governance:
      risk: R1
      capabilities:
        - READ
      data:
        - INTERNAL

  ? Apply to SKILL.md? [Y/n]
```

`claws annotate` reads the skill's handler code (if present), detects tool patterns,
and suggests governance metadata. The developer reviews and applies.

---

## Tier 2: Import @bic/claws-skill-kit

### What changes

Import @bic/claws-skill-kit and use the `skill()` factory and decorators. The handler
gets typed parameters, the skill definition gets governance validation at
construction time, and the MockGateway becomes available for testing.

### Effort

| Metric | Value |
|--------|-------|
| Time | 15-30 minutes |
| Code changes | Moderate (wrap handler in skill(), add types) |
| New dependencies | @bic/claws-skill-kit |
| New files | 0-1 (types.ts optional) |
| Risk of breakage | Low (structural refactor, no behavior change) |

### How to do it

**Before (untyped, no framework):**

```typescript
// handler.ts
export async function search(args: any) {
  const results = await gateway.tools.invoke('kb', { query: args.query });
  return { results: results.items };
}

export async function sendEmail(args: any) {
  // Manually implemented approval flow (or none at all)
  const result = await gateway.tools.invoke('email', {
    to: args.to,
    subject: args.subject,
    body: args.body,
  });
  return { sent: true, messageId: result.id };
}
```

**After (typed, governed):**

```typescript
// handler.ts
import { skill, obo, audit, validate } from '@bic/claws-skill-kit';

class MySkill {
  @validate()
  async search(
    input: { query: string; limit?: number },
    ctx: SkillContext,
  ): Promise<{ results: any[]; count: number }> {
    const results = await ctx.tools.invoke('kb', { query: input.query });
    return { results: results.items, count: results.total };
  }

  @obo({ mode: 'inline', timeout: 60_000 })
  @audit()
  @validate()
  async sendEmail(
    input: { to: string; subject: string; body: string },
    ctx: SkillContext,
  ): Promise<{ sent: boolean; messageId: string }> {
    const result = await ctx.tools.invoke('email', input);
    return { sent: true, messageId: result.id };
  }
}

const instance = new MySkill();

export default skill('my-skill', {
  governance: {
    risk: 'R3',
    capabilities: ['READ', 'COMMUNICATE'],
    obo: ['send-email'],
    data: ['INTERNAL'],
    audit: true,
  },

  tools: {
    'search': {
      description: 'Search the knowledge base',
      handler: instance.search.bind(instance),
    },
    'send-email': {
      description: 'Send an email (requires approval)',
      handler: instance.sendEmail.bind(instance),
    },
  },
});
```

### What you get (beyond Tier 1)

| Benefit | Description |
|---------|-------------|
| **Type safety** | TypeScript catches parameter errors at compile time |
| **Decorator metadata** | @obo, @audit, @validate drive code generation |
| **Construction-time validation** | skill() validates governance config on import |
| **MockGateway** | Test handlers locally with mock Gateway |
| **Custom matchers** | @bic/claws-test governance assertions |
| **Governance guard generation** | `claws build` generates wrapper from decorators |

### Governance badge: TYPED

```
┌──────────────────────────────────────┐
│  my-skill v1.1.0                     │
│  ★★★★☆ (120 installs)               │
│                                      │
│  ◕ claws governance: TYPED           │
│  Risk: R3 (READ, COMMUNICATE)       │
│  OBO: send-email (elicitation)       │
│  Data: INTERNAL                      │
│  Audit: enabled                      │
│  Supply chain: not verified          │
│                                      │
│  clawhub install my-skill            │
└──────────────────────────────────────┘
```

Three-quarter-filled circle (TYPED) indicates the skill uses @bic/claws-skill-kit with
typed handlers and decorator-driven governance. Machine-verified at construction time
but not fully compiled by claws build.

### Migration guide

1. `npm install @bic/claws-skill-kit` (add dependency)
2. Import `skill` and desired decorators
3. Wrap each handler function in a class with decorators
4. Call `skill()` with governance config and tool map
5. Export the result as default
6. Run `claws pinch` to validate
7. Run `claws test --governance` to verify decorator consistency
8. Publish: `claws publish` (or `clawhub publish` -- both work)

---

## Tier 3: Full claws Build

### What changes

The skill is fully managed by claws. SKILL.md is the source of truth. `claws build`
generates types, governance wrapper, and tests. The developer owns SKILL.md and
src/handler.ts; everything else is generated.

### Effort

| Metric | Value |
|--------|-------|
| Time | 30-60 minutes (or use `claws import`) |
| Code changes | Full restructure (but `claws import` automates most of it) |
| New dependencies | @bic/claws-skill-kit, @bic/claws-test |
| New files | src/types.ts, dist/governance-guard.ts, tests/, .claws-manifest |
| Risk of breakage | Medium (structural rewrite, behavior preserved) |

### How to do it: `claws import`

`claws import` reads an existing skill directory and produces a full claws skill:

```
$ claws import ./my-skill

  claws import -- analyzing my-skill

  Found:
    SKILL.md          ← existing, has governance frontmatter
    handler.ts        ← existing handler (3 functions)

  Detected tools:
    1. search        (search function) → risk R1, read-only
    2. send-email    (sendEmail function) → risk R5, OBO
    3. list-recent   (listRecent function) → risk R1, read-only

  Actions:
    ✓ Updated SKILL.md with tool tables (parameters, returns)
    ✓ Moved handler.ts → src/handler.ts
    ✓ Generated src/types.ts from SKILL.md declarations
    ✓ Generated tests/scenarios.test.ts from SKILL.md scenarios
    ✓ Generated tests/governance.test.ts
    ✓ Generated package.json (updated dependencies)
    ✓ Generated claws.json
    ✓ Generated tsconfig.json

  Next steps:
    cd my-skill
    claws build       # Generate governance wrapper
    claws test        # Verify everything works
    claws pinch       # Validate governance
    claws publish     # Publish with VERIFIED badge
```

`claws import` does a best-effort analysis:
- Reads handler.ts function signatures for tool extraction
- Reads SKILL.md sections for scenario extraction
- Maps function names to tool names (camelCase -> kebab-case)
- Generates typed parameters from function parameter types
- Preserves the original handler logic -- only wraps it in the new structure

### What you get (beyond Tier 2)

| Benefit | Description |
|---------|-------------|
| **Generated types** | types.ts auto-generated from SKILL.md, always in sync |
| **Generated tests** | Scenario tests from SKILL.md, governance tests, security scan |
| **Generated governance wrapper** | Full OBO/audit/budget/validation layer |
| **Signed manifest** | .claws-manifest with SHA-256 hash chain and provenance |
| **Incremental builds** | `claws build` only regenerates changed files |
| **Supply chain verification** | Dependencies audited, manifest signed |

### Governance badge: VERIFIED

```
┌──────────────────────────────────────┐
│  my-skill v2.0.0                     │
│  ★★★★☆ (120 installs)               │
│                                      │
│  ● claws governance: VERIFIED        │
│  Risk: R3 (READ, COMMUNICATE)       │
│  OBO: send-email (elicitation)       │
│  Data: INTERNAL                      │
│  Audit: enabled, chain verified      │
│  Supply chain: signed, scanned       │
│                                      │
│  clawhub install my-skill            │
└──────────────────────────────────────┘
```

Full circle (VERIFIED) indicates the skill was compiled by claws build, tested
by claws test, validated by claws pinch, and published with a signed manifest.
Maximum enterprise trust.

### Migration guide

1. `claws import ./my-skill` (automated analysis and restructure)
2. Review generated SKILL.md tool tables for accuracy
3. Review generated src/types.ts for type correctness
4. `claws build` (generates governance wrapper + manifest)
5. `claws test` (run all generated + custom tests)
6. `claws pinch` (validate governance)
7. `claws publish` (publish with VERIFIED badge)

---

## Tier Comparison

| Dimension | Tier 1: DECLARED | Tier 2: TYPED | Tier 3: VERIFIED |
|-----------|:---:|:---:|:---:|
| **Effort** | 2-5 min | 15-30 min | 30-60 min |
| **Code changes** | None | Moderate | Full restructure |
| **Risk of breakage** | Zero | Low | Medium |
| **Governance badge** | DECLARED (half) | TYPED (three-quarter) | VERIFIED (full) |
| **Risk classification** | Declared | Declared + validated | Compiled + tested |
| **OBO gates** | Declared | Metadata-driven | Generated code |
| **Audit chain** | Not active | Construction-validated | Generated + verified |
| **Input validation** | None | Decorator-driven | Generated validators |
| **Type safety** | None | Yes | Yes + generated |
| **Test coverage** | None | Manual + matchers | Auto-generated + manual |
| **Security scan** | None | None | Full scan |
| **Supply chain** | None | None | Signed manifest |
| **Fleet visibility** | Detected + tagged | Detected + typed | Detected + verified |
| **Enterprise trust** | Low | Medium | High |

---

## ClawHub Governance Badges

ClawHub displays governance badges on skill pages. The badge tier is determined by
what governance artifacts are present.

### Badge Criteria

| Badge | Symbol | Requirement |
|-------|--------|-------------|
| **No governance** | (none) | No governance frontmatter |
| **DECLARED** | Half circle | governance: block in SKILL.md frontmatter |
| **TYPED** | Three-quarter circle | @bic/claws-skill-kit dependency + skill() usage |
| **VERIFIED** | Full circle | .claws-manifest present + valid + claws pinch passes |

### ClawHub API Integration

claws publish sends governance metadata to ClawHub via the existing publish API,
adding fields that ClawHub renders as the badge:

```json
{
  "name": "my-skill",
  "version": "2.0.0",
  "governance": {
    "tier": "verified",
    "risk": "R3",
    "capabilities": ["READ", "COMMUNICATE"],
    "obo": ["send-email"],
    "data": ["INTERNAL"],
    "audit": true,
    "manifest": {
      "hash": "sha256:a1b2c3d4...",
      "signedAt": "2026-04-11T09:00:00Z",
      "clawsVersion": "1.0.0"
    },
    "testResults": {
      "scenarios": 3,
      "governance": 15,
      "security": 16,
      "passed": 34,
      "failed": 0
    }
  }
}
```

ClawHub displays the governance section alongside existing skill metadata (stars,
installs, description). No ClawHub schema changes are needed -- the governance field
is additive and ClawHub renders it when present.

### Enterprise admin view

Enterprise ClawHub admins see an aggregated governance dashboard:

```
Enterprise Governance Dashboard
═══════════════════════════════

Installed skills: 47

  ● VERIFIED:  12  (26%)
  ◕ TYPED:      8  (17%)
  ◑ DECLARED:  15  (32%)
  ○ None:      12  (26%)

Risk distribution:
  R1: 18  R2: 12  R3: 10  R4: 5  R5: 2

OBO actions:
  send-email (3 skills), deploy (2 skills), bash (1 skill)

Actions:
  [Require DECLARED for new installs]
  [Require TYPED for R3+]
  [Require VERIFIED for R4+]
```

---

## `claws scan` -- Installed Skill Audit

`claws scan` audits all skills installed in a workspace (or fleet of workspaces)
and reports their governance status.

### Usage

```
$ claws scan

  claws scan -- auditing installed skills

  Scanning: /workspaces/my-agent

  Found 12 installed skills:

  Skill                  Version   Risk   Badge       Issues
  ──────────────────────────────────────────────────────────────
  email-drafter          2.0.0     R3     VERIFIED    -
  kb-search              1.5.0     R1     TYPED       -
  code-reviewer          1.2.0     R3     VERIFIED    -
  file-manager           3.0.1     R3     DECLARED    No tests
  web-scraper            1.0.0     R2     DECLARED    No audit
  deploy-helper          2.1.0     R5     VERIFIED    -
  data-analyst           1.3.0     R2     TYPED       -
  slack-notifier         1.0.0     R3     DECLARED    No OBO gate
  git-helper             2.0.0     R3     TYPED       -
  meeting-scheduler      1.1.0     R2     DECLARED    -
  terminal-exec          1.0.0     R5     ○ None      ⚠ UNGOVERNED
  custom-plugin          0.9.0     ???    ○ None      ⚠ UNGOVERNED

  Summary:
    VERIFIED: 3   TYPED: 3   DECLARED: 4   Ungoverned: 2

  ⚠ 2 ungoverned skills detected:
    terminal-exec (R5 estimated -- shell access detected)
    custom-plugin (risk unknown -- no governance metadata)

  Recommendations:
    1. terminal-exec should be at minimum TYPED (R5 tools need OBO gates)
    2. custom-plugin needs governance frontmatter (run: claws annotate custom-plugin)
    3. slack-notifier declares OBO but has no elicitation gate (upgrade to Tier 2)
    4. file-manager has no tests (add: claws test --init file-manager)
```

### Fleet scan

```
$ claws scan --fleet

  claws scan --fleet -- auditing all workspaces

  Discovered 8 workspaces:

  Workspace                   Skills   Governed   Ungoverned   Risk
  ──────────────────────────────────────────────────────────────────────
  /workspaces/agent-alpha     12       10 (83%)   2            R5
  /workspaces/agent-beta      8        8 (100%)   0            R3
  /workspaces/agent-gamma     15       11 (73%)   4            R4
  /workspaces/agent-delta     6        6 (100%)   0            R2
  /workspaces/agent-epsilon   20       14 (70%)   6            R5
  /workspaces/agent-zeta      3        3 (100%)   0            R1
  /workspaces/agent-eta       9        7 (78%)    2            R3
  /workspaces/agent-theta     11       9 (82%)    2            R4

  Fleet totals:
    84 skills across 8 workspaces
    68 governed (81%), 16 ungoverned (19%)

  Fleet policy violations:
    3 workspaces have R5 tools without VERIFIED badge
    6 skills have OBO declared but no elicitation gate
    4 skills have no governance metadata in R3+ risk category

  Export: claws scan --fleet --format sarif > fleet-audit.sarif
```

### `claws scan` implementation

`claws scan` is a read-only analysis tool. It:

1. Discovers installed skills (scans node_modules/@*, skills/, .openclaw/skills/)
2. Reads each skill's SKILL.md frontmatter
3. Checks for governance metadata presence
4. Checks for .claws-manifest presence and validity
5. Detects risk level from tool patterns (if not declared)
6. Reports findings with severity

It does NOT:
- Modify any files
- Install dependencies
- Run tests
- Change governance metadata

---

## Adoption Funnel

The three tiers form a natural funnel. Each tier is a stepping stone to the next:

```
5,198 existing skills
  │
  ├─ claws annotate → Tier 1 (DECLARED)     ← 2-5 min, zero risk
  │   Target: ALL 5,198 skills
  │   Expected adoption: 80%+ within 6 months
  │   (governance frontmatter is free value)
  │
  ├─ Import skill-kit → Tier 2 (TYPED)      ← 15-30 min, low risk
  │   Target: Skills with handlers (est. 3,500)
  │   Expected adoption: 40% within 12 months
  │   (type safety motivates the refactor)
  │
  └─ claws import → Tier 3 (VERIFIED)       ← 30-60 min, medium effort
      Target: Enterprise-critical skills (est. 500)
      Expected adoption: 20% within 18 months
      (enterprise requirements drive the migration)
```

### Adoption incentives

| Incentive | Tier 1 | Tier 2 | Tier 3 |
|-----------|:---:|:---:|:---:|
| ClawHub badge visibility | X | X | X |
| Enterprise install approval | X | X | X |
| Fleet scan detection | X | X | X |
| Type safety | | X | X |
| Auto-generated tests | | | X |
| Signed supply chain | | | X |
| ClawHub "verified" featured section | | | X |

### Enterprise adoption policy

Enterprise ClawHub admins can set minimum governance tiers per risk level:

```json
{
  "claws": {
    "install-policy": {
      "R1-R2": "declared",
      "R3": "typed",
      "R4-R5": "verified"
    }
  }
}
```

This means:
- R1/R2 skills only need Tier 1 (governance frontmatter)
- R3 skills need Tier 2 (@bic/claws-skill-kit)
- R4/R5 skills need Tier 3 (full claws build)

When a developer tries to install a skill that doesn't meet the policy:

```
$ clawhub install terminal-exec
  ⚠ terminal-exec is R5 but has no governance badge
  ⚠ Workspace policy requires VERIFIED for R4+ skills
  ⚠ Installation blocked. Contact the skill author or request an exception.
```

---

## Migration Tooling Summary

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `claws annotate` | Suggest governance frontmatter | Existing skill | Updated SKILL.md |
| `claws import` | Full claws restructure | Existing skill | Full claws skill directory |
| `claws scan` | Audit installed skills | Workspace/fleet | Governance report |
| `claws scan --fleet` | Fleet-wide audit | All workspaces | Fleet governance report |
| `claws pinch` | Validate governance | Any tier skill | Pass/fail with diagnostics |
| `claws test --governance` | Validate governance behavior | Tier 2+ skill | Governance test report |

All tools are non-destructive. They read existing skills, produce reports or suggestions,
and let the developer decide what to change.
