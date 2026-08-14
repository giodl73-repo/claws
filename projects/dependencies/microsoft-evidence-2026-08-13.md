# Microsoft Dependency Evidence - 2026-08-13

## Governing Model

Work IQ located current Microsoft guidance establishing:

- Central Feed Services (CFS) and approved Azure Artifacts feeds as the
  authoritative package-ingestion path;
- Component Governance (CG) as the authoritative inventory, vulnerability,
  license, and remediation evidence surface; and
- no general package-by-package CELA approval workflow for ordinary OSS
  consumption.

The ordinary Microsoft posture is therefore:

1. consume the exact version through CFS or an approved Azure Artifacts feed;
2. run CG and resolve blocking security or legal alerts;
3. pin exact versions and preserve lockfile evidence; and
4. use an exception process only for blocked controls or unsupported paths.

Internal usage remains precedent, not authority.

## Exact CFS Admission Check

Queried the Microsoft-protected npm endpoint on 2026-08-13:

`https://packagefeedproxy.microsoft.io/npm/`

| Package | Exact version | CFS result | CG result | Current conclusion |
| --- | --- | --- | --- | --- |
| `@lydell/node-pty` | `1.2.0-beta.14` | Available | Not detected by current Lobster scan | CFS-admitted; CG coverage and privileged-use review required |
| `@aws-sdk/core` | `3.977.1` | Available | Not detected by current Lobster scan | CFS-admitted; upgrade from deprecated version |
| `audio-decode` | `2.2.3` | Available | Not detected by current Lobster scan | CFS-admitted; replace renamed package with CFS-available `@audio/decode@3.11.3` |
| `crypto-js` | `4.2.0` | Available | Not detected by current Lobster scan | CFS-admitted; unmaintained runtime path requires replacement review |
| `js-yaml` | `4.3.0` | Available | High CG alert | Admitted with remediation: update to CFS-available `4.3.1` |

Availability proves that the exact version is currently admitted through the
Microsoft-protected dependency supply chain. It does not prove that the
OpenClaw repository has no unresolved CG alert or that the package is
appropriate for its specific usage.

## Package-Specific Work IQ Result

The focused `@lydell/node-pty@1.2.0-beta.14` search found no durable
package-specific CG clearance, Lobster promotion, quarantine, block, or
exception record. It did find the controlling requirement that production
builds consume third-party application packages only through Azure Artifacts
or CFS.

Combining that evidence with the direct feed query changes the package from
unknown admission to **CFS-admitted**, while its CG and usage disposition remain
unresolved.

## Live Lobster Component Governance Evidence

The current governed consumer is the `bic/lobster` OpenClaw Official pipeline:

- pipeline: `Lobster-OpenClaw-Official`, definition `459851`;
- build: `26.225.12-openclaw-official`, run `176551095`;
- Lobster source: `23e358fe30625802dd975acd969d08e957e65614`; and
- consumed OpenClaw package: pinned `openclaw@2026.5.28`; and
- authoritative task: the successful Component Governance task in
  `BuildOpenClawContext`, correlation
  `45dcafd9-e4d5-4aa6-9bd6-5bb57ec5e7ce`.

The live manifest detects `js-yaml@4.3.0` from Lobster's
`src/lobster_app/pnpm-lock.yaml`. Work IQ also found package-specific internal
CG evidence for `GHSA-5p4m-2wfm-xmqj`, severity High, and a remediation record
requiring `js-yaml@4.3.1`; that version is available through CFS.

The same live CG task did not detect `@lydell/node-pty`, `@aws-sdk/core`,
`audio-decode`, or `crypto-js`. The image-stage CG task also omitted them and
reported that no Docker images were detected. OpenClaw is installed from its
npm package during the Docker build, so the current source scan does not
register the installed OpenClaw transitive graph.

Pipeline success is not equivalent to a clean CG disposition:
`Official.Build.yml` currently sets `cg.failOnAlert: false`.

This is a governance-coverage gap, not evidence that the four absent packages
are blocked or clean. Closing it requires registering the pinned OpenClaw
lockfile, an exact package SBOM, or the built image's dependency inventory with
CG. The governed Lobster build is also pinned to `openclaw@2026.5.28`, so its
result cannot establish compliance for the newer OpenClaw source baseline used
by this dependency inventory.

An analysis experiment in Lobster Official run `176596891` staged the
remediation branch's OpenClaw `2026.8.1` lock and proved that Pnpm9Detector can
inventory it under the existing scan root (correlation
`cd1612d3-5780-45e1-9afc-d6d3e85bd55d`). It is explicitly **not** control
closure evidence: the Lobster image still installs `openclaw@2026.5.28`, so
the staged graph did not describe the product being built. Lobster PR #8174
and OpenClaw remediation PR #123513 were closed on 2026-08-14 when the effort
returned to analysis-only scope. No pipeline registration from that experiment
should be retained or cited as product compliance.

## Remaining Unknown Evidence

