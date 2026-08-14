# Dependency Governance Role Review - 2026-08-13

## Review Scope

Reviewed the proposed technical-triage and Microsoft-governance process through
five repository roles spanning four tension clusters:

- `ciso`: security assurance and defensible decisions;
- `gateway-eng`: runtime stability and governance overhead;
- `compliance`: complete, durable evidence;
- `platform-eng`: repeatable fleet-scale operation; and
- `founder`: simplicity and a clean community/enterprise boundary.

## Findings

### Keep

- Preserve separate technical-risk, blast-radius, Microsoft-disposition, and
  action fields.
- Rate exact versions in their actual OpenClaw usage context.
- Use WorkIQ to discover precedent, policy, owners, and prior decisions.
- Treat Microsoft governance as a private evidence overlay rather than an
  upstream judgment about community packages.

### Change

1. Do not run all 2,625 occurrences through manual WorkIQ searches. Automate
   public evidence for the full inventory, then use internal discovery for
   prioritized decision candidates.
2. Do not treat presence in an internal feed as approval unless a current
   policy explicitly defines that feed as a gated approval authority and
   provides a durable decision identifier.
3. Separate a component decision from its occurrences. One authoritative
   package/version/range decision may cover several lockfile rows, but each
   occurrence retains its own reachability and action.
4. Do not leave records indefinitely `Unknown`. After a bounded discovery pass,
   unresolved Microsoft evidence becomes `Review required` with an owner or
   escalation queue.
5. Keep dependency governance out of the Gateway request path. Scan manifests,
   lockfiles, artifacts, and changes in CI or release workflows; do not add
   per-request runtime checks.
6. Make decisions reproducible: record source class, authority, owner, scope,
   version range, usage, date, conditions, expiration, and durable citation.

## Evidence Authority

Use the strongest applicable source:

1. **Authoritative decision:** the designated Microsoft component-governance
   record or named approval owner; supports `Approved`, `Conditional`, or
   `Blocked`.
2. **Governing policy:** current policy defining scope, conditions, and decision
   authority; supports routing and may support a disposition when it explicitly
   covers the component and use.
3. **Internal precedent:** WorkIQ results, internal code usage, or internal-feed
   presence without a governing approval guarantee; supports only
   `Internal precedent`.
4. **No sufficient evidence:** after bounded discovery, use `Review required`,
   not an evergreen `Unknown`.

## Revised Process

1. **Inventory:** reproduce exact dependency occurrences from manifests,
   lockfiles, and shipped artifacts.
2. **Automated evidence:** collect advisories, license, provenance,
   maintainership, lifecycle behavior, and available fixes for every row.
3. **Reachability:** manually validate R4/R3, High/Critical, direct runtime,
   native, install/update, auth, cryptography, and network-facing paths.
4. **Internal discovery:** use WorkIQ and internal feeds only for the prioritized
   queue; locate precedent, policy, decision records, and owners.
5. **Decision:** apply the authority ladder and record a durable Microsoft
   disposition or route the record to `Review required`.
6. **Action and delta:** retain, update, isolate, replace, remove, or escalate;
   rerun only changed dependency occurrences on each lockfile or artifact delta.

## Cheapest Next Test

Run the complete process for the five shipped pnpm High rows. The test succeeds
only if each row ends with a reproducible technical conclusion, an authoritative
Microsoft disposition or named review route, and a concrete owner/action without
requiring a manual search of unrelated transitive dependencies.
