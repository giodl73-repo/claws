# Compliance Evidence Examples

SOC2, HIPAA, EU AI Act artifacts, audit chains, and governance badges.

## SOC2 Evidence Generation

```bash
claws comply --framework soc2
```

```
SOC2 Type II Evidence: support-workspace

  Control CC6.1 (Access Control):
    ✓ Tool classifications present (15 tools)
    ✓ Permission tiers configured (T0-T4)
    ✓ OBO boundaries declared (3 skills)
    Evidence: .claws/compliance/soc2/CC6.1-access-control.json

  Control CC7.2 (Change Management):
    ✓ Audit chain intact (1,247 entries)
    ✓ Governance rebuild on change (claws build)
    ✓ Version history tracked (HISTORY.yaml)
    Evidence: .claws/compliance/soc2/CC7.2-change-management.json

  Control CC8.1 (Monitoring):
    ✓ Real-time watch configured
    ✓ Alert routing active
    Evidence: .claws/compliance/soc2/CC8.1-monitoring.json

  All 12 controls covered. Evidence generated.
```

## HIPAA Evidence

```bash
claws comply --framework hipaa
```

```
HIPAA Security Rule: patient-intake-workspace

  Administrative Safeguards:
    ✓ Access controls (T0-T4 tiers)
    ✓ Workforce training (L1 advisory content)
    ✓ Audit controls (chain.jsonl, HMAC-verified)

  Technical Safeguards:
    ✓ PHI tools classified R4+ (3 tools)
    ✓ Encryption at rest (.claws/vault/)
    ✓ Transmission security (MCP trust gates)
```

## EU AI Act Assessment

```bash
claws assess --framework eu-ai-act
```

```
EU AI Act Article 6 / Annex III Assessment:

  Risk Classification: LIMITED
  Reason: System assists human decisions, does not make autonomous
          high-risk determinations (healthcare, legal, financial)

  Transparency Requirements:
    ✓ System identified as AI to users
    ✓ Capabilities and limitations documented
    ✗ MISSING: Human oversight mechanism documented
    
  Recommended: Add human-oversight section to SOUL.md
```

## Audit Chain Verification

```bash
claws audit verify
```

```
Chain: .claws/audit/chain.jsonl
  Entries:    1,247
  Algorithm:  HMAC-SHA256
  Signing:    Ed25519
  First:      2026-03-01T08:00:00Z
  Last:       2026-04-12T14:32:00Z
  Status:     VALID ✓

  Breakdown:
    tool-calls:   892 (71.5%)
    governance:   234 (18.8%)
    lifecycle:     89 (7.1%)
    bypass:         2 (0.2%)
    admin:         30 (2.4%)
```

## Governance Badge Progression

```
DECLARED ─────────────────────────────────────────
  ✓ Risk level declared in frontmatter
  ✓ OBO boundary declared
  ✓ Data classification declared
  Badge: [DECLARED: R2 | no-obo | INTERNAL]

TYPED ────────────────────────────────────────────
  ✓ All DECLARED requirements
  ✓ @bic/claws-skill-kit used
  ✓ Type-safe handler (skill() factory)
  Badge: [TYPED: R2 | no-obo | INTERNAL | typed]

VERIFIED ─────────────────────────────────────────
  ✓ All TYPED requirements
  ✓ Signed manifest (SHA-256 + Ed25519)
  ✓ Dependency audit (npm audit + license scan)
  Badge: [VERIFIED: R2 | no-obo | INTERNAL | signed]
```

## Three-Tier Adoption Assessment

```bash
claws assess --tier
```

```
Tier: support-workspace

  Skill               DECLARED  TYPED  VERIFIED
  triage-ticket       ✓         ✓      ✓
  draft-response      ✓         ✓      ✗ (unsigned)
  lookup-customer     ✓         ✓      ✗ (unsigned)
  send-email          ✓         ✗      ✗ (no skill-kit)
  handle-pii          ✓         ✗      ✗ (no skill-kit)

  Overall tier: DECLARED (5/5 declared, 3/5 typed, 1/5 verified)
```
