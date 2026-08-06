# Awesome Claws Application Upgrade Plan

This plan upgrades all 35 current starters as diverse agent applications. It
does not require every package to have the same setup form, integrations, or
asset layout. Scores use Product, Capabilities, Resources, Adaptation,
Operations, and Theme (`P/C/R/A/O/T`) on the rubric in
`projects/claws/awesome-claws-app-scorecard.md`.

## Portfolio Rules

- Showcase review target: at least 21/30, Product and Operations at least 4,
  Theme at least 3, one of Capabilities/Resources/Adaptation at 5, and another
  at least 3. This is a human quality target, not a machine-enforced quota that
  justifies artificial capabilities, resources, setup, or theme.
- Adaptation rewards safe zero-question discovery. Do not ask for identity,
  workspace, timezone, locale, integrations, or prior preferences when the
  harness can already provide them with appropriate authority.
- Discovery is allowlisted, previewed, and provenance-bearing. A Claw must say
  which existing context it proposes to reuse, let the user correct or decline
  it, and never scan for sensitive identity, credentials, or unrelated files.
- A capability must materially participate in the workflow. Do not add a skill,
  plugin, MCP server, or cron job merely to improve a score.
- A resource must be consumed or produced by the application. Do not add
  decorative templates, schemas, examples, fixtures, or assets.
- User-owned personalization remains local and upgrade-safe. Secrets stay in
  existing harness-owned stores and are never copied into package resources.
- Each Claw has one primary pair. Shared mechanics may be reused, but its
  workflow, adaptation strategy, resources, and operational boundaries remain
  domain-specific.
- Every `CLAW.md` body provides a role-specific `SOUL.md`. Theme ranges from 3
  (light and easy to customize) through 5 (unmistakable but professional); it
  must not duplicate workflow instructions or become theatrical noise.
- Theme is package-managed content, so theme changes appear in update preview.
  It cannot grant authority, relax capability boundaries, impersonate a person,
  or move operational rules out of `AGENTS.md`.
- Exactly one package is the **Golden Claw** at 30/30. Perfect does not mean
  largest: each capability, resource, adaptive behavior, and operational
  control must be necessary to one coherent user outcome.

## Golden Claw

**Travel Concierge** is the Golden Claw target at `5/5/5/5/5/5 = 30`.

- **Product**: one complete job from traveler intent through a timestamped,
  traveler-controlled Expedia comparison and booking handoff.
- **Capabilities**: the official Expedia plugin and least-privilege tool profile
  materially execute lodging/flight search and explicit authentication steps.
- **Resources**: trip-requirements schema, comparison schema/template, worked
  example, and verification checklist are explicitly consumed and produced by
  the workflow.
- **Adaptation**: safely reuse agent/traveler identity, existing Expedia state,
  locale/timezone, home airport, currency, and prior user-owned preferences;
  ask only unresolved trip-specific gaps and support review/reconfiguration.
- **Operations**: preview and consent, credential-store ownership, volatile-data
  timestamps, provider/price caveats, no booking/payment authority, diagnostics,
  update-safe personalization, and selective removal are all demonstrated.
- **Theme**: a calm, exacting travel concierge identity consistently prioritizes
  traveler intent, comparison quality, caveats, and traveler-controlled action
  without imitating a salesperson or inventing hospitality theater.

Golden proof must exercise package inspection, dry-run, consented apply,
adaptive setup, plugin reuse/install behavior, resource-backed output, status,
doctor, update, export, and selective remove through OpenClaw. The same package
must also pass standalone Claws CLI inspection. No mock capability may be used
to claim the final 30.

## Copyable Reference Claw

**Executive Assistant** is the package authors should copy when creating a new
Claw. It remains intentionally smaller than the Golden Claw and requires no
external service, credential, plugin, MCP server, or scheduled job.

Its package should make the core application anatomy obvious:

1. `CLAW.md` defines identity and the portable agent prompt.
2. `workspace/AGENTS.md` defines the operating workflow and completion contract.
3. One role-labeled template demonstrates managed application resources.
4. Safe context discovery avoids asking for identity/timezone already known.
5. A bounded gap interview seeds user-owned `USER.md` preferences once.
6. `package.json` provides the portable package entry point.

