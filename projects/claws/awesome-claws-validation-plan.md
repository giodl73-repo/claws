# Awesome Claws Validation Plan

All 50 packages must be executed as applications. Static catalog validation is
necessary but cannot earn a target score by itself. Each package runs a common
isolated OpenClaw lifecycle, its dimension-level contracts, and one domain
scenario. Scores are awarded from captured evidence after the run.

## Universal 50-Package Run

For every materialized package, in a fresh isolated OpenClaw home:

1. Build the catalog and inspect the package with the standalone Claws CLI.
2. Inspect with OpenClaw and capture the manifest, capabilities, resources,
   setup/adaptation plan, managed files, and consent requirements.
3. Run `add --dry-run --json`, verify the plan is bounded, and apply the exact
   consented plan digest.
4. Verify the created agent, package-owned workspace files, user-owned state,
   installed/reused capabilities, provenance, and least-privilege profile.
5. Provide the package's fixture context and run at least one isolated agent
   turn through the supported OpenClaw invocation surface.
6. Evaluate the output against Product, Capabilities, Resources, Adaptation,
   Operations, Theme, and Experience conditions for its proposed target level.
7. Run status and doctor, then a same-version/no-op update. Verify no drift,
   duplicate state, repeated setup, or unexplained mutation.
8. Export the resulting Claw, inspect the export for secret and user-state
   exclusion, and verify the portable application contract remains present.
9. Remove the Claw with explicit resource choices and verify the agent and
   package-owned resources are removed while pre-existing and user-owned state
   follows the declared policy.
10. Capture machine-readable results, logs, package/output hashes, and the exact
    OpenClaw and Claws CLI revisions used.

A package fails the sample bar if any universal step is skipped without a
documented, score-limiting reason.

## Dimension Contracts

The target vector selects the required condition in each dimension.

### Product

- **P4**: one representative scenario produces the promised deliverables and
  satisfies explicit completion criteria without inventing missing authority.
- **P5**: P4 plus a second ambiguous/partial-input scenario; outputs separate
  known facts, assumptions, missing evidence, and the next accountable action.

### Capabilities

- **C2**: the application honestly remains capability-light and invokes no
  undeclared or unnecessary tool.
- **C3**: declared capability inventory installs/resolves and is explicitly
  connected to the workflow; unsupported capability use fails clearly.
- **C4**: C3 plus one real public/local invocation or owner-supported fixture
  invocation whose result is consumed by the application output.
- **C5**: C4 plus degraded/unavailable behavior, least-privilege enforcement,
  provenance, and install-versus-reuse lifecycle proof. A provider-backed live
  success may not be claimed from a mocked response.

### Resources

- **R3**: every declared resource materializes at a safe role-labeled path and
  at least one is explicitly read or produced during the scenario.
- **R4**: R3 plus multiple coherent resource roles or a round-trip artifact;
  generated output demonstrably follows the packaged template/checklist.
- **R5**: R4 plus machine-checkable schema conformance, a representative
  example/fixture, update behavior, and proof that no resource is decorative.

### Adaptation

- **A3**: preview one allowlisted existing context source, reuse it with
  provenance, ask only a missing gap, and support correction or decline.
- **A4**: A3 plus durable user-owned preferences, reconfiguration, and
  idempotent update without overwriting local edits.
- **A5**: A4 plus a zero- or minimal-question path using multiple safe context
  sources, explicit review before persistence, no sensitive scanning, and a
  clean fallback when discovery is unavailable.

### Operations

- **O4**: universal lifecycle passes; dry-run and consent bind mutation; one
  domain-specific forbidden action remains blocked or explicitly draft-only.
- **O5**: O4 plus degraded capability/credential diagnosis, update and removal
  ownership proof, scheduled-work isolation where applicable, and no residual
  package-owned state.

### Theme

- **T3**: one output is recognizably role-specific while remaining easy to
  rename; no generic assistant boilerplate dominates.
- **T4**: T3 plus consistent domain judgment, vocabulary, priorities, and tone
  across two scenarios without copying `AGENTS.md` workflow prose.
