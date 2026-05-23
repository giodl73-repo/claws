---
doc: R3-claws-ciso
round: 3
panel: cp-3-fork-prep
reviewer: ciso
created: 2026-05-04
---

# R3 — claws-internal CISO review of fork-prep substrates

Different lens than the upstream compliance officer. They worry about whether
the contract is sound for OSS consumers across the world. I worry about whether
I can ship this on a Microsoft enterprise tenant on Monday and survive the
SOC2 / FedRAMP-Moderate / HIPAA / GDPR auditors who are walking the floor on
Tuesday. The substrate quality is high; the gaps below are the ones I will be
asked about by name.

## Enterprise-deployment threat model (one frame)

Microsoft's deployment shape is: many tenants per fleet, gateway runs as a
managed service, workspace files live on Aether (rclone+FUSE OneDrive). The
adversary is not the upstream-paranoia adversary (a malicious operator
self-hosting). It is: (a) a compromised agent escalating laterally inside one
tenant, (b) a tenant operator with workspace write access who wants to silence
governance, (c) the audit subpoena that arrives 18 months after an incident
and demands tamper-evident reconstruction. The substrates are mostly designed
for (a). They are weak on (b) and have a documented gap on (c).

## Per-substrate findings

### oc-paths-substrate (CP-1 PR-1)

**Sentinel-DoS — Concern #1.** I read the threat-model section in the PR-1
draft and the L-020/L-021/L-022 entries in `lkg-recovery-substrate/PITFALLS.md`
plus the substring guard in
`C:\src\claws\packages\oc-paths-substrate\src\plugin-sdk\oc-path\sentinel.ts`.
The mitigation logic is right (refuse-at-boundary, defense-in-depth on `.lkg`
companion at recover, audit emit on every refusal). For Microsoft enterprise
this is realistic v0 **with two caveats**:

- The refusal path emits `outcome: 'failed', reason: 'sentinel-detected'` and
  audit-records it (`store.ts:243-251`). Good. But there is no rate-limit on
  audit emission. A motivated DoS operator can flood the SIEM pipeline with
  refusal events. **WARN** — Microsoft Sentinel charges per ingested GB; an
  agent stuck in a sentinel-loop costs real money. Need a coalescing window in
  the audit sink or a downstream Sentinel rule that buckets these.
- **WARN** — there is no recovery-on-DoS playbook anywhere in the wave
  artifacts. When the sentinel firehose fires at 3 AM, the on-call needs a
  documented "kill the offending tracker, audit the bytes, restore from LKG"
  sequence. That is a runbook, not code, but it has to exist before this
  ships to Microsoft customers. Can be done outside this PR but I want it
  in the wave's PR description before merge.

**Per-tenant sentinel rotation — Concern #7.** `REDACTED_SENTINEL` is a
compile-time constant exported as part of the public ABI
(`sentinel.ts:25`). For a single-tenant self-hoster this is fine. For
Microsoft multi-tenant the literal becomes a universal lockpick: an agent
that learns the constant from `@openclaw/oc-path` (which it can — it is on
npm) can intentionally pollute a sibling tenant's LKG-tracked file with a
substring-form sentinel and force a recovery loop on that tenant.

**BLOCK for multi-tenant.** Either the sentinel needs to become per-tenant
rotatable (constructor param threaded through `FsLKGStore`) or Microsoft
deployments need a documented "sentinel poisoning is a threat we accept; out-
of-band scrubber required" stance. I prefer rotation. Tracking ask for v1.

### lkg-recovery-substrate (CP-1 PR-2)

**Audit chain tamper-evidence — Concern #4.** Read
`C:\src\claws\packages\lkg-recovery-substrate\src\extensions\lkg-fs\audit.ts`
end-to-end. `LKGAuditRecord` has `event`, `path`, `outcome`,
`fingerprintHash`, `clobberedFileHash`, `replacedFingerprintHash`, `actor`,
`correlationEventId`, `observedAt`. **There is no `prevHash` / chained-hash
field.** The `InMemoryAuditSink` is a plain ring buffer. HIPAA §164.312(b)
("audit controls") and SOC2 CC7.2 expect tamper-evident audit. Today an
operator with disk write access can rewrite history.

