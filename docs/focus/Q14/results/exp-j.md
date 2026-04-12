# Experiment J: Platform & Ecosystem

**Unit**: clawdbot-tools (37), git-and-github (159), apple-apps-and-services (44), ios-and-macos-development (29), smart-home-and-iot (43), moltbook (44)
**Total skills**: 356

---

## Governance Angle

### Risk Classification Defaults

| Sub-group | Default Risk | Count (est.) | Rationale |
|---|---|---|---|
| Git operations (read) | **R2 READ** | ~40 | Read repos, PRs, issues |
| Git operations (write) | **R4 EXECUTE** | ~60 | Push, merge, create PRs |
| Apple apps (read) | **R2 READ** | ~15 | Read contacts, photos, notes |
| Apple apps (write) | **R4 EXECUTE** | ~20 | Create notes, reminders, calendar events |
| Apple system control | **R4 EXECUTE** | ~10 | Control apps, Shortcuts, TTS |
| iOS/macOS dev tools | **R3 TRANSFORM** | ~20 | Development tooling |
| Smart home (read) | **R2 READ** | ~10 | Read device status |
| Smart home (control) | **R4 EXECUTE** | ~30 | **Physical world access** |
| Moltbook social | **R3 TRANSFORM** | ~25 | Social network for agents |
| Moltbook security | **R3 TRANSFORM** | ~10 | Agent security tools |
| Platform meta-tools | **R3 TRANSFORM** | ~20 | Skill management, MCP tools |
| Blockchain/crypto (misplaced) | **R5 TRANSACT** | ~30 | Trading, wallet management |

### Key Governance Risks

1. **Git push = irreversible**: `auto-pr-merger`, `alex-session-wrap-up` (commit + push), `conventional-commits`. Git push to main/production is **R4 EXECUTE with confirmation gate**.

2. **Apple OBO**: Apple apps integration enables OBO without user awareness:
   - `apple-mail` / `apple-mail-search` -- read email (OBO-EMAIL-READ)
   - `apple-reminders` -- create reminders (OBO-CALENDAR)
   - `apple-notes` -- create/modify notes
   - `apple-contacts` -- read contacts (PII-CONTACT)
   - `apple-find-my-local` / `findmy-location` -- **track location** (PII-LOCATION, CRITICAL)
   - `apple-photos` -- access photos (PII-MEDIA)
   - `imessage-signal-analyzer` -- analyze message history (PII-COMMUNICATION)
   - `healthkit-sync` -- health data (PHI)
   - `shortcuts-generator` -- create iOS shortcuts (code execution)

3. **Smart home = physical world**: IoT skills cross from digital to physical:
   - `anova-oven` -- control oven temperature (SAFETY-PHYSICAL)
   - `control-ikea-lightbulb`, `govee-lights`, `wiz-light-control` -- control lights
   - `homeassistant-cli`, `glitch-homeassistant` -- full Home Assistant control
   - `frigate` -- NVR camera access (PRIVACY-SURVEILLANCE)
   - `nest-sdm` -- thermostat + doorbell + cameras
   - `lg-thinq` -- control LG appliances
   - `ipcam` -- PTZ camera control
   - `dyson-cli` -- air purifier/fan control
   - `bambu-cli`, `bambu-local` -- 3D printer control (physical manufacturing)
   - `icom-7610` -- radio transceiver control

4. **Moltbook social engineering**: Agent-to-agent social networks can spread adversarial skills:
   - `moltbook`, `moltbook-interact` -- social posting
   - `whisper` -- "end-to-end encrypted agent-to-agent private messaging via dead drops"
   - `moltlang` -- "compact symbolic language for AI-to-AI communication"
   - `moltysmind` -- "collective AI knowledge layer with blockchain-verified voting"

### Physical World Access Policy

```yaml
physical-world-policy:
  smart_home_control:
    risk: R4
    gate: user_confirm
    safety_categories:
      heating:
        max_temp: 30C  # prevent overheating
        confirm: always
      kitchen:
        confirm: always  # ovens, appliances
        timeout: 30min  # auto-shutoff
      cameras:
        privacy: blur_faces_by_default
        recording: requires_consent
      locks:
        confirm: double_confirm
        audit: enhanced
      lights:
        confirm: optional  # low risk
      
  3d_printing:
    risk: R4
    gate: user_confirm
    fire_safety: true
    material_check: true
```

