# Dependency Governance Frame

## Thesis

OpenClaw can produce an evidence-complete dependency inventory in which every
exact component version has an independently reviewable technical-risk rating,
Microsoft governance disposition, and recommended action.

This thesis is false if the scan cannot reproduce the shipped graph from pinned
source, if internal policy cannot be tied to the intended usage, or if reviewers
cannot explain why a dependency received its disposition.

## Problem

OpenClaw spans a large pnpm workspace, plugins, native packages, generated
clients, release tooling, and platform applications. A vulnerability scan alone
does not answer:

- whether a dependency is actually reachable in a shipped path;
- whether its maintenance, provenance, license, and install behavior are
  acceptable;
- whether Microsoft permits the exact package for the intended internal use;
  or
- what approved alternative should replace it.

The provisional OpenClaw baseline inspected on 2026-08-13 contains 178
`package.json` files before a full ecosystem inventory. The workspace already
uses pnpm's minimum-release-age control and blocks exotic subdependencies.
Those are useful controls, not a complete governance decision.

## Owner Systems

- OpenClaw manifests and lockfiles own the reproducible dependency graph.
- Package registries, source repositories, advisories, and release provenance
  own public package facts.
- Microsoft governance systems own internal allowability and exceptions.
- WorkIQ helps discover internal policy, precedent, owning teams, and prior
  decisions; it does not create approval.

## V1 Scope

- All direct and transitive dependencies represented by checked-in manifests
  and lockfiles.
- Runtime, optional/plugin, native, build/release, dev/test, and platform-app
  contexts kept distinct.
- Exact versions, integrity/provenance, licenses, lifecycle scripts,
  maintainership, known vulnerabilities, reachability, and internal evidence.
- One prioritized action per reviewed dependency.

## Non-Goals

- Automatically approving dependencies for Microsoft.
- Treating popularity or internal usage as proof of safety.
- Replacing existing Component Governance, legal, security, or procurement
  authority.
- Filing mass upgrade or replacement PRs before the rating model is tested.

## Simplification Target

Replace one-off package debates and spreadsheet-only memory with one
reproducible inventory, explicit evidence fields, and a delta review for every
dependency change.

## Cheapest Disproof Test

Rate five deliberately different dependencies: one network-facing parser, one
native module, one authentication library, one build tool, and one test-only
package. Reject or revise the model if it cannot distinguish their exposure or
produce an auditable Microsoft disposition.