Work IQ found ordinary internal CI usage of `useblacksmith/begin-testbox` and
`useblacksmith/run-testbox`, but no action-specific contract, GovID, SSPA
record, procurement approval, or exception. The controlling source is
[Third Party Software Governance](https://microsoft.sharepoint.com/teams/SoftwareLicensingService/SitePages/Third-Party-Software-Governance.aspx),
owned by Jon Norris and Kalyan Chintalapudi and modified 2026-05-18. It routes
uncatalogued third-party software and cloud services through the
[ServiceNow approval request](https://microsoft.service-now.com/sp?id=sccatitem&sysid=2936f71113acf6889317b1e32244b016).
Internal usage is therefore precedent only.

`rx.mini@1.4.0` is CFS-admitted, but its published tarball and package metadata
contain no license declaration. Two focused Work IQ attempts failed, including
a 503 response, so no internal decision or exception was established.

`@openclaw/uirouter@0.1.1` is integrity-pinned in the OpenClaw baseline lock and
available from the upstream CDN, but remains unavailable from CFS. A clean
governed install therefore needs normal CFS admission or a
compatibility-validated admitted version; a protected-feed bypass is not an
acceptable resolution.

The 2026-08-14 recheck found thirteen exact-version CFS gaps:
`@openclaw/fs-safe@0.5.5`, `@trycua/cua-driver@0.19.3` and its six platform
packages, `eventsource-parser@3.1.1`, `hono@4.13.2`, the
`@openclaw/uirouter@0.1.1` package, `nanoid@3.3.18`, and `ws@8.21.3`.
`@nolyfill/domexception@1.0.28`, the exact actual package behind the
`node-domexception` alias, now resolves through CFS with the lock integrity.

Official CFS guidance establishes a seven-day npm minimum-release hold and
routes delayed ingestion assistance to `terrapineng@microsoft.com`, with
Global Helpdesk at `https://aka.ms/techweb` as the support path. Exact upstream
package reads succeeded for the remaining gaps. Upstream tag timestamps place
all but `ws@8.21.3` inside the seven-day window; `ws` crossed the boundary only
hours before this recheck. Feed absence remains a governance/remediation gap,
not a technical vulnerability finding, and does not authorize a
public-registry bypass or premature exemption request.

The Cloudflare container declaration contains
`sha256:<official-openclaw-image-digest>`, not an exact image. It cannot receive
an exact-image disposition until promotion substitutes a real digest.

## Microsoft Check-off Ledger

The workbook `Microsoft Controls` sheet is the canonical check-off surface.
Its source is `microsoft-controls.json`, which records each expectation,
authority, owner, dependencies, current evidence, and completion criterion.

Current state:

- satisfied: exact inventory review and zero Critical technical-risk rows;
- gaps: CFS admission, Unknown evidence, High-risk decisions, ordinary
  dispositions, CG coverage/enforcement, vulnerability/license remediation,
  hosted-service governance, and immutable images;
- blocked: the final release attestation, which depends on the preceding
  controls.

Ordinary OSS rows should move from `Review required` to `Controls satisfied`
only after one durable governed run proves exact CFS resolution, reconciled CG
detection, and no blocking alert. This is a batch governed-control attestation,
not 2,623 individual Microsoft package approvals. High-risk and exceptional
service, license, or provenance cases still require named owner or exception
evidence.

## Prepared Remediation Evidence - 2026-08-14

OpenClaw branch `enterpriseclaw/dependency-governance-remediation`, through
commit `39b18ffbe4f`, prepares four package closures and one image-provenance
closure:

- `js-yaml@4.3.1` replaces the alerted `4.3.0`;
- `@aws-sdk/core@3.977.6` replaces deprecated `3.977.1`;
- ClawHub `0.23.3` resolves its release-tool Undici to `7.29.0`; and
- `werift@0.24.3` removes `rx.mini@1.4.0`; and
- the live-media runner's Ubuntu `24.04` base uses the same immutable digest as
  the existing installer smoke image.

The generated locks contain none of the superseded identities, the frozen pnpm
lock passes supply-chain policy verification, and the focused OpenAI WebRTC
test passes on supported Node `24.15.0`. The governed install still fails
closed because CFS lacks `@openclaw/fs-safe@0.5.5`; broad proof and Microsoft
check-off therefore remain pending. No feed bypass, CG registration, or
pipeline-policy change was used.

## Remaining Gaps Identified by the Analysis

1. Wait for normal CFS admission of the thirteen held exact versions; use the
   official CFS support path for versions still absent after their
   minimum-release window.
2. Locate a Blacksmith procurement/GovID/SSPA record or route the four Testbox
   action SHAs through Third Party Software Governance; internal CI usage alone
   is not approval.
3. If remediation is later authorized, validate the exact graph installed by
   the governed product rather than staging an unrelated source lock.
4. Resolve the `rx.mini@1.4.0` license gap and replace the Cloudflare image
   placeholder with the promoted immutable digest.
5. Treat all implementation, publication, and pipeline-registration work as
   outside this completed analysis unless separately authorized.
