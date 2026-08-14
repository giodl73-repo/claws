# Dependency Rating Model

## Decision Shape

Do not assign one blended grade. Each dependency record has:

1. a technical and supply-chain risk rating;
2. a Microsoft governance disposition;
3. an OpenClaw usage and blast-radius classification; and
4. a recommended action.

Rate an exact package version in an exact usage context. The same package may
receive different actions when used at runtime and only in tests.

## Required Record

| Field | Evidence |
| --- | --- |
| Identity | Ecosystem, package, exact version, integrity, source repository |
| Introduction | Direct or transitive parent, workspace, lockfile, optionality |
| Usage | Runtime, plugin, native, build/release, dev/test, generated artifact |
| Reach | Network input, untrusted parsing, auth/secrets, filesystem, process execution, local-only |
| Maintenance | Release activity, maintainer continuity, issue/security response, deprecation |
| Supply chain | Registry provenance, source/tag match, signatures or attestations, install scripts, binary downloads |
| Security | Known advisories, exploitability in OpenClaw, available fix, compensating controls |
| License | Declared license, file-level exceptions, notice/source obligations, policy compatibility |
| Microsoft evidence | Authoritative decision, policy scope, internal precedent, owner, date, citation |
| Action | Retain, update, isolate, replace, remove, or escalate |

## Technical Risk

Use the highest justified level; do not average away a hard blocker.

| Rating | Meaning |
| --- | --- |
| Low | Maintained, ordinary provenance, compatible license, no material reachable advisory, and narrow exposure |
| Moderate | Acceptable with tracked weaknesses such as broad reach, delayed maintenance, lifecycle scripts, or limited provenance |
| High | Privileged or network-facing use combined with weak maintenance/provenance, reachable serious advisories, or difficult containment |
| Critical | Known exploitable blocker, prohibited legal condition, compromised provenance, or unacceptable privileged behavior |
| Unknown | Required evidence is missing; this is not equivalent to low risk |

## Microsoft Governance Disposition

| Disposition | Required evidence |
| --- | --- |
| Approved | Authoritative Microsoft record covers the exact component or accepted version range and intended usage |
| Controls satisfied | The exact component is covered by the ordinary governed intake controls: admitted feed, reconciled CG detection, no blocking alert, and intended use within policy |
| Conditional | Authoritative record permits use only with named controls, scope, version, notice, or review conditions |
| Internal precedent | WorkIQ or code search shows Microsoft use, but no authoritative approval record has been established |
| Review required | No sufficient decision or precedent; route to the owning governance process |
| Blocked | Authoritative policy or decision disallows the component or intended use |
| Unknown | The relevant authority or evidence has not yet been found |

## OpenClaw Blast Radius

Classify independently:

- `R4`: privileged core runtime, authentication, secrets, process execution, or
  update/install path;
- `R3`: network-facing parser, channel/provider runtime, persistent state, or
  default shipped feature;
- `R2`: optional plugin or bounded runtime feature;
- `R1`: build/release tooling that cannot enter the shipped artifact;
- `R0`: test, fixture, docs, or local development only.

The rating must record why a transitive package inherits or does not inherit its
parent's reachability.

## WorkIQ Validation Protocol

For each package selected for internal validation:

1. Search the exact package name, common aliases, ecosystem, and owning
   repository.
2. Find current internal usage, the responsible team, and the usage context.
3. Find the governing policy, approval, exception, or approved-alternative
   record.
4. Record title, owner, date, durable citation, covered version/range, and
   covered use. Do not copy private message bodies into this project.
5. Mark the result `internal precedent` unless the source is authoritative for
   approval.
6. Escalate conflicting or stale evidence instead of selecting the friendliest
   answer.

Do not search every lockfile occurrence manually. Apply this protocol first to
R4/R3, High/Critical, direct runtime, native, install/update, authentication,
cryptography, and network-facing candidates. A package decision may cover
multiple occurrences only when its version range, usage scope, and conditions
actually match.

Internal-feed presence is `Internal precedent` unless a current policy
explicitly establishes the feed as a gated approval authority and supplies a
durable decision record.

## Evidence Authority

Use evidence in this order:

1. authoritative component decision or named approval owner;
2. current governing policy with explicit component and usage coverage;
3. WorkIQ, internal code, or internal-feed precedent; and
4. no sufficient evidence.

Use `Controls satisfied` for ordinary OSS intake only when a durable governed
run proves exact CFS resolution, reconciled CG detection, and no blocking
alert. It is not package-specific Microsoft approval. Only authoritative
component or policy decisions can support `Approved`, `Conditional`, or
`Blocked`. After a bounded discovery pass, move missing evidence from
`Unknown` to `Review required` and record the escalation owner or queue.

## Operating Flow

1. Reproduce exact occurrences from manifests, lockfiles, and artifacts.
2. Automate public advisory, license, provenance, maintenance, and lifecycle
   evidence across the complete inventory.
3. Validate reachability for the prioritized technical-risk queue.
4. Run WorkIQ and internal-source discovery for prioritized decision
   candidates, not the entire transitive graph.
5. Record the authoritative Microsoft disposition or route to
   `Review required`.
6. Apply retain, update, isolate, replace, remove, or escalate actions and
   repeat the process only for changed dependency deltas.

Dependency checks belong in inventory, CI, and release workflows rather than
the Gateway request path.

## Prioritization

Review in this order:

1. `R4` and `R3` direct runtime dependencies;
2. packages with lifecycle scripts, native binaries, or remote binary fetches;
3. known critical/high advisories and abandoned packages;
4. authentication, cryptography, update, archive, and parser chains;
5. optional/plugin runtime dependencies;
6. build/release dependencies;
7. test-only and fixture dependencies.
