# Experiment F: Browser & Automation

**Unit**: browser-and-automation (322)
**Total skills**: 322

---

## Governance Angle

### Risk Classification: Uniformly High

Browser automation is the **highest-risk category** in the ecosystem. Every skill that controls a browser can:
- Navigate to arbitrary URLs (injection surface)
- Read/modify page content (data exfiltration)
- Submit forms (OBO actions)
- Execute JavaScript (arbitrary code)

| Sub-group | Default Risk | Count (est.) | Rationale |
|---|---|---|---|
| Headless browser control | **R4 EXECUTE** | ~40 | Full browser control, form submission |
| Web scraping | **R3 TRANSFORM** | ~60 | Content extraction with injection risk |
| Form filling/automation | **R4 EXECUTE** | ~30 | Submit forms on user's behalf |
| Shopping/checkout | **R5 TRANSACT** | ~25 | Purchase actions |
| Social media automation | **R4 EXECUTE** | ~35 | Post, reply, engage on platforms |
| CRM/SaaS automation | **R4 EXECUTE** | ~30 | Manage external services |
| Desktop automation | **R4 EXECUTE** | ~15 | Mouse/keyboard control |
| Data extraction | **R2 READ** | ~40 | Read-only page scraping |
| Financial/trading | **R5 TRANSACT** | ~30 | Execute trades via browser |

### Injection Risk Census

**CRITICAL**: Browser skills are the primary vector for indirect prompt injection. Web pages can contain adversarial instructions that hijack the agent.

High-injection-risk skills:
- `Agent Browser`, `agent-browser` (2 variants) -- full headless browser
- `browser-use` -- "spin up cloud browsers for Clawdbot"
- `camoufox` -- "anti-detect browser automation" (explicitly evades detection)
- `grok-browser` -- "Query Grok AI via browser automation"
- `cdp-browser` -- "CDP browser control at localhost:9222"
- `mcp-chrome` -- "Control Chrome browser with AI"
- `autofillin` -- "Automated web form filling and file uploading"
- `amazon-shopper` -- "Buy and return items on Amazon using browser automation"
- `nova-act` -- "AI-powered browser automation tasks like flight [booking]"
- `multilogin`, `multiloginx` -- "manage Multilogin X browser profiles" (anti-fingerprint)

### OBO Actions via Browser

Many browser skills perform OBO without declaring it:
- `amazon-shopper` -- OBO-PURCHASE (buy items)
- `checkers-sixty60` (shopping) -- OBO-PURCHASE via browser
- `ds160-autofill` -- OBO-FORM (fill US visa applications!)
- `instagram-scraper` -- OBO-SOCIAL (scrape profiles)
- `line-oa` -- OBO-MESSAGE (operate LINE Official Account)
- `meta-fb-inbox` -- OBO-MESSAGE (check Facebook inbox)
- `comonyx-admin` -- OBO-ADMIN (sign into Cosmonyx, fetch companies, export)

### Key Governance Risks (Ranked)

1. **Indirect prompt injection** (CRITICAL): Web content can hijack agent behavior. Every browser skill is an injection surface.
2. **Anti-detection evasion** (HIGH): `camoufox`, `multilogin` explicitly bypass bot detection. These need R4+ with explicit user consent.
3. **Credential theft** (HIGH): Browser automation can read cookies, tokens, passwords from pages.
4. **Form submission without consent** (HIGH): `autofillin`, `ds160-autofill` submit forms -- including legal documents.
5. **Purchase without confirmation** (CRITICAL): `amazon-shopper` buys items. Must be R5 TRANSACT with double confirmation.

### Mandatory Policy Rules for Browser Skills

```yaml
browser-skill-policy:
  # All browser skills must:
  injection_defense:
    strip_instructions: true
    sandbox_javascript: true
    max_page_length: 50000
    
  # Form submission requires confirmation
  form_submission:
    risk: R4
    gate: user_confirm
    preview: true  # show form contents before submitting
    
  # Purchases require double confirmation
  purchase:
    risk: R5
    gate: double_confirm
    budget_check: true
    
  # Anti-detect tools need explicit consent
  anti_detect:
    risk: R4
    requires: explicit_user_consent
    audit: enhanced  # log all actions
    
  # Credential pages are forbidden by default
  credential_pages:
    forbidden: ['/login', '/signin', '/password', '/oauth']
    override: requires_policy_exception
```

### Replace / Complement / Enable Matrix

| Skill | Relationship | Notes |
|---|---|---|
| `agentaudit`, `agentaudit-skill` | **COMPLEMENT** | Package security gate; feeds into claws G-SUPPLY |
| `skill-cleaner` (communication cat.) | **COMPLEMENT** | Verify suspicious skills via VirusTotal |
| `flaresolverr` | **ENABLE** | Bypass Cloudflare; needs @claws/security clearance |
| `capmonster`, `2captcha` | **ENABLE** | CAPTCHA solving; needs @claws/policy for ethical use |

---

## Maker Angle

### @claws/security for Input Sanitization

This is the #1 maker need for browser skills:

```typescript
import { BrowserSanitizer } from '@claws/security';

const sanitizer = new BrowserSanitizer({
  strip_instructions: true,
  strip_scripts: true,
  strip_iframes: true,
  max_content_length: 50000,
  allowed_domains: ['example.com'],
  forbidden_paths: ['/login', '/oauth']
});

// Sanitize page content before passing to LLM
const safePage = sanitizer.sanitize(rawPageContent);
```

### @claws/browser for Governed Browser Access

```typescript
import { GovernedBrowser } from '@claws/browser';

const browser = new GovernedBrowser({
  policy: 'enterprise-standard',
  injection_defense: 'aggressive',
  form_gate: 'user-confirm',
  purchase_gate: 'double-confirm',
  audit: true
});

// All page navigation is policy-checked
await browser.navigate('https://example.com');
const content = await browser.getContent(); // sanitized
```

### Templates for Browser Skills

| Template | Description |
|---|---|
| `skill-web-scraper` | Read-only scraping with injection defense |
| `skill-form-filler` | Form automation with preview + confirmation gate |
| `skill-shopper` | Purchase automation with R5 budget enforcement |
| `skill-social-automator` | Social media automation with rate limits and OBO declaration |
| `skill-saas-connector` | SaaS integration with credential sandboxing |

### Key Maker Recommendations

1. **Mandatory sanitization**: Every browser skill must use `@claws/security/BrowserSanitizer`
2. **Navigation allowlist**: Skills declare which domains they access; policy rejects unlisted
3. **Form preview**: All form submissions show preview before submitting
4. **Credential isolation**: Browser sessions cannot access `/login` paths without policy exception
5. **Anti-detect disclosure**: Skills using anti-detection must declare it in skill manifest

---

## Summary Statistics

- Total skills analyzed: 322
- R4 EXECUTE skills: ~150 (47%)
- R5 TRANSACT skills: ~55 (17%)
- R2-R3 (read/scrape only): ~117 (36%)
- Injection risk surface: 322 (100%) -- all browser skills
- High injection risk: ~40 (12%)
- OBO-crossing (undeclared): ~30 (9%)
- Anti-detection skills: 3 (CRITICAL governance concern)