The grep across `claws-sdk/src/audit/chain.ts` and
`openclaw-guardrails/src/audit/chain.ts` confirms the rest of the org has
already shipped chained-hash audit; this substrate skipped it. **BLOCK for
HIPAA / FedRAMP-Moderate deployments.** Mitigation in scope for v0: extend
`LKGAuditRecord` with `prevHash: string | null` and have the default sink
chain. Microsoft healthcare cannot deploy until this lands. The contract
already carries an `attestation?` slot (Concern #8 below); tamper-evidence
should ride alongside, not after.

**`attestation` slot enforcement — Concern #8.** L-101 in the substrate
PITFALLS marks `attestation` enforcement as DEFERRED. The slot is on
`LKGFingerprint` (`types.ts:51-57`). For Microsoft compliance-grade
deployments this is **WARN, not BLOCK** — the slot exists and the upstream
contract permits enforcement; downstream we wrap `FsLKGStore` with a policy
that rejects observations whose `attestation` is null. But we will need that
wrapper before we can ship to a regulated customer. Ask the upstream PR-2 to
add a `requireAttestation: boolean` constructor option even if it ships as
no-op for v0; otherwise the wrap is a fork.

**Cross-tenant policy bleed — Concern #9.** Verified via
`C:\src\claws\packages\lkg-recovery-substrate\src\extensions\lkg-fs\store.ts:79-107`
and the api.ts comment at `api.ts:8-13`: each `FsLKGStore` constructs its
own `trackers` Map, `entries` Map, audit/notice sinks, and `root`. The
contract intentionally has no `tenantId` argument. Two stores in the same
process do not share state through the SDK surface. **No issue.** The risk
is operator misconfig (running a single store across tenants) — that is a
deployment posture problem, not a contract problem. Document the
single-store-per-tenant invariant in the Microsoft deployment guide and we
are fine. NIT: add a runtime assertion that two `FsLKGStore` instances on
overlapping `root` paths log a warning at construction; today there is no
guardrail against this footgun.

**GDPR scrub primitive — Concern #3.** Confirmed there is no
`LKGStore.scrub(path)` in `api.ts`. Once Microsoft promotes a PolicyIR
containing user-identifiable content (a SOUL.md reference to "user
giodl@microsoft.com" is plausible), GDPR Article 17 (right to erasure)
requires a documented mechanism to delete the bytes from BOTH the active
file and the `.lkg` companion AND the `lkg-health.json` state file AND the
audit ring buffer.

**BLOCK for EU deployment.** v0 ships with at minimum a `purgePath(path)`
SDK method that walks all four storage locations. Eduardo's runtime-
governance design (bic/aether#5408) likely needs this same primitive — flag
to him on the 2026-04-30 sync. Currently the v0 lack of scrub is a real
deployment blocker for any Microsoft tenant in EU/UK/Switzerland.

### policy-substrate (CP-1 PR-3)

**PolicyIR signing path — Concern #2.** `computePolicyId` is sha256(JCS-
canonical body) — `policy/canonicalize.ts` and the POL-010..POL-012
pitfalls. This is a content-integrity hash, NOT a signature. The PR-3 draft
acknowledges this at `v2-policy-ir.md:138` ("Signing is operator-territory,
layered on top of LKG composite fingerprints"). For SOC2 the hash-only
posture is **WARN, defensible** — auditors accept hash-chain integrity if
the chain itself is signed at a higher layer (gateway-side). For
FedRAMP-Moderate the picture is different: AU-10 ("non-repudiation") expects
cryptographic signing of the policy artifact bytes itself, not just a
gateway-side wrapper. The scope-note in the PR-3 doc covers this for SOC2;
**it does NOT cover FedRAMP-Moderate**.

**WARN.** Update the v2-policy-ir.md scope-note to call out: "FedRAMP-
Moderate consumers MUST layer cryptographic signing at the gateway; the
hash-only `policyId` is not by itself a non-repudiation primitive." Without
this, a Microsoft federal-cloud customer reading the upstream doc thinks
they have what they need and they don't.

**`openclaw-policy evaluate` as enumeration surface — Concern #5.** The CLI
at `C:\src\claws\packages\policy-substrate\src\cli\index.ts:636-675`
takes a `policy.jsonc` file and a tool id and returns the Decision with the
deny-rule id. **Anyone with read access to `policy.jsonc` and the CLI binary
can fully enumerate the deny matrix.** A red-team operator drops the binary
on a workstation, points it at the workspace, and walks every tool to harvest
deny reasons + rule ids. The reasons leak threat-model intent
("never-share-restricted") to the agent / attacker.

This is a real Microsoft red-team finding pattern. **BLOCK for
deployment-as-installed-CLI.** Mitigation options:

- (preferred) Gate `evaluate` behind a `--allow-enumeration` flag that
  defaults to off; without the flag, deny reasons collapse to a generic
  string ("policy.deny"). Operators debugging policy use the flag locally.
- Or: ship the CLI without the `evaluate` subcommand for enterprise builds.
- Or: log every `evaluate` invocation to the audit pipeline so red-team
  abuse becomes detectable. (NIT-tier; doesn't prevent enumeration.)

This is a Microsoft-specific concern; upstream is fine with it because
self-hosters trust their own operators. Either fork the CLI or get
`--allow-enumeration` upstream. I'd push for upstream.

**`workspace.json` integrity — Concern #6.** Verified via
`C:\src\claws\packages\oc-paths-substrate\src\plugin-sdk\oc-path\workspace\config.ts`:
`workspace.json` is a plain JSONC file at the workspace root, parsed
permissively, no signing, no LKG-tracking documented in the loader. The lkg
section has `skip: string[]` and `skipPaths: string[]`. An operator can write
`{"lkg": {"skipPaths": ["**"]}}` and silence governance entirely.

**BLOCK for Microsoft Purview-style deployments.** The polised-configures-
the-police separation requires the governance config itself to be signed by
a key the workspace operator does not hold. Mitigation in scope for v1+:
LKG-track `workspace.json` itself with an `attestation` requirement, OR ship
a `workspace.json.sig` companion the loader verifies against a fleet-pinned
key. This is fork-required if upstream won't take it; the OS layer above
(Eduardo's governance engine) might be the right home.

### pinch (CP-2 PR-1)

Reviewed `C:\src\claws\packages\pinch\src\cli\PITFALLS.md` and the
runner. The lint runner inherits the workspace.json governance gap (Concern
#6) — `lint.skip: ["*"]` silences the policed surface. Same severity as
above. **WARN here**: pinch is read-only over the workspace; the worst case
is a missed lint, not a policy bypass. The BLOCK lives on policy-substrate.

The CLI's `--json` output goes through `scrubSentinel` (CLI-PINCH-030 family
in pinch/PITFALLS.md). Good for the substrate's threat model. **NIT** — like
oc-path CLI, no rate-limit on diagnostic emission. Same SIEM-cost concern as
oc-path; same mitigation (downstream rule).

### oc-paths-doctor (CP-2 PR-2)

Doctor fixers are bytes-mutating. Verified the package runs through the same
sentinel guard at emit. **NIT.** A fixer that runs auto-applied (no
operator confirmation) is a privilege-escalation surface — an agent that can
trigger doctor (e.g., via a workspace-edit hook) can rewrite governance
files. The default `--dry-run` is the right posture; ensure Microsoft
deployment runbook says "never auto-apply doctor fixers in production
gateway." Documentation, not code change.

## Unresolved threat scenarios

Three I want explicit airtime in the next checkpoint:

1. **The on-call subpoena scenario.** "Reconstruct what policy was in effect
   between 14:30 and 14:45 UTC on 2026-03-12." Today: gateway-side audit +
   PolicyIR `policyId` + LKG fingerprint should compose to give this answer,
   BUT the audit sink has no chained-hash so the reconstruction is not
   tamper-evident. Concern #4 BLOCK plus a wave-level integration test that
   plays the subpoena scenario end-to-end.

2. **The compromised-agent-pivots-to-policy-self-edit scenario.** Agent has
   `oc://policy.jsonc/...` write access (it does — that's how regeneration
   works). It writes an empty deny matrix, calls `lkg.observe`, the
   validator passes (no schema-level lower-bound on rule count), the bad
   policy promotes, every subsequent decision is `allow`. Mitigation: the
   tracker's `validate` for `policy.jsonc` MUST refuse a policy whose deny
   matrix shrinks below the prior LKG's deny matrix without an operator
   attestation. Not in v0. **BLOCK** the moment claws ships agent-driven
   policy regeneration to Microsoft customers; today we're safe because no
   such regeneration path exists in the substrates as shipped.

3. **The substrate-owned `.openclaw/` directory permissions.** `FsLKGStore`
   writes `<root>/.openclaw/lkg-health.json` (`store.ts:105`). On rclone-FUSE
   OneDrive this directory inherits SharePoint ACLs which (per Ryan's notes)
   default to broad read in many tenant configurations. Audit state visible
   to anyone with workspace read access. **WARN** — out of substrate scope
   but the deployment guide must call this out and require chmod 0700 (where
   FUSE supports it) or an out-of-tree state file.

## Ask list (priority-ordered)

| ask | severity | who | when |
| --- | --- | --- | --- |
| Chained `prevHash` on `LKGAuditRecord` (Concern #4) | BLOCK | upstream PR-2 | before merge |
| `LKGStore.purgePath(path)` for GDPR scrub (Concern #3) | BLOCK (EU) | upstream PR-2 | v1 minimum |
| Per-tenant sentinel rotation (Concern #7) | BLOCK (multi-tenant) | upstream PR-1 amendment | v1 |
| `--allow-enumeration` on `openclaw-policy evaluate` (Concern #5) | BLOCK | upstream PR-3 | before enterprise CLI ship |
| Sign or LKG-track `workspace.json` (Concern #6) | BLOCK (Purview) | claws fork or governance layer | v1 |
| FedRAMP-Moderate scope-note on `policyId` hash-only (Concern #2) | WARN | upstream PR-3 doc | before merge |
| `requireAttestation` constructor flag on `FsLKGStore` (Concern #8) | WARN | upstream PR-2 | v0 if cheap |
| Audit-emission rate-limit / SIEM coalescing (Concern #1) | WARN | downstream Sentinel rules | before Microsoft customer #1 |
| Recovery-on-sentinel-DoS runbook (Concern #1) | WARN | wave artifact | before merge |
| Single-store-per-tenant warning at `FsLKGStore` construction (Concern #9) | NIT | upstream PR-2 | opportunistic |
| Microsoft deployment guide: doctor auto-apply prohibition | NIT | claws docs | before customer #1 |
| Deployment guide: `.openclaw/` ACL hardening on rclone-FUSE | NIT | claws docs | before customer #1 |

The substrates are well-built. The gaps are the gaps a CISO sees because
they shape which boxes get ticked on which compliance attestation. Most are
deferrable to v1; three (audit chain, GDPR scrub, enumeration surface) are
load-bearing for the very first regulated Microsoft customer. The team has
done the architecture work — now we need the compliance-evidence work to
ride alongside.
