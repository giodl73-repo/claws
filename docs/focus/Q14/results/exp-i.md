# Experiment I: Personal & Lifestyle

**Unit**: health-and-fitness (84), personal-development (51), notes-and-pkm (69), gaming (35)
**Total skills**: 239

---

## Governance Angle

### Risk Classification Defaults

| Sub-group | Default Risk | Count (est.) | Rationale |
|---|---|---|---|
| Health tracking (Fitbit, Garmin, Oura) | **R2 READ** | ~30 | Read health data |
| Health logging (calories, fasting) | **R3 TRANSFORM** | ~15 | Write personal health records |
| Mental health support | **R3 TRANSFORM** | ~8 | Provide guidance; sensitivity required |
| Fitness coaching | **R2 READ** | ~10 | Training plans, read-only |
| Personal notes/memory | **R3 TRANSFORM** | ~40 | Store personal data |
| Knowledge management | **R3 TRANSFORM** | ~20 | Organize knowledge bases |
| Self-improvement | **R2 READ** | ~15 | Guidance and tracking |
| Gaming | **R2 READ** | ~25 | Play games, social interaction |
| Financial tracking (personal) | **R3 TRANSFORM** | ~10 | Expense tracking |
| Crypto/trading (misplaced) | **R5 TRANSACT** | ~15 | Trading bots in health/PKM categories |

### Data Sensitivity: PHI and PII Dominant

This unit handles the **most sensitive personal data** in the ecosystem.

| Label | Description | Skills |
|---|---|---|
| **PHI** (Protected Health Info) | Medical data, biometrics, diagnoses | `fitbit`, `garmin-health`, `oura-analytics`, `health-sync`, `gevety`, `apple-health-skill`, `huckleberry` (baby data!) |
| **PHI-MENTAL** | Mental health data | `anxiety-relief`, `depression-support`, `sauna-calm`, `zenplus-health` |
| **PII-BIOMETRIC** | Biometric data | `fitbit` (heart rate, SpO2), `garmin-cli` (VO2 max), `soft-pillow` (sleep data) |
| **PII-FINANCIAL** | Personal finances | `finance-skill`, `ezbookkeeping`, `shelter`, `nova-net-worth` |
| **PII-LOCATION** | Movement data | `garmin-health` (GPS tracks), `geomanic` |
| **PII-RELATIONSHIP** | Relationship data | `personal-friends`, `personal-love`, `hinge-profile-optimizer`, `memepickup-wingman` |
| **PII-CHILD** | Child data | `huckleberry` (baby sleep, feeding, diapers) -- COPPA applies |
| **PII-DIETARY** | Dietary/religious | `islamic-skills` (prayer, fasting), `jadwal-sholat`, `feast` |

### HIPAA Template for Health Skills

```yaml
hipaa-health-skill-policy:
  data_classification:
    - type: PHI
      retention: 7_years  # HIPAA minimum
      encryption: at_rest_and_transit
      access: user_only
      
  consent:
    required: true
    granularity: per_data_type
    revocable: true
    
  audit:
    all_access: true
    all_modifications: true
    retention: 6_years
    
  data_minimization:
    collect_only: declared_types
    purpose_limitation: true
    
  breach_notification:
    threshold: any_unauthorized_access
    timeline: 72_hours
```

### Key Governance Risks

1. **Baby data without COPPA**: `huckleberry` tracks "baby sleep, feeding, diapers, and growth." Child data requires COPPA compliance. No current governance.
2. **Mental health without safeguards**: `depression-support`, `anxiety-relief` provide "daily support" with no crisis escalation protocol. **Must include crisis hotline and escalation.**
3. **Health data retention**: Health tracking skills persist biometric data indefinitely. HIPAA requires encryption at rest, access controls, and retention policies.
4. **Intimate data**: `intimate-wellbeing` provides "guidance on intimate wellbeing and sexual performance." High sensitivity, requires explicit opt-in.
5. **Religious data**: `islamic-skills`, `jadwal-sholat`, `daily-devotion` handle religious practices. Protected under GDPR Article 9 (special categories).
6. **Dating/relationship data**: `hinge-profile-optimizer`, `memepickup-wingman` analyze dating profiles. PII-RELATIONSHIP label required.

### Replace / Complement / Enable Matrix

| Skill | Relationship | Notes |
|---|---|---|
| `shieldcortex-skill` | **COMPLEMENT** | Memory with anti-poisoning; complements claws data labels |
| `publish-guard` | **COMPLEMENT** | Pre-publication verification; complements claws content policy |
| `failure-memory` | **ENABLE** | Error-to-rule learning; uses @claws/audit patterns |
| `agent-wal` | **ENABLE** | Write-ahead log; uses @claws/audit for state persistence |
| `tribe-protocol` | **COMPLEMENT** | Trust lookup for interactions; complements claws trust model |

---

## Maker Angle

### @claws/data for Sensitive Personal Data

```typescript
import { PersonalDataStore } from '@claws/data';

const store = new PersonalDataStore({
  labels: ['PHI', 'PII-BIOMETRIC'],
  encryption: 'aes-256-gcm',
  retention: '7y',  // HIPAA
  access: 'user-only',
  audit: true
});

// Store health data with automatic labeling
await store.write('heart-rate', {
  bpm: 72,
  timestamp: Date.now(),
  source: 'fitbit'
});

// Reads are audited
const data = await store.read('heart-rate', { range: 'last-7d' });
```

### Mental Health Safety Protocol

```typescript
import { SafetyProtocol } from '@claws/safety';

const protocol = new SafetyProtocol({
  domain: 'mental-health',
  crisis_keywords: ['suicide', 'self-harm', 'hurt myself'],
  escalation: {
    type: 'crisis-hotline',
    number: '988',  // US Suicide Prevention
    message: 'If you are in crisis, please call 988.'
  },
  disclaimers: [
    'I am an AI assistant, not a licensed therapist.',
    'This is not a substitute for professional help.'
  ]
});

// Check every response before sending
const safe = await protocol.check(response);
```

### Templates for Personal Skills

| Template | Description |
|---|---|
| `skill-health-tracker` | Health tracking with PHI labels, encryption, HIPAA template |
| `skill-fitness-coach` | Fitness coaching with disclaimer and data minimization |
| `skill-mental-health` | Mental health support with crisis protocol and escalation |
| `skill-personal-notes` | Personal notes with PII detection and encryption |
| `skill-child-tracker` | Child data tracking with COPPA compliance |
| `skill-diet-tracker` | Dietary tracking with sensitivity for religious restrictions |

### Key Maker Recommendations

1. **PHI auto-labeling**: `@claws/data` detects and labels health data automatically
2. **Crisis escalation**: `@claws/safety` provides mandatory crisis detection for mental health skills
3. **COPPA compliance**: `@claws/data/child` enforces parental consent for child data
4. **Encryption by default**: All personal data encrypted at rest using `@claws/data`
5. **Retention policies**: Auto-enforce data retention limits per data label

---

## Summary Statistics

- Total skills analyzed: 239
- R2 READ skills: ~80 (33%)
- R3 TRANSFORM skills: ~95 (40%)
- R4 EXECUTE skills: ~15 (6%)
- R5 TRANSACT skills: ~15 (6%) -- misplaced crypto/trading
- PHI-handling skills: ~40 (17%)
- PII-handling skills: ~60 (25%)
- Mental health skills (need crisis protocol): 8 (3%)
- Child data skills (need COPPA): 1 (huckleberry)
- Religious data skills: 4 (2%)
- claws REPLACE: 0 | COMPLEMENT: 3 | ENABLE: 2
