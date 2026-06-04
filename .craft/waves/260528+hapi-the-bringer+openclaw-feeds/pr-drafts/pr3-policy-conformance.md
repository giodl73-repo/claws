## Summary

Adds feed update awareness, optional approved-only install posture, and Policy conformance checks for configured feed sources.

This is config/catalog conformance, not broad runtime enforcement:

- Reports newer feed-backed versions for an explicit installed inventory.
- Adds optional approved-only warn/enforce behavior for explicit feed-backed installs.
- Adds `policy.jsonc` catalog feed rules for required feed source ids.
- Adds configured-source integrity and attestation posture checks.
- Adds feed evidence to policy output only when feed policy rules are present.
- Does not fetch feed documents during policy checks.
- Does not intercept unrelated skill/plugin install commands.

## Example policy syntax

```jsonc
{
  "catalog": {
    "feeds": {
      "sources": {
        "require": ["company-approved"],
        "requireIntegrity": true,
        "requireAttestation": true
      }
    }
  }
}
```

## Example install policy syntax

```jsonc
{
  "catalog": {
    "feeds": {
      "installPolicy": {
        "mode": "enforce",
        "requireApproval": true
      }
    }
  }
}
```

## Commands

```bash
openclaw feeds updates --installed ./installed.json --approved-only --json
openclaw policy check --json
```

## Notes

Policy reports findings when active OpenClaw config does not conform to the approved policy file. It does not enforce install behavior or fetch feeds during policy checks.

## Validation

Use focused feed update/install policy tests plus policy feed conformance tests, format/lint on touched feed and policy files, import smoke, `git diff --check`, and `codex review --commit HEAD`.
