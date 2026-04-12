# Experiment C: Security & Governance

**Unit**: security-and-passwords (54)
**Total skills**: 54

---

## Governance Angle

### Complete Skill Audit

Every skill in this category was read and classified. This is the critical category -- these skills are what claws's governance engine either replaces, works alongside, or enables.

### Replace / Complement / Enable Matrix (Full)

#### REPLACE (claws generates from policy)

| Skill | What it does | How claws replaces it |
|---|---|---|
| `clawdstrike` | Security audit and threat model for gateway hosts | `claws pinch` generates threat models from policy IR |
| `clawdstrike-test` | Same as above (test variant) | Same replacement |
| `clawaudit` | Automated security auditing | `claws pinch` + `claws audit` from FE5 audit chain |
| `audit-badge-demo` | Audit badge workflow | claws generates governance badges from policy compliance |
| `page-behavior-audit` | Behavioral audit with hashed policy | claws G-RUNTIME does behavioral policy enforcement |
| `glin-profanity` | Profanity detection and content moderation | claws data-label policy with CONTENT-FILTER rules |

**REPLACE count: 6**

#### COMPLEMENT (works alongside claws)

| Skill | What it does | How it complements claws |
|---|---|---|
| `ggshield-scanner` | Detect 500+ types of hardcoded secrets | Complements claws G-SUPPLY; ggshield handles secret scanning, claws handles policy |
| `1password` | 1Password CLI setup and use | claws delegates secret storage to 1Password; policy says "use vault" |
| `bitwarden`, `bitwarden-vault` | Bitwarden password management | Same complement pattern as 1Password |
| `dashlane` | Dashlane vault access | Same complement pattern |
| `go-security-vulnerability` | Go security vulnerability scanner | Language-specific complement; claws covers policy, this covers Go-specific CVEs |
| `domain-trust-check` | URL phishing/malware check | Complements claws's trust model with real-time domain intelligence |
| `credential-manager` | Security foundation for OpenClaw | Complements claws identity; handles credential lifecycle |
| `hash-toolkit` | Content hashing for dedup | Utility complement; claws uses hashes for audit, this provides primitives |
| `hopeids` | Intrusion detection for agents | Runtime complement to claws's compile-time policy |
| `age-verification` | Age-appropriate content filtering | Domain-specific complement; claws provides framework, this adds age logic |
| `api-security` | Secure API design patterns | Knowledge complement; design patterns that claws codifies into policy |
| `secure-auth-patterns` | Auth patterns (JWT, OAuth2, RBAC) | Knowledge complement; patterns claws generates |
| `safe-encryption-skill` | Encryption with post-quantum support | Crypto complement; claws signs, this encrypts |

**COMPLEMENT count: 13**

#### ENABLE (uses @claws/* libraries)

| Skill | What it does | How @claws/* helps |
|---|---|---|
| `authensor-gateway` | Fail-safe policy gate for marketplace skills | Uses @claws/security as policy engine foundation |
| `clawdefender` (in clawdbot-tools) | Security scanner and input sanitizer | Uses @claws/security for sanitization rules |
| `cifer-sdk` | Quantum-resistant encryption | Uses @claws/security for key management integration |
| `saysigned` | E-signatures for AI agents | Uses @claws/identity for agent identity, @claws/audit for signature trail |
| `xproof` | Certify agent outputs on blockchain | Uses @claws/audit for the certification data |
| `mfa-word` | Secret word challenge before sensitive ops | Uses @claws/security for challenge-response patterns |
| `solid-agent-storage` | W3C Solid identity for agents | Uses @claws/identity for decentralized identity |
| `xpr-agent-operator` | Autonomous agent on trustless registry | Uses @claws/identity for registry interaction |
| `vnsh` | Encrypted expiring file shares | Uses @claws/security for encryption primitives |

**ENABLE count: 9**

#### NOT RELEVANT (misplaced in category)

| Skill | Actual category | Notes |
|---|---|---|
| `breweries` | Fun/utility | Find breweries for humans |
| `countries` | Reference data | Country lookup |
| `harrypotter` | Fun/utility | Harry Potter lookup |
| `starwars` | Fun/utility | Star Wars lookup |
| `devinism` | Social/philosophical | AI religion experiment |
| `facebook` | Social media | Facebook Graph API |
| `feelgoodbot` | Utility | File integrity monitoring |
| `golden-master` | DevOps | Source-of-truth file tracking |
| `google-tasks` | Productivity | Task management |
| `guardian-angel` | Philosophy | Thomistic virtue ethics |
| `liewatch`, `skill-liewatch` | Gaming | Social deduction game |
| `linkswarm-api` | Marketing | Backlink exchange |
| `outtake-bounty-network` | Bounty | Malicious domain bounties |
| `dotnet-expert` | Development | .NET expertise |
| `gandi-skill` | Infrastructure | Domain/DNS management |
| `test-upload2` | Test | Test skill |

**NOT RELEVANT count: 16** (30% of the category is miscategorized)

### Risk Classification

| Sub-group | Default Risk | Count |
|---|---|---|
| Secret management (1Password, Bitwarden, Dashlane) | **R3 TRANSFORM** (read vault) | 5 |
| Security scanning (ggshield, clawdstrike, audit) | **R2 READ** | 8 |
| Identity/signing (saysigned, xproof, solid) | **R4 EXECUTE** | 5 |
| Content filtering (profanity, age) | **R2 READ** | 3 |
| Encryption (cifer, safe-encryption, vnsh) | **R3 TRANSFORM** | 3 |

---

## Maker Angle

### @claws/security as Foundation

The 9 ENABLE skills demonstrate demand for a shared security foundation:

```typescript
import { sanitize, classify, audit } from '@claws/security';

// Skill author writes:
const input = sanitize(rawInput, { rules: 'skill-marketplace' });
const risk = classify(input, { policy: 'default-R3' });
await audit.log({ action: 'skill-install', risk, input });
```

### Security Skill Development Kit

| Component | Purpose | Replaces ad-hoc |
|---|---|---|
| `@claws/security/sanitize` | Input sanitization rules | `clawdefender` manual patterns |
| `@claws/security/classify` | Risk classification engine | `clawdstrike` manual threat models |
| `@claws/security/audit` | Audit trail primitives | `clawaudit` custom logging |
| `@claws/identity/verify` | Agent identity verification | `clawprint-verify` custom verification |
| `@claws/identity/sign` | Output signing | `xproof` custom blockchain signing |

### Templates for Security Skills

| Template | Description |
|---|---|
| `skill-security-scanner` | Scan + report with @claws/security primitives |
| `skill-vault-adapter` | Vault integration (1Password/Bitwarden) with @claws/identity |
| `skill-content-filter` | Content moderation with @claws/security rules |
| `skill-audit-reporter` | Audit report generation from @claws/audit trail |

### Key Finding: Category Pollution

30% of skills in "Security & Passwords" are miscategorized (breweries, Harry Potter, Star Wars, etc.). This suggests:
1. ClawHub categorization is unreliable
2. claws should classify skills by **declared capabilities**, not category tags
3. Governance badges should be capability-based, not category-based

---

## Summary Statistics

- Total skills analyzed: 54
- Correctly categorized: 38 (70%)
- Miscategorized: 16 (30%)
- claws REPLACE: 6 | COMPLEMENT: 13 | ENABLE: 9
- Not relevant: 16
- Governance overlap: 28 of 38 relevant skills (74%) have some claws relationship
