# OpenClaw v2026.6.33 Dependency Evidence

This is a concrete prototype of one dependency-feed entry.

## Release-time evidence

- `evidence/` is the original workflow artifact generated on 2026-07-21.
- `npm-attestations.json` is npm's public attestation response.
- `npm-slsa-provenance.json` decodes the SLSA statement binding
  `openclaw@2026.6.33` to source commit
  `7af0cfc9c5488e03c4e2f528bdc7ac9f7778b35e` and publish run
  `29825660318`.

## Reconstructed evidence

- `dependencies.json` and `dependencies.csv` contain 1,481 exact identities
  from every dependency input recognized at the release tag.
- `npm-install-reconstruction-lock.json` and
  `npm-install-reconstruction.csv` contain the 306-package production install
  graph resolved on 2026-08-14 with scripts disabled.

The source inventory is reproducible from the immutable tag. The npm install
reconstruction is only illustrative because transitive npm ranges can resolve
differently after publication. A real feed must create this lock or an
SPDX/CycloneDX SBOM in the trusted release workflow.

## Known gaps

- No release-time npm installed-graph SBOM was published.
- The release had no GitHub release assets or container digest/SBOM references.
- The evidence bundle itself was not signed as one artifact-bound index.
- The Actions artifact expires on 2026-10-19; this checked-in copy preserves
  the prototype, but upstream needs durable release publication.
