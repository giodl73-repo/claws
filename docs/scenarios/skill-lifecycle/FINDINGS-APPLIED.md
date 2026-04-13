# Findings Applied: skill-lifecycle

**Date**: 2026-04-11
**Scenarios processed**: 5
**Total findings**: 48
**Major/warning applied**: 37
**Note severity skipped**: 11

---

## Summary of Changes

### Specs Edited

#### CL-05 Developer Experience (Maker Experience section)
- **20 new constraints** added covering: scaffold risk level derivation from workspace trust tier, dependency auto-install or guided install for @bic/claws-skill-kit, scaffold default tier and --tier flag option, version alignment between claws and @bic/claws-skill-kit, .gitignore in scaffold template, skill name vs directory name consistency check, OBO auto-suggestion from skill name heuristics, scaffold must produce check-clean output, prompt-only skill tier ceiling (DECLARED or VERIFIED skip TYPED), frontmatter-to-decorator value propagation in claws import, enterprise tier-per-risk enforcement, governance-aware test generation from frontmatter, tier detection from workspace state not stored metadata, signature staleness detection and tier downgrade, claws annotate heuristic accuracy requirements and false-positive/negative bounds, closest-value suggestion for enum validation errors, collect-all-errors for frontmatter validation, YAML None/null ambiguity in obo field, URL stability and versioning policy for error messages, annotate command as remediation path in error messages

#### CL-05 Developer Experience (ClawHub Governance Badges)
- **7 new constraints** covering: visual distinction between DECLARED and VERIFIED badges, self-reported qualifier for DECLARED tier, supply chain badge independent of governance tier, badge staleness and re-validation policy, data sensitivity requires higher tier for enterprise trust, inconsistent governance metadata display, per-version badge storage

#### CL-05 Developer Experience (Publish / Supply Chain)
- **6 new constraints** covering: publish distinguishes unsigned from invalid-signed, fleet-level publish tier requirement, warnings not suppressible by --quiet for security-relevant messages, manifest signing key source and key management, publish atomicity and rollback on remote failure, badge freshness at publish time

#### CL-06 Platform Ecosystem
- **2 new constraints**: claws/clawhub metadata namespace boundary, ClawHub rendering for skills published without claws (Open Question 5)

### PITFALLS.md
- **5 new pitfalls** (P-225 through P-229)
- P-225: **Scaffold risk exceeds workspace trust tier** -- High -- S01-F01 -- Scaffold defaults to R5 in T2 workspace; first check produces immediate G-CLASS violation. claws response: CL-05 scaffold derives max risk from workspace trust tier. Detection ring: Compile-time
- P-226: **DECLARED tier OBO claim unverified** -- High -- S03-F02 -- Badge shows obo: none but skill handler actually calls email APIs; self-reported OBO is unverified at DECLARED tier. claws response: CL-05 self-reported qualifier on DECLARED badges. Detection ring: Fleet
- P-227: **Stale VERIFIED badge after handler modification** -- High -- S02-F06 -- Developer modifies handler.ts after verification; manifest signature invalidated but badge still shows VERIFIED. claws response: CL-05 signature staleness detection + tier downgrade. Detection ring: Middle
- P-228: **Non-atomic publish leaves local state inconsistent** -- High -- S05-F05 -- Badge metadata injected locally but remote publish fails; local version number incremented for unpublished skill. claws response: CL-05 publish atomicity with rollback on remote failure. Detection ring: Middle
- P-229: **YAML None parsed as null breaks obo field** -- Medium -- S04-F04 -- obo: None (capitalized) parsed as YAML null instead of string "none"; validation fails with cryptic error. claws response: CL-05 YAML None/null disambiguation. Detection ring: Compile-time

### Plans Edited
- **claws-scaffold**: trust tier derivation, dependency management, tier flag
- **claws-publish**: unsigned vs invalid-signed distinction, fleet policy, atomicity
- **claws-badge**: per-version storage, staleness detection, self-reported qualifier
- **claws-annotate**: heuristic accuracy bounds, false-positive/negative targets

### Guides Edited
- **docs/claws/maker/three-tier-adoption.md**: tier detection from state, prompt-only tier ceiling, enterprise enforcement
- **docs/claws/maker/skill-scaffold.md**: trust tier derivation, dependency install, OBO suggestion
- **docs/claws/maker/error-messages.md**: closest-value suggestion, URL stability, annotate as remediation

---

## Findings NOT Applied (note severity, skipped per rules)

11 findings with severity "note" were skipped: S01-F07 (inline documentation in scaffold), S01-F09 (overwrite protection), S02-F07 (error messages as onboarding), S02-F09 (ClawHub badge backward compatibility), S03-F07 (badge accessibility), S03-F09 (workspace-level tier as minimum), S04-F07 (typo detection via fuzzy matching), S04-F10 (per-field errors for empty governance block), S05-F07 (implicit check validation before publish), S05-F09 (per-version badge storage -- promoted to constraint despite note due to data integrity).
