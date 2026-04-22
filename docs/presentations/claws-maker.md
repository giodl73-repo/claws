---
marp: true
theme: claws-dark
paginate: true
---

<!-- _class: title -->

# Building Governed Skills with claws

**5,198 skills. No types. No tests. No governance. No signing. You're about to change that.**

One framework. One compiler. One publish.

---

<!-- _class: split -->

<div>

## The Maker Gap

**Skills today ship without a safety net.**

No typed context. No test framework. No governance validation. No signed manifest. No supply chain audit.

It's npm before package-lock.json. Before audit. Before provenance. We already know how that ends.

*98.4% of the 5,198-skill ecosystem has zero governance relationship today.*

</div>
<div>

```
             TODAY    WITH CLAWS
  ─────────────────────────────────
  Framework  none     @bic/claws-skill-kit
  Types      none     typed ctx
  Tests      none     4 layers
  Governance none     29 rules
  Scanning   none     16 security rules
  Signing    none     HMAC-SHA256
  Publish    hope     checked + signed

  YOUR HANDLER TODAY
  ──────────────────
  export async function handle(args) {
    // raw args, no types
    // no audit, no budget
    // no governance at all
    return result;
  }
```

</div>

---

<!-- _class: title -->

# claws new skill
## From zero to governed in one command.

---

<!-- _class: small -->

## Scaffolding a Governed Skill

**One command. Five files. Everything you need.**

```
  $ claws new skill weather-lookup

    Created weather-lookup/
      SKILL.md           governance frontmatter + skill description
      src/handler.ts     skill() factory + typed handler
      tests/handler.test.ts   scenario + governance + security tests
      package.json       @bic/claws-skill-kit as dependency
      .gitignore         .claws/ excluded

    Next steps:
      cd weather-lookup
      npm install
      claws check           # validate governance
      claws test             # run all 4 test layers
```

The scaffold passes `claws check` out of the box. Zero violations from a fresh scaffold. Risk level defaults to your workspace trust tier. OBO auto-suggested from the skill name (e.g., "send-email" suggests `obo: email`).

---

<!-- _class: split -->

<div>

## SKILL.md Deep Dive

**The governance contract. What the agent sees. What the compiler reads.**

Three YAML lines declare your governance posture. The rest is what the agent sees in its prompt context.

The frontmatter is the single source of truth. `claws check` validates it. `claws build` compiles from it. `claws publish` badges from it.

</div>
<div>

```yaml
  ---
  governance:
    risk: R2            # R1-R5
    obo: none           # none, email, message,
                        # calendar, social,
                        # purchase, transact
    data: PUBLIC        # PUBLIC, INTERNAL,
                        # CONFIDENTIAL, RESTRICTED
  ---
  # Weather Lookup

  Get the current weather for any city.

  ## Tools
  - fetchWeather: query weather API

  ## Examples
  - input: { city: "Seattle" }
    output: { temp: 72, condition: "sunny" }
  - input: { city: "Tokyo" }
    output: { temp: 18, condition: "cloudy" }
```

</div>

---

<!-- _class: small -->

## handler.ts Deep Dive

**You write business logic. claws writes governance plumbing.**

```typescript
  import { skill, obo, audit, budget, classify, validate, timeout } from '@bic/claws-skill-kit';

  //  DECORATOR          WHAT IT DECLARES
  //  ─────────          ────────────────
  //  @obo('email')      handler acts AS the user
  //  @audit('send')     action logged to audit chain
  //  @classify('R5')    override risk for this tool call
  //  @validate          input must pass validation first
  //  @budget(500)       max 500 tokens per call
  //  @timeout(30_000)   auto-cancel after 30s

  export default skill({
    name: 'weather-lookup',
    risk: 'R2', obo: 'none', data: 'PUBLIC',
    handler: async (ctx) => {
      const city = ctx.input.get('city');        // typed — no raw args parsing
      return { forecast: await fetchWeather(city) };
    },
  });
```

