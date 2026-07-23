# SM — Security model (primary spec)

**Absorbs**: CL-02

## Risk tiers

Five tiers, from least-risky to most-risky:

| Tier   | Class                                       | Example                               | Fail-mode      |
| ------ | ------------------------------------------- | ------------------------------------- | -------------- |
| **R1** | Public read                                 | fetch public docs                     | open           |
| **R2** | Tenant read                                 | read own inbox                        | open           |
| **R3** | Tenant write                                | create draft email                    | configurable   |
| **R4** | External write (reversible)                 | post to internal Slack                | configurable   |
| **R5** | External write (irreversible) or restricted | send email, pay money, access secrets | closed (fixed) |

Tier is a property of the TOOL, modified at compile time by
`args_from` chains that propagate uplift (G-CHAIN, see
`policy/specs/POC-compiler.md`).

`effectiveTier = max(declared, args_from-propagated)`. A tool declared
R1 with an `args_from` that includes a RESTRICTED classifier compiles
to effective R5.

## On-Behalf-Of (OBO) boundary

Every tool call carries a `caller: Principal`. The principal can be:

- **End user**: interactive OBO — the user's identity, attested.
- **Service OBO**: service-account token with delegation claim
  (`on_behalf_of: userPrincipal`).
- **Agent**: system identity acting autonomously on its own behalf.

R4 and R5 calls MUST carry user OBO or service OBO — pure agent
identity is not sufficient for external-write tools. This is enforced
at compile time (G-rule: G-24) and at runtime (pre-authorization
policy check).

## A2A governance

Agent-to-agent calls are governed: every A2A invocation is a tool
call under the callee's workspace policy. The caller's workspace
does NOT get to relax the callee's policy — each workspace
compiles its own IR independently.

## 16 injection defence rules

Per CL-02 §5. Categories:

1. **Prompt injection** (I-01 through I-04): instruction-following
   isolation, delimiter escaping, instruction-hierarchy
2. **Tool-argument injection** (I-05 through I-08): schema validation,
   path canonicalization, command-injection detection, SQL escape
3. **Return-value injection** (I-09 through I-12): output sanitization,
   structured-data-only returns, size limits, binary-content markers
4. **Cross-tool injection** (I-13 through I-16): args_from propagation,
   RESTRICTED stickiness, chain-cycle detection, sensitivity clamp

See [../pitfalls/injection.md](../pitfalls/injection.md) for worked
examples.

## Compliance artifacts

Every policy decision produces audit entries that map to compliance
evidence:

- **SOC2**: `DecisionEntry` + `ApprovalEntry` chain (who, what, when,
  why) — CC6.3 satisfied
- **HIPAA**: `effectiveTier` + `caller` + `data-classification` in
  every entry — §164.312(b) audit controls satisfied
- **EU AI Act**: `policyArtifactSha256` + `canonicalizerVersion` +
  `DrainEntry` during promotes — Art. 12 logging + Art. 14 human
  oversight satisfied

The compliance-artifact signer at
`packages/openclaw-guardrails/src/compliance/` emits the per-entry
evidence blobs. See `guardrails/specs/GRA-audit-chain.md`.

## Key management

All HMAC and signing keys are referenced by `keyId` — see
`guardrails/specs/GRT-trust-set.md`. Rotation is via trust-set reload;
old + new keys both accepted during the overlap window.

Key material is NEVER embedded in code or checked into the repo. In
production, keys live in the platform secret store (Azure Key Vault,
AWS KMS, GCP Secret Manager) and are loaded into the trust set at
daemon boot.

## Kill switch

The host process can be force-denied every pending decision by
writing `{ "active": false }` to the daemon's kill-switch file. The
daemon watches the file via fs.watch; within one watcher tick, every
in-flight `preAuthorize` returns `deny { reason: 'kill-switch' }`.

Kill switch is persistent — it survives reboots. Clearing requires
explicit operator action (write `{ "active": true }` AND restart the
daemon, to force a clean boot).