### Git Push Policy

```yaml
git-push-policy:
  branches:
    main:
      risk: R4
      gate: user_confirm
      requires: pr_review  # never push directly
    production:
      risk: R5
      gate: double_confirm
      requires: [pr_review, ci_pass]
    feature:
      risk: R3
      gate: optional
      
  actions:
    force_push:
      forbidden: true  # never
      override: requires_admin
    delete_branch:
      risk: R3
      gate: user_confirm
    merge:
      risk: R4
      gate: user_confirm
```

### Replace / Complement / Enable Matrix

| Skill | Relationship | Notes |
|---|---|---|
| `clauditor` | **COMPLEMENT** | "Tamper-resistant audit watchdog for Clawdbot agents" |
| `clawdbot-security-check` | **COMPLEMENT** | "Comprehensive read-only" security check |
| `moltbot-security` | **COMPLEMENT** | "Security hardening guide for AI agents" |
| `agentgate` | **ENABLE** | "API gateway with human-in-the-loop write approval"; uses @claws/obo |
| `arc-security-audit` | **COMPLEMENT** | "Comprehensive security audit for agent's full skill stack" |
| `arc-trust-verifier` | **ENABLE** | "Verify skill provenance and build trust scores"; uses @claws/trust |
| `capability-graph-mapper` | **ENABLE** | "Map composite permission surface"; uses @claws/classify |
| `capability-scope-expansion-watcher` | **ENABLE** | "Detect incremental scope expansion"; uses @claws/audit |
| `runtime-attestation-probe` | **ENABLE** | "Validate runtime matches attestation"; uses @claws/verify |
| `commit-analyzer` | **COMPLEMENT** | "Analyzes git commit patterns to monitor autonomous" agents |

---

## Maker Angle

### @claws/identity for Authentication

Platform skills need standardized auth:

```typescript
import { PlatformAuth } from '@claws/identity';

const auth = new PlatformAuth({
  platform: 'apple',
  scopes: ['calendar.read', 'reminders.write'],
  consent: 'per-scope',
  audit: true
});

// Auth flow with granular consent
const token = await auth.authorize();
```

### @claws/iot for Smart Home Governance

```typescript
import { SmartHomeGovernor } from '@claws/iot';

const governor = new SmartHomeGovernor({
  platform: 'homeassistant',
  safety: {
    max_temp: 30,
    auto_shutoff: '30m',
    camera_blur: true,
    lock_double_confirm: true
  }
});

// Governed device control
await governor.control('living-room-thermostat', {
  action: 'set_temperature',
  value: 22,
  // Automatically checks safety limits and requests confirmation
});
```

### Templates for Platform Skills

| Template | Description |
|---|---|
| `skill-git-automator` | Git operations with branch protection and push confirmation |
| `skill-apple-integration` | Apple app integration with per-scope consent |
| `skill-smart-home` | Smart home control with safety limits and confirmation |
| `skill-social-agent` | Agent social network skill with content policy |
| `skill-iot-sensor` | IoT sensor reading with privacy labels |
| `skill-platform-connector` | Generic platform connector with @claws/identity |

### Key Maker Recommendations

1. **Per-scope consent**: `@claws/identity` enforces granular consent for Apple/Google/Microsoft
2. **Physical safety limits**: `@claws/iot` enforces temperature, timing, and safety bounds
3. **Git protection**: `@claws/git` prevents force-push, requires PR for main
4. **Camera privacy**: `@claws/iot/camera` blurs faces by default
5. **Agent social policy**: `@claws/social` rate-limits agent-to-agent communication

---

## Summary Statistics

- Total skills analyzed: 356
- R2 READ skills: ~65 (18%)
- R3 TRANSFORM skills: ~95 (27%)
- R4 EXECUTE skills: ~130 (37%)
- R5 TRANSACT skills: ~30 (8%)
- Physical world skills: ~43 (12%)
- Apple OBO skills: ~15 (4%)
- Git push skills: ~60 (17%)
- Agent social network skills: ~44 (12%)
- claws REPLACE: 0 | COMPLEMENT: 5 | ENABLE: 5
