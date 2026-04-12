# exp-a: The Skill Creation Experience (End-to-End Walkthrough)

**Question**: Q12o -- How does claws help makers create skills?
**Experiment**: Complete skill creation walkthrough comparing today vs claws
**Method**: Design analysis
**Date**: 2026-04-11

---

## Today: The OC-Native Workflow

Creating an OC skill today requires manual assembly with no framework, no governance
validation, no code generation, and no testing harness.

### Step 1: Create directory and SKILL.md by hand

```
$ mkdir email-drafter && cd email-drafter
$ touch SKILL.md
```

The developer writes SKILL.md from scratch:

```markdown
---
name: email-drafter
description: Draft and send emails on behalf of the user
version: 1.0.0
---

# Email Drafter

## Tools

- send-email: Send an email to a recipient
  - to: string (required)
  - subject: string (required)
  - body: string (required)

## Scenarios

1. User asks to send a meeting invite
2. User asks to draft a reply to an email thread
```

No governance annotations. No risk classification. No OBO flags. No data labeling.
The developer has to know what fields are available from memory.

### Step 2: Optionally write TypeScript handler

```typescript
// handler.ts -- no framework, no types, no standard patterns
export async function sendEmail(args: any) {
  // How do I call the Gateway API? No standard.
  // How do I handle approval? No standard.
  // How do I audit? No standard.
  return { sent: true };
}
```

No typed tool declarations. No handler decorators. No mock Gateway for testing.
The developer invents their own patterns.

### Step 3: Basic validation

```
$ openclaw skills check
✓ email-drafter: SKILL.md found
  1 warning: no version field in frontmatter
```

`openclaw skills check` validates structure only: does SKILL.md exist, is frontmatter
parseable, are required fields present. No governance validation, no security scanning,
no scenario testing.

### Step 4: Publish

```
$ clawhub publish
Publishing email-drafter v1.0.0...
✓ Published to ClawHub
```

No pre-publish governance check. No risk classification. No OBO validation. No
signed manifest. No dependency audit. The skill is live on ClawHub with no
governance metadata.

### Problems with Today's Workflow

| Problem | Impact |
|---------|--------|
| No typed tool declarations | Runtime type errors when Gateway calls handler |
| No governance annotations | Enterprise orgs can't assess risk before installing |
| No OBO flow standard | Each skill invents its own approval pattern |
| No test framework | Skills ship untested; bugs found in production |
| No security scanning | Injection patterns and secret leaks go undetected |
| No signed manifest | No supply chain provenance, no integrity verification |
| No code generation | Boilerplate repeated across 5,198 skills |

---

## With claws: The Maker Workflow

### Step 1: `claws new skill email-drafter`

```
$ claws new skill email-drafter

  claws new skill -- scaffolding email-drafter

  ? Risk level (R1-R5):  R3 (COMMUNICATE)
  ? Capabilities:        [READ, COMMUNICATE]
  ? OBO actions:         [send-email]
  ? Data classification: INTERNAL
  ? Template:            communication (3 tools, OBO flow, audit)

  Creating email-drafter/
    SKILL.md               ← typed frontmatter + governance annotations
    src/handler.ts         ← typed handler skeleton with decorators
    src/types.ts           ← generated from tool declarations
    tests/scenarios.test.ts ← generated from SKILL.md scenarios
    tests/governance.test.ts ← governance validation tests
    package.json           ← @bic/claws-skill-kit dependency
    claws.json             ← governance config (inherits workspace)
    .claws-manifest        ← build provenance (populated at build)
    tsconfig.json          ← TypeScript configuration
    .gitignore             ← standard ignores

  Next steps:
    cd email-drafter
    $EDITOR SKILL.md           # Define your tools and scenarios
    claws build                # Generate typed handlers
    claws test                 # Run scenario tests
    claws pinch                # Validate governance
    claws publish              # Publish to ClawHub
```

#### Generated SKILL.md