Decorators are metadata. claws reads them at build time and generates governance wrappers. At runtime the generated code handles elicitation, audit logging, and budget enforcement. You just write the business logic.

---

<!-- _class: small -->

## An OBO Skill: Sending Email AS the User

**R5 territory. The skill acts AS the user. Every decorator matters.**

```typescript
  import { skill, obo, audit, budget } from '@bic/claws-skill-kit';

  class SendEmailHandler {
    @obo('email')           // acts AS the user — triggers elicitation gate
    @audit('send')          // hash-chained audit entry per call
    @budget(500)            // max 500 tokens — no runaway spending
    async handle(ctx) {
      const { to, subject, body } = ctx.input.all();
      const result = await ctx.tools.sendEmail({ to, subject, body });
      return { messageId: result.id };
    }
  }

  export default skill({
    name: 'send-email',
    risk: 'R5',                  // TRANSACT — highest risk
    obo: 'email',                // on-behalf-of: email
    data: 'CONFIDENTIAL',       // handles sensitive content
    handler: SendEmailHandler,
  });

  //  WITHOUT CLAWS: Agent → send-email → SENT. No approval. No audit.
  //  WITH CLAWS:    Agent → send-email → BLOCKED. Approval requested. Denial logged.
```

---

<!-- _class: title -->

# claws build --skill
## Compile your skill. Generate governance wrappers.

---

<!-- _class: small -->

## What claws build Compiles

**SKILL.md + handler.ts in. Governance package out.**

```
  $ claws build --skill

    Parse:    SKILL.md                   0.8ms
    Extract:  src/handler.ts             2.1ms
    Analyze:  risk classification        1.2ms
    Generate: governance wrappers        3.4ms
    Emit:     .claws/dist/ (4 files)     1.0ms
    Build: 8.5ms — VERIFIED

  INPUT (you own)                      OUTPUT (.claws/dist/)
  ─────────────                        ─────────────────────
  SKILL.md                             types.ts              generated types
  src/handler.ts                       governance-guard.ts   governance gateway plugin
                                       scenarios.test.ts     generated test cases
                                       .claws-manifest       build provenance + hash

  Your project root stays clean. Only .claws/dist/ is modified.
  .claws/ is gitignored. Your source files are never touched.
```

Build time: ~10-20ms per skill. Incremental via content hashing. Repeated builds on unchanged sources produce byte-identical output.

---

<!-- _class: title -->

# claws test
## Four layers. One command. Governance bugs caught before your users find them.

---

<!-- _class: small -->

## Three Testing Layers

**Scenarios + Governance + Security. Every angle covered.**

```
  $ claws test

    claws test — weather-lookup

    Scenarios
      ✓ city=Seattle returns forecast              12ms
      ✓ city=Tokyo returns forecast                 8ms
      ✓ missing city returns error                  3ms

    Governance (12 checks)
      ✓ declared-vs-actual-risk                     1ms    Does your R2 handler call R4 tools?
      ✓ declared-vs-actual-obo                      1ms    Declared "none" but sends email?
      ✓ declared-vs-actual-data                     0ms    Declared PUBLIC, reads CONFIDENTIAL?
      ✓ missing-audit-on-obo                        0ms    OBO action without @audit?
      ✓ missing-budget-on-transact                  0ms    R5 without @budget?
      ✓ obo-without-elicitation                     0ms    OBO without user confirmation?
      ... 6 more passed

    Security (16 rules)
      ✓ no-eval · no-exec · no-dynamic-import       0ms
      ✓ no-template-injection · no-hardcoded-secrets 0ms
      ... 11 more passed

    3 scenarios, 12 governance, 16 security — all passed (0.4s)
```

---

<!-- _class: split -->

<div>

## MockGateway

**Test without a running OC Gateway. Assert on governance the same way you assert on logic.**

