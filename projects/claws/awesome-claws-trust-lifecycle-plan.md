# Awesome Claws Trust and Lifecycle Plan

Date: 2026-08-17

## Goal

Prove the Awesome Claws catalog survives real use, upgrades, and dependency
drift.

The catalog already has sufficient breadth and visual coverage: 51 Claws,
including 25 visual Claws with 50 desktop/mobile renders. The next phase should
improve lifecycle and ecosystem trust rather than add another arbitrary count
of Claws or visuals.

## Thesis

Awesome Claws is a useful reference catalog today, but its strongest lifecycle
proof exercises only a no-op update and its external capability declarations
are validated more deeply than their continued availability. A representative
real upgrade, live package-health evidence, and one runtime proof per capability
class would make the catalog a trustworthy application corpus without moving
runtime, package, or publication authority out of OpenClaw, ClawHub, or the
individual package owners.

This thesis is disproved if a real N-1-to-N fixture cannot exercise the public
Claw lifecycle without introducing catalog-specific runtime behavior, or if the
proposed dependency gates require secrets and live third-party calls on every
pull request.

## Current Evidence

- All 51 packages pass inspect, add, status, no-op update, doctor, export,
  remove, and user-owned `USER.md` preservation proof.
- All 25 visual Claws have installed production and presentation contracts.
- Required CI proves all 50 visual renders and one installed Gateway
  `show_widget` round trip.
- External declarations are exact-pinned, but broad availability and
  installability are not required catalog gates.
- The catalog currently declares 16 skills, 5 plugin packages, 2 native
  extensions, 2 MCP servers, 8 crons, and 9 bootstrap flows.
- Five Claws lack explicit capability and boundary guidance: Sales Operations,
  Recruiting Coordinator, Content Operations, Executive Assistant, and
  Knowledge Curator.

## Prioritized Slices

### 1. Real N-1-to-N upgrade proof

Create one checked-in prior-version package fixture and update it through the
public lifecycle.

Acceptance:

- preview identifies the exact managed-resource delta;
- apply changes only package-managed resources;
- user-owned files and edits remain untouched;
- stale managed resources are handled by the declared ownership policy;
- plan-integrity protection rejects a mutated preview;
- status and doctor describe the post-update state;
- removal and rollback behavior remain safe and observable.

This is the first implementation slice because the current no-op update cannot
detect migration, ownership, or stale-resource defects.

### 2. Dependency health and package acceptance

Separate static declaration validation from live ecosystem health.

Acceptance:

- a scheduled or release gate verifies every exact-pinned dependency exists and
  remains downloadable;
- package type, version, identity, and declared capability metadata agree;
- failures identify the affected Claw and dependency;
- pull-request CI remains deterministic and credential-free;
- provider calls and third-party account setup are not required.

### 3. Capability-class runtime matrix

Prove one clean installed example for each major capability class: skill,
plugin, MCP server, cron, bootstrap flow, and visual.

Acceptance:

- each lane states exactly what it proves and does not prove;
- fixtures replace live third-party integrations where possible;
- evidence comes from installed artifacts rather than workspace imports;
- the matrix reuses the portfolio harness instead of creating parallel
  lifecycle semantics.

### 4. Capability guidance closure

Add specific capability, consent, and boundary guidance to the five remaining
Claws. Avoid shared boilerplate that overstates runtime access.

Acceptance:

- each package distinguishes supplied inputs from capabilities it can invoke;
- setup and consent requirements are explicit;
- unavailable capabilities have an honest fallback;
- catalog validation prevents the guidance gap from recurring.

### 5. Selective X3 deepening

Deepen only decision-risk-heavy starters where structure improves
reproducibility and owner control. Initial candidates are Financial Analyst,
Public Safety Monitor, Recruiting Coordinator, Sales Operations, and Civic Data
Analyst.

Acceptance:

- every new schema represents a real domain decision or evidence relationship;
- semantic validation covers references that JSON Schema cannot;
- terminal decisions remain human- or owner-controlled;
- no target is set for another visual-count milestone.

### 6. Catalog discovery UX

Generate machine-readable and human-readable chooser views organized by setup
burden, external dependencies, proof tier, category, and risk.

Acceptance:

- users can distinguish dependency-free starters, capability-backed
  applications, and dashboard examples;
- generated views derive from catalog metadata and cannot drift;
- the chooser does not create another authoritative catalog.

## Review Lenses

- **New hire:** make the safest usable choice obvious without requiring a full
  catalog read.
- **Skill author:** keep package acceptance useful and low ceremony.
- **Release engineer:** test fresh installed artifacts, real version
  transitions, and actionable recovery.
- **Compliance and skeptical maintainer:** prefer traceable provenance and
  bounded claims over more presentation polish.

External precedent supports this sequence: Agent Skills uses progressive
disclosure to keep packages approachable; the MCP Registry separates metadata,
version, and ownership verification from package hosting; and Copilot Studio
emphasizes continuous evaluation and application lifecycle management. Awesome
Claws should reuse those principles without adopting their platform-specific
control planes.

## Sequence

1. Implement and require the representative real-upgrade fixture.
2. Add scheduled dependency-health evidence.
3. Add the capability-class runtime matrix.
4. Close the five guidance gaps.
5. Deepen selected X3 Claws.
6. Generate the catalog chooser.

Do not begin by increasing the number of Claws or visuals.

## Parallel Program Gates

These remain separate from the Awesome Claws quality plan:

- obtain maintainer acceptance for RFC #48;
- verify the first published OpenClaw release containing runtime repair
  `103e1a4cc9`.
