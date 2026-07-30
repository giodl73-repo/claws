# Awesome Claws Application Scorecard

Scored 2026-07-29 against the initial 35-package catalog in
`giodl73-repo/awesome-claws#1`. This evaluates each package as an agent
application, not only as a valid Claw manifest or useful prompt.

## Rubric

The first five dimensions and Experience are scored from 1 (minimal) to 5
(exemplary). Theme is scored from 3 to 5 because every published Awesome Claw
must have a recognizable identity. The maximum is 35.

1. **Product (P)**: clear audience, job, workflow, outputs, example, and done state.
2. **Capabilities (C)**: coherent skills, plugins, MCP, tools, and scheduled work
   that materially enable the job.
3. **Resources (R)**: useful packaged references, templates, schemas, examples,
   fixtures, or assets, with an explicit role in the workflow.
4. **Adaptation (A)**: how efficiently the application becomes locally useful.
   This includes safe reuse of agent identity, workspace context, existing
   configuration/integrations, locale/timezone, and prior user-owned state;
   minimal gap questions; and durable, upgrade-safe personalization. A
   zero-question contextual bootstrap may score higher than a setup form.
5. **Operations (O)**: least privilege, capability disclosure, approvals,
   failure boundaries, recurring-work safety, and verifiable completion.
6. **Theme (T)**: how clearly the `CLAW.md` prompt becomes a role-specific
   `SOUL.md` through domain judgment, vocabulary, priorities, and voice. A 3 is
   intentionally light and easy to customize, 4 is distinctive, and 5 is an
   unmistakable but still professional identity. Theme must not duplicate
   `AGENTS.md`, weaken safety, or become theatrical noise.
7. **Experience (X)**: how effectively the application turns its work into a
   usable interaction across chat, durable artifacts, and supported visual
   surfaces. A 3 has a deliberate output contract and graceful channel
   fallback; 4 adds a task-specific visual or interactive result with stable
   state; 5 provides a complete chat-to-application loop with named updatable
   widgets, appropriate dashboard pinning, user actions, durable artifacts,
   and an accessible text fallback. A dashboard is never required when it
   would not improve the job.

Adaptation is scored by outcome, not question count: 1 is static; 2 reuses
conversation context and asks only for gaps; 3 safely discovers existing local
identity/workspace/configuration; 4 adds durable user-owned state with
idempotent update and reconfigure behavior; and 5 combines discovery, minimal
questions, explicit review/consent, durable personalization, and safe fallback.
Sensitive identity or secrets are never inferred merely to increase the score.

Bands: 31-35 exemplary application; 27-30 strong application prototype; 22-26
composed starter; 17-21 workflow/prompt kit; below 17 concept only.

## Target Bar

A showcase-ready application should score at least 25, with Product and
Operations at least 4, Experience at least 3, at least one of
Capabilities/Resources/Adaptation at 5, and a second of those three at least 3.
Theme must be at least 3. At most one of the first five dimensions may be below
3, and the omission must be intrinsic to the application rather than missing
work.

Portfolio coverage should include a distinct named exemplar for every pair among
Product, Capabilities, Resources, Adaptation, and Operations: `P+C`, `P+R`,
`P+A`, `P+O`, `C+R`, `C+A`, `C+O`, `R+A`, `R+O`, and `A+O`. This is a
portfolio diversity requirement, not a reason to make every Claw symmetrical.
Adding Theme produces five more pairs: `P+T`, `C+T`, `R+T`, `A+T`, and `O+T`.
Adding Experience produces six more pairs: `P+X`, `C+X`, `R+X`, `A+X`, `O+X`,
and `T+X`. The 50-package portfolio should contain a natural exemplar for all
21 pairs without forcing every Claw into the same visual shape.

The portfolio must also contain exactly one **Golden Claw** scoring 35/35. The
Golden Claw is not a maximal manifest or kitchen-sink package: every perfect
dimension must be natural to one coherent application, exercised end to end,
and removable without leaving unexplained state. Travel Concierge is the
designated Golden Claw target.

The portfolio also designates **Executive Assistant as the Copyable Reference
Claw**. Copyability is not a sixth score and does not require a perfect package.
It rewards a small, dependency-free structure that demonstrates the portable
prompt, workflow, packaged template, contextual adaptation, seed-once
user-owned preferences, and upgrade boundary without external credentials.

## Scores

The table below is the legacy six-dimension baseline used to plan the original
35-package upgrade. It intentionally omits Experience and remains historical
evidence rather than silently assigning X scores without rendered proof. The
50-package conformance run will replace it with seven-dimension achieved scores.

