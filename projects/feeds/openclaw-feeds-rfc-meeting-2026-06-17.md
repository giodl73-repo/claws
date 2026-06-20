# OpenClaw Feeds RFC Meeting Notes

Date: 2026-06-17
Topic: Feeds-based plugin and skill registry, architecture and rollout plan
Participants: Gio, Vince, Patrick, Kevin, Jason, and OpenClaw contributors

## Summary

The group aligned on feeds as the right underlying primitive for OpenClaw plugin
and skill distribution. The immediate OpenClaw use case is plugins: move the
current file-backed external plugin registry to a hosted JSON feed, keep a
bundled fallback for offline and air-gapped users, and use feeds to control
which plugins and providers are visible, installable, disabled, or updated.
Skills should move into the same model after the plugin path is stable.

The Microsoft/MOS3 story maps cleanly onto this model as an enterprise
composition layer. ClawHub can publish an opinionated public feed. Microsoft can
consume that feed into its own registry, combine it with internal/private feeds,
apply tenant policy, and expose the resulting effective feed to Scout, Cowork,
Copilot, and OpenClaw clients.

## Decisions

- Write a new RFC rather than patching the stale prior feeds extension RFC.
- Frame feeds as the underlying primitive and leave naming open for user-facing
  surfaces that may prefer "marketplace".
- Start with plugins because OpenClaw already has a local external registry and
  npm-backed external plugin installs.
- Keep a bundled registry/feed fallback in every OpenClaw build so offline,
  Docker, and blocked-network environments still work.
- Treat the hosted feed as JSON over HTTP, suitable for edge caching and
  regionalization.
- Preserve package integrity checks, including package version and hash, so
  external npm/ClawHub packages cannot be silently swapped after review.
- Align Tencent and Xiaomi feed/mirror work before the spec ships to avoid
  incompatible regional feed formats.

## RFC Requirements

The RFC should define a feed contract that can represent:

- Plugin entries, provider entries, and later skill entries.
- Package source, such as npm, ClawHub, private registry, or future source
  adapters.
- Package version and immutable hash/integrity metadata.
- Visibility and recommendation metadata for onboarding and discovery.
- Enable, disable, block, and update state.
- Regional or environment-specific feed variants.
- Parent/child feed composition, where an enterprise feed can subset or override
  a public feed.
- Offline fallback behavior from the bundled feed.
- Update detection through feed hashes, ETags, last-modified headers, or similar
  endpoint metadata.

Vince added that the OpenClaw manifest will need refactoring as part of this
work. Once the hosted feed is deployed, OpenClaw should use HTTP
`Last-Modified` headers plus a checksum to detect whether a newer feed version
exists before downloading or applying updates.

The RFC should also state what feeds do not own:

- Runtime tool-call policy enforcement, such as MCP method blocking or parameter
  clamping, unless represented as metadata handed to a policy engine.
- Full private registry RBAC. Private GitHub repos or enterprise registries can
  supply private feeds, but the feed format should not become the auth system.
- The final end-user onboarding UX.

## Microsoft Tenant Model

The Microsoft model should be included as a visual flow in the RFC:

1. ClawHub publishes public and curated OpenClaw feeds.
2. MOS3 consumes ClawHub feeds plus Microsoft/private internal feeds.
3. Microsoft applies enterprise policy, publisher trust, scan requirements, and
   tenant-specific allow/block rules.
4. Tenant admins can subset, block, filter, or add private entries.
5. Teams can publish private skills/plugins into the Microsoft registry.
6. Scout, Cowork, Copilot, and OpenClaw clients consume the effective feed.
7. Approved internal contributions can be promoted back toward ClawHub when
   policy allows.

This makes Microsoft "a tenant with a composed feed" rather than a special
protocol. Other enterprises can use the same model with their own hosted feed,
private Git repo, or registry-backed source.

## ClawHub Model

ClawHub can own the public/community registry surface and publish one or more
feeds for OpenClaw clients:

- A default gated feed for safe onboarding and standard OpenClaw installs.
- Curated or reviewed feeds for trusted/plugin-safe entries.
- Regional feeds where provider availability differs by geography.
- Future private organization/team feeds, following the same contract.

Patrick is expected to supplement the RFC with the ClawHub-specific publishing,
review, trust, and private-feed details.

## Policy Questions

The RFC should separate feed governance from runtime policy while allowing them
to connect.

Feed-level governance:

- Entry appears or does not appear.
- Entry is recommended, pinned, hidden, disabled, or blocked.
- Entry version is allowed or update is available.
- Entry comes from a trusted, verified, reviewed, or official publisher.
- Entry satisfies scan or integrity requirements.

Runtime policy:

- MCP tool-level enable/disable, such as allowing Gmail read but not send.
- Parameter clamping, such as requiring tool arguments to match tenant policy.
- Built-in plugin disabling even when the plugin ships with OpenClaw.

Open question: whether runtime policy should live in the feed, a separate
policy document, or feed metadata consumed by a policy engine.

## Rollout Plan

1. Move the current OpenClaw external plugin registry from a local file to a
   hosted JSON feed.
2. Bundle the latest generated feed into OpenClaw at build/deploy time as the
   fallback.
3. Host the public feed on an edge-backed endpoint, likely Cloudflare, with
   regional variants where needed.
4. Keep npm-backed plugin installation, but make the feed the source of truth
   for package spec, version, and hash.
5. Remove skills and likely hooks from onboarding, then use onboarding to point
   users toward ClawHub/feed-backed discovery.
6. Extend the same feed model to skills after plugin flow stabilizes.
7. Coordinate with Tencent and Xiaomi before release so Chinese mirrors and
   private team feed implementations converge on the same spec.

## Existing OpenClaw Entry Points

The current file-backed external plugin catalog is already close to the first
hosted-feed slice:

- Generated TypeScript catalog entry point:
  `src/plugins/official-external-plugin-catalog.ts`
- Actual npm-backed catalog data:
  `scripts/lib/official-external-plugin-catalog.json`
- Package install metadata:
  `openclaw.install.npmSpec`
- Onboarding reader:
  `src/wizard/setup.official-plugins.ts`
- Install executor:
  `src/commands/onboarding-plugin-install.ts`
- Example entry:
  `@openclaw/acpx` in `scripts/lib/official-external-plugin-catalog.json`

The first implementation should preserve this package/install model while
moving the catalog source from a bundled-only file to hosted JSON with bundled
fallback.

## Open Questions

- What is the final user-facing noun: feed, marketplace, registry, or another
  term?
- Which ClawHub feeds should ship by default: official-only, reviewed, trusted,
  community, regional, or several named feeds?
- How should private organization/team feeds authenticate?
- Should private GitHub repositories be first-class feed sources or just one
  backing option?
- How much policy belongs in the feed versus a separate policy file?
- What does the OpenClaw client do when hosted feed fetch fails but package
  installs still need npm or ClawHub access?
- How should regional selection work: client locale, endpoint routing, explicit
  feed URL, tenant policy, or a combination?
- What stable versions must exist before Scout and Microsoft clients depend on
  the feed contract?

## Action Items

- Gio: draft a new RFC with the feed contract, Microsoft tenant visual flow,
  and rollout plan.
- Patrick: supplement ClawHub feed, review, and private/team registry details.
- Vince: move the first plugin registry slice toward hosted feed consumption.
- Patrick: add build/deploy logic to bundle the latest feed as fallback.
- Jason: remove skills from onboarding, with hooks likely next.
- Patrick and Mason: sync with Tencent on official Chinese mirror alignment.
- Vince: find Xiaomi engineers working on private/team feeds and align them on
  the shared spec.