Its Theme target is deliberately 3: recognizable executive-assistant judgment
and tone, but light enough that authors can replace the role without first
unwinding an elaborate persona.

The README should identify this package as the copyable reference, show its
small file tree, and distinguish package-owned files from user-owned state. A
copy/customize proof must rename the package and agent, change its workflow and
template, add or remove an adaptation input, build it, inspect it with the
standalone CLI, and apply it in OpenClaw without editing generator output by
hand. Keep authoring guidance outside the runtime prompt and package resources.

Document two copy paths explicitly: external authors may copy the materialized
package directory as an independent Claw, while contributors to this generated
catalog copy and edit the Executive Assistant entry in `catalog.json`, then run
the materializer. Do not tell contributors to hand-edit `claws/` output.

## Foundation

Start Wave 1 with the repository's existing catalog fields. After at least two
exemplars expose real repetition, extend the repository-local catalog authoring
model only as needed to express two generated `AGENTS.md` contracts and one
prompt-body contract:

1. **Resource contract**: which packaged resources a workflow reads and which
   outputs it produces from them.
2. **Adaptation contract**: which safe local context is discovered, which gaps
   may be asked, what user-owned state is persisted, and how it is reconfigured.
3. **Theme contract**: the domain-specific judgment, vocabulary, priorities,
   and voice expressed by `CLAW.md` without duplicating the operational
   workflow owned by `AGENTS.md`.

These are catalog-authoring conveniences, not new portable CLAW.md schema
fields. Delete or defer any helper that does not remove demonstrated repetition.
Validation should prove paths and generated references, not claim to prove
semantic quality.

## Wave 1: Exemplar Matrix A

| Claw                | Pair | Target           | Concrete application upgrade                                                                                                                                                                                                                                                                                                    |
| ------------------- | ---- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Travel concierge    | P+C  | 5/5/5/5/5/5 = 30 | Golden Claw: reuse safe traveler identity and existing Expedia state; ask only missing trip preferences; connect requirements/comparison schemas, template, worked example, and verification checklist to real Expedia searches and the traveler-controlled handoff; give it an unmistakable but restrained concierge identity. |
| Financial analyst   | P+R  | 5/4/5/4/5/5 = 28 | Add a calculation/input schema, worked scenario example, and scenario template contract; preserve currency/materiality preferences and use a rigorous, assumption-explicit financial voice.                                                                                                                                     |
| Executive assistant | P+A  | 5/3/4/5/5/3 = 25 | Copyable Reference Claw: keep the dependency-free package anatomy and theme light; read agent/principal identity, timezone, and workspace context before asking gaps; persist communication/focus preferences and demonstrate one managed brief template.                                                                       |
| Incident response   | P+O  | 5/3/4/5/5/5 = 27 | Discover active incident/service context safely; package timeline, mitigation-decision, and handoff resources; use a terse incident-command identity while preserving exact approval and rollback boundaries.                                                                                                                   |
| Software maintainer | C+R  | 5/5/5/4/5/4 = 28 | Make GitHub and Diffs consume the change contract and produce the reviewer handoff; add a change schema and representative fixture; derive repository state automatically with a pragmatic maintainer identity.                                                                                                                 |

## Wave 2: Exemplar Matrix B

| Claw                   | Pair | Target           | Concrete application upgrade                                                                                                                                                                           |
| ---------------------- | ---- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Executive briefing     | C+A  | 5/5/3/5/5/5 = 28 | Discover available calendar/mail/weather context, ask only source/recipient gaps, persist briefing preferences, add a concise output template, and use a decisive briefing-editor identity.            |
| Public safety monitor  | C+O  | 5/5/3/4/5/5 = 27 | Reuse authorized region/source context; add alert thresholds and an alert record template with an authoritative, non-alarmist monitor identity and isolated, non-announcing scheduled behavior.        |
| Presentation producer  | R+A  | 5/4/5/5/5/4 = 28 | Discover approved audience and brand context; package a deck template, brand asset example, content schema, and review checklist consumed by the PPTX skill; use a disciplined editorial design voice. |
| Compliance reviewer    | R+O  | 5/3/5/3/5/4 = 25 | Package framework references, control/evidence schemas, review checklist, and example evidence set with a traceable, evidence-first reviewer identity.                                                 |
| Recruiting coordinator | A+O  | 4/3/3/5/5/4 = 24 | Reuse role, interviewer, timezone, and calendar context; ask accommodation/contact gaps only; add interview-plan and candidate-safe handoff templates with a discreet coordinator identity.            |

