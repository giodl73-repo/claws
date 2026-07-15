# F4: Compatibility Configuration And Documentation Cleanup

## Outcome

Remove obsolete deployment flags, fallback routes, dashboards, alerts, and
documentation after compatibility expiry.

## Repository And Dependencies

- Repository: `bic/lobster`
- Depends on: F3

## Change

- Remove old capability flags and fallback configuration.
- Remove stale dashboards, alerts, runbooks, and deployment examples.
- Publish the final migration and deletion ledger.
- Close the migration profile and document the supported bundle/profile path.
- File separately owned repository cleanups as follow-up PRs rather than
  combining repositories in this plan.

## Non-Goals

- No cleanup before the minimum supported release and expiry are reached.
- No removal of diagnostics still used by the new owner surfaces.

## Proof And Exit

- Repository and deployment searches find no active compatibility references.
- Fresh and upgraded deployments use only the supported configuration.
- Operators have one current readiness, Status, Doctor, and rollback runbook.
