Review the OpenClaw Readiness Conditions/Providers and Standard Hosting Profiles
package as an adversarial runtime, reliability, and security reviewer. Do not
modify files.

Artifacts:

- RFC 0018 and its readiness v1 sidecar spec in
  `/root/src/openclaw-rfcs-0018-refresh`.
- RFC 0023 and its hosting-profile v1 sidecar spec in
  `/root/src/openclaw-rfcs-0023-refresh`.
- Readiness diff `f7d61b4352952aae852454f7571cf59d42b695ff..5e7a713545a6588ce1d14ead756aa594123cc84e`
  in `/root/src/openclaw-104018-rebase`.
- Profile-only diff `5e7a713545a6588ce1d14ead756aa594123cc84e..2336ee23999eac6bfbed176c3d669e5f42a39f03`
  in `/root/src/openclaw-107765-rebase`.

Try to break readiness: hung or malicious plugin providers, timeout and cache
interactions, concurrent probes, startup/drain races, stale runtime identity,
optional versus required promotion, provider exceptions, repeated calls, HTTP
200/503 compatibility, workspace/storage failure, reverse-proxy trust, node
pairing/command approval, and upgrade from an unprofiled deployment. Confirm
that failures are bounded and fail closed where promised without creating a
denial-of-service extension point.

Report only evidence-backed findings, ordered by severity, with exact file and
line references and a concrete reproduction or failing scenario. Distinguish
spec defects, implementation defects, and missing tests. End with a ship/block
verdict and residual-risk summary.
