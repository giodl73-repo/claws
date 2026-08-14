# Attest the exact OpenClaw dependency graph installed in the image

## Problem

Lobster installs a pinned OpenClaw npm package inside the container build, but
the current Component Governance source scan does not detect most of that
installed transitive graph or the built image. Pipeline success therefore
cannot establish the dependency disposition of the OpenClaw artifact Lobster
actually ships.

Official run `176596891` demonstrated the failure mode: Component Governance
successfully parsed a separately staged OpenClaw `2026.8.1` lock while the
image installed `openclaw@2026.5.28`. The scan worked technically but described
the wrong product graph.

## Desired outcome

Every Lobster OpenClaw release has one durable record tying together:

- the exact OpenClaw package version and package digest installed;
- the final image digest;
- an SBOM or dependency inventory generated from that package/image;
- CFS admission results for the exact npm versions;
- the Component Governance correlation and alert result;
- governed exceptions or owner decisions; and
- the Lobster source commit and Official build identifier.

## Acceptance criteria

- Dependency evidence is produced from or cryptographically bound to the exact
  package/image built by the Official pipeline.
- Component Governance detects the OpenClaw runtime graph without an unrelated
  source checkout or staged lockfile.
- The build fails on unresolved blocking Component Governance alerts after the
  initial baseline and owner-approved rollout.
- Missing evidence, graph/version mismatches, and unverifiable digests fail
  closed with actionable diagnostics.
- The evidence bundle is retained with the Official build and can be mapped to
  the promoted image digest.
- Microsoft-specific CFS, procurement, and exception policy remains in Lobster;
  OpenClaw upstream is not required to encode Microsoft policy.

## Suggested implementation investigation

Prefer these seams in order:

1. consume the exact entry from an OpenClaw release dependency-evidence feed,
   when available;
2. generate an SBOM from the exact npm tarball before installation;
3. scan the completed image and reconcile it with the package evidence.

The preferred upstream feed would identify each immutable release, artifact
digests, SBOM/lock evidence, dependency deltas, scanner/policy versions, and
withdrawal state. Lobster would apply Microsoft-specific CFS, Component
Governance, procurement, and exception policy after selecting the exact entry
for the package it installs.

Do not reopen Lobster PR #8174 unchanged. Fetching a source lock is acceptable
only when the product is built from that exact source commit and the resulting
artifact digest is part of the same attestation.

## Related evidence

- Complete dependency analysis and Microsoft controls workbook: available from
  the OpenClaw dependency-governance project handoff.
- Experimental Official run:
  https://msazure.visualstudio.com/b32aa71e-8ed2-41b2-9d77-5bc261222004/_build/results?buildId=176596891
- Closed experimental PR: https://microsoft.ghe.com/bic/lobster/pull/8174
- Closed remediation proof: https://github.com/openclaw/openclaw/pull/123513