MockGateway records:
- Audit events (hash-chained)
- Budget consumption
- Elicitation prompts
- Tool calls and responses

Same checks as the real Gateway. Zero network. Works with vitest or jest.

</div>
<div>

```typescript
  import { MockGateway, MockTools }
    from '@bic/claws-test';
  import mySkill from './src/handler';

  const gw = new MockGateway();
  const tools = new MockTools();
  tools.mock('fetchWeather', {
    temp: 72, condition: 'sunny'
  });

  const result = await gw.run(mySkill, {
    input: { city: 'Seattle' },
    tools,
  });

  // assert on logic
  expect(result.forecast.temp).toBe(72);

  // assert on governance
  expect(gw.auditLog).toHaveLength(1);
  expect(gw.budgetUsed).toBeLessThan(500);
  expect(gw.elicitations).toHaveLength(0);
  // no OBO = no elicitation prompt
```

</div>

---

<!-- _class: title -->

# claws check
## Governance validation. 29 rules. Auto-fix.

---

<!-- _class: small -->

## claws check: npm test for Governance

**Every rule tells you WHERE, WHAT, and HOW TO FIX.**

```
  $ claws check

    G-CLASS      Tool risk classification          PASS
    G-ELICIT     OBO elicitation gates             PASS
    G-A2A-TRUST  Inter-agent trust boundaries      FAIL  [HIGH]
        agents.yaml:14 — agent "research" trusts "drafting" but no trust group defined
        Fix: add trust-group declaration in agents.yaml or claws.json
        Docs: https://claws.dev/rules/G-A2A-TRUST
    G-INPUT      Input sanitization                PASS
    G-BUDGET     Token budget enforcement          PASS

    1 violation (1 high) in 0.3s

  $ claws check --fix

    G-A2A-TRUST  Inter-agent trust boundaries      FIXED
        agents.yaml:14 — added trust-group declaration for "research" → "drafting"

    1 fixed, 0 remaining. ✓

  OTHER MODES                                     WHEN
  ───────────                                     ────
  claws check                                     quick check, any time
  claws check --fix                               auto-fix what can be fixed
  claws check --staged                            pre-commit hook (<1s)
  claws check --watch                             live feedback while editing
  claws check --strict                            CI, zero-tolerance mode
```

---

<!-- _class: title -->

# Three-Tier Adoption
## Start in 2 minutes. Graduate when ready.

---

<!-- _class: small -->

## DECLARED (2 min) -> TYPED (20 min) -> VERIFIED (45 min)

**Each tier is complete. Not a stepping stone.**

```
  TIER 1: DECLARED — 3 YAML lines, 2 minutes, zero dependencies
  ─────────────────────────────────────────────────────────────────────────────
  Add governance frontmatter to SKILL.md.    $ claws check
  No build step. No imports.                   ✓ Risk: R2 · OBO: none · Data: PUBLIC
                                               Tier: DECLARED (0.1s)
  Badge: Risk + OBO + Data

  TIER 2: TYPED — skill() factory + decorators, 15-20 minutes
  ─────────────────────────────────────────────────────────────────────────────
  npm install @bic/claws-skill-kit               $ claws check
  Wrap handler with skill().                   ✓ Frontmatter matches handler
  Add @audit, @obo, @budget.                   ✓ @audit decorator: logged
                                               Tier: TYPED (0.3s)
  Badge: + Type-safe handler

  TIER 3: VERIFIED — full compile + signed manifest, 30-45 minutes
  ─────────────────────────────────────────────────────────────────────────────
  claws build --skill                        $ claws test
  Generated tests, signed manifest.            3 scenarios, 12 governance, 16 security
                                               ✓ VERIFIED (1.2s)
  Badge: + Signed + Scanned + Tested

  Most skills stay DECLARED. That's fine — Tier 1 is designed to feel complete.
```

---

<!-- _class: split -->

<div>

## claws publish