```markdown
---
name: email-drafter
description: Draft and send emails on behalf of the user
version: 1.0.0
governance:
  risk: R3
  capabilities:
    - READ
    - COMMUNICATE
  obo:
    - send-email
  data:
    - INTERNAL
  audit: true
---

# Email Drafter

Draft and send emails on behalf of the user.

## Tools

### send-email

Send an email to a recipient. Requires human approval (OBO).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| to | string | yes | Recipient email address |
| subject | string | yes | Email subject line |
| body | string | yes | Email body (plain text or markdown) |

**Returns:**

| Name | Type | Description |
|------|------|-------------|
| messageId | string | Sent message identifier |
| sent | boolean | Whether the email was sent |

### draft-email

Draft an email without sending. Does not require approval.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| to | string | yes | Recipient email address |
| subject | string | yes | Email subject line |
| body | string | yes | Email body |

**Returns:**

| Name | Type | Description |
|------|------|-------------|
| draftId | string | Draft identifier |
| preview | string | Rendered preview |

### list-recent

List recent sent emails for context.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| count | number | no | Number of emails to list (default: 10) |

**Returns:**

| Name | Type | Description |
|------|------|-------------|
| emails | Email[] | Recent email summaries |

## Scenarios

### 1. Send a meeting invite

The user asks to send a meeting invite to a colleague.

**Input:** "Send a meeting invite to jane@acme.com for our 1:1 tomorrow at 2pm"

**Expected:**
- Tool: send-email
- OBO approval requested before sending
- Audit event recorded

### 2. Draft a reply

The user asks to draft a reply to a thread.

**Input:** "Draft a reply to the budget thread saying I approve"

**Expected:**
- Tool: draft-email
- No approval needed (draft only)
- Draft returned for review

### 3. Check recent emails

The user asks what emails were sent recently.

**Input:** "What emails did I send this week?"

**Expected:**
- Tool: list-recent
- No approval needed (read-only)
- Summary returned
```

#### Generated src/handler.ts

```typescript
/**
 * Email Drafter -- Skill Handler
 *
 * Scaffolded by claws new skill v1.0.0
 * Edit this file to implement your skill logic.
 * Tool types are generated in types.ts.
 */

import type {
  SendEmailInput,
  SendEmailOutput,
  DraftEmailInput,
  DraftEmailOutput,
  ListRecentInput,
  ListRecentOutput,
} from './types';

/**
 * Send an email to a recipient.
 * This tool requires OBO approval -- claws injects the approval flow at build time.
 */
export async function sendEmail(
  input: SendEmailInput,
  ctx: SkillContext,
): Promise<SendEmailOutput> {
  // TODO: Implement email sending via your email provider
  // The OBO approval flow is injected by claws build -- you don't need to handle it.
  const result = await ctx.tools.invoke('email-provider', {
    action: 'send',
    to: input.to,
    subject: input.subject,
    body: input.body,
  });

  return {
    messageId: result.messageId,
    sent: true,
  };
}

/**
 * Draft an email without sending.
 */
export async function draftEmail(
  input: DraftEmailInput,
  ctx: SkillContext,
): Promise<DraftEmailOutput> {
  // TODO: Implement draft creation
  return {
    draftId: 'draft-001',
    preview: `To: ${input.to}\nSubject: ${input.subject}\n\n${input.body}`,
  };
}

/**
 * List recent sent emails.
 */
export async function listRecent(
  input: ListRecentInput,
  ctx: SkillContext,
): Promise<ListRecentOutput> {
  // TODO: Implement email listing
  const count = input.count ?? 10;
  return { emails: [] };
}
```

#### Generated src/types.ts

```typescript
/**
 * Email Drafter -- Tool Types
 *
 * Auto-generated from SKILL.md tool declarations.
 * DO NOT EDIT -- regenerate with `claws build`.
 */

// ── send-email ──

export interface SendEmailInput {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** Email body (plain text or markdown) */
  body: string;
}

export interface SendEmailOutput {
  /** Sent message identifier */
  messageId: string;
  /** Whether the email was sent */
  sent: boolean;
}

// ── draft-email ──

export interface DraftEmailInput {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** Email body */
  body: string;
}

export interface DraftEmailOutput {
  /** Draft identifier */
  draftId: string;
  /** Rendered preview */
  preview: string;
}

// ── list-recent ──

export interface ListRecentInput {
  /** Number of emails to list (default: 10) */
  count?: number;
}

export interface Email {
  id: string;
  to: string;
  subject: string;
  sentAt: string;
}

export interface ListRecentOutput {
  /** Recent email summaries */
  emails: Email[];
}

// ── Shared ──

export interface SkillContext {
  /** Current user identity */
  user: { id: string };
  /** Tool invocation API */
  tools: {
    invoke: (name: string, args: Record<string, unknown>) => Promise<any>;
  };
  /** Audit chain (if governance.audit is enabled) */
  audit?: {
    append: (event: { action: string; target: string; outcome: string }) => Promise<void>;
  };
}
```

