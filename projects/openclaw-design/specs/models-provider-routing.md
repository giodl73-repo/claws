# Models and Provider Routing Facilities

## Boundary

This portfolio turns model/provider definitions and operator selections into an
executable, credential-bound runtime and one or more provider attempts.

It does not make the model catalog the owner of credentials, attempts, usage,
or health.

## Contracts

### Model catalog

- provider/model definitions and metadata;
- configured/discovered overlays;
- lookup and ordering;
- logical route projection.

### Route and auth planning

- explicit/default/session/alias selection;
- allowlists and fallback candidates;
- physical donor and public route metadata;
- auth-profile, endpoint, env, and SecretRef binding;
- credential availability and cooldown.

### Prepared model runtime

- fingerprinted accepted runtime generation;
- model/provider/auth/plugin facts;
- lease and replacement lifecycle.

### Provider attempt and fallback

- ordered candidate;
- attempt correlation;
- retry, probing, cooldown, and fallback;
- cancellation, timeout, terminal status, and backend-native identifiers.

### Usage and status projection

- selected-route diagnostics;
- tokens, usage, and cost;
- provider/auth availability;
- health/readiness projection.

## Current Gap

OpenClaw exposes request-level `model.call` IDs with provider/model lifecycle
and usage, but fallback candidate records do not have a parent identity binding
candidate order, auth/runtime generation, their model calls, and per-candidate
usage. Do not collapse these two lifetimes into one ambiguous provider attempt.

Source audit:
`../source-audit-models-provider-routing-2026-08-01.md`.

First bounded enterprise proof:
`../evidence-slices/provider-attempt-usage.md`.
