# Lobster Allowed-Origins Deletion Proof

## Current Workaround

Lobster currently:

1. seeds `~/.openclaw/openclaw.json` from baked `$include` fragments;
2. reads comma-separated `OPENCLAW_GATEWAY_ALLOWED_ORIGINS`;
3. writes `gateway.controlUi.allowedOrigins` as an inline sibling while
   preserving `gateway.$include`;
4. removes the previously generated sibling when the environment value becomes
   empty or unset;
5. performs the overlay after seeding and before Gateway spawn.

Primary implementation and proof surfaces:

- `src/openclaw_container/src/gateway_config_override.rs`;
- `src/openclaw_container/src/gateway_config_override_tests.rs`;
- `src/openclaw_container/src/gateway_lifecycle.rs`;
- `OPENCLAW_GATEWAY_ALLOWED_ORIGINS` projections in deployment/local E2E
  configuration.

## Layer Replacement

```json
[
  {
    "id": "deployment",
    "access": "read-only",
    "config": {
      "gateway": {
        "controlUi": {
          "allowedOrigins": [
            "http://127.0.0.1:18001",
            "http://localhost:18001"
          ]
        }
      }
    }
  },
  {
    "id": "customization",
    "access": "read-write",
    "config": {
      "gateway": {
        "controlUi": {
          "enabled": true
        }
      }
    }
  }
]
```

The composed source contains the same allowed origins and preserves the
unclaimed `enabled` sibling. The runtime candidate passes ordinary OpenClaw
validation/materialization and publishes once.

## Stale-Value Semantics

The generated cleanup function is unnecessary after migration. Removing
`allowedOrigins` from the deployment layer relinquishes the claim on full-chain
recomposition. The next declaring layer controls the leaf, or the ordinary
OpenClaw default applies when no layer declares it.

No imperative “remove the value written by the previous environment” operation
is needed because authority state and effective config are derived from current
layer documents.

## Deletion Gate

After a minimum OpenClaw release provides the conformant layer activation path:

- delete `gateway_config_override.rs` and its module wiring;
- delete `gateway_config_override_tests.rs` exact-blob/order tests;
- remove the lifecycle overlay call after seeding;
- remove `OPENCLAW_GATEWAY_ALLOWED_ORIGINS` where its only purpose is config
  mutation;
- remove stale generated allowed-origin cleanup;
- retain deployment compilation that supplies the equivalent layer document;
- add conformance comparing old and new effective Gateway fragments during a
  bounded dual-run period.

## Proof Status

- Recursive exact authority: proven.
- Sparse validation/default projection: proven.
- Runtime materialization: proven.
- Atomic activation callback: proven.
- Representative origins plus unrelated customization sibling: covered by the
  focused prototype test; consolidated proof is `3` files and `28` tests passed
  on WSL2 `Ubuntu-24.04`.
- Real Lobster old/new dual-run capture: encoded against the actual overlay
  helper for loopback, external tenant, operator-sibling, and stale-removal
  cases; execution is pending the private Cargo registry token.
- Lobster deletion PR: not created.
- Upstream OpenClaw PR: not created.
