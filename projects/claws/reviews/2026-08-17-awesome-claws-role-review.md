# Awesome Claws 25-Visual Role Review

Date: 2026-08-17

## Scope

- Reviewed Awesome Claws `origin/main` at `444669fc07`.
- Reviewed the ten visual upgrades from `a4b9f5a53e..444669fc07`.
- Evidence baseline: 51 Claws, X5=7, X4=18, X3=26, 82 catalog tests,
  50/50 desktop/mobile asset renders, and green Ubuntu/macOS/Windows catalog
  CI for PRs #8-#17.
- Role panel:
  - runtime owner: `gateway-eng`
  - operators: `power-user`, `new-hire`
  - makers/community: `skill-author`, `founder`
  - assurance: `ciso`, `compliance`
  - delivery: `claws-release-eng`, `claws-repo-steward`
  - skeptical maintainer: `lorant-reviewer`

The `.craft/roles/claws` set predates the portable Claw application work and
contains several governance-product and integration-partner checks that are
not applicable to this catalog. This review applies each role's underlying
tension rather than importing unrelated command or fleet requirements.

## Verdict

The catalog passes the role review for bounded authority, readable package
shape, generated-output consistency, and cross-platform static validation. It
does not yet pass as proof that 25 installed Claws produce 25 working visual
applications. The current evidence proves that assets exist and render; it
does not prove that the installed agent knows when or how to populate, save,
and present them.

## Findings

### P1 - Visual conformance does not prove visual application behavior

**Roles:** gateway-eng, power-user, new-hire, founder, lorant-reviewer

For X4/X5, `scripts/experience-cases.mjs` requires only a packaged asset,
`show_widget`, and a fallback path. The installed instructions do not require
the agent to use the schema, write the fallback, populate the visual, or call
`show_widget`. A direct audit found 23 of 25 visual Claws with no asset path or
`show_widget` instruction in `workspace/AGENTS.md` or the prompt body.

The screenshot harness then supplies the missing behavior itself:

- `scripts/generate-screenshots.mjs:69-112` constructs assistant history.
- `scripts/generate-screenshots.mjs:149` installs a mock Gateway.
- `scripts/generate-screenshots.mjs:183-188` directly serves the packaged
  asset.
- `scripts/generate-screenshots.mjs:190-199` injects the prepared session.

For example, `claws/data-analyst/CLAW.md:20-27` lists the schema, fixture,
asset, and template, but `claws/data-analyst/workspace/AGENTS.md` never tells
the agent how to use any of them.

**Failure mode:** an installed Claw can produce an ordinary text answer, never
write the declared structured artifact, and never show the visual while still
satisfying every current catalog and screenshot check.

**Smallest fix:** generate an explicit visual contract into every X4/X5
`AGENTS.md`: input schema, output path, fallback path, when to invoke
`show_widget`, and a prohibition on presenting the packaged fixture as live
state. Extend portfolio proof to assert those instructions reach the runtime,
then add a representative model/tool lane that observes an actual
`show_widget` call and the corresponding workspace output.

### P1 - Rendering and Control UI proof are not merge gates

**Roles:** claws-release-eng, claws-repo-steward, lorant-reviewer

`.github/workflows/validate.yml:26` runs only `npm run check`. Neither
`npm run proof:experience` nor `npm run screenshots` runs in CI. The rendering
proof also depends on an external compatible OpenClaw checkout, so the
repository cannot reproduce its visual claim from a fresh clone by itself.

**Failure mode:** a future PR can merge an overflowing, blank, inaccessible, or
Control-UI-incompatible visual while all required checks remain green.

**Smallest fix:** make desktop/mobile asset proof a required CI lane with a
pinned, reproducible renderer. Keep the heavier Control UI capture as a
scheduled or explicit release gate against an exact OpenClaw revision, and
retain its machine-readable summary as an artifact.

### P2 - Structured evidence references are syntactic, not traceable

**Roles:** ciso, compliance, power-user, lorant-reviewer

The new schemas require non-empty reference strings but do not verify that
references resolve inside the same artifact. Direct mutations showed that all
of these remain schema-valid:

- Data Analyst metric `lineageRefs` pointing to a missing source.
- Project Manager milestone dependencies pointing to a missing milestone.
- Product Manager option `evidenceRefs` pointing to missing evidence.
- Research Briefing option `claimRefs` pointing to a missing claim.

The affected generated schemas are:

- `claws/data-analyst/schemas/analysis-state.schema.json:1`
- `claws/project-manager/schemas/project-state.schema.json:1`
- `claws/product-manager/schemas/product-decision.schema.json:1`
- `claws/research-briefing/schemas/research-brief.schema.json:1`

**Failure mode:** an artifact can pass strict AJV validation while its claimed
lineage, dependency graph, or evidence trace is broken.

**Smallest fix:** add per-domain semantic validators after JSON Schema
validation. Reject dangling and duplicate ids/references, dependency cycles
where relevant, and references to evidence states that cannot support the
claimed terminal decision.

### P2 - Research Briefing promises collection without source access

**Roles:** skill-author, new-hire, power-user, founder

`claws/research-briefing/workspace/AGENTS.md:22` instructs the agent to
"Collect diverse authoritative sources," and its expected outcome requires
current evidence and direct links. The same package explicitly grants no
browser, search, or network capability
(`workspace/AGENTS.md:13`, `README.md:18`).

**Failure mode:** a first-time user can reasonably expect current research, but
the installed agent can only synthesize sources already supplied in the
workspace or conversation.

**Smallest fix:** choose one honest V1:

1. keep the bounded profile and rename the workflow to source-supplied
   synthesis, requiring the user to provide the source set; or
2. add a separately consented, allowlisted research capability and retain the
   current collection promise.

### P3 - The single embedded catalog is an authoring tax

**Roles:** skill-author, founder, new-hire, claws-repo-steward

`README.md:157-158` and `README.md:181-183` make `catalog.json` the only
editable source while every per-Claw package is generated. At 51 entries, this
forces authors to edit escaped JSON strings for schemas, Markdown, fixtures,
and HTML, then review the same content again under `claws/`.

**Cost:** contribution diffs are harder to review, merge conflicts concentrate
in one file, and a contributor who starts from the readable generated package
is told that their edits are invalid.

**Smallest fix:** retain deterministic materialization but move editable
resources to per-Claw source directories. Generate the aggregate catalog and
published package from those files rather than embedding every resource body
in one JSON document.

## Role Verdicts

| Role tension | Verdict |
| --- | --- |
| Runtime stability and least privilege | Pass. The upgraded profiles are bounded and avoid adding runtime hooks or broad authority. |
| Operator usefulness | Conditional. Domain workflows are materially stronger, but visual behavior is not installed behavior yet. |
| First-five-minutes experience | Conditional. Package READMEs are clear; visual production and source-supply expectations are not. |
| Community and author simplicity | Conditional. Ordinary Markdown package shape is preserved, but the canonical authoring surface is cumbersome. |
| Security and compliance evidence | Conditional. Authority boundaries are strong; cross-reference integrity needs semantic validation. |
| Release reliability | Fail for the visual claim until rendering becomes a required reproducible gate. |
| Maintainer correctness | Fail on the two P1 proof gaps; no new broad runtime-authority defect was found. |

## Recommended Order

1. Add the generated X4/X5 visual-production contract and runtime assertion.
2. Make asset rendering a required reproducible CI gate.
3. Add semantic cross-reference validators for the deep domain schemas.
4. Resolve the Research Briefing capability promise.
5. Move toward per-Claw editable source files without changing package output.
