## Confirmed defects

1. **High — `reverse-proxy` can return ready when its only ingress cannot authenticate.**

   RFC 0023 requires `TrustedProxyReady=True` only when the active ingress accepts identity from validated sources and rejects direct or forged identity (`rfcs/0023/hosting-profile-v1-spec.md:141`). The predicate checks only auth mode, header presence, and a nonempty proxy list (`src/hosting/profiles.ts:193`, `src/hosting/profiles.ts:221`). OpenClaw’s actual authenticator rejects loopback proxies unless `allowLoopback=true` (`src/gateway/auth.ts:317`).

   The alleged ready E2E config trusts `127.0.0.1` but does not enable `allowLoopback` (`scripts/e2e/hosting-profiles-docker.sh:39`), then proves only a local `/readyz` call (`scripts/e2e/hosting-profiles-client.mjs:63`). It therefore blesses a deployment whose readiness is `200` while its intended trusted-proxy users are rejected.

2. **High — timed-out plugin providers can accumulate indefinitely.**

   The normative contract prohibits another invocation until the original callback settles (`rfcs/0018/readiness-v1-spec.md:306`). The cache instead clears `rawPending` when the timeout wrapper resolves, not when the raw callback settles (`src/readiness/plugin-readiness.ts:124`, `src/readiness/plugin-readiness.ts:131`). The test explicitly requires a second invocation of a never-settling callback after TTL expiry (`src/readiness/plugin-readiness.test.ts:64`).

   This allows one new permanently pending invocation every five seconds. It contradicts RFC 0018’s boundedness goal and its own lifecycle prose; the RFC implementation-status paragraph also incorrectly celebrates the conflicting behavior (`rfcs/0018-readiness-conditions-and-providers.md:374`). Registry replacement additionally has no generation-bound abort mechanism despite the atomic-reload requirement at `rfcs/0018/readiness-v1-spec.md:229`.

3. **High — `node-mode` does not use the canonical command policy and can report executable authority that runtime invocation denies.**

   The evaluator manually intersects pairing commands, config allow/deny arrays, and live commands (`src/hosting/node-mode.ts:30`). The canonical owner also applies platform defaults, plugin commands, dangerous-command exclusions, device metadata, and declaration checks (`src/gateway/node-command-policy.ts:398`, `src/gateway/node-command-policy.ts:424`, `src/gateway/node-command-policy.ts:513`).

   For example, a paired/live dangerous desktop command not explicitly allowed can satisfy `CommandApprovalReady`, while canonical invocation rejects it. The test named “canonical command policy” verifies only the two raw config arrays (`src/hosting/node-mode.test.ts:49`), not agreement with `resolveNodeCommandAllowlist`.

   The same readiness path calls `listNodePairing()` (`src/hosting/node-mode.ts:24`), which loads, traverses, and sorts the entire pairing store (`src/infra/node-pairing.ts:346`). That conflicts with the bounded activation-snapshot promise at `rfcs/0023/hosting-profile-v1-spec.md:172`.

4. **High — the host-visible profile contract is absent.**

   RFC 0023 requires machine-readable `profileContractVersion`, `profile`, `profileSource`, and activation metadata (`rfcs/0023/hosting-profile-v1-spec.md:279`). The canonical implementation contains only two activation IDs (`src/readiness/conditions.ts:29`). The selected profile exists only inside an operator-facing message (`src/hosting/profiles.ts:235`).

   Selection also discards provenance: `resolveHostingProfile` returns only an ID (`src/hosting/profiles.ts:73`), and the CLI converts an argument into the environment variable (`src/cli/gateway-cli/run.ts:713`). Thus even a later projection could misreport an argument as an environment selection.

   This contradicts the public claim that readiness, health, and status report the selected profile (`docs/gateway/hosting-profiles.md:71`).

5. **High — the “release-tested support contract” is substantially less than the normative conformance promise.**

   The specification requires immutable conformance records and scenarios covering forged/direct proxy ingress, wrong-target node correlation, incarnation replacement, exact condition sets, contract versions, artifact mismatch, and agreement across HTTP, health, status, and CLI (`rfcs/0023/hosting-profile-v1-spec.md:328`, `rfcs/0023/hosting-profile-v1-spec.md:376`).

   The release lane runs a scenario script but emits no defined conformance record, artifact binding, or contract version. Its matrix covers only the scenarios at `scripts/e2e/hosting-profiles-docker.sh:116`; its assertions inspect `/readyz` only (`scripts/e2e/hosting-profiles-client.mjs:27`). Scheduling that lane in release checks (`.github/workflows/openclaw-release-checks.yml:903`) does not satisfy the specified evidence contract.

   Operator-profile inheritance is likewise normative (`rfcs/0023/hosting-profile-v1-spec.md:246`) but the config schema accepts only the four standard enum values and has no `profiles` map (`src/config/zod-schema.hosting.ts:4`).

