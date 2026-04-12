# Experiment b: Package Strategy -- Scope, Vehicle, Licensing

**Method**: design analysis
**Date**: 2026-04-11

---

## 1. npm Scope: @openclaw/ vs @craftworks/ vs Unscoped

### Option 1A: `@openclaw/audit-chain` (community-native scope)

**Pros:**
- Lowest adoption friction. Developers searching for OpenClaw governance see it immediately.
- Signals "this is part of the OpenClaw ecosystem" -- import feels native, not foreign.
- Aligns with foundation positioning: Craftworks as a contributing member, not a parasite.
- Discoverability: `npm search @openclaw` lists it alongside any future foundation packages.
- Reduces psychological resistance in PRs ("why are we pulling in a @craftworks package for our OpenClaw setup?").

**Cons:**
- **Scope ownership is unresolved.** The `@openclaw` npm scope may be held by the openclaw org, the foundation (still forming), or Peter Steinberger personally. If Craftworks does not control the scope, every publish requires permission from whoever does. If the foundation relationship sours, publishing is blocked.
- Less brand attribution. Users may not realize Craftworks built it. The npm page says `@openclaw/audit-chain` -- Craftworks appears only in package.json metadata that nobody reads.
- Sets a precedent: every contributed package uses the community scope. If the foundation later wants to reclaim or reorganize the scope, Craftworks loses naming control.
- Risk of naming collision if the foundation or another contributor publishes their own `@openclaw/audit-chain`.

**Verdict:** Best for adoption, worst for control. Only viable if Craftworks secures a publishing agreement with the foundation -- ideally a documented maintainer role for governance-scoped packages.

### Option 1B: `@craftworks/audit-chain` (branded scope)

**Pros:**
- Full publishing control. Craftworks owns the `@craftworks` scope; no external dependency.
- Clear brand attribution. Every `import { AuditChain } from '@craftworks/audit-chain'` is a brand impression.
- No foundation politics. Publish on our own schedule, our own terms.
- Natural progression: `@craftworks/audit-chain` (free, upstream) and `@craftworks/guard` (paid, proprietary) share the same scope -- consistent brand experience.

**Cons:**
- Adoption friction. An OpenClaw user sees `@craftworks/audit-chain` and wonders: "Why is this not @openclaw? Is this an official extension or a third-party thing?" Perceived foreignness.
- Discovery gap. `npm search @openclaw` will not list it. Users must know to look for `@craftworks`.
- Community perception: "They're building their brand on our ecosystem but won't contribute under our namespace." This is the classic open-source brand tension.
- If another vendor contributes a competing `@openclaw/audit-chain`, the community will prefer the "native" one regardless of quality.

**Verdict:** Safest for Craftworks, but creates an adoption and perception gap. Works if Craftworks already has strong brand recognition in the OpenClaw community (we do not, yet).

### Option 1C: `openclaw-audit-chain` (unscoped)

**Pros:**
- No scope ownership issues. Anyone can publish unscoped packages.
- Discoverable: `npm search openclaw` returns it.
- Neutral: neither "official" nor "branded."

**Cons:**
- No namespace protection. Anyone can publish `openclaw-audit-chain-2` or `openclaw-audit-chain-next`.
- Looks informal/amateur compared to scoped packages. Enterprise users expect scoped packages from serious projects.
- No organizational grouping. Five separate packages scattered across npm, no visual connection.
- Name squatting risk: the name could already be taken.

**Verdict:** Worst option. Combines the disadvantages of both without the advantages of either.

### Recommended Scope Strategy: Dual-Scope

Use `@openclaw/` for packages contributed to the community AND accepted by the foundation, `@craftworks/` for everything else. Concrete mapping:

| Package | Scope | Rationale |
|---------|-------|-----------|
| audit-chain | `@openclaw/audit-chain` | Core runtime primitive, contributed upstream |
| siem-emitter | `@openclaw/siem-emitter` | Core runtime primitive, contributed upstream |
| identity-bridge | `@openclaw/identity-bridge` | Core runtime primitive, contributed upstream |
| secret-scanner | `@openclaw/secret-scanner` | Core runtime primitive, contributed upstream |
| budget-meter | `@openclaw/budget-meter` | Core runtime primitive, contributed upstream |
| openclaw-validate | `@openclaw/validate` | Community tool, contributed upstream |
| guard (policy engine) | `@craftworks/guard` | Proprietary, not contributed |
| claws (compiler CLI) | `@craftworks/claws` | Proprietary, not contributed |
| fleet-manager | `@craftworks/fleet` | Proprietary, not contributed |

**Prerequisite:** Before publishing anything under `@openclaw/`, secure a formal publishing agreement with the OpenClaw foundation. This should specify:
1. Craftworks is an authorized publisher for governance-scoped packages.
2. Package naming conventions (e.g., governance packages use `@openclaw/` prefix).
3. Maintenance responsibilities (who triages issues, who merges PRs, who handles CVEs).
4. Succession plan if Craftworks stops maintaining a package.

If the foundation agreement cannot be reached, fall back to `@craftworks/` for everything and contribute the packages to `openclaw/openclaw` as PRs (see Section 2, Option 2A).

---

## 2. Contribution Vehicle: Where the Code Lives

### Option 2A: PRs to `openclaw/openclaw` monorepo

**Mechanism:** Submit PRs adding governance modules to the main OpenClaw repo. The code becomes part of OpenClaw core or an official plugin.

**Pros:**
- Maximum distribution. Every OpenClaw install ships the governance primitives. Zero install friction.
- Strongest community signal. "OpenClaw chose to include our governance work in core."
- Maintenance burden shared with the community -- other contributors can fix bugs, add features.
- No separate repo to maintain. One upstream to track.

**Cons:**
- **Loss of release cadence control.** PRs are subject to OpenClaw maintainer review, which may be slow (foundation transition, contributor churn). A critical bug fix could sit in review for weeks.
- **Architectural compromise.** OpenClaw maintainers may request changes that weaken the design (e.g., "make the hash chain optional" or "don't require SHA-256"). Governance primitives must be opinionated to be useful; community consensus dilutes opinions.
- **Review overhead.** Each PR requires understanding OpenClaw's contribution guidelines, coding style, testing requirements, CI pipeline. This is ongoing overhead for every change.
- **Version coupling.** The governance code ships on OpenClaw's release cycle. If OpenClaw releases monthly and we need a hotfix now, we wait.
- **Breaking change exposure.** Internal OpenClaw refactors can break our contributed modules. We become maintenance dependents of a project we do not control.

**Verdict:** Best for distribution, worst for control. Appropriate for specification documents and small utilities (validate CLI), not for core governance runtime packages.

### Option 2B: Standalone packages in `craftworks/openclaw-governance` repo

**Mechanism:** Create a public GitHub repo (`craftworks/openclaw-governance`) containing the 5 governance packages as a monorepo (Turborepo/Lerna/npm workspaces). Publish to npm under the agreed scope. OpenClaw users install separately: `npm install @openclaw/audit-chain`.

**Pros:**
- **Full release cadence control.** Ship whenever we want, hotfix in hours, version independently.
- **Architectural integrity.** No compromise with OpenClaw maintainers on design decisions. The hash chain uses SHA-256 and is append-only because we say so.
- **Clean extraction boundary.** Each package has its own test suite, its own CI, its own versioning. Matches the "contribute runtime, keep compile-time" strategy exactly.
- **Monorepo efficiency.** Shared tooling (TypeScript config, Vitest, ESLint), cross-package integration tests, single CI pipeline.
- **Brand positioning.** The repo is `craftworks/openclaw-governance` -- Craftworks is visibly the governance authority.
- **Foundation-friendly.** We can offer the foundation a transfer path: if the packages prove successful, transfer ownership to the foundation repo. This is an option, not an obligation.

**Cons:**
- Extra install step for users. `npm install @openclaw/audit-chain` vs built-in.
- Discovery requires marketing. Users need to know the packages exist. ClawHub listing, OpenClaw docs reference, and conference talks are required.
- Maintenance is 100% on Craftworks. No community co-maintenance unless we actively cultivate contributors.
- Risk of "not invented here" rejection by community purists who want everything in core.