## Wave 3: Resource-Led Applications

| Claw                   | Pair | Target           | Concrete application upgrade                                                                                                                                                                                        |
| ---------------------- | ---- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security analyst       | P+T  | 5/2/5/3/5/5 = 25 | Theme exemplar: add threat-model, evidence, finding, and verification schemas plus a bounded example; use a skeptical, authorization-first analyst identity and discover only explicitly authorized target context. |
| Research briefing      | P+R  | 5/3/5/3/4/3 = 23 | Add source ledger, claim/evidence schema, brief template, and worked example; reuse the current question and supplied sources with a deliberately light analyst theme.                                              |
| Content operations     | R+T  | 5/3/5/4/4/5 = 26 | Theme exemplar: package brand/claim references, channel templates, rights checklist, and publication handoff; use a distinctive editorial-operations identity grounded in approved brand/channel context.           |
| Product manager        | P+R  | 5/3/5/3/4/3 = 23 | Add decision memo, experiment schema, evidence ledger, and worked product decision; keep the product judgment theme light and portable.                                                                             |
| Knowledge curator      | R+A  | 4/3/5/5/4/4 = 25 | Package taxonomy, provenance, deduplication, and destination templates; discover current workspace taxonomy with a careful archivist identity.                                                                      |
| Video concept producer | C+T  | 5/5/5/3/5/5 = 28 | Theme exemplar: package rights-cleared prompt/brand asset examples, generation record schema, and review board; use a creative-director identity while requiring explicit provider/cost/publication approval.       |

## Wave 4: Capability and Resource Applications

| Claw                       | Pair | Target           | Concrete application upgrade                                                                                                                                                      |
| -------------------------- | ---- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data analyst               | C+R  | 5/4/5/3/4/3 = 24 | Add a vetted data-file capability, dataset contract, analysis schema, reproducible example, and result template; infer safe file/workspace context with a light analytical theme. |
| Meeting intelligence       | C+R  | 5/5/5/3/5/4 = 27 | Connect Whisper and DOCX to consent record, transcript schema, meeting-summary template, and representative fixture with a discreet recorder identity.                            |
| Spreadsheet analyst        | C+R  | 5/4/5/3/5/3 = 25 | Connect the XLSX skill to workbook templates, validation schema, formula-preservation checklist, and synthetic workbook fixture with a light audit-minded theme.                  |
| Document intake analyst    | C+R  | 5/4/5/3/5/3 = 25 | Connect conversion to intake/extraction schemas, output templates, and safe representative fixtures; reuse discovered file context with a light normalization theme.              |
| Media evidence reviewer    | C+R  | 5/5/5/3/5/4 = 27 | Connect frame/audio extraction to evidence schema, timestamped review template, and synthetic audiovisual fixture with a forensic-review identity.                                |
| Website evidence collector | C+R  | 5/5/5/3/5/4 = 27 | Connect Firecrawl to crawl policy, extraction schema, source ledger, and deterministic fixture; use a methodical collector identity while preserving access boundaries.           |
| Civic data analyst         | C+R  | 5/4/5/4/4/4 = 26 | Connect transit data to jurisdiction/dataset metadata, analysis schema, worked example, and locally adapted geography with a public-interest analyst identity.                    |

## Wave 5: Capability and Operations Applications