6. **Medium — profile-only activation behavior leaks into unprofiled deployments.**

   RFC 0023 says an unprofiled runtime remains ordinary RFC 0018 and must omit profile-only conditions (`rfcs/0023/hosting-profile-v1-spec.md:39`, `rfcs/0023/hosting-profile-v1-spec.md:419`). The Gateway resolves activation identity unconditionally (`src/gateway/server.impl.ts:687`) and always passes it into readiness (`src/gateway/server.impl.ts:1343`), which always emits required `RuntimeActivationIdentified` (`src/readiness/conditions.ts:163`).

   The unprofiled package test checks only that `ProfileSelected` and `WorkspaceWritable` are absent, so it misses this regression (`scripts/e2e/hosting-profiles-client.mjs:27`).

7. **Medium — the declared provider schema and redaction contract are not enforced.**

   RFC 0018 mandates a reason regex, a 512-byte message limit, and redacted output (`rfcs/0018/readiness-v1-spec.md:107`). Runtime validation checks only nonempty strings (`src/readiness/plugin-readiness.ts:50`). Separately, `PluginsLoaded` copies raw plugin loader errors into the canonical message (`src/readiness/conditions.ts:91`), while loader errors may contain full stacks and paths (`src/plugins/loader-records.ts:153`).

   Selector validation also permits arbitrary strings (`src/config/zod-schema.gateway.ts:93`); an unknown selector such as `ConfigLoaded` is emitted under that raw condition type (`src/readiness/selection.ts:32`), creating a duplicate of a core condition despite the uniqueness invariant.

## Design questions

- **Which condition order is normative?** RFC 0018 places `WorkspaceWritable` before profile conditions (`rfcs/0018/readiness-v1-spec.md:134`), while RFC 0023 orders `ProfileSelected`, activation, then workspace (`rfcs/0023/hosting-profile-v1-spec.md:75`). Implementation produces a third order through `src/gateway/server.impl.ts:1348` and `src/readiness/conditions.ts:150`.

- **Why is one readiness preset a new top-level `hosting` config domain?** The behavior is wholly Gateway readiness-owned, and RFC 0018 already provides `gateway.readiness`. Given OpenClaw’s config-surface bar, `gateway.readiness.profile` appears more native and avoids suggesting a broader hosting subsystem that does not exist.

- **Should operator profiles be V1 at all?** The RFC still lists their inclusion as unresolved (`rfcs/0023-standard-hosting-profiles.md:478`), while the sidecar declares them mandatory. I would defer inheritance until a concrete operator consumer exists rather than expand config merely to make the draft spec internally consistent.

No accidental Lobster, OCC, or AgentHarness implementation coupling was found. The coupling problem is instead duplicated OpenClaw-owned trusted-proxy, node-command, and pairing semantics.

## Verdict

**Not ready as one conforming package.** RFC 0018’s condition model, HTTP redaction, thin CLI, and shared health/status evaluator are directionally OpenClaw-native. However, provider lifecycle boundedness is broken. RFC 0023 is a partial standard-profile prototype described as a complete support, inheritance, projection, and conformance contract, and two profile predicates can claim readiness without satisfying their owning runtime subsystems.

The three highest-value changes are:

1. Make provider execution generation-owned and truly bounded: track raw settlement, abort on registry replacement, prohibit overlapping invocations, and enforce output bounds.
2. Reuse canonical trusted-proxy and node-command policy helpers; prove profiles through actual authenticated ingress and actual node invocation.
3. Rescope RFC 0023 V1 to a minimal deliverable: standard selection, exact machine-readable projection, and a real packaged matrix. Defer operator inheritance and artifact assertions unless implemented with immutable records.

Validation was read-only. Both implementation ranges pass `git diff --check`; all worktrees remain clean. Tests were inspected but not executed because the branches are fork-sourced and repository policy forbids local execution of untrusted checkout tooling. The requested advisory Codex review was attempted but could not initialize under the read-only filesystem. Exact-head container and release evidence therefore remain unverified.
