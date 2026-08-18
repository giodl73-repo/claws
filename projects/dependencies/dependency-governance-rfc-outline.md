# OpenClaw Dependency Governance: Long-Term Direction

## Recommendation

Do not replace OpenClaw's dependency guard. It already provides a strong
community-owned foundation:

- daily Dependabot coverage for npm, GitHub Actions, Swift, Gradle, and Docker;
- a two-day pnpm minimum-release-age policy;
- security-owner authorization for dependency graph changes;
- frozen-lock and generated npm-lock checks;
- a production dependency vulnerability gate;
- transitive manifest, ownership/install-surface, and dependency-delta reports;
- npm release dependency evidence; and
- signed provenance and SBOMs for primary container releases.

The durable design should be:

```text
OpenClaw's existing dependency guard and release evidence
+ a small cross-ecosystem evidence contract
-> reusable upstream safety and product-exact downstream attestation
```

OpenClaw retains dependency policy, contributor workflow, package ownership,
release semantics, and public evidence. Lobster retains Microsoft feed
admission, Component Governance policy, procurement/exception decisions, and
release approval.

## Thesis

If OpenClaw emits one artifact-bound dependency evidence bundle for every
release, downstream consumers can verify and govern the exact package or image
they install without copying source lockfiles into unrelated scans.

This thesis is disproved if the evidence bundle cannot be generated from the
actual release build, cannot be tied to the released artifact digest, or
creates a contributor-facing approval process specific to Microsoft.

## Dependency Evidence Feed

The bundle should also be published through a small, append-only release feed.
Each entry identifies one immutable OpenClaw release and links to its evidence:

- release version, source commit, and publication time;
- npm tarball and container image digests;
- lockfile and SBOM digests plus download/attestation references;
- dependency additions, removals, and changed versions;
- scanner and policy versions;
- vulnerability, license, provenance, and install-surface summaries; and
- supersession or withdrawal state.

Consumers such as Lobster can poll or subscribe to this feed, import only the
release they actually install, apply their own policy, and track drift as
OpenClaw publishes new releases. The feed reports facts and upstream policy
results; it does not declare Microsoft approval.

## v2026.6.33 Emulation

The prototype under `artifacts/release-feed/` demonstrates the contract with
real release evidence:

- npm provenance binds `openclaw@2026.6.33` to source commit
  `7af0cfc9c5488e03c4e2f528bdc7ac9f7778b35e`;
- the original release workflow reports cover 1,355 npm lockfile packages,
  dependency changes, vulnerability policy, transitive risks, and
  ownership/install surfaces;
- an exact-tag reconstruction inventories 1,481 identities across npm, SwiftPM,
  Gradle, Go, GitHub Actions, containers, and Python declarations; and
- a current production npm install resolves 306 packages.

The last number is illustrative rather than historical proof. The npm package
does not carry the repository lock, so transitive versions may resolve
differently after publication. A production feed must therefore generate an
installed-graph SBOM during release preflight and bind its digest to the exact
tarball. The prototype also confirms that the existing Actions evidence
artifact is temporary and that v2026.6.33 has no GitHub release assets or
container references. Durable publication and one signed cross-artifact index
remain the substantive gaps.

## Small Upstream Gaps

### 1. Complete ecosystem update coverage

Dependabot currently covers npm, Actions, Swift, Gradle, and Docker, but the
reviewed repository also contains Cargo and isolated release-tool lockfiles.
Add updater coverage or an explicit owner-reviewed alternative for those
surfaces.

### 2. Enforce existing ownership and pin checks

OpenClaw already has `deps:root-ownership:check` and `deps:pins:check`. Make
them required where dependency files change, instead of leaving the strongest
ownership and pin analysis as opt-in scripts.

### 3. Govern minimum-release-age exclusions

The two-day pnpm hold is useful, but the exclusion list is large. Each exact
exclusion should carry an owner, reason, and expiry or review date. The goal is
not to remove emergency escape hatches; it is to prevent permanent silent
bypass.

### 4. Extend release evidence beyond the root npm graph

The existing npm release evidence is a good base. Extend the same manifest to
identify relevant Cargo, Gradle, Swift, isolated npm locks, and container SBOM
artifacts. Keep ecosystem-native scanners; normalize only the evidence index.

### 5. Bind evidence to released artifacts

The evidence manifest should record:

- source commit and release identifier;
- npm tarball and image digests;
- lockfile and SBOM digests;
- scanner/tool versions and policy versions;
- findings and accepted exceptions; and
- provenance/attestation verification instructions.

The evidence must be generated by the release build, not reconstructed from a
different branch afterward.

## Non-Goals

- Microsoft CFS logic in upstream OpenClaw.
- Component Governance-specific configuration in upstream OpenClaw.
- Individual approval records for every ordinary OSS package.
- A new dependency bot replacing Dependabot.
- A central policy service in the OpenClaw runtime.

## Internal Comparison

| Existing OpenClaw mechanism | Decision |
| --- | --- |
| Dependency Guard authorization and autoscrub | Reuse |
| npm production vulnerability gate | Reuse and extend by ecosystem |
| Dependency change, transitive-risk, and ownership reports | Reuse |
| npm release dependency evidence manifest | Adapt into the common evidence index |
| Docker SBOM and provenance attestations | Reuse as artifact-bound evidence |
| Permanent unstructured release-age exclusions | Avoid |

## External Comparison

- GitHub Dependency Review provides PR-time vulnerability and license policy
  over dependency changes. It is useful as a complementary cross-ecosystem
  check, not a replacement for OpenClaw's security-owner guard.
- pnpm `minimumReleaseAge` is designed to reduce exposure to newly published
  malicious packages; exclusions are intentional escape hatches and should be
  governed rather than banned.
- SLSA provenance and SPDX SBOMs establish the correct downstream seam:
  evidence is bound to the released artifact digest and generated during the
  trusted build.

Sources:

- https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/manage-your-dependency-security/configure-dependency-review-action
- https://pnpm.io/supply-chain-security
- https://docs.github.com/en/actions/concepts/security/artifact-attestations
- https://slsa.dev/spec/v1.2/provenance
- https://spdx.dev/

## Stakeholder Findings

- **OpenClaw/community owner:** keep Microsoft-specific admission and approval
  out of upstream contributor workflows. Add only generally useful release
  evidence and safety checks.
- **Release operator:** evidence must describe the published tarball/image, not
  a workspace approximation, and must fail before promotion when a blocking
  dependency gate fails.
- **Lobster operator:** consume immutable evidence; do not fetch a moving or
  unrelated source lock during the product build.
- **Security/compliance:** one signed, timestamped record must connect source,
  artifact digest, dependency inventory, policy result, and exceptions.

## Recommended Delivery Slices

1. Wire existing OpenClaw ownership and pin checks into dependency-changing PRs.
2. Add owner/reason/expiry metadata for minimum-release-age exclusions.
3. Extend the existing release evidence manifest with artifact and SBOM
   digests, then publish it through an append-only release feed.
4. Add one non-npm ecosystem to the feed.
5. Have Lobster consume and attest the exact published feed entry.

No new RFC is required for slices 1 and 2. Use an upstream RFC only if slice 3
becomes a stable cross-artifact public contract.
