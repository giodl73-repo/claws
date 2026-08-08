# R2 review — 07 the enterprise IT admin

**Verdict**: APPROVE-WITH-WARNINGS
**R1 verdict was**: APPROVE-WITH-WARNINGS
**Delta vs R1**: improved — three of my five HC-WARN concerns close cleanly under Option C; the headline multi-tenant gap is now structural rather than implicit, and the merger PR finally has a deprecation window I can roll out behind.

## R1 concerns — status check

### Multi-tenant LKG isolation — CLOSED

W4 was the loudest concern and Option C answers it the right way. `upstream-pr2-lkg.md` §"Multi-tenant isolation" makes segregation **structural** ("one `LKGStore` per tenant scope … the contract intentionally **does not** add a `tenantId` parameter — segregation is structural (separate store instances), not a per-call argument that could be forgotten"). That is the shape my auditor asks for: there is no rope to forget. Path-normalization at registration with `LKG_TRACKER_PATH_INVALID` rejection (a new error code in `LKGErrorCode`), `forbidPathsOutsideRoot: true` default on the reference FS impl, per-store `lkg-health.json` scoping, and per-store audit-stream scoping all compose. PR-3's §"Multi-tenant isolation" rides PR-2's pattern with per-tenant policy-plugin instances and `(sessionKey, fingerprint.hash)` cache keying inside a single instance — cross-tenant cache leak is structurally impossible. This is the answer.

### Merger widening deprecation window — CLOSED

W1 closes. `upstream-pr4-hook-merger.md` §"Deprecation window" ships the `gateway.approvalsMerger: "conjunctive" | "first-wins"` flag for one minor release with first-wins as the v(N) default, conjunctive as the v(N+1) default. That's the pilot-tenant gate I asked for. Plus the `normalizeApprovals` SDK helper means my Swift supervisor app and any third-party renderer don't have to hand-roll `Array.isArray` discrimination. The codemod is documented. Isolating the breaking change into its own PR (rather than bundling it with PR-3's additive contract) means PR-3 can land on a normal cadence while PR-4 takes the slow lane. Exactly right for a regulated fleet.

### Sentinel-registry rotation — OPEN (not addressed in Option C)

W2 is unchanged. The Option C pass focused on multi-tenant + merger isolation + audit forensics; the literal-only `__OPENCLAW_REDACTED__` guard in PR-1 is not on the touched-files list. This stays as a documented follow-up. Still acceptable for the same reason as R1 — substrate guard is the right floor — but I'm logging that R2 did not move it. If a sentinel rotates before the substrate-side registry lands, my fleet runs naked on the new pattern.

### Audit correlation across LKG recovery — CLOSED

W3 closes cleanly. `LKGObservation`-recovered now carries `replacedFingerprint`, `clobberedFileHash`, `actor` (`LKGActor` with `kind`/`id`/`pid`), and `correlationEventId`. `LKGObserveOptions` lets the host pass `{ actor, correlationEventId }` at observe time, so the recovery audit record stitches with my Sentinel queries on `(tenantId, sessionId, agentId, decisionId)` via the same correlation tuple. The forensic fields section in `upstream-pr2-lkg.md` (the `LKGObservation` doc-comment) is exactly the contract I needed written down. The new `attestation?` slot on `LKGFingerprint` is a bonus — gives me a contract-stable composition path for SOC 2 §CC6.1 / FedRAMP AU-10 attestation enforcement without a future contract change.

## New R2 concerns

- **Supervisor-layer TOCTOU (W5) is still open** — `ctx.lkgFingerprint` closes the plugin layer; the supervisor approval window doesn't yet carry the fingerprint. PR-3 doesn't claim to fix it. Acceptable as a documented follow-up but worth flagging again so it doesn't drift off the radar.
- **Genesis hash for first LKG audit record** (R1 N3) and **kill-switch parity** (R1 N5) didn't get touched — still acceptable as N-tier, but my compliance officer will ask about both in the SOC 2 walk-through.
- **`approvalsMerger` flag observability** — config flag ships, but I'd like the gateway to emit a startup-time audit event recording which mode the gateway booted in. Otherwise auditors can't tell whether a fleet member was running first-wins or conjunctive at any given timestamp. Small ask, fits in PR-4.

## Recommendation for the channel

**Ready for `#clawtributors`** on the strength of the multi-tenant restructure and the merger-isolation deprecation window. PR-2 and PR-3 are the additive substrate I want my next 18 months of governance work riding on; PR-4 has the rollout discipline a breaking approval-flow change deserves. Hold only on PR-1's sentinel rotation (W2) before this hits production fleets — it can ride a follow-up release-train slot, doesn't need to gate the package.

---

🤖 R2 review by general-purpose agent reading as persona 07
