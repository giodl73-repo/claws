# Compliance and Auditing

Generate compliance artifacts, verify audit chains, and manage governance badges.

## Generate Compliance Artifacts

Produce compliance evidence for SOC2, HIPAA, or EU AI Act:

```bash
claws comply --framework soc2
claws comply --framework hipaa
claws comply --framework eu-ai-act
```

Each framework generates structured evidence: control mappings, temporal proof of governance enforcement, and artifact manifests. Output goes to `.claws/compliance/`.

## Verify Audit Chains

The audit chain is an append-only HMAC hash chain. Verify chain integrity:

```bash
claws audit verify
```

```
Audit chain: .claws/audit/chain.jsonl
  Entries: 1,247
  First:   2026-03-01T08:00:00Z
  Last:    2026-04-12T14:32:00Z
  Chain:   VALID (all HMAC hashes verified)
  Gaps:    0
```

If verification fails, the output identifies the exact entry where the chain broke.

## Configure Governance Badges

Published skills receive governance badges on ClawHub. Badge tiers:

| Tier | Badge | Requirements |
|------|-------|-------------|
| DECLARED | Risk + OBO + classification | Frontmatter present |
| TYPED | + type-safe handler | `@bic/claws-skill-kit` used |
| VERIFIED | + signed manifest + dependency scan | `claws publish` |

Graduate from DECLARED to VERIFIED:

1. Add `@bic/claws-skill-kit` as a peer dependency
2. Use the `skill()` factory or typed decorators
3. Run `claws publish` for signed manifest generation

## Set Up Tier Adoption

Track your workspace's adoption tier:

```bash
claws assess --tier
```

```
Tier assessment: support-workspace
  DECLARED: 12/12 skills  ✓
  TYPED:    8/12 skills   (4 need @bic/claws-skill-kit migration)
  VERIFIED: 6/12 skills   (6 need signed publish)

  Overall: DECLARED
  Next:    Migrate 4 skills to @bic/claws-skill-kit for TYPED tier
```

## Next Steps

- [Security and Classification](security-classification.md) -- tool classification
- [Platform Ecosystem](platform-ecosystem.md) -- packages and shared libraries
