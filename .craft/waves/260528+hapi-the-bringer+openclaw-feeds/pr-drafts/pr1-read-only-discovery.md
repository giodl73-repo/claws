## Summary

Adds the OpenClaw feed document contract, local catalog index, source config, and read-only feed discovery commands.

This PR establishes the client-side primitive without install enforcement:

- Adds feed document parsing, validation, attestation hashing, and local indexing.
- Adds `catalog.feeds.sources[]` for configured feed documents.
- Adds `openclaw feeds sources`, `feeds status`, `feeds sync`, and `feeds search`.
- Supports `file://`, `http://`, and `https://` feed URLs with optional pinned `sha256:<hex>` integrity.
- Adds docs and tests for source config, sync, and search.
- Does not install, update, block, or auto-fetch anything in the background.

## Example syntax

```jsonc
{
  "catalog": {
    "feeds": {
      "sources": [
        {
          "id": "company-approved",
          "url": "https://feeds.example.com/openclaw/feed.json",
          "integrity": "sha256:...",
          "requireAttestation": true,
        },
      ],
    },
  },
}
```

## Commands

```bash
openclaw feeds sources
openclaw feeds status
openclaw feeds sync company-approved
openclaw feeds search calendar --type plugin --source company-approved
```

## Notes

This is intentionally read-only. It does not add ClawHub-native hosted feeds, background sync, automatic installation, or runtime enforcement.

## Validation

Use focused feed source/index tests, format/lint on touched feed files, import smoke, `git diff --check`, and `codex review --commit HEAD`.
