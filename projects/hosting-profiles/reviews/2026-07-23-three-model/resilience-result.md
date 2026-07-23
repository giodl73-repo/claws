The package is not ship-ready. I found four block/near-block issues in the promised readiness/profile contract.

LOC reviewed:
Readiness diff: `+2602/-64` across 64 files. Profile-only diff: `+1480/-6` across 38 files.

**Findings**
1. **Blocker: `reverse-proxy` can report ready while real trusted-proxy ingress is unusable.**  
   Type: implementation defect + missing test.  
   RFC 0023 requires `TrustedProxyReady=True` only when active ingress accepts asserted identity from validated trusted sources and rejects direct/untrusted forged identity headers (`rfcs/0023/hosting-profile-v1-spec.md:141`, `rfcs/0023/hosting-profile-v1-spec.md:146`). The profile predicate only checks `authMode`, `userHeader`, and `trustedProxyCount`, then returns `True` (`src/hosting/profiles.ts:193`, `src/hosting/profiles.ts:221`). The actual auth path rejects loopback trusted-proxy sources unless `gateway.auth.trustedProxy.allowLoopback=true` (`src/gateway/auth.ts:317`, `src/gateway/auth.test.ts:1204`). The package E2E even configures `trustedProxies=["127.0.0.1"]` without `allowLoopback` and expects `reverse-proxy-ready` to be `200` (`scripts/e2e/hosting-profiles-docker.sh:39`, `scripts/e2e/hosting-profiles-docker.sh:120`), contradicting the auth contract and docs (`docs/gateway/configuration-reference.md:679`, `docs/gateway/security/index.md:620`).  
   Repro: select `OPENCLAW_HOSTING_PROFILE=reverse-proxy`, set `gateway.auth.mode=trusted-proxy`, `gateway.auth.trustedProxy.userHeader=x-forwarded-user`, `gateway.trustedProxies=["127.0.0.1"]`, omit `allowLoopback`; `/readyz` can return `200`, but a same-host proxy request with `x-forwarded-user` is rejected as `trusted_proxy_loopback_source`.

2. **Blocker: plugin readiness provider output is published without the v1 validation/redaction bounds.**  
   Type: implementation defect + missing tests.  
   The readiness spec requires provider `reason` regex validation, max 512-byte redacted messages, and no secrets/raw exception/tenant content before caching or projection (`rfcs/0018/readiness-v1-spec.md:107`, `rfcs/0018/readiness-v1-spec.md:111`). The resolver only checks that `reason` and `message` are non-empty strings (`src/readiness/plugin-readiness.ts:50`) and then copies them into the canonical condition verbatim (`src/readiness/plugin-readiness.ts:64`). Those values flow to detailed `/readyz` JSON for local/authenticated callers (`src/gateway/server-http.ts:300`, `src/gateway/server-http.ts:307`), the `ready` RPC (`src/gateway/server-methods/health.ts:149`), and `openclaw ready` table/JSON output (`src/commands/ready.ts:46`, `src/commands/ready.ts:96`).  
   Repro: a selected plugin provider returns `{status:"False", reason:"Bad\nHeader", message:"postgres://user:password@host/db " + "x".repeat(10_000_000)}`. Core accepts, caches, and projects it instead of converting to `CriterionInvalidResult`, leaking sensitive material and allowing response-size DoS.

3. **Blocker: timed-out plugin providers can accumulate unbounded never-settling invocations.**  
   Type: implementation defect + test defect.  
   The sidecar requires later polls to reuse the timeout result and not start another invocation until the prior callback settles and the cache expires (`rfcs/0018/readiness-v1-spec.md:306`). The implementation marks `rawPending=false` when the bounded wrapper `value` resolves (`src/readiness/plugin-readiness.ts:131`), but `value` resolves on timeout while the underlying `raw` provider promise can remain pending forever (`src/readiness/plugin-readiness.ts:40`, `src/readiness/plugin-readiness.ts:117`). Once the TTL expires, the next poll starts another provider call. The test locks in this unsafe behavior by expecting two calls for a never-settling provider after cache expiry (`src/readiness/plugin-readiness.test.ts:64`, `src/readiness/plugin-readiness.test.ts:83`).  
   Repro: register a required provider whose `check()` returns `new Promise(() => {})`; poll readiness every 6 seconds. Each poll starts another retained provider promise, giving a malicious or broken plugin a denial-of-service extension point.

4. **Medium: unprofiled deployments are no longer isolated from activation identity validation/profile-only output.**  
   Type: implementation defect against RFC 0023 compatibility.  
   RFC 0023 says profile selection is opt-in and upgrade must not select profile behavior for unprofiled deployments (`rfcs/0023/hosting-profile-v1-spec.md:62`); absent profile means unprofiled operation (`rfcs/0023/hosting-profile-v1-spec.md:204`), and activation identity is scoped to profiled results (`rfcs/0023/hosting-profile-v1-spec.md:221`). Docs also say unprofiled readiness does not add profile-only conditions (`docs/gateway/hosting-profiles.md:15`). The gateway validates runtime/incarnation identity unconditionally at startup (`src/gateway/server.impl.ts:687`), CLI `gateway run` does the same before startup (`src/cli/gateway-cli/run.ts:731`), and runtime readiness always includes `RuntimeActivationIdentified` whenever activation is passed (`src/readiness/conditions.ts:163`, `src/gateway/server.impl.ts:1347`).  
   Repro: with no `hosting.profile` and no `OPENCLAW_HOSTING_PROFILE`, set `OPENCLAW_RUNTIME_ID="bad id with spaces"` and run `openclaw gateway run`; startup exits with the identity validation error. Even valid unprofiled runs receive a required `RuntimeActivationIdentified` condition.

5. **Low: workspace missing uses an undocumented stable reason.**  
   Type: spec/implementation mismatch + test defect.  
   RFC 0018 lists `WorkspaceStorageFull`, `WorkspaceNotWritable`, `WorkspaceProbeFailed`, `WorkspaceProbeTimedOut`, and `WorkspaceNotChecked` for `WorkspaceWritable` (`rfcs/0018/readiness-v1-spec.md:161`). The implementation emits `WorkspaceMissing` for `ENOENT` (`src/readiness/workspace.ts:41`), and the test asserts that as stable (`src/readiness/workspace.test.ts:72`).  
   Repro: require `openclaw.workspace-writable` and point the default workspace at a nonexistent directory; `/readyz` fails with `WorkspaceMissing`, which is not in the v1 reason contract.

**Verdict**
Block. The reverse-proxy false-ready path and plugin-provider DoS/output-validation gaps violate core runtime, reliability, and security promises.

Residual risk: I did not run live tests in this read-only review. Code read covered RFC 0018/0023 specs, readiness selection/provider/workspace evaluators, gateway readiness/HTTP/RPC/CLI projections, hosting profiles, node-mode evidence, trusted-proxy auth, docs, and package E2E wiring.