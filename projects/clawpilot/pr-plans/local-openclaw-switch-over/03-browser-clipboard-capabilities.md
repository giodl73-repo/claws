# Local OpenClaw Switch-Over PR80: Browser and Clipboard Capabilities

Planned PR: #80
Branch: `user/giodl/local-openclaw-switch-pr80-browser-clipboard`
Base: PR79

## Objective

Add the first user-context capability expansion beyond filesystem/shell:
browser and clipboard requests through Desktop node mode with preview, consent,
origin/context binding, and audit.

## Code Surfaces

- Add capability contracts for `browser.open`, `browser.readActiveTab`,
  `browser.extractSelection`, `clipboard.read`, and `clipboard.write`.
- Add origin/URL/title/selection preview fields and clipboard preview/redaction
  fields.
- Add approval cards and audit projections for browser/clipboard actions.
- Add executor seams that never expose ambient browser profile or background
  clipboard polling to OpenClaw.

## Acceptance Criteria

- Browser actions bind to explicit origin/URL/context and cannot silently read
  arbitrary browser profile state.
- Clipboard read/write requires visible preview and user approval.
- No background clipboard polling or arbitrary DOM mutation is introduced.
- Denied, stale, invalid, unsupported, or policy-blocked requests do not execute.

## Expected Validation

- Focused contract, policy, approval, executor, and audit tests.
- GUI proof for at least one approved browser action and one approved clipboard
  write/read path.
- Negative no-bypass tests for background/ambient access.
- `pnpm run typecheck`.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `git diff --check`.

## Non-Goals

No browser automation beyond explicit open/read/selection surfaces, no cookie or
profile access, and no M365 token use.
