# Experiment D: Infrastructure & Cloud

**Unit**: devops-and-cloud (392), self-hosted-and-automation (32)
**Total skills**: 424

---

## Governance Angle

### Risk Classification Defaults

| Sub-group | Default Risk | Count (est.) | Rationale |
|---|---|---|---|
| Cloud provider CLI (AWS, Azure, GCP) | **R4 EXECUTE** | ~60 | Create/destroy infrastructure |
| Container management (Docker, K8s) | **R4 EXECUTE** | ~30 | Container lifecycle |
| Deployment skills | **R4 EXECUTE** | ~40 | Push code to production |
| Monitoring/observability | **R2 READ** | ~50 | Read-only metrics |
| Secret management (vault, keys) | **R3 TRANSFORM** | ~20 | Read/rotate secrets |
| Self-hosted automation | **R4 EXECUTE** | ~32 | Server-side operations |
| CI/CD pipelines | **R4 EXECUTE** | ~25 | Build and deploy |
| DNS/Networking | **R4 EXECUTE** | ~20 | DNS changes, firewall rules |
| Financial/trading (misplaced) | **R5 TRANSACT** | ~40 | Crypto, trading bots |

### Key Governance Risks

1. **Irreversible infrastructure**: `aws-infra`, `azure-infra`, `hcloud` can create/destroy VMs, databases, networks. Confirmation gates mandatory.
2. **Secret exposure**: `azure-keyvault-py`, `agentkeys`, `agentmemory` handle credentials. Data labels: SECRET.
3. **Cost explosion**: Cloud provisioning without budget limits. Skills like `aws-ecs-monitor` read, but `awscli` writes.
4. **DNS takeover**: `cf-manager`, `cloudflare-guard`, `gandi-skill` modify DNS records = R4 with domain-specific confirmation.
5. **Deployment without review**: `appdeploy`, `laravel-forge` deploy directly = R4, should require review gate.

### Confirmation Gate Requirements

```
INFRA-CREATE:
  trigger: "create", "provision", "deploy", "launch"
  elicit:
    - resource: "What resource type?"
    - region: "Which region?"
    - cost_estimate: "Estimated cost: [X]/month"
  gate: user_confirm + cost_ack

INFRA-DESTROY:
  trigger: "destroy", "delete", "terminate"
  elicit:
    - resource: "Which resource?"
    - impact: "This will delete [resource]. Data loss: [yes/no]"
  gate: double_confirm

DNS-MODIFY:
  trigger: "add record", "change DNS", "update zone"
  elicit:
    - domain: "Which domain?"
    - record: "Record type and value?"
    - propagation: "Changes propagate in ~5 minutes"
  gate: user_confirm
```

### OBO Boundary Map

- `email-manager-ai`, `email-processor`, `email-resend` -- OBO-EMAIL in a DevOps context
- `calcom`, `caldav-cli`, `caldav-skill`, `calmly` -- OBO-CALENDAR
- `autoresponder` -- OBO-MESSAGE (auto-respond to iMessage/SMS)
- `deploydevnlu` -- OBO via Slack ("Deploy via Slack natural language")

### Replace / Complement / Enable Matrix

| Skill | Relationship | Notes |
|---|---|---|
| `agent-self-governance` | **REPLACE** | WAL + VBR protocol; claws generates this from policy |
| `aegis-audit` | **COMPLEMENT** | Deep behavioral audit; claws adds policy-level gates |
| `aiclude-security-scan` | **COMPLEMENT** | MCP/skill vulnerability scanning; feeds into claws G-SUPPLY |
| `agentguard` | **COMPLEMENT** | Security monitoring; runtime complement to claws compile-time |
| `agentos-sdk` | **ENABLE** | Accountability infrastructure; uses @claws/audit |
| `ai-act-risk-check` | **ENABLE** | EU AI Act risk assessment; uses @claws/classify |
| `depguard` | **COMPLEMENT** | Dependency audit + license compliance; complements G-SUPPLY |
| `credence` | **COMPLEMENT** | MCP trust registry; feeds into claws trust model |
| `courtroom` | **ENABLE** | AI behavioral oversight; uses @claws/audit for evidence |

---

## Maker Angle

### @claws/schema for Infra Config Validation

```typescript
import { validateInfraConfig } from '@claws/schema';

// Validates Terraform, CloudFormation, Pulumi configs
const result = validateInfraConfig(config, {
  policy: 'enterprise-standard',
  budget: { monthly_max: 5000 },
  regions: ['us-east-1', 'eu-west-1'],
  forbidden: ['p3.16xlarge'] // no GPU instances without approval
});
```

### @claws/audit for Infrastructure Changes

Every infrastructure change should be logged:

```typescript
import { auditInfraChange } from '@claws/audit';

await auditInfraChange({
  action: 'create',
  resource: 'aws:ec2:instance',
  region: 'us-east-1',
  cost_estimate: 45.60,
  approved_by: 'user:giodl',
  policy_version: 'v2.1'
});
```

### Templates for Infra Skills

| Template | Description |
|---|---|
| `skill-cloud-provisioner` | Cloud resource creation with cost gates and confirmation |
| `skill-deploy-pipeline` | Deployment skill with review gate and rollback plan |
| `skill-dns-manager` | DNS modification with propagation warning and confirmation |
| `skill-secret-rotator` | Secret rotation with vault integration and audit trail |
| `skill-monitoring-reader` | Read-only monitoring with alert thresholds |

### Key Maker Recommendations

1. **Cost estimation library**: `@claws/cost` estimates resource costs before provisioning
2. **Rollback primitives**: `@claws/rollback` provides undo capability for infrastructure changes
3. **Drift detection**: `@claws/drift` compares actual state vs declared policy
4. **Multi-cloud policy**: Templates for AWS, Azure, GCP with consistent governance

---

## Summary Statistics

- Total skills analyzed: 424
- R4 EXECUTE skills: ~207 (49%)
- R5 TRANSACT skills: ~40 (9%) -- mostly misplaced crypto/trading
- OBO-crossing: ~10 (2.4%)
- Confirmation gates needed: ~200 (47%)
- claws REPLACE: 1 | COMPLEMENT: 5 | ENABLE: 3