**Verdict:** Best balance of control and community benefit. Recommended for the 5 runtime governance packages.

### Option 2C: Fork of OpenClaw with governance layer

**Mechanism:** Fork `openclaw/openclaw`, add governance primitives, maintain the fork as "OpenClaw Enterprise Edition" or "EnterpriseClaw."

**Pros:**
- Total control over the entire stack. Can modify any part of OpenClaw to support governance.
- Strongest product differentiation. "Our fork has governance built in."

**Cons:**
- **Fork maintenance is brutal.** OpenClaw moves fast (100K+ stars, active community). Merging upstream changes into a diverged fork is a continuous engineering tax that only grows over time.
- **Community hostility.** Forks of popular open-source projects are perceived as hostile acts. "They took our work and made a proprietary version." This is the Oracle/MySQL or Redis/Valkey dynamic.
- **Ecosystem fragmentation.** Community plugins/skills may not work with the fork. Two ecosystems means half the support.
- **Foundation relationship damage.** The foundation would view a fork as competitive, not collaborative.

**Verdict:** Worst option. The fork tax is prohibitive, and the community damage undermines the entire brand strategy. Never fork.

### Recommended Vehicle: Standalone Monorepo (2B) + Selective PRs (2A)

- **5 governance packages**: `craftworks/openclaw-governance` monorepo, published under `@openclaw/` scope (with foundation agreement) or `@craftworks/` scope (fallback).
- **Workspace format spec + PEG grammars**: PR to `openclaw/openclaw` as documentation (not code). Specs in a `docs/specs/` directory. Low maintenance, high impact.
- **openclaw-validate CLI**: PR to `openclaw/openclaw` or standalone in the governance repo. Depends on foundation appetite.
- **Security hardening patterns**: PR to `openclaw/openclaw` docs. Pure documentation, no maintenance burden.

This gives maximum control over the runtime packages (where quality matters most) while contributing documentation and specs directly to core (where distribution matters most).

---

## 3. Licensing

### Context

- **OpenClaw**: MIT license (confirmed: "Yes (MIT license)" per GitHub and community docs).
- **Craftworks compiler-sdk/craftworks-sdk**: Currently internal. Will need a license decision for upstream packages.
- **Enterprise concern**: Patent exposure for governance-adjacent technology.

### Option 3A: MIT (matching OpenClaw)

**Pros:**
- Zero friction with OpenClaw ecosystem. Same license, no compatibility analysis needed.
- Maximum adoption. MIT is the most permissive widely-used license. No enterprise legal team will block it.
- Simplicity. Two sentences. Everyone understands it.
- Community expectation: contributing to an MIT project under MIT is the norm.

**Cons:**
- No patent grant. If Craftworks holds patents on governance primitives (audit chain hashing, SIEM emission patterns, identity bridging), MIT does not explicitly license those patents. A patent troll or competitor could use the code and still sue over patents.
- No contributor protection. Contributors are not shielded from Craftworks asserting patents against them.

**Patent risk assessment:** Low. The governance primitives are implementations of well-established patterns (hash chains, CEF/syslog formatting, OIDC validation). These are not novel inventions. Patent risk is theoretical, not practical.

### Option 3B: Apache 2.0 (patent grant)

**Pros:**
- Explicit patent grant. Section 3 of Apache 2.0 grants a royalty-free, irrevocable patent license covering the contribution. This protects adopters and contributors from patent claims by Craftworks.
- Enterprise comfort. Legal teams at large organizations often prefer Apache 2.0 because the patent grant is explicit. "MIT is fine, but Apache is better" is a common enterprise legal stance.
- Contribution protection. If Craftworks ever goes hostile (acquirer, leadership change), the patent grant survives.