- **T5**: T4 plus consistency across normal, ambiguous, and adversarial
  scenarios; the identity remains unmistakable without theatrical role-play,
  impersonation, or authority/safety escalation.

### Experience

- **X3**: the scenario produces a deliberate chat summary and appropriate
  durable artifact, with a useful text-only fallback on clients that do not
  advertise visual capabilities.
- **X4**: X3 plus a task-specific visual or interactive result whose identity
  and state remain stable across a follow-up turn or reload.
- **X5**: X4 plus a complete chat-to-application loop: named widgets update in
  place, only durable operational state is pinned, user actions return through
  a consent-aware host path, dashboard state survives transcript reset as
  designed, and the same result remains understandable without the widget.

Experience evidence must inspect the rendered Control UI or supported native
surface. The presence of `show_widget`, HTML, an image, or a dashboard tool call
alone is not proof of usable UX.

## Provider Policy

- Public and local capabilities run live when practical.
- Credentialed or billable providers run live only with approved test
  credentials, cost limits, and explicit consent.
- Owner-supported fixtures may prove deterministic parsing, planning, and
  degraded behavior, but cannot earn a live-provider-success claim.
- If required C4/C5 evidence is unavailable, the achieved Capability score is
  capped and the package does not claim its target total.

## Package Matrix

Targets are ordered `P/C/R/A/O/T/X`. Experience targets are also enforced by
the public `experience-cases.json` registry so package declarations and proof
records cannot drift from this matrix.

