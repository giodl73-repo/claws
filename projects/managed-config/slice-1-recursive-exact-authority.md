# Slice 1: Recursive Exact Authority

## Question

Can OpenClaw recursively compose generic named layers using exact authority,
preserve unclaimed siblings, reject a later conflict, and produce enough
provenance to replace Lobster's allowed-origins writer?

## Narrow Surface

Implement a pure internal function before selecting CLI names or a production
layer-list loader:

```ts
composeConfigLayers(layers: ConfigLayer[]): ConfigCompositionResult
```

It accepts zero or more already parsed, presence-preserving source documents. It
returns either a composed source candidate with path provenance or structured
findings. It does not apply defaults, runtime overrides, reload, or disk writes.

```ts
type ConfigLayer = {
  id: string;
  config: OpenClawConfigInput;
};
```

Read-only/writable capabilities belong to later I/O integration, not the fold.

## Fixture Matrix

1. Zero layers produces an empty candidate.
2. One layer preserves explicitly declared paths and provenance.
3. Two layers preserve an unclaimed sibling from the later layer.
4. A later equal exact declaration is accepted and appears in
   `declaringLayers`.
5. A later different exact declaration produces `ControlledByEarlierLayer`.
6. Three layers prove a middle layer can establish authority over the final
   layer.
7. Removing the first layer promotes the next declaration on recomposition.
8. Arrays are atomic exact values in this slice.
9. Absent paths remain absent; no defaults are introduced.
10. Duplicate or empty layer IDs fail descriptor validation.

## Lobster Representative

```json
[
  {
    "id": "platform",
    "config": {
      "gateway": {
        "controlUi": {
          "allowedOrigins": ["https://work.example"]
        }
      }
    }
  },
  {
    "id": "operator",
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

Expected candidate preserves both leaves. The proof is complete when these
declared inputs reproduce the old relevant effective fragment without applying
`OPENCLAW_GATEWAY_ALLOWED_ORIGINS` after seeding.

## Not In Slice

- bounded comparators;
- source loading syntax;
- mutation APIs;
- runtime override classification;
- CLI/status commands;
- Lobster deletion;
- upstream PRs.

## Fork Boundary

Build only in an isolated fork branch/worktree. Do not open an upstream
OpenClaw issue or PR.

## Proof

- Date: 2026-07-11
- Windows implementation worktree:
  `C:\src\openclaw-managed-config-slice1`
- Linux proof worktree: `/root/src/openclaw-managed-config-slice1`
- Branches: `user/giodl/managed-config-slice1` and local proof branch
  `user/giodl/managed-config-slice1-proof`
- Command:

  ```bash
  OPENCLAW_VITEST_MAX_WORKERS=1 \
    node scripts/run-vitest.mjs src/config/layer-composition.test.ts
  ```

- Result: `1` test file passed, `11` tests passed.
- Runtime: Vitest `503ms`; repository wrapper `6.70s`.
- Provider: local WSL2 `Ubuntu-24.04`. Brokered AWS Crabbox was attempted first
  but rejected before lease allocation with HTTP 401, so no `cbx_...` id exists.

## Slice Result

The role-neutral recursive exact-authority fold is viable as a pure boundary.
Proceed to a separate integration slice for presence-preserving layer loading,
schema validation, runtime materialization, and snapshot publication.