**Governed publishing. One command wraps checks, signing, audit, and badge generation.**

Four steps, in order. If any fails, nothing reaches ClawHub.

1. Governance check (all rules pass)
2. Signed manifest (SHA-256 + signer)
3. Dependency audit (npm audit + license)
4. Publish + badge

No half-published state. Ever.

</div>
<div>

```
  $ claws publish

    claws publish — weather-lookup v1.2.0

    Step 1: Governance check
      ✓ R2 / none / PUBLIC
        12 governance, 16 security passed

    Step 2: Signed manifest
      ✓ sha256:a3f8c91d...
        signer: dev@example.com

    Step 3: Dependency audit
      ✓ 14 packages, 0 vulnerabilities
        MIT + Apache-2.0

    Step 4: Publish to ClawHub
      ✓ weather-lookup@1.2.0 published
      ✓ Badge: VERIFIED
      ✓ clawhub.dev/skills/weather-lookup

    Published in 3.2s
```

</div>

---

<!-- _class: small -->

## What the ClawHub Listing Shows

**Governance is visible to every installer.**

```
  ┌─────────────────────────────────────────────────┐
  │  weather-lookup                          v1.2.0 │
  │  Get the current weather for any city.          │
  │                                                 │
  │  ┌──────────────────────────────────────┐       │     BADGE BY TIER
  │  │  claws VERIFIED                      │       │     ────────────────────────────
  │  │  Risk: R2 (READ) · OBO: none         │       │     DECLARED   Risk + OBO + Data
  │  │  Data: PUBLIC                        │       │     TYPED      + Type-safe
  │  │  Supply chain: signed, scanned       │       │     VERIFIED   + Signed + Scanned
  │  │  Deps: 14 (0 vulnerabilities)        │       │
  │  └──────────────────────────────────────┘       │     Skills without governance
  │                                                 │     show no badge.
  │  ⬇ 2,340 installs · ★ 4.7 · Updated 2d ago    │     That's the 98.4% baseline.
  └─────────────────────────────────────────────────┘

  Enterprise install policies can require tiers by risk:
    R1-R2: DECLARED minimum    R3: TYPED minimum    R4-R5: VERIFIED required
```

---

<!-- _class: split -->

<div>

## claws import

**Migrate an existing skill to claws. Keep everything. Add governance.**

`claws import` reads your existing SKILL.md, detects capabilities, suggests governance values, and generates the skill-kit wrapper.

Your original files are never modified. claws adds governance alongside them.

Three-step workflow:
1. Analyze existing skill
2. Generate governance frontmatter
3. Wrap handler with skill()

</div>
<div>

```
  $ claws import ./my-skill

    Analyzing my-skill...
      SKILL.md found (no governance)
      handler: src/index.ts
      tools: fetchData, writeReport

    Detected:
      risk: R3 (WRITE) — writeReport
      obo: none
      data: INTERNAL — fetchData reads DB

    Generated:
      SKILL.md     +3 lines frontmatter
      handler.ts   skill() wrapper

  $ claws check
    ✓ Tier: TYPED (handler matches)

  Not sure about the values?
  $ claws annotate
    Suggests risk/obo/data from
    capability analysis.
```

</div>

---

<!-- _class: small -->

## @claws/sift in Skills

**The expression engine behind claws policies. Standalone. Typed. Use it in your skill logic.**

```typescript
  import { sift } from '@claws/sift';

  // Filter tools by risk — typed, no string parsing
  const riskyTools = sift('risk >= R3 AND obo = true').evaluate(tools);

  // Boolean predicate — compile-time validated
  const blocked = sift('trust_tier < T2 OR data_label = RESTRICTED').test(ctx);

  // Data query — LINQ-style, chainable
  const recent = sift('timestamp > now() - 24h AND category = "customer"')
                   .select('summary', 'source')
                   .from(memory);

  WHAT SIFT DOES                             WHY IT MATTERS
  ─────────────                              ──────────────
  Typed expressions    sift('risk >= R3')    No string parsing at runtime
  Boolean predicates   .test(context)        Compile-time validation
  Collection filters   .evaluate(tools)      Type-safe, zero injection risk
  Data queries         .select().from()      LINQ-style, chainable

  npm install @claws/sift     ~25 KB. MIT. Works without claws.
```