**Cons:**
- License mismatch with OpenClaw (MIT). Not a legal problem -- MIT and Apache 2.0 are compatible (Apache 2.0 code can be included in MIT projects, and vice versa). But it creates a perception issue: "Why is this governance package Apache when everything else is MIT?"
- Slightly more complex. Apache 2.0 is a longer document with more clauses (NOTICE file requirement, trademark clause). Minor overhead.
- NOTICE file requirement. Must include a NOTICE file in distributions. Minor administrative burden.

### Option 3C: Dual MIT/Apache 2.0

**Pros:**
- Users choose. MIT-only users take the MIT license. Patent-conscious enterprises take Apache 2.0.
- Maximum compatibility with any downstream project.
- Well-established pattern (Rust ecosystem uses this widely).

**Cons:**
- Dual licensing is confusing. "Which license applies?" is a question that slows adoption, even though the answer is "whichever you prefer."
- Unusual in the Node.js/OpenClaw ecosystem. The Rust community normalized dual licensing; the JavaScript community did not. It looks out of place.
- Administrative overhead. Two license files, SPDX expressions in package.json (`MIT OR Apache-2.0`), explanation in README.

### Recommended License: MIT for contributed packages, Apache 2.0 for proprietary

| Artifact | License | Rationale |
|----------|---------|-----------|
| `@openclaw/audit-chain` | MIT | Match ecosystem, maximize adoption |
| `@openclaw/siem-emitter` | MIT | Match ecosystem, maximize adoption |
| `@openclaw/identity-bridge` | MIT | Match ecosystem, maximize adoption |
| `@openclaw/secret-scanner` | MIT | Match ecosystem, maximize adoption |
| `@openclaw/budget-meter` | MIT | Match ecosystem, maximize adoption |
| Workspace format spec | MIT | Documentation, match ecosystem |
| `@craftworks/guard` | Apache 2.0 | Enterprise product, patent protection matters |
| `@craftworks/claws` | Apache 2.0 | Enterprise product, patent protection matters |

**Rationale:** The upstream contributions are implementations of standard patterns (hash chains, CEF formatting, OIDC validation). Patent risk is negligible. MIT matches the ecosystem and removes all friction. The proprietary products (guard, claws) are where novel IP lives (policy IR, fence passes, trust tiers) -- Apache 2.0 protects both Craftworks and enterprise customers in that context.

---

## 4. Monorepo vs Multi-Repo

### The 5 Contributed Packages

| Package | Dependencies on other packages | Shared code |
|---------|-------------------------------|-------------|
| audit-chain | None (standalone) | Hashing utilities, JSONL helpers |
| siem-emitter | Depends on audit-chain (reads entries) | Format utilities |
| identity-bridge | None (standalone) | Token validation patterns |
| secret-scanner | None (standalone) | Regex/entropy utilities |
| budget-meter | None (standalone) | State machine patterns |

**Cross-dependency analysis:** Only siem-emitter depends on audit-chain. The other 4 are independent. Shared code is limited to utility patterns.

### Option 4A: Single monorepo (`craftworks/openclaw-governance`)

```
openclaw-governance/
  packages/
    audit-chain/       (package.json, src/, tests/)
    siem-emitter/      (package.json, src/, tests/)
    identity-bridge/   (package.json, src/, tests/)
    secret-scanner/    (package.json, src/, tests/)
    budget-meter/      (package.json, src/, tests/)
  shared/              (utility code, TypeScript config)
  .github/workflows/   (single CI pipeline)
  package.json         (workspaces root)
```

**Pros:**
- Single CI pipeline. One PR runs all tests. Cross-package integration is tested automatically.
- Shared tooling. TypeScript config, Vitest config, ESLint config, Changesets config -- all shared.
- Atomic releases. When siem-emitter depends on a new audit-chain feature, both release in one PR.
- Contributor experience. One repo to clone, one setup, one contributing guide.
- siem-emitter can import audit-chain types via workspace symlinks during development.

**Cons:**
- All-or-nothing contributor access. A contributor fixing a typo in secret-scanner has write access to audit-chain.
- Larger repo clone for casual contributors.
- Release coupling. A breaking change in audit-chain may force a siem-emitter release even if siem-emitter has no changes.

### Option 4B: Separate repos per package