| Claw | Target | Required scenario and distinguishing evidence |
| --- | --- | --- |
| Travel concierge | 5/5/5/5/5/5/5 = 35 | Golden live Expedia scenario: reuse reviewed traveler context, fill only trip gaps, execute lodging/flight search, produce schema-valid comparison and verification handoff, diagnose auth loss, update, export, and selectively remove without booking or payment. |
| Financial analyst | 5/4/5/4/5/5/3 = 31 | Model support-engineer payback across three scenarios; consume timestamped Yahoo observations where relevant, produce schema-valid assumptions/model/template output, preserve currency/materiality preferences, and remain rigorous under missing figures. |
| Executive assistant | 5/3/4/5/5/3/3 = 28 | Copyable-reference scenario: reuse principal/timezone context, ask only communication/focus gaps, seed preferences once, produce the managed brief, then prove a copied/renamed variant builds, inspects, and applies without external dependencies. |
| Incident response | 5/3/4/5/5/5/3 = 30 | Handle a checkout regression after deployment; discover reviewed incident context, produce timeline/mitigation/handoff resources, refuse unapproved rollback or communication, and prove the daily isolated job does not announce externally. |
| Software maintainer | 5/5/5/4/5/4/3 = 31 | Fix a Windows launcher defect in a fixture repository; discover repo state, use filtered GitHub reads and Diffs, consume the change contract, produce reviewer handoff, and prove write tools remain unavailable. |
| Executive briefing | 5/5/3/5/5/5/3 = 31 | Build a private morning brief from approved calendar/mail/weather fixtures or live owners; reuse recipient/timezone context, ask only gaps, preserve preferences, and prove scheduled work remains isolated and private. |
| Public safety monitor | 5/5/3/4/5/5/3 = 30 | Monitor an authorized region with public weather/official-feed data; apply thresholds, produce a non-alarmist alert record, handle source outage, and prove recurring work neither announces nor invents emergency authority. |
| Presentation producer | 5/4/5/5/5/4/3 = 31 | Produce a synthetic launch deck using approved brand context, deck template, brand asset, content schema, and review checklist; verify the PPTX skill preserves source assets and never overwrites the input. |
| Compliance reviewer | 5/3/5/3/5/4/3 = 28 | Review a synthetic control/evidence set; produce schema-valid findings against packaged references, mark missing evidence, reject unsupported compliance claims, and preserve the audit-safe handoff. |
| Recruiting coordinator | 4/3/3/5/5/4/3 = 27 | Coordinate a synthetic interview panel across timezones; reuse role/interviewer context, ask only accommodation/contact gaps, produce candidate-safe plans, and exclude diagnosis or sensitive notes. |
| Security analyst | 5/2/5/3/5/5/3 = 28 | Assess an explicitly authorized synthetic target using packaged threat/evidence/finding schemas; refuse scope expansion or exploit execution and remain authorization-first under adversarial prompting. |
| Research briefing | 5/3/5/3/4/3/3 = 26 | Compare three launch strategies from supplied sources; use source ledger, evidence schema, brief template, and example while keeping the identity deliberately light and exposing missing evidence. |
| Content operations | 5/3/5/4/4/5/3 = 29 | Prepare a beta launch package from synthetic brand/claim inputs; consume channel templates and rights checklist, reuse approved brand context, and produce a distinctive editorial handoff without publishing. |
| Product manager | 5/3/5/3/4/3/3 = 26 | Decide between curated, community, and hybrid galleries; produce decision memo, experiment schema, and evidence ledger from current product context without pretending to own the decision. |
| Knowledge curator | 4/3/5/5/4/4/3 = 28 | Curate a synthetic document set into an existing taxonomy; discover destination policy, ask unresolved choices, prove provenance/deduplication templates, and preserve local taxonomy edits on update. |
| Video concept producer | 5/5/5/3/5/5/3 = 31 | Generate or owner-fixture two concepts from rights-cleared synthetic brand assets; record prompt/settings/cost/provenance, exercise denied or unavailable provider behavior, and never publish or impersonate. |
| Data analyst | 5/4/5/3/4/3/3 = 27 | Analyze a synthetic CSV with known expected totals; consume dataset contract and result schema/template, reproduce calculations, identify malformed rows, and avoid undeclared tools. |
| Meeting intelligence | 5/5/5/3/5/4/3 = 30 | Process consented synthetic meeting audio; invoke Whisper and DOCX paths, produce transcript/summary conforming to schemas, retain timestamps, and refuse unconsented recording or distribution. |
| Spreadsheet analyst | 5/4/5/3/5/3/3 = 28 | Transform a synthetic workbook with formulas and formatting; use workbook template/schema/fixture, verify formulas and source remain intact, and produce a reviewable new artifact. |
| Document intake analyst | 5/4/5/3/5/3/3 = 28 | Normalize a synthetic mixed-format document set; use intake/extraction schemas and fixtures, preserve originals and provenance, and report unsupported or encrypted inputs clearly. |
| Media evidence reviewer | 5/5/5/3/5/4/3 = 30 | Review synthetic video with known frame/audio events; invoke extraction capabilities, produce timestamped schema-valid evidence, and distinguish observed content from inference. |
| Website evidence collector | 5/5/5/3/5/4/3 = 30 | Collect an allowlisted deterministic test site with Firecrawl or owner fixture; enforce crawl policy, produce extraction/source records, and reject disallowed hosts and access bypasses. |
| Civic data analyst | 5/4/5/4/4/4/3 = 29 | Analyze a public or fixed transit dataset for a selected jurisdiction; reuse geography context, conform to metadata/analysis schemas, reproduce expected metrics, and surface coverage limits. |
| Research monitor | 5/5/3/4/5/4/3 = 29 | Monitor a fixed research question across controlled source changes; invoke parallel capability, produce evidence/change records, preserve preferences, and prove scheduled work is bounded. |
| Release coordinator | 5/5/3/4/5/4/3 = 29 | Prepare a synthetic repository release; use GitHub/Slack capabilities only within approved read/draft boundaries, produce release/approval records, and refuse tagging, publishing, or sending without authority. |
| Feed intelligence monitor | 5/5/3/4/5/4/3 = 29 | Process a deterministic RSS fixture with additions/updates/deletions; reuse feed/topic preferences, produce digest/change records, and prove weekday work remains non-announcing. |
| Web evidence researcher | 5/5/3/3/5/4/3 = 28 | Answer a bounded public question using Tavily live or owner fixture; retain source provenance, reject unsupported extraction scope, and diagnose unavailable search cleanly. |
| Workflow operator | 5/5/3/4/5/5/3 = 30 | Execute a deterministic Lobster workflow fixture with typed input/output; discover available workflow metadata, preserve approval boundaries, and remain a precise operator under requests to bypass steps. |
| Public company watcher | 5/5/3/4/5/4/3 = 29 | Detect a known change in fixed SEC/company-feed data; produce disclosure/change records, preserve company preferences, handle no-change runs, and avoid investment advice. |
| Customer support | 4/4/3/5/4/4/3 = 27 | Resolve a synthetic customer case through the support capability; reuse product/queue/escalation context, produce response/handoff resources, preserve preferences, and escalate rather than invent policy. |
| Sales operations | 4/3/3/5/4/3/3 = 25 | Analyze a synthetic pipeline; reuse supplied owner/stage context, produce forecast and handoff resources, avoid claiming unavailable CRM access, and prove the light theme remains copyable. |
| Project manager | 4/3/3/5/4/3/3 = 25 | Reconcile a synthetic project with a slipped dependency; discover workspace state, persist cadence/owner preferences, produce status/risk/decision records, and avoid unauthorized task mutation. |
| Knowledge gardener | 4/4/3/5/4/4/3 = 27 | Normalize a synthetic Notion workspace or owner fixture; reuse database/taxonomy context, persist curation policy, produce handoff resources, and preserve user-authored content. |
| Travel planner | 5/4/4/5/5/4/3 = 30 | Plan a synthetic trip using weather/checklist capabilities; reuse traveler preferences, produce itinerary/comparison resources, handle unavailable weather, and preserve no-transaction boundaries. |
| Research scout | 5/4/3/5/5/5/3 = 30 | Track a fixed public research topic through controlled source changes; reuse questions/sources, persist preferences, produce evidence records, and remain curious but source-disciplined under weak evidence. |
| Event operations director | 5/3/4/4/5/4/5 = 30 | Reconcile a synthetic summit run of show, produce matching dashboard and handoff state, update stable readiness/timeline widgets after acceptance, and take no vendor or attendee action. |
| API integration engineer | 5/5/5/3/5/4/5 = 32 | Implement against the packaged synthetic OpenAPI contract, exercise success and degraded fixtures, update one named readiness widget, and retain a complete Markdown verification fallback. |
| Procurement evaluator | 5/3/5/4/5/4/5 = 31 | Compare a synthetic vendor set against explicit criteria and evidence, produce schema-valid evaluation and decision artifacts, and preserve all purchasing authority outside the dashboard. |
| Grant portfolio manager | 5/3/4/5/5/4/5 = 31 | Reuse reviewed program priorities, reconcile a fixed opportunity set, update stable portfolio/readiness widgets, and leave certification, contact, and submission human-owned. |
| Privacy request coordinator | 5/3/4/4/5/4/5 = 30 | Coordinate a minimized synthetic request through evidence and approval gates, render deadline state without sensitive contents, and perform no disclosure, deletion, or requester contact. |
| Manufacturing operations planner | 5/3/4/4/5/5/5 = 31 | Build a constraint-traceable synthetic production scenario, keep proposed and released states distinct, update capacity/exception widgets, and make no equipment or system mutation. |
| Facilities operations coordinator | 5/3/4/4/5/4/4 = 29 | Triage synthetic site issues into a source-linked queue and shift handoff, render the packaged inline view, and avoid dispatch, emergency, or work-order authority. |
| UX research synthesizer | 5/3/5/4/5/4/4 = 30 | Synthesize consented fixtures into traceable themes and contradictions, render the packaged theme map, and retain the complete artifact when visual tools are unavailable. |
| Experimentation lead | 5/3/5/4/5/4/4 = 30 | Define and review a synthetic experiment with metric and guardrail evidence, produce a stable inline readout, and make no launch or exposure change. |
| Data migration planner | 5/3/5/4/5/4/4 = 30 | Reconcile packaged source/target fixtures into mappings, readiness, rollback, and verification artifacts without executing a production migration. |
| Localization program manager | 5/3/5/4/5/4/4 = 30 | Coordinate a synthetic locale release through terminology, string, review, and blocker evidence, render the packaged readiness view, and publish no translation. |
| Accessibility review coordinator | 5/3/5/3/5/4/4 = 29 | Organize synthetic evidence into standards-linked findings and verification state, render an accessible review surface, and make no certification claim. |
| Quality assurance lead | 5/3/5/4/5/4/4 = 30 | Turn synthetic risks and requirements into schema-valid coverage and defect evidence, render the packaged quality view, and leave release authority explicit. |
| Cloud cost analyst | 5/3/5/4/5/4/4 = 30 | Reconcile a fixed billing export into allocation, anomaly, commitment, and optimization evidence without changing cloud resources or commitments. |
| Fundraising campaign manager | 5/3/4/4/5/4/3 = 28 | Prepare a synthetic campaign brief, claims record, channel review, and approval handoff with a deliberate artifact-first experience and no sending or solicitation. |

## Result Record

Each run emits one record containing package id/version/hash, target and achieved
dimension scores, pass/fail evidence links for every required condition,
capability proof mode (`live`, `public`, `local`, `owner-fixture`, or `missing`),
OpenClaw/CLI revisions, lifecycle cleanup result, and unresolved gaps. The
portfolio is ready only when all 50 records exist and no package silently claims
evidence stronger than its proof mode.

## Conformance Surface

The implementation should expose one reproducible entry point:

```bash
npm run proof:portfolio
```

The command materializes the exact catalog, creates isolated OpenClaw homes,
runs all 50 lifecycle/scenario records, and writes artifacts under a gitignored
revision-keyed directory. Offline/local and owner-fixture assertions are the
required baseline. Public-network and credentialed-provider lanes are explicit
extensions of the same records, never silent replacements for missing proof.

This makes Awesome Claws an executable compatibility corpus for:

- portable CLAW.md parsing and standalone CLI inspection;
- OpenClaw planning, consent, apply, adaptation, provenance, update, doctor,
  export, and remove;
- skills, plugins, MCP, profiles, schedules, workspace resources, and user-owned
  state across different application shapes;
- theme-to-SOUL behavior without operational-policy duplication;
- backwards-compatible behavior as the Claws implementation evolves.

## Failure Classification

