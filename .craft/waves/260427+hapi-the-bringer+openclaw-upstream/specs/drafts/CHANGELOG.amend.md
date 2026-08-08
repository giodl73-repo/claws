---
spec: UG (changelog)
applies_to: docs/upstream/CHANGELOG.md
applies_at: deploy stage of wave 260427+hapi-the-bringer+openclaw-upstream
companion_to: UG-upstream.amend.md
---

# CHANGELOG.md amendment — UG domain (DRAFT)

At deploy time, the following entry is **appended at end-of-section** to `docs/upstream/CHANGELOG.md` (per house convention C6: CHANGELOG entries land at end-of-section, never mid-section).

## Entry to append

```markdown
## v0.2 — Hapi wave (2026-04-27)

- **Revised OC-PR roadmap.** Adapts to upstream `openclaw/openclaw` HEAD `5e8cc1d9c`
  after ~4785 commits of drift since the OneDrive proposal (2026-04-18). Six of seven
  original PRs are dropped, moved, or narrowed; only OC-4 (stripFrontMatter raw-preserve)
  and OC-7 (requireApproval conjunctive merger) land as surgical upstream PRs. Original
  v0.1 § "Contribution roadmap" superseded by amendment §1.
- **Bot-reviewer operating constraints.** Surfaces upstream's actual review trio
  (Greptile + GitHub Copilot + ChatGPT Codex) and codifies 10 operating constraints
  (PR cap, concurrency, baseline-hash refresh, SDK-overview table refresh, Swift model
  regen, CHANGELOG end-of-section, CLAUDE.md authority, no-refactor-only rule, auto-close
  labels, adversarial-plugin assumption). Amendment §2.
- **Enforcement-model shift to runtime-gated.** Without OC-1/OC-2 file-ingest hooks,
  governance enforcement happens at agent runtime via `before_agent_start`, not at
  file-write-time. Hosts requiring write-blocking deploy `@openclaw/snap` in `stage on`
  posture. Amendment §3.
- **Trust-set lifecycle.** ComplianceReport signing-key registry, rotation policy
  (quarterly cadence, 24-month grace floor for regulatory retention), revocation,
  verification path (valid / expired / revoked / invalid). Amendment §4.
- **Approval lifecycle audit events.** Every approval handle emits three audit events
  (issued, resolved, expired) into the hash-chained audit log. E-discovery query
  "which handles timed out unused on date X?" becomes answerable. Amendment §5.
- **Mandatory audit attribution.** `AuditEntrySummary.sourcePluginId` becomes
  non-optional. Plugin-supplied attribution treated as hint, not ground truth;
  registry overrides at `postAudit()` boundary. Defends against adversarial plugins
  spoofing each other's audit entries. Amendment §6.
- **Temporal query semantics.** New CLI verb `openclaw snap resolvePolicy --at
<iso8601-timestamp>` walks the audit chain to answer "what policy was in force at
  time T?" — required for SOC 2 / HIPAA e-discovery answerability. Amendment §7.
- **PR sequencing pacing.** v0.1's dependency order retained; v0.2 adds 2-PR-open
  concurrency rule per upstream's culture. Amendment §8.
- **Scope-flip mechanics moved into scope.** Original v0.1 left `@bic/openclaw-* →
@openclaw/*` rename across our monorepo as a follow-up plan. v0.2 makes it the
  closing deliverable of the contribution wave's final checkpoint, ordered AFTER all
  upstream package PRs merge but BEFORE any `@openclaw/*` npm publish to avoid the
  transient versioning gap. Amendment §9.
- **Atom registry expansion.** 6 new atoms registered (bot-reviewer-constraints,
  runtime-gated-enforcement, trust-set-lifecycle, approval-audit-events,
  audit-attribution, temporal-queries). See `ATOMS.md`.
```
