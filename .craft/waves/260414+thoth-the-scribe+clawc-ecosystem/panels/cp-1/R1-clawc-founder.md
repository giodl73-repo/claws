---
role: claws:founder
type: impl
round: 1
checkpoint: 1
scope: "Protect feature completeness, security posture value, CLI UX, command coherence"
files_reviewed: 12
findings: 14
major: 3
warning: 7
note: 4
verdict: conditional-pass
---

# R1 — claws:founder Review: CP-1 Security Hardening + Protect

**Reviewer**: claws:founder (community-first product lens)
**Scope**: Protect command group — budget, secrets vault, identity SSO, doctor checks, registry client
**Verdict**: **Conditional pass** — 3 Major findings must be addressed before merge

---

## Findings

### M-01: Passphrase and secret value exposed in process argv (Major)

**File**: `claws-cli/src/cli.ts:548-608`
**What**: Every secrets subcommand requires `--passphrase <pass>` as a CLI flag. The `secrets set <key> <value>` command also takes the secret value as a positional argument. Both the passphrase and the secret value appear in the process command line, visible to any user via `ps aux` or `/proc/PID/cmdline` on shared systems.

**Why it matters**: This is a governance compiler for enterprise customers. If a security team audits `claws protect secrets set API_KEY sk-live-abc123 --passphrase hunter2` in their process table, they will reject the tool immediately. OpenClaw's personal-assistant trust model means the secret store must be safe on a single-user workstation AND on a shared CI runner.

**Fix**: Accept passphrase from `CLAWS_VAULT_PASSPHRASE` environment variable (with `--passphrase` as override). For `secrets set`, accept value from stdin when value argument is omitted (`echo $SECRET | claws protect secrets set API_KEY --passphrase ...`). This follows `gh auth login --with-token` and `docker login --password-stdin` conventions that the OC community already knows.

---

### M-02: Bare invocation and status output omit protect command group (Major)

**File**: `claws-cli/src/cli.ts:692-708`
**What**: When a user runs `claws` with no arguments in a workspace, the "Next steps" output shows only `compile`, `check`, `build`. The JSON status output also lists only `['compile', 'check', 'build']`. The protect command group is invisible to new users. Similarly the no-workspace output shows only `init` commands.

**Why it matters**: Protect is the security posture feature -- the reason enterprises adopt claws. A user who just ran `claws init` has no discoverability path to `claws protect` without reading `--help`. For the community, budget tracking is the most immediately useful protect feature (it answers "how much is my agent costing me?"), and it's hidden.

**Fix**: Add `protect` to the commands arrays and add a line to the "Next steps" sections:
```
  claws protect    Budget, secrets, and identity management
```

---

### M-03: Fleet budget output lacks workspace identification (Major)

**File**: `claws-cli/src/commands/protect.ts:108-118`, `claws-sdk/src/protect/types.ts:27-37`
**What**: The fleet budget CLI output prints `${ws.percentage}% ${ws.tokenCount}/${ws.limit} tokens (${ws.period})` for each workspace -- but there is no workspace name or path. The `BudgetReport` type has no identifier field. A fleet operator with 20 workspaces sees 20 lines of percentages with no way to know which workspace is which.

**Fix**: Add a `name` or `path` field to `BudgetReport` (or a wrapper `FleetWorkspaceReport`). The fleet output should show: `  85%  12500/15000 tokens (monthly) — /home/team/agent-alpha`. The fleet scan already has the workspace path; it just isn't threaded through.

---

### W-01: `secrets list` does not require passphrase -- metadata leak (Warning)

**File**: `claws-cli/src/cli.ts:587-596`, `claws-sdk/src/protect/secrets.ts:485-492`
**What**: `claws protect secrets list` returns all stored key names without authentication. Any process with read access to the vault file can enumerate what secrets exist. The vault values are encrypted, but the key names (e.g., "OPENAI_API_KEY", "PROD_DATABASE_URL") reveal what the workspace connects to.

**Why it matters**: Key name enumeration is a recon vector. Enterprise security teams expect secret stores to require authentication even for listing. Compare: `vault kv list` in HashiCorp Vault requires a token.

**Fix**: Either require passphrase for list (consistent with get/set/delete), or document explicitly that key names are unencrypted metadata and this is by design. If by design, add a `--names-only` flag to make the intent explicit.

---

### W-02: Identity configure silently accepts empty required OIDC fields (Warning)

