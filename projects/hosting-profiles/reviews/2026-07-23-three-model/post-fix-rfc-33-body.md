## Decision Requested

Should OpenClaw modernize its fixed Gateway readiness evaluator into one structured, extensible condition contract?

This RFC covers readiness conditions and providers only. Standard Hosting Profiles are a separate decision in [RFC 0023](https://github.com/openclaw/rfcs/pull/37).

## Normative Specification

The [Readiness v1 specification](https://github.com/giodl73-repo/rfcs/blob/user/giodl/standard-hosting-profiles-ready-check/rfcs/0018/readiness-v1-spec.md) defines the schema, provider lifecycle, bounded evaluation, projection, and conformance requirements.

## Problem

OpenClaw already exposes `/ready` and `/readyz`, but the evaluator is purpose-built around fixed Gateway observations. Startup, drain, channel, event-loop, configuration, plugin, and workspace facts do not share one iterable condition shape; operators cannot require a known plugin dependency; and hosts add private scripts to bridge the gaps. This leaves "the process responds" confused with "this runtime can accept work."

## Proposed v1

Every observation has a stable `type + status + requirement + reason + message` shape. Required `False` or `Unknown` conditions fail readiness; advisory conditions remain visible. Existing Gateway facts become canonical core conditions while legacy fields remain compatibility projections. `/ready`, `/readyz`, health, status, and `openclaw ready` project the same canonical result; `/healthz` remains shallow liveness.

Operators can add registered core or plugin criteria directly with `gateway.readiness`; profiles are not required. Plugin providers are activation-scoped, namespaced, enumerable, observational, advisory by default, and governed by per-provider and outer deadlines. Core owns invocation, cancellation, no-overlap retries, coalescing, caching, output validation, message bounds, redaction, and deterministic ordering. Evaluation failure returns required `ReadinessEvaluationComplete=Unknown` rather than rejecting or hanging a health request.

Existing installations acquire no new opt-in criterion. This RFC does not add a profile catalog, policy engine, OCC dependency, config system, or state-continuity guarantee.

## Primary Implementation

[openclaw/openclaw#104018](https://github.com/openclaw/openclaw/pull/104018) contains thirteen ordered commits at exact head `8fbc1210762`, rebased onto OpenClaw `main` at `b8a47b23384`. Focused safety and behavior tests, production typing, type-aware lint, unused-export checks, protocol generation/guard, documentation indexing, and diff checks pass. Config and provider registries publish as one readiness snapshot; dynamic config publication advances that identity; and late workspace/provider results cannot cross generations or prevent the replacement generation from recovering. Workspace recovery permits one replacement probe while retaining a strict two-probe ceiling. Prior package-installed proof demonstrated fail-closed `200 -> 503 -> 200` recovery and matching CLI/HTTP projections; exact-head remote proof remains a landing gate.

Optional fork slices: [core conditions](https://github.com/giodl73-repo/openclaw/pull/17), [workspace criterion](https://github.com/giodl73-repo/openclaw/pull/22), [providers and selection](https://github.com/giodl73-repo/openclaw/pull/23), and [CLI projection](https://github.com/giodl73-repo/openclaw/pull/27).

## Maintainer Questions

1. Is the required/advisory model the right modernization of the existing evaluator?
2. Is activation-scoped plugin registration the right extension boundary?
3. Is explicit `gateway.readiness` selection sufficient for v1 without profiles?