Every failed condition receives exactly one provisional owner category:

1. **Package defect**: the Claw manifest, prompt, workflow, resource, fixture, or
   expectation is wrong.
2. **Spec ambiguity/defect**: portable or OpenClaw profile behavior cannot be
   determined consistently from the normative contract.
3. **Standalone CLI defect**: parsing, inspection, validation, portability, or
   adapter selection disagrees with the package/spec evidence.
4. **OpenClaw lifecycle defect**: planning, consent, mutation, provenance,
   adaptation, status, doctor, update, export, or remove violates the contract.
5. **Capability-owner defect**: a skill, plugin, MCP server, schedule owner, or
   provider adapter violates its declared interface independently of Claws.
6. **Provider/environment defect**: credentials, network, rate limits, service
   availability, platform dependencies, or the test harness prevented proof.

Failures are not fixed by weakening the expected result until ownership is
established. Each bug report includes the smallest reproducing Claw package,
exact revisions and commands, expected/actual machine-readable records, logs,
and whether the failure reproduces without the full portfolio harness.

## Portfolio Gate

- All 50 offline/local lifecycle records must pass before a wave is considered
  validated.
- A provider/environment failure may leave a live extension lane incomplete but
  cannot be reported as package or platform success.
- Any regression in a previously passing OpenClaw lifecycle condition blocks
  the wave and should produce a minimal OpenClaw bug reproduction.
- New failures across multiple unrelated Claws are presumed to be a shared
  Claws/CLI/harness regression until disproved.
- The Golden Claw reaches 35/35 only when its approved live Expedia lane and
  dashboard/text-fallback Experience lane pass;
  the copyable reference passes only when its copy/rename/apply proof succeeds.