#### Generated package.json

```json
{
  "name": "email-drafter",
  "version": "1.0.0",
  "description": "Draft and send emails on behalf of the user",
  "type": "module",
  "main": "dist/handler.js",
  "types": "dist/handler.d.ts",
  "scripts": {
    "build": "claws build",
    "test": "claws test",
    "pinch": "claws pinch",
    "publish": "claws publish"
  },
  "dependencies": {
    "@bic/claws-skill-kit": "^1.0.0"
  },
  "devDependencies": {
    "@bic/claws-test": "^1.0.0",
    "typescript": "^5.4.0"
  },
  "claws": {
    "type": "skill",
    "risk": "R3"
  }
}
```

### Step 2: Edit SKILL.md and implement handlers

The developer edits SKILL.md to refine tool declarations and scenarios, then
implements the handler functions in src/handler.ts. The types in src/types.ts
are regenerated automatically whenever SKILL.md changes.

### Step 3: `claws build`

```
$ claws build

  claws build -- compiling email-drafter

  PARSE    SKILL.md                              0.8ms
  EXTRACT  3 tools, 3 scenarios, 1 OBO action    1.2ms
  ANALYZE  governance: R3, OBO: send-email        0.5ms
  EMIT     src/types.ts (regenerated)             0.3ms
  EMIT     dist/handler.js                        0.4ms
  EMIT     dist/handler.d.ts                      0.2ms
  EMIT     dist/governance-guard.js               1.1ms
  EMIT     .claws-manifest                        0.1ms

  Build complete (4.6ms)

  Files:
    src/types.ts             ← updated from SKILL.md
    dist/handler.js          ← compiled handler
    dist/handler.d.ts        ← type declarations
    dist/governance-guard.js ← OBO gate + audit chain (generated)
    .claws-manifest          ← build provenance + integrity hash
```

The key generated file is `dist/governance-guard.js` -- this wraps the handler's
`sendEmail` function with the OBO approval flow, audit chain, and budget check.
The developer never writes this code. claws generates it from the governance
annotations in SKILL.md.

### Step 4: `claws test`

```
$ claws test

  claws test -- running email-drafter tests

  Scenarios (from SKILL.md):
    ✓ 1. Send a meeting invite
      ✓ send-email tool invoked with correct args
      ✓ OBO approval requested before send
      ✓ Audit event recorded (tool: send-email, decision: allow)
    ✓ 2. Draft a reply
      ✓ draft-email tool invoked
      ✓ No OBO approval requested (draft only)
    ✓ 3. Check recent emails
      ✓ list-recent tool invoked
      ✓ No OBO approval requested (read-only)

  Governance:
    ✓ Risk classification matches declared R3
    ✓ OBO actions match declared [send-email]
    ✓ Capabilities match declared [READ, COMMUNICATE]
    ✓ Data classification matches declared [INTERNAL]
    ✓ Audit chain integrity verified

  Security:
    ✓ No injection patterns detected in handler
    ✓ No hardcoded secrets detected
    ✓ No eval() or Function() usage
    ✓ Input validation present for all tool parameters

  8 scenarios passed, 4 governance checks passed, 4 security checks passed
  Total: 16/16 (0 failures)
```

### Step 5: `claws pinch`

```
$ claws pinch

  claws pinch -- validating email-drafter governance

  Policy: workspace (inherits org)

  ✓ Risk R3: COMMUNICATE capability declared
  ✓ OBO: send-email action has elicitation gate
  ✓ Data: INTERNAL classification -- no external data egress
  ✓ Audit: chain enabled, integrity verified
  ✓ Supply chain: 2 dependencies, all signed
  ✓ Manifest: .claws-manifest present, hash valid

  Governance: PASS (6/6 checks)
```

### Step 6: `claws publish`

