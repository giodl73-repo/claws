# Lint Catalog Evidence

Frozen snapshot of `openclaw/openclaw` issue evidence motivating each lint
code in this catalog. Pulled **2026-04-28** via `gh issue list`.

Per `claws-workspace-lint` plan: re-pull before pushing PR-1 with
`scripts/regen-lint-evidence.ts` so cited numbers stay fresh. The
`{N}-{slug}.jsonc` fixture column is the failure-pattern replay used by
`tests/lint/issue-replay.test.ts`.

## Evidence table

| Issue | Title | Lint code(s) | Fixture |
|---|---|---|---|
| [#14998](https://github.com/openclaw/openclaw/issues/14998) | Config validation rejects `$schema` despite valid JSON Schema convention | (negative test — no `OC_CFG_UNKNOWN_FIELD`) | `issues/14998-schema-key.jsonc` |
| [#20478](https://github.com/openclaw/openclaw/issues/20478) | Duplicate plugin id warning when channels coexists with bundled extensions | `OC_CFG_PLUGIN_ID_COLLISION` | `issues/20478-plugin-id-collision.jsonc` |
| [#22272](https://github.com/openclaw/openclaw/issues/22272) | `doctor --fix` flags unrecognized config keys but does not remove them | `OC_CFG_UNKNOWN_FIELD` | `issues/22272-unrecognized-keys.jsonc` |
| [#31251](https://github.com/openclaw/openclaw/issues/31251) | Plugin install/uninstall clobbers unrelated `dmPolicy` key | `OC_CFG_MISSING_REQUIRED_FIELD` | `issues/31251-clobbered-dmpolicy.jsonc` |
| [#48415](https://github.com/openclaw/openclaw/issues/48415) | Control UI saves invalid JSON5 with stray comma; on-disk file validates | `OC_CFG_TRAILING_COMMA_INCONSISTENT` | `issues/48415-trailing-comma-mix.jsonc` |
| [#59070](https://github.com/openclaw/openclaw/issues/59070) | `agents: Unrecognized key: "defaultId"` + permanent unsaved-changes state | `OC_CFG_UNKNOWN_FIELD` | `issues/59070-defaultId-typo.jsonc` |
| [#60334](https://github.com/openclaw/openclaw/issues/60334) | 2026.4.2 update rejects legacy config keys | `OC_CFG_LEGACY_FIELD` | `issues/60334-legacy-root-keys.jsonc` |
| [#61683](https://github.com/openclaw/openclaw/issues/61683) | Plugin-scoped config errors abort gateway startup | `OC_CFG_MISSING_REQUIRED_FIELD` | `issues/61683-missing-required.jsonc` |
| [#62281](https://github.com/openclaw/openclaw/issues/62281) | `openclaw configure` writes `__OPENCLAW_REDACTED__` literals into config | `OC_CFG_REDACTED_PLACEHOLDER` | `issues/62281-redacted-corruption.jsonc` |
| [#62438](https://github.com/openclaw/openclaw/issues/62438) | `secret_token_in_config` audit fires for `${VAR}` env refs (false positive) | (negative test — no `OC_CFG_SECRET_REF_AMBIGUOUS`) | `issues/62438-secret-ref-clean.jsonc` |
| [#65565](https://github.com/openclaw/openclaw/issues/65565) | Dashboard "Set Default" agent fails with `Unrecognized key: "defaultId"` | `OC_CFG_UNKNOWN_FIELD` | `issues/65565-default-agent-typo.jsonc` |
| [#72872](https://github.com/openclaw/openclaw/issues/72872) | 2026.4.24 schema rejects `agents.defaults.agentRuntime` from prior 4.x | `OC_CFG_LEGACY_FIELD` | `issues/72872-agentRuntime-legacy.jsonc` |

## Aggregate counts (2026-04-28)

| Category | Issues |
|---|---|
| Open `Unrecognized key` startup-block | 11 (#14998, #22272, #59070, #65565, #62455, #60334, #72527, #68664, #72872, #47002, #57270) |
| Closed `Unrecognized key` | 2 (#44943, #62182) |
| Open `__OPENCLAW_REDACTED__` corruption | 4 (#60917, #68423, #66832, #59945) |
| Closed `__OPENCLAW_REDACTED__` corruption | 6 (#13495, #44357, #62281, #21573, #13210, #12078) |
| Open plugin-id collision / hot loop | 2 (#20478, #64946) |
| Open trailing-comma round-trip | 1 (#48415) |
| Open plugin-clobber | 1 (#31251) |
| Open secret-ref false positive | 1 (#62438) |
| **Total distinct issues cited** | **27** |

## Negative tests

Two issues are negative tests — they confirm the lint catalog does NOT
reproduce upstream's *false-positive* failure mode:

- **#14998** — `$schema` is a legitimate editor convention; lint must NOT
  flag it as unknown. Schema test allow-lists `$schema` at root.
- **#62438** — clean `${VAR}` references must NOT trigger
  `OC_CFG_SECRET_REF_AMBIGUOUS`. Only suspicious partial forms (`$VAR`
  without braces, `${...` unclosed) flag.

## Regen workflow

Pre-PR-push:
```bash
node scripts/regen-lint-evidence.ts
```

The script pulls live issue counts via `gh` and writes a fresh
`EVIDENCE.md` plus an updated table in PR-DRAFT 1. CI gate (warn-only)
flags drift between recorded and live counts.