| Claw                      | Pair | Target           | Concrete application upgrade                                                                                                                                               |
| ------------------------- | ---- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Research monitor          | C+O  | 5/5/3/4/5/4 = 26 | Reuse tracked questions/sources, add change/evidence records, and keep parallel and scheduled work bounded with a patient watch-analyst identity.                          |
| Release coordinator       | C+O  | 5/5/3/4/5/4 = 26 | Discover repository/channel context, add release and approval records, and keep GitHub/Slack activity approval-bound with a calm release-captain identity.                 |
| Feed intelligence monitor | C+O  | 5/5/3/4/5/4 = 26 | Reuse existing feeds/topics, add digest/change records, and preserve isolated work with a signal-over-noise editor identity.                                               |
| Web evidence researcher   | C+O  | 5/5/3/3/5/4 = 25 | Add search/extraction scope and evidence records while retaining minimal constraints and a source-skeptical researcher identity.                                           |
| Workflow operator         | O+T  | 5/5/3/4/5/5 = 27 | Theme exemplar: discover available Lobster workflows, package input/output schemas and examples, and use a precise operations-console identity while preserving approvals. |
| Public company watcher    | C+O  | 5/5/3/4/5/4 = 26 | Reuse company/source preferences, add disclosure/change records, and use a sober filings-watcher identity without drifting into investment advice.                         |

## Wave 6: Adaptation-Led Applications

| Claw               | Pair | Target           | Concrete application upgrade                                                                                                                                                                          |
| ------------------ | ---- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Customer support   | C+A  | 4/4/3/5/4/4 = 24 | Reuse product, customer, queue, and escalation context; persist preferences; connect the support skill to response resources with an empathetic but exact support identity.                           |
| Sales operations   | C+A  | 4/3/3/5/4/3 = 22 | Select a vetted CRM capability only if available; otherwise adapt from supplied pipeline context, package forecast/handoff resources, and keep the operations theme light.                            |
| Project manager    | A+O  | 4/3/3/5/4/3 = 22 | Discover project/workspace state, persist cadence/owner preferences, package status/decision/risk records, and keep the coordinator theme light.                                                      |
| Knowledge gardener | C+A  | 4/4/3/5/4/4 = 24 | Reuse Notion workspace/database/taxonomy context, persist curation policy, and add resources with a patient knowledge-gardener identity.                                                              |
| Travel planner     | C+A  | 5/4/4/5/5/4 = 27 | Reuse traveler identity/preferences, connect weather/checklist skills to itinerary resources, preserve transaction boundaries, and use a practical planner identity.                                  |
| Research scout     | A+T  | 5/4/3/5/5/5 = 27 | Theme exemplar: reuse research questions/sources, persist monitoring preferences, add evidence/change records, and use a curious but source-disciplined scout identity with non-announcing schedules. |

## Delivery Sequence

1. Foundation authoring/validation support.
2. Wave 1 proves five pair shapes and establishes resource/adaptation patterns.
3. Wave 2 completes the original ten pair exemplars.
4. Theme exemplars in Waves 3, 5, and 6 complete all 15 six-dimension pairs.
5. Waves 3-6 upgrade the remaining 25 by natural architecture.
6. After every wave: build all 35 and run the complete 35-package validation
   matrix in `projects/claws/awesome-claws-validation-plan.md`. Rescore only
   from captured committed evidence.

Each wave gets one signed commit for generator/validation support when needed
and one signed content commit, unless the support is inseparable from the first
consumer. All 35 packages run the universal lifecycle and their score-selected
conditions after every wave; unchanged packages may reuse immutable fixtures but
must execute against the new exact catalog/OpenClaw revisions. Golden adds live
provider and exhaustive depth beyond the universal run. Do not publish packages
or merge the PR as part of a wave.

Each content wave should be independently reviewable and should not depend on a
later wave for correctness. Publication remains separate from this plan.

## Review Decisions

The reviewed portfolio policy is: all 35 target showcase-ready status (21+),
all 15 pair exemplars remain distinct packages, Travel Concierge alone targets
Golden Claw status, Executive Assistant remains the dependency-free Copyable
Reference Claw, and capability gaps wait for vetted public dependencies rather
than introducing speculative integrations.

The scorecard, pair matrix, and per-package target vectors remain private design
tools in `claws-hapi`. Public Awesome Claws documentation explains application
shapes, Golden and copyable references, and theme range without publishing
scores or implying that every package should contain the same components.
