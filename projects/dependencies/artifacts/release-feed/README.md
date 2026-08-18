# OpenClaw Dependency Evidence Feed Prototype

This directory emulates an append-only dependency feed for OpenClaw releases.
Each entry points to immutable release identity, artifact provenance, full
source dependency inventory, release-time policy reports, and artifact-specific
dependency evidence when available.

`feed.json` is the polling surface. Consumers select the exact version they
install, verify the referenced hashes and attestations, then apply their own
policy. The feed reports OpenClaw facts; it does not represent Microsoft
approval.

The `v2026.6.33` entry is reconstructed from public release evidence:

- signed tag `v2026.6.33` and source commit
  `7af0cfc9c5488e03c4e2f528bdc7ac9f7778b35e`;
- the original dependency evidence artifact from npm preflight workflow run
  `29817136995`;
- npm package digest and SLSA provenance from publish workflow run
  `29825660318`;
- a 1,481-identity source inventory regenerated from the exact release tag;
- a 306-package npm install graph reconstructed on 2026-08-14.

The reconstructed npm install graph demonstrates the desired artifact-specific
shape, but it is not historical release-time proof. Future releases should
generate and attest that graph during preflight, bind its digest to the
published tarball, and publish the bundle somewhere durable rather than relying
on expiring Actions artifacts.
