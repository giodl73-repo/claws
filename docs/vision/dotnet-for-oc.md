# The .NET for OpenClaw

<!-- atom:dotnet-for-oc (C55) -->

claws is not a tool. It is a platform. The compiler is one piece. The real play is the library ecosystem -- 11+ @claws/* packages that make every OC skill better, whether or not the developer ever runs `claws build`.

## The playbook

Microsoft built .NET as a set of libraries. The libraries were free, useful, and everywhere. Then Visual Studio made those libraries better with tooling. Then Azure made Visual Studio deployments effortless. Each layer added value; none required the next. But each layer made the next one natural.

claws follows the same arc:

```
.NET libraries     -->  Visual Studio     -->  Azure
(free, useful)          (better tooling)       (managed infra)
     |                       |                      |
     v                       v                      v
@claws/* libraries -->  claws compiler    -->  claws fleet
(free, useful)          (compiled governance)   (managed governance)
```

The libraries are the foundation. The compiler is the integration. Fleet is the enterprise layer. Each stage provides standalone value. None requires the next.

## 11+ libraries as the ecosystem

These are not wrappers or stubs. Each `@claws/*` package solves a real problem that OC skill developers face today:

| Package | Problem it solves |
|---------|-------------------|
| `@claws/relax` | "I need typed expressions for policy rules" |
| `@claws/audit` | "I need tamper-evident audit trails" |
| `@claws/security` | "I need input sanitization against prompt injection" |
| `@claws/budget` | "I need token/cost controls" |
| `@claws/data` | "I need typed data access with sensitivity labels" |
| `@claws/report` | "I need to generate compliance documents" |
| `@claws/identity` | "I need agent authentication helpers" |
| `@claws/schema` | "I need config validation" |
| `@bic/claws-skill-kit` | "I need a `skill()` factory with governance decorators" |
| `@bic/claws-test` | "I need to test governance behavior" |
| `@claws/runtime` | "I need classify/elicit/audit helpers at runtime" |

Plus 5 @openclaw/* packages contributed directly to the OC ecosystem:

| Package | Problem it solves |
|---------|-------------------|
| `@openclaw/audit-chain` | "I need hash-chained audit for any agent" |
| `@openclaw/budget-meter` | "I need threshold alerts for token spending" |
| `@openclaw/identity-bridge` | "I need enterprise SSO in my agent" |
| `@openclaw/siem-emitter` | "I need to forward events to my SOC" |
| `@openclaw/secret-scanner` | "I need to detect leaked credentials" |

Every package is MIT-licensed, standalone, and useful without the claws compiler. An OC developer can `npm install @claws/security` and get production-quality input sanitization today. They never need to hear the word "governance."

## The adoption funnel

```
Stage 1: Libraries (free)
  Developer installs @claws/relax for typed policy expressions.
  No compiler, no config, no commitment.
  Value: better code.

Stage 2: Compiler (free)
  Developer runs claws init + claws build.
  Governance compiled from existing workspace files.
  Value: automated enforcement that they would have written manually.

Stage 3: Fleet (commercial)
  Team runs claws pinch --fleet across 50 workspaces.
  Consistent governance at organizational scale.
  Value: compliance without per-workspace manual configuration.

Stage 4: Enterprise (commercial + support)
  Organization adopts ClawHub governance badges, SIEM integration, sidecar.
  Value: managed governance with audit trails that satisfy SOC2/HIPAA.
```

Each stage is a natural next step, not a forced migration. The developer who installed `@claws/relax` in Stage 1 is not locked in -- they can use the library forever without touching the compiler. But when they need compiled governance, the compiler already understands the patterns they are using because the libraries define those patterns.

## Why this matters for the OC community

The OC ecosystem has 5,198 skills. Of those:

- **98.4% have no governance relationship today** -- no risk classification, no audit, no budget controls
- **165 cross OBO boundaries** -- sending emails, making purchases, posting on behalf of users
- **322 browser skills have 100% injection risk surface** -- every input is untrusted
- **111 R5 TRANSACT skills need budget enforcement** -- financial operations with no spending caps

13,729 skill authors built 5,198 skills without governance. That is a testament to the platform's simplicity. After the ClawHavoc purge, 3,286 curated skills remain. But the lack of governance is becoming a liability: enterprises cannot adopt OC agents without audit trails, SOC integration, and OBO controls.

The wrong answer is a governance framework that makes simple agents complicated. The right answer is libraries that make every skill better -- and a compiler for those who need compiled enforcement.

## The founder's perspective

The founder built OpenClaw as a personal assistant. 346K stars. 3.2M MAU. The community IS the product. The founder asks three questions about every governance addition:

**"Would I want this in MY agent?"**

The libraries: yes. Typed expressions, audit trails, input sanitization -- these make any agent better. They are not governance overhead; they are quality infrastructure.

**"Can the user uninstall this?"**

Yes. `rm -rf .claws` and claws was never there. The libraries remain installed as standard npm packages, useful with or without the compiler.

**"Are we making OpenClaw better or just adding a tax?"**

The @openclaw/* packages are contributions. MIT-licensed, maintained, useful to anyone. If claws disappeared, the packages would still work. The @claws/* packages are the platform layer -- they add capability, not obligation. The compiler is opt-in. Fleet is commercial. At no point does the community pay a tax for governance it did not choose.

## Quality, not control

The .NET analogy holds because .NET succeeded through quality, not lock-in. Developers used the libraries because they were the best available. Visual Studio made them better. Azure made deployment effortless. Each layer earned adoption. None demanded it.

claws earns adoption the same way. Enterprises need governance; the community does not want it imposed. The platform model resolves this: the community gets free libraries that improve skill quality, enterprises get compiled governance that satisfies compliance, the ecosystem gets governance metadata (ClawHub badges) that builds trust, and the founder gets upstream contributions that strengthen the platform. Value flows from libraries up, not from enterprise mandates down. Start with libraries so good that the platform becomes inevitable.