**File**: `claws-cli/src/commands/protect.ts:333-355`
**What**: When `--provider OIDC` is specified without `--issuer`, the CLI fills in `opts.issuer ?? ''`, which then passes validation... until it hits `validateOidcConfig` which throws "OIDC issuer must be a valid HTTP(S) URL". The error message is correct but the user experience is poor -- the error comes from deep in the SDK, not at the CLI argument parsing level.

**Why it matters**: A community contributor following the `--help` output sees `--issuer <url>` as optional. They run `claws protect identity configure --provider OIDC --client-id abc` and get a cryptic validation error. The CLI should make provider-dependent fields conditionally required or print a clear message at the CLI layer: "OIDC provider requires --issuer, --client-id, and --redirect-uri".

**Fix**: Add provider-aware validation in the CLI before calling the SDK. When provider is OIDC, check that issuer, clientId, and redirectUri are present. When SAML, check entityId, ssoUrl, and certificate. Print actionable error messages.

---

### W-03: Budget shows 0% with 0/0 tokens when no budgetConfig exists (Warning)

**File**: `claws-sdk/src/protect/budget.ts:194`, `claws-cli/src/commands/protect.ts:59`
**What**: When no `budgetConfig` is in claws.json, the effective limits default to `{ daily: 0, monthly: 0 }`. The percentage computes as 0 (line 217: `periodLimit > 0 ? ... : 0`). The CLI then shows: `Budget: 0% used (0/0 tokens, monthly)`. This is confusing -- is the budget 0% because nothing was used, or because no limit was configured?

**Fix**: When no budget config exists, the CLI should print a distinct message: `No budget limits configured. Add budgetConfig to claws.json to enable tracking.` In JSON mode, return `{ "status": "not-configured" }` rather than a report with 0/0 values.

---

### W-04: Weekly period has no enforcement (Warning)

**File**: `claws-sdk/src/protect/budget.ts:215-216`
**What**: The budget function supports `daily`, `weekly`, and `monthly` periods for the report. But enforcement only evaluates daily and monthly limits (line 130-158). The `BudgetLimit` type has `daily` and `monthly` fields but no `weekly`. If a user runs `claws protect budget --period weekly`, they get a report but no enforcement -- the "weekly" period silently falls through to using the monthly limit for percentage calculation (line 216: `period === 'daily' ? effectiveLimits.daily : effectiveLimits.monthly`).

**Why it matters**: The user explicitly asked for weekly. Getting monthly enforcement back is confusing. Either support weekly limits properly or remove the weekly period option from the CLI.

**Fix**: Either (a) add `weekly` to `BudgetLimit` and enforcement, or (b) remove `--period weekly` from the CLI options and restrict to daily/monthly. Option (b) is simpler and honest.

---

### W-05: `verifyPkce` uses non-constant-time string comparison (Warning)

**File**: `claws-sdk/src/protect/identity.ts:143-148`
**What**: `verifyPkce` compares `expected === codeChallenge` using JavaScript's `===` operator. PKCE code challenges are security-sensitive values. While PKCE timing attacks are less practical than HMAC timing attacks (the verifier is single-use), this sets a bad pattern in a security module that other contributors will copy.

**Fix**: Use `crypto.timingSafeEqual` for the comparison, consistent with the security posture this module is establishing. The `secrets.ts` module already uses `crypto` -- the import is available.

---

### W-06: Self-signed certificate check fails open (Warning)

**File**: `claws-sdk/src/protect/identity.ts:403-408`
**What**: The `checkSelfSigned` function catches all exceptions and returns `false` (not self-signed). This means a malformed certificate that fails ASN.1 parsing is treated as CA-signed and passes validation. An attacker could craft a deliberately malformed certificate that bypasses the self-signed check.

**Why it matters**: This is the enterprise SAML path. Enterprise customers configure SAML precisely because they want strong identity guarantees. A parsing failure should be treated as suspicious, not permissive.

**Fix**: On parse failure, return `true` (treat as potentially self-signed) or throw. Fail closed, not open.

---

### W-07: `secrets get` outputs bare value to stdout in non-JSON mode (Warning)

**File**: `claws-cli/src/commands/protect.ts:209-210`
**What**: `claws protect secrets get API_KEY` prints the raw secret value to stdout with `console.log(value)`. While this is useful for piping (`claws protect secrets get KEY | xargs ...`), it means a casual `claws protect secrets get KEY` in a terminal dumps the secret on screen with no warning. There's no `--quiet` or `--reveal` flag to control this.

**Why it matters**: The community includes developers who will screenshot their terminal or share recordings. An accidental reveal is a security incident. Compare: `gh auth token` prints a warning before showing the token.

**Fix**: Print a masked value by default (`API_KEY = ****`), with `--reveal` or `--raw` flag to print the actual value. The `--json` mode can continue to include the value since it's typically piped to `jq`.

---

### N-01: `IdentityConfig` in types.ts is unused / diverges from `FullIdentityConfig` (Note)

**File**: `claws-sdk/src/protect/types.ts:66-75`
**What**: The `IdentityConfig` interface in `types.ts` has `issuer`, `clientId`, and `roleMapping: Record<string, string>` -- but the actual implementation uses `FullIdentityConfig` from `identity.ts` which has `provider`, optional `oidc`/`saml` sub-objects, and `roleMapping: Record<string, TrustTier>`. The `types.ts` version is imported in `identity.ts` but never actually used as a function parameter or return type. The `index.ts` barrel exports both types, creating confusion about which is canonical.

**Fix**: Remove `IdentityConfig` from `types.ts` or align it with `FullIdentityConfig`. Having two identity config types -- one correct and one stale -- will confuse contributors.

---

### N-02: Registry client `publishToRegistry` does not validate endpoint URL (Note)

**File**: `claws-sdk/src/publish/registry-client.ts:230`
**What**: The `publishToRegistry` function constructs `${credentials.endpoint}/v1/packages` and passes it to `fetch`. If `credentials.endpoint` contains a trailing slash or is not a valid URL, the fetch will fail with an unhelpful error. No URL validation or normalization is performed.

**Fix**: Normalize the endpoint (strip trailing slashes) and validate it's a URL before calling fetch. Print a clear error: "Invalid registry endpoint: ..." rather than the raw fetch error.

---

### N-03: Doctor checks not wired into the orchestrator index (Note)

**File**: `claws-sdk/src/doctor/checks/index.ts` (not in diff), `claws-sdk/src/doctor/checks/vault-kdf.ts`, `claws-sdk/src/doctor/checks/key-colocation.ts`
**What**: Both `vault-kdf` and `key-colocation` doctor checks are new files. The diff shows changes to `claws-sdk/src/doctor/checks/index.ts` -- need to confirm these are properly registered in the doctor orchestrator so `claws doctor` actually runs them. If they're only exported but not registered, the checks exist as dead code.

**Fix**: Verify that `checkVaultKdf` and `checkKeyColocationDoctor` are in the orchestrator's check registry. If not, add them.

---

### N-04: `protect` description is too vague for discoverability (Note)

**File**: `claws-cli/src/cli.ts:514`
**What**: The protect command group's description is "Security and budget management". This doesn't communicate the three distinct capabilities (budget tracking, encrypted secrets vault, SSO/identity). Users scanning `claws --help` won't know protect includes secrets or identity management.

**Fix**: Change to: `Budget tracking, encrypted secrets vault, and SSO identity management` -- or at minimum `Security: budget tracking, secrets, and identity`. This is the product's enterprise differentiator; it deserves a description that sells.

---

## Summary

| Severity | Count | Must-fix |
|----------|-------|----------|
| Major | 3 | Yes |
| Warning | 7 | Recommended |
| Note | 4 | Optional |

**What works well**: The SDK/CLI separation is clean -- `protect.ts` is a pure adapter with no business logic. The secrets vault crypto is solid (AES-256-GCM, Argon2id with scrypt fallback, per-entry IVs, passphrase entropy validation). The type surface in `types.ts` is well-designed with clear boundaries. Budget tracking from the audit chain is a smart design -- no new telemetry required. The doctor checks for vault KDF and key co-location are the kind of proactive security guidance that makes claws feel like it's on the user's side.

**What needs work**: The three Majors all concern the same theme: **the protect surface doesn't yet meet the bar for a security feature that enterprises will evaluate**. Process-visible passphrases (M-01), invisible command group (M-02), and unidentifiable fleet workspaces (M-03) are the gaps between "feature works" and "feature ships." The Warnings are mostly hardening -- the kind of work that earns trust during a security review.

**Founder test**: "Would I want this in my agent?" -- Yes, budget tracking and the secrets vault are genuinely useful for the community, not just enterprise funnels. "Can the user uninstall this?" -- Yes, `rm -rf .claws/secrets` removes the vault cleanly. "Does the generated code look like something our community would write?" -- The protect module feels native to the OC ecosystem. Fix the Majors and this is a strong CP-1.
