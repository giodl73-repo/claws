# OpenClaw dependency governance baseline

Updated: 2026-08-14

This is the updateable, Microsoft-facing publication of the completed OpenClaw
dependency review. It covers all 2,624 exact dependency identities in the
review workbook.

## Result

- Critical: 0
- High: 33
- Moderate: 1,707
- Low: 878
- Unknown: 6

The estate has no Critical finding or emergency supply-chain event. The
remaining High and Unknown findings are classified and actionable. This does
not yet constitute Microsoft release approval: product-exact Component
Governance evidence, feed admission, ownership decisions, licensing evidence,
and final attestation remain separate controls.

## Published files

- [Canonical workbook](analysis/openclaw-dependency-governance.xlsx): formatted
  review workbook with the inventory and Microsoft controls.
- [Searchable inventory](analysis/openclaw-dependency-inventory-2026-08-14.csv):
  all 2,624 reviewed identities, flattened from the canonical workbook for
  searchable and diffable access.
- `openclaw-microsoft-controls-2026-08-14.csv`: current Microsoft control status,
  evidence, gaps, and completion criteria.
- `lobster-dependency-governance-tracker.md`: remediation checklist and
  dependency evidence-feed direction.
- `microsoft-evidence-2026-08-13.md`: detailed evidence and conclusions.

## Tracking

- [Living governance tracker #8223](https://microsoft.ghe.com/bic/lobster/issues/8223)
- [Product-exact attestation #8220](https://microsoft.ghe.com/bic/lobster/issues/8220)

This versioned Lobster analysis branch is the durable publication surface.
Refresh the workbook and CSV exports in a new commit when the baseline changes;
#8223 remains the living work tracker and points to the latest published
commit.
