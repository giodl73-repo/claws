# Dependency Audit Tool

Build the OpenClaw dependency inventory and governance workbook from a clean
source checkout.

## Run

```bash
python3 tools/dependency-audit/scan.py \
  --repo /root/src/openclaw-dependency-audit \
  --output projects/dependencies/artifacts/inventory.json

python3 tools/dependency-audit/enrich.py \
  --inventory projects/dependencies/artifacts/inventory.json \
  --cache projects/dependencies/artifacts/public-metadata-cache.json

node tools/dependency-audit/review-unknowns.cjs \
  projects/dependencies/artifacts/inventory.json \
  projects/dependencies/artifacts/ecosystem-evidence-cache.json

NODE_PATH=/tmp/dependency-audit-node/node_modules \
  node tools/dependency-audit/build-workbook.cjs \
  projects/dependencies/artifacts/inventory.json \
  projects/dependencies/pilot-ratings.json \
  projects/dependencies/high-reviews.json \
  projects/dependencies/moderate-reviews.json \
  projects/dependencies/artifacts/openclaw-dependency-governance.xlsx
```

The scanner reads checked-in pnpm, npm, Cargo, SwiftPM, Go, Gradle, and Python
manifests or lockfiles. It does not infer Microsoft approval. WorkIQ and
authoritative governance evidence are added through the workbook evidence
columns.