| Claw | P | C | R | A | O | T | Total | Primary gap |
| --- | -: | -: | -: | -: | -: | -: | -: | --- |
| Travel concierge | 5 | 5 | 3 | 4 | 5 | 5 | **27** | Reuse safe local travel identity and make its template a plugin-output contract |
| Software maintainer | 5 | 5 | 4 | 3 | 5 | 4 | **26** | Persist project preferences while deriving repository context automatically |
| Financial analyst | 5 | 3 | 3 | 4 | 5 | 4 | **24** | Add calculation schema/example and connect the skill to the template |
| Executive assistant | 5 | 1 | 3 | 4 | 5 | 3 | **21** | Add calendar, mail, task, or briefing capabilities |
| Executive briefing | 5 | 5 | 1 | 2 | 5 | 4 | **22** | Derive recipient/source context and add a reusable brief template |
| Public safety monitor | 5 | 5 | 1 | 2 | 5 | 5 | **23** | Discover safe location/source context and add an alert template |
| Meeting intelligence | 5 | 4 | 1 | 2 | 5 | 4 | **21** | Reuse consent/output context and add transcript schemas and templates |
| Research monitor | 5 | 4 | 1 | 2 | 5 | 4 | **21** | Discover tracked topics/sources and add evidence-report resources |
| Media evidence reviewer | 5 | 4 | 1 | 2 | 5 | 4 | **21** | Reuse media/workspace context and add evidence resources |
| Release coordinator | 5 | 4 | 1 | 2 | 5 | 4 | **21** | Discover repository/channel context and add release templates |
| Feed intelligence monitor | 5 | 4 | 1 | 2 | 5 | 4 | **21** | Reuse existing feeds/topics and add a digest schema/template |
| Travel planner | 5 | 4 | 1 | 2 | 5 | 4 | **21** | Reuse traveler context and add itinerary/comparison resources |
| Web evidence researcher | 5 | 4 | 1 | 2 | 5 | 4 | **21** | Derive query/workspace context and add evidence schemas |
| Website evidence collector | 5 | 4 | 1 | 2 | 5 | 4 | **21** | Reuse crawl context and add extraction schemas and fixtures |
| Video concept producer | 5 | 4 | 1 | 2 | 5 | 5 | **22** | Reuse workspace brand context and add rights-cleared assets |
| Workflow operator | 5 | 4 | 1 | 2 | 5 | 4 | **21** | Discover available workflows and add schemas and examples |
| Public company watcher | 5 | 4 | 1 | 2 | 5 | 4 | **21** | Reuse company/source context and add a digest template |
| Research scout | 5 | 4 | 1 | 2 | 5 | 4 | **21** | Reuse research context and add evidence resources |
| Incident response | 5 | 3 | 1 | 2 | 5 | 4 | **20** | Discover incident context and add system integrations/templates |
| Spreadsheet analyst | 5 | 3 | 1 | 2 | 5 | 3 | **19** | Derive workbook context and add schemas/templates/fixtures |
| Presentation producer | 5 | 3 | 1 | 2 | 5 | 4 | **20** | Reuse audience/brand context and add deck assets/templates |
| Document intake analyst | 5 | 3 | 1 | 2 | 5 | 3 | **19** | Infer safe document context and add schemas/templates/fixtures |
| Civic data analyst | 5 | 3 | 1 | 2 | 4 | 4 | **19** | Reuse jurisdiction/dataset context and add schemas/examples |
| Customer support | 4 | 3 | 1 | 2 | 4 | 3 | **17** | Discover support context and add escalation/response resources |
| Security analyst | 5 | 1 | 1 | 2 | 5 | 4 | **18** | Add approved tools and reuse safe target/evidence context |
| Compliance reviewer | 5 | 1 | 1 | 2 | 5 | 4 | **18** | Discover framework/control context and add evidence connectors |
| Knowledge gardener | 4 | 3 | 1 | 2 | 4 | 4 | **18** | Reuse workspace/database context and add taxonomy resources |
| Data analyst | 5 | 1 | 1 | 2 | 4 | 3 | **16** | Add data tools and derive source/schema context safely |
| Recruiting coordinator | 4 | 1 | 1 | 2 | 5 | 4 | **17** | Add ATS/calendar capabilities and reuse role/interview context |
| Research briefing | 4 | 1 | 1 | 2 | 4 | 3 | **15** | Add search capabilities and reuse topic/source context |
| Sales operations | 4 | 1 | 1 | 2 | 4 | 3 | **15** | Add CRM capabilities and derive pipeline context |
| Content operations | 4 | 1 | 1 | 2 | 4 | 4 | **16** | Add publishing capabilities and reuse brand/channel context |
| Project manager | 4 | 1 | 1 | 2 | 4 | 3 | **15** | Add project tools and derive workspace/project context |
| Product manager | 4 | 1 | 1 | 2 | 4 | 3 | **15** | Add evidence/project tools and reuse product context |
| Knowledge curator | 4 | 1 | 1 | 2 | 4 | 3 | **15** | Add source/destination tools and derive taxonomy context |

## Portfolio Result

- Overall average: **19.7/30**.
- Dimension averages: Product **4.7**, Capabilities **2.9**, Resources **1.3**,
  Adaptation **2.2**, Operations **4.7**, Theme **3.8**.
- One current package is exemplary, three are strong application prototypes,
  19 are composed starters, and 12 remain workflow/prompt kits.
- The highest-value catalog improvement is not more prose. Add setup and
  application resources to the already capable packages, and explicitly state
  how a skill/plugin/tool consumes or produces those resources.

## Recommended Upgrade Cohorts

1. **Prove every application lane**: upgrade Financial Analyst, Software
   Maintainer, Travel Concierge, Presentation Producer, and Media Evidence
   Reviewer with schemas, templates, fixtures/assets, and explicit capability
   usage contracts.
2. **Operational applications**: add meaningful setup and output resources to
   Executive Briefing, Public Safety Monitor, Release Coordinator, Feed
   Intelligence Monitor, and Research Monitor.
3. **Convert prompt kits selectively**: only promote generic starters when a
   real capability and persisted setup materially changes the user experience.
