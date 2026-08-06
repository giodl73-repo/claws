# Awesome Claws Upgrade Plan Role Review

Reviewed 2026-07-29 using the FACES Evaluate phase and the founder,
skill-author, new-hire, CISO, repository-steward, release-engineer, and
power-user roles under `.craft/roles/claws/`.

## Verdict

Proceed after the plan corrections below. The six dimensions and 15-pair
portfolio matrix create useful diversity, but only as private human review
tools. Turning them into public scores or machine-enforced quotas would reward
feature padding and make the collection harder to understand.

## Findings

### Founder: preserve the folder-and-Markdown model

- Keep scores and pair assignments out of public packages and README tables.
- A 21/30 target cannot require irrelevant integrations, setup forms, or assets.
- Golden must mean one coherent end-to-end application, not the largest
  manifest. Users must still be able to inspect, remove, and walk away.

**Plan response:** scoring remains private and directional; feature-padding is
explicitly prohibited; Golden proof includes selective removal.

### Skill author and new hire: prove copyability before abstraction

- The Executive Assistant is a good copyable reference because it is small and
  dependency-free, but generated-repo contributors and external package authors
  need different copy instructions.
- Do not add `resourceGuidance`, `adaptationGuidance`, or theme authoring helpers
  before concrete exemplars prove repeated authoring cost.
- The public path should remain understandable from `CLAW.md`, `AGENTS.md`,
  package resources, and `package.json` without knowledge of the scorecard.

**Plan response:** two copy paths are required; Wave 1 starts with existing
fields and extracts helpers only from demonstrated repetition.

### CISO: adaptation and theme are trust surfaces

- "Safe discovery" is underspecified unless context sources are allowlisted,
  previewed, correctable, and attributable.
- Identity, credentials, unrelated workspace files, and sensitive preferences
  cannot be silently inferred.
- A strong personality cannot grant itself authority, weaken consent, or turn
  an operational boundary into optional role-play.
- Fixtures and media assets must be synthetic or rights-cleared and secret-free.

**Plan response:** adaptation now requires preview, provenance, correction, and
decline; theme cannot own authority or operational policy.

### Repository steward: retain one source of truth

- `catalog.json` and materializer logic remain authoritative for this repo;
  generated `claws/` content is never hand-edited by contributors.
- Review artifacts stay in `claws-hapi`, not the public package collection.
- New catalog-only helpers must not leak into the portable Claw schema.

**Plan response:** the plan says repository-local rather than private, keeps
review material private, and distinguishes external copying from repo authoring.

### Release engineer: make waves independently provable

- Each wave needs signed, reviewable commits and cannot depend on a later wave
  for correctness.
- Full catalog build/validation is required after every wave. The portfolio
  owner additionally requires every Claw to execute its lifecycle and
  score-selected scenario on each exact wave revision so the collection remains
  a real sample rather than a set of static manifests.
- No package publication or merge belongs inside these implementation waves.

**Plan response:** all 35 now run a common lifecycle and per-package scenario
matrix after every wave. Golden retains deeper live-provider and exhaustive
proof rather than being the only package exercised end to end.

### Power user: adaptation must reduce work without surprising mutation

- Reused context must be visible and overrideable.
- Package resources should be role-labeled and should not clutter unrelated
  workspace paths.
- Theme changes are managed updates and must appear in preview rather than
  silently rewriting local personality.
- Update and remove behavior must remain understandable for resources,
  preferences, capabilities, and theme.

**Plan response:** preview and provenance requirements now cover adaptation and
theme; user-owned state remains local and selective removal stays in Golden
proof.

## Required Evidence Per Wave

1. Exact catalog generation and semantic validation for all 35 packages.
2. Standalone CLI and isolated OpenClaw lifecycle execution for all 35.
3. One domain scenario per package with target-level dimension assertions.
4. Capability proof mode recorded honestly as live/public/local/fixture/missing.
5. Theme review showing `CLAW.md` identity without `AGENTS.md` duplication.
6. Diff review confirming no generated-output-only edits or leaked review data.

## Remaining Policy

No blocking policy question remains. The accepted interpretation is:

- 21/30 is a review target, not a mechanical acceptance gate.
- All 15 pair slots have distinct exemplars, but packages may naturally be
  strong in additional dimensions.
- Theme spans 3-5; stronger is not inherently better.
- Capability gaps wait for vetted dependencies.
- Golden and Copyable Reference are separate responsibilities.