```
$ claws publish

  claws publish -- publishing email-drafter to ClawHub

  Pre-publish checks:
    ✓ claws pinch passed
    ✓ claws test passed (16/16)
    ✓ .claws-manifest signed
    ✓ No unpinned dependencies
    ✓ SKILL.md governance frontmatter complete

  Publishing:
    → email-drafter@1.0.0
    → Governance badge: R3 (COMMUNICATE, OBO: send-email)
    → Signed manifest: sha256:a1b2c3...

  ✓ Published to ClawHub

  View: https://clawhub.dev/skills/email-drafter
```

---

## Side-by-Side Comparison

| Step | Today (OC-native) | With claws |
|------|-------------------|-----------|
| **Scaffold** | `mkdir` + manual SKILL.md | `claws new skill` -- prompted, templated, governed |
| **Types** | None (write `any`) | Auto-generated from SKILL.md tool declarations |
| **Handler** | Freeform TS, no standard | Typed skeleton with decorator hooks |
| **OBO flow** | Invent your own | Generated from governance annotations |
| **Audit** | None | Generated audit chain integration |
| **Testing** | None | Generated scenario tests + governance + security |
| **Validation** | `openclaw skills check` (structure only) | `claws pinch` (governance + security + supply chain) |
| **Publish** | `clawhub publish` (no checks) | `claws publish` (must pass pinch + test) |
| **Badge** | None | Governance badge with risk, OBO, data labels |

### Time Comparison

| Activity | Today | With claws | Savings |
|----------|-------|-----------|---------|
| Scaffold | 10-15 min | 30 sec | 95% |
| Type definitions | 15-30 min | 0 (generated) | 100% |
| OBO flow | 30-60 min | 0 (generated) | 100% |
| Audit integration | 20-40 min | 0 (generated) | 100% |
| Test writing | 30-60 min | 5 min (customize generated) | 85% |
| Governance validation | N/A (doesn't exist) | 5 sec | N/A |
| **Total** | 2-3.5 hours | 10-15 min | 90%+ |

---

## Template Library

`claws new skill` offers templates based on the 10 skill categories from Q12n:

| Template | Category | Tools | Risk | OBO | Description |
|----------|----------|-------|------|-----|-------------|
| `minimal` | -- | 1 | R1 | no | Bare skill with one read-only tool |
| `read-only` | Knowledge | 1-3 | R1 | no | Knowledge retrieval, search, summarize |
| `filesystem` | Developer | 3-5 | R3 | partial | File operations with safety gates |
| `communication` | Communication | 2-4 | R3 | yes | Email/messaging with OBO approval |
| `web` | Internet | 2-3 | R2 | no | Web search, API calls, scraping |
| `data` | Data | 3-5 | R3 | partial | Database queries, analytics |
| `system` | System | 3-6 | R5 | yes | Shell commands, system operations |
| `multi-agent` | Orchestration | 2-4 | R4 | yes | A2A delegation, sub-agent dispatch |
| `compliance` | Governance | 2-3 | R2 | no | Audit, compliance checking |
| `custom` | -- | -- | -- | -- | Empty template, add tools manually |

Each template includes:
- SKILL.md with appropriate tools, scenarios, and governance annotations
- Handler skeleton matching the tool set
- Type definitions matching tool parameters
- Scenario tests matching SKILL.md scenarios
- Governance tests matching declared risk/capabilities
- Appropriate claws.json overrides

---

## Complement Relationship with OC

claws does NOT replace the OC workflow. It enhances it:

```
OC-native workflow:          claws enhancement layer:
─────────────────           ─────────────────────────
mkdir my-skill              claws new skill my-skill     ← scaffolding
edit SKILL.md               edit SKILL.md                ← same file, richer frontmatter
                            claws build                  ← code generation
                            claws test                   ← scenario + governance tests
openclaw skills check       claws pinch                  ← superset of skills check
clawhub publish             claws publish                ← wraps clawhub publish + governance
```

A developer who uses only `openclaw` and `clawhub` can still work with claws-generated
skills. The generated SKILL.md is valid OC markdown. The generated handler.ts is valid
OC TypeScript. The governance frontmatter is additive -- OC ignores fields it doesn't
recognize.

`claws publish` calls `clawhub publish` internally. It's not a replacement -- it's a
pre-publish validation layer that ensures governance requirements are met before the
skill reaches ClawHub.