---

<!-- _class: small -->

## When Publish Blocks You

**Governance failures are actionable. Every error is a tutorial.**

```
  $ claws publish

    Step 1: Governance check
      ✗ declared-vs-actual-obo
        → SKILL.md declares obo: none
        → src/handler.ts calls sendEmail (OBO-EMAIL detected)
        Fix: change governance.obo to "email" in SKILL.md
        Docs: https://claws.dev/rules/declared-vs-actual-obo

    Publish blocked — 1 failure. Fix and retry.

  EVERY ERROR INCLUDES THREE THINGS:
  ─────────────────────────────────────────────────────────────────
  1. WHERE    SKILL.md:3 — the file and line
  2. WHAT     declared obo: none but handler sends email
  3. HOW      change governance.obo to "email"

  No error without a fix suggestion. No error without a docs URL.
  Error messages are the primary onboarding surface.
```

---

<!-- _class: small -->

## The Full Lifecycle: One Skill, Start to Publish

**Everything in order. Every command.**

```
  SCAFFOLD                              BUILD + TEST
  ────────                              ────────────
  $ claws new skill weather-lookup      $ claws build --skill
    ✓ SKILL.md                            Parse → Extract → Analyze → Generate → Emit
    ✓ src/handler.ts                      .claws/dist/ (4 files) — 8.5ms
    ✓ tests/handler.test.ts
                                        $ claws test
  DEVELOP                                 3 scenarios     ✓
  ───────                                 12 governance   ✓
  Write your handler logic.               16 security     ✓
  Add decorators: @obo, @audit,           All passed — 0.4s
  @budget, @classify, @validate,
  @timeout.                             CHECK + PUBLISH
                                        ───────────────
  VALIDATE                              $ claws check
  ────────                                ✓ 0 violations
  $ claws check
    ✓ 0 violations                      $ claws publish
  $ claws check --watch                   ✓ Governance passed
    Live feedback on every save.          ✓ Manifest signed
                                          ✓ 0 vulnerabilities
                                          ✓ Published — VERIFIED badge

  TIME: scaffold (1 min) + develop (variable) + validate (seconds) + publish (3s)
```

---

<!-- _class: split -->

<div>

## The @claws/* Library Ecosystem

**11 packages. Any OC developer. No compiler required.**

Every library works standalone. Install what you need. Add the compiler later when you want full governance compilation.

The libraries are the value. The compiler is the integration layer.

All MIT. ~198 KB total.

</div>
<div>

```
  PACKAGE             SIZE   WHAT
  ───────             ────   ────
  @bic/claws-skill-kit    35KB   skill() + 6 decorators
  @bic/claws-test         45KB   MockGateway + 4 layers
  @claws/sift         25KB   typed expressions
  @claws/audit        15KB   hash-chained trail
  @claws/budget        8KB   token ceiling
  @claws/security     12KB   injection defense
  @claws/data         10KB   typed queries
  @claws/identity      5KB   agent auth
  @claws/schema        8KB   config validation
  @claws/report       20KB   doc generation
  @claws/runtime      15KB   governance bridge

  npm install @bic/claws-skill-kit
  npm install @bic/claws-test
  npm install @claws/sift

  No claws compiler needed.
  No claws.json needed.
  Pure library usage.
```

</div>

---

<!-- _class: title -->

# One skill.
# Fully governed. Tested. Signed. Published.

**`claws new skill` -> `claws build` -> `claws test` -> `claws check` -> `claws publish`**

*Your agent asks before it acts. Your skill proves it.*