```
craftworks/openclaw-audit-chain/
craftworks/openclaw-siem-emitter/
craftworks/openclaw-identity-bridge/
craftworks/openclaw-secret-scanner/
craftworks/openclaw-budget-meter/
```

**Pros:**
- Independent release cycles. Each package versions independently with no coupling.
- Granular permissions. Write access per package.
- Simpler per-repo. Less configuration, less CI complexity.

**Cons:**
- 5x CI configuration. 5 separate GitHub Actions pipelines, 5 Dependabot configs, 5 ESLint configs.
- Cross-package changes require coordinated PRs across repos (siem-emitter + audit-chain).
- Shared code must be duplicated or extracted into a 6th package (`@openclaw/governance-common`).
- Contributor friction: 5 repos to discover, 5 contributing guides, 5 issue trackers.
- Discoverability suffers. No single "governance" landing page on GitHub.

### Recommended: Single monorepo (4A)

The packages are small (audit-chain is ~300 lines, siem-emitter ~200 lines), tightly related (all governance primitives), and have a cross-dependency (siem-emitter reads audit-chain entries). A monorepo is strictly better for this size and relationship:

- **Repo**: `craftworks/openclaw-governance`
- **Package manager**: npm workspaces (matches Craftworks' existing practice)
- **Versioning**: Changesets (independent versions per package, coordinated releases)
- **CI**: Single GitHub Actions pipeline with matrix strategy per package
- **Testing**: Vitest, matching Craftworks' existing test infrastructure

---

## 5. Specification Publishing

### What to Publish

| Document | Content | Target audience |
|----------|---------|----------------|
| Workspace format spec | Formal 12-file workspace definition (from Spec 103) | Tool authors, IDE plugin developers |
| PEG grammars | 11 machine-readable format definitions | Parser implementors |
| Audit chain format spec | JSONL schema, hash chain protocol | Security tool authors |
| SIEM format mapping | CEF/NDJSON/syslog field mappings | SOC engineers |
| Round-trip test suite | Reference test cases for reader/writer correctness | Tool authors |

### Option 5A: RFCs submitted to OpenClaw foundation

**Mechanism:** Write formal RFCs (Request for Comments) and submit to the foundation's governance process. RFCs become canonical if accepted.

**Pros:**
- Highest authority. An accepted RFC IS the standard. Other implementations must conform to it.
- Establishes Craftworks as the governance specification authority within the foundation.
- Forces community review, which improves the spec and builds consensus.
- Creates a citable reference ("per OpenClaw RFC-001, audit entries MUST use SHA-256").

**Cons:**
- Foundation governance is still forming. There may not be an RFC process yet. Craftworks may need to propose the RFC process itself before submitting RFCs.
- Slow. Community review takes weeks or months. Iteration is painful.
- Risk of rejection or modification. The community may disagree with design decisions.

### Option 5B: GitHub wiki pages on `openclaw/openclaw`

**Pros:**
- Easy to publish. Wiki is open for editing on most open-source repos.
- Discoverable via the main OpenClaw repo.
- Low barrier to contribution/correction.

**Cons:**
- Wikis are not authoritative. They are "community documentation," not specifications.
- Not version-controlled in a meaningful way (wiki git is separate from repo git).
- Cannot enforce conformance against a wiki page.
- Wikis are frequently unmaintained and become stale.

**Verdict:** Wikis are for how-to guides, not specifications. Never publish a formal spec as a wiki.

### Option 5C: Standalone docs site

**Mechanism:** Build a dedicated documentation site (e.g., `governance.openclaw.dev` or `docs.craftworks.dev/openclaw`) using a static site generator (Docusaurus, Astro, VitePress).

**Pros:**
- Professional presentation. Searchable, navigable, versioned.
- Full control over content, structure, and updates.
- Can include interactive examples (e.g., paste a workspace, see validation results).
- Brand positioning: "the governance documentation site for OpenClaw."

**Cons:**
- Maintenance burden. A docs site requires hosting, CI/CD, and ongoing updates.
- Discovery requires marketing (SEO, backlinks from OpenClaw docs).
- May be perceived as "Craftworks' docs" rather than "community docs."

### Option 5D: Hybrid -- RFCs + docs site

**Mechanism:** Submit formal RFCs to the foundation for canonical specs. Host a docs site with detailed guides, examples, and interactive tools that reference the RFCs.

**Pros:**
- RFCs provide authority. Docs site provides usability.
- The docs site can include content that does not belong in an RFC (tutorials, migration guides, examples).
- If the foundation does not yet have an RFC process, publish specs on the docs site first and port to RFCs when the process exists.

**Cons:**
- Highest effort. Two publishing channels to maintain.
- Risk of drift between RFC content and docs site content.

### Recommended: Docs site first, RFCs when foundation is ready (5D phased)

1. **Immediately:** Publish specs on a standalone docs site (`governance.openclaw.dev` if the foundation grants the subdomain, otherwise `openclaw-governance.craftworks.dev`).
2. **When foundation RFC process exists:** Submit the workspace format spec and audit chain format as RFCs. Reference the docs site for examples and guides.
3. **Ongoing:** Docs site serves as the living reference. RFCs serve as the frozen standard.

The docs site gives us immediate publishing ability without waiting for foundation governance to solidify. RFCs give us long-term authority once the foundation is ready to accept them.

---

## Recommended Strategy Summary

| Decision | Recommendation | Fallback |
|----------|---------------|----------|
| npm scope | `@openclaw/` with foundation agreement | `@craftworks/` if agreement fails |
| Contribution vehicle | Standalone monorepo (`craftworks/openclaw-governance`) | PRs to openclaw/openclaw for specs/docs only |
| License | MIT for contributed packages | Apache 2.0 for proprietary products only |
| Repo structure | Single monorepo with npm workspaces | -- |
| Spec publishing | Docs site now, RFCs when foundation is ready | Docs site only if foundation stalls |

### Prerequisite Actions (before any publishing)

1. **Contact the OpenClaw foundation.** Request: (a) `@openclaw/` npm scope publishing rights for governance packages, (b) input on whether the foundation has or plans an RFC process, (c) blessing for a `governance.openclaw.dev` subdomain.
2. **Register fallback scope.** Ensure `@craftworks` npm scope is claimed and ready (likely already done since craftworks-sdk exists).
3. **Prepare extraction.** Audit `compiler-sdk/src/astro/audit/audit-chain.ts` and `craftworks-sdk/src/domains/guard/audit/siem-emitter.ts` for external dependencies. The current implementations import `zod` and internal types -- these dependencies must be either included or eliminated for standalone packages.

---

## Key Findings

1. **Scope decision is gated on foundation politics.** The best scope (`@openclaw/`) requires a relationship that does not yet exist. The fallback (`@craftworks/`) is always available but hurts adoption. Start the foundation conversation immediately -- it is on the critical path.

2. **Never fork.** The maintenance tax and community damage make forking catastrophically worse than any alternative. This is a hard no.

3. **Standalone monorepo is strictly better than PRs for runtime packages.** PRs lose release control, which is unacceptable for security-critical governance code. Specs and docs can go upstream as PRs because they have no release cadence.

4. **MIT is the right license for upstream contributions.** The governance primitives implement standard patterns (hash chains, CEF, OIDC). Patent risk is negligible. Matching the ecosystem license removes friction. Save Apache 2.0 for the proprietary products where novel IP lives.

5. **Dual-scope is not a compromise -- it is the strategy.** `@openclaw/` for community contributions, `@craftworks/` for proprietary products. This maps directly to the contribute/keep boundary from Q12b's working notes. The scope signals which side of the line a package falls on.

6. **Spec publishing has a chicken-and-egg problem.** RFCs have the most authority, but the foundation may not have an RFC process yet. A docs site provides immediate publishing ability. Plan for both, start with the docs site.

7. **The extraction boundary is clean.** audit-chain (compiler-sdk) and siem-emitter (craftworks-sdk) are already in separate packages with well-defined interfaces. The main extraction work is removing internal imports (zod schemas, cross-package type imports) and making the packages truly standalone.
