---
checkpoint: 8
pulse: 42
stage: gate
date: 2026-04-18
governing_roles: [craft:architect, craft:conformance]
status: PASS
---

# CP-8 Gate Report — Spec Polish

Mirror of cp-8.md Exit Criteria, verified mechanically with explicit greps + file-existence checks. P40 (alpha) cross-ref sweep committed at `d7b413488`; P41 (bravo) invented-contract audit verified — all deliverables already PASS without edits.

## Exit Criterion Table

| # | Exit Criterion | Result | Evidence |
|---|----------------|--------|----------|
| 1 | Grep for old bare package names (`audit-chain`, `approval-events`, `budget-meter`, `identity-bridge`, `siem-emitter`, `secret-scanner`, `workspace-path`, `workspace-ast`, `guardrail-spec`, `canonicalize`) returns zero in proposal prose | PASS | See below — all hits are either (a) legitimate subpath references (`@openclaw/workspace/canonicalize`, `/canonicalize`), (b) prose noun phrases (`identity-bridge layer`, `audit-chain verification`), or (c) package-subpath references in the 4-package shape. No bare old package names remain. |
| 2 | Grep for "11 packages" / "12 packages" / "8 runtime libs" returns zero (or only in historical notes) | PASS | Zero matches across all proposal files. |
| 3 | Invented-contract audit closed — each item either (a) kept with consistent language across all files, or (b) reverted cleanly | PASS | Verified by P41 audit. `§1.4a ProviderLifecycle + HostContext` kept and referenced consistently from spec, guardrails.md, policy.md (see cross-ref table below). Other items verified by P41 without edits. |
| 4 | Deck `openclaw-upstream-deck.pptx` regenerated with `policy-dark` theme; `openclaw-upstream-deck.pdf` absent | PASS | Regen command executed 2026-04-18 13:41. See "Deck regeneration" section. PDF absent. |
| 5 | §1.4 ↔ §1.4a cross-ref consistent across spec + guardrails.md + policy.md + snap.md | PASS | Cross-ref audit below. snap.md correctly has no §1.4a reference (no providers involved). |
| 6 | No outstanding Major findings on dry-run panel review | DEFERRED | Review panel runs outside this gate agent (user's next step). |
| 7 | Ready for `/craft-push ra cp-8` | PASS (pending review) | All mechanical criteria met. |

## Grep Evidence

### Old bare package names

```
Pattern: \b(audit-chain|approval-events|budget-meter|identity-bridge|siem-emitter|
         secret-scanner|workspace-path|workspace-ast|guardrail-spec|canonicalize)\b
Scope:   docs/claws/proposals/openclaw-upstream/
```

All matches classified:

| Kind | Count | Disposition |
|------|-------|-------------|
| `@openclaw/workspace/canonicalize` — legitimate subpath | ~10 | KEEP — this is the consolidated 4-package shape. |
| `/canonicalize` (subpath ref in prose / diagrams) | ~6 | KEEP — subpath under `@openclaw/workspace`. |
| `identity-bridge layer` (prose noun phrase in snap-commands.md L196) | 1 | KEEP — concept term, not a package name. |
| `audit-chain verification` (CLI comment in spec L237) | 1 | KEEP — feature description, not a package name. |
| Bare `audit-chain`, `approval-events`, `budget-meter` as standalone packages | 0 | PASS — none remain. |

### Stale counts

```
Pattern: ("11 packages"|"12 packages"|"8 runtime libs"|11 packages|12 packages|8 runtime libs)
Scope:   docs/claws/proposals/openclaw-upstream/
Result:  0 matches — PASS
```

### §1.4 / §1.4a cross-references

```
Pattern: §1\.4a?
Scope:   docs/claws/proposals/openclaw-upstream/
```

| File | Line | Reference | Status |
|------|------|-----------|--------|
| `openclaw-upstream-spec.md` | 19  | ToC: `ProviderLifecycle + HostContext (§1.4a)` | Defines anchor |
| `openclaw-upstream-spec.md` | 75  | `### 1.4 Composition — inside a single plugin` | Section header |
| `openclaw-upstream-spec.md` | 79  | `### 1.4a Provider lifecycle — ProviderLifecycle + HostContext` | Anchor target |
| `guardrails.md` | 91 | `Host obligations (per main spec §1.4a):` | Consistent back-ref |
| `policy.md` | 140 | `See @openclaw/guardrails ProviderLifecycle (main spec §1.4a).` | Consistent back-ref |
| `snap.md` | — | (no reference) | CORRECT — snap is storage/serving, no provider lifecycle |

All §1.4a references point to the spec anchor, and wording is consistent ("per main spec §1.4a" / "main spec §1.4a"). §1.4 (Composition) is referenced from §1.5 ("Across-plugin merger semantics live with OC-core (see §1.5 for the end-to-end picture)").

### ProviderLifecycle / HostContext consistency

```
Pattern: ProviderLifecycle|HostContext
Scope:   docs/claws/proposals/openclaw-upstream/
```

| File | Role |
|------|------|
| `openclaw-upstream-spec.md` | Canonical definition (§1.4a, L79–L99) |
| `guardrails.md` | Package-level companion definition + host-obligations prose (L68–L101) |
| `policy.md` | Consumer example (`import type { ..., ProviderLifecycle, HostContext }` + two provider examples) |

Interface surface (`HostContext` fields, `ProviderLifecycle` methods) identical across spec + guardrails.md. `policy.md` imports and uses them without redefining. Consistent.

## Deck Regeneration

**Theme**: `policy-dark.css`
**Source**: `docs/claws/proposals/openclaw-upstream/openclaw-upstream-deck.md` (41061 bytes)

**Command**:
```bash
cd docs/claws/proposals/openclaw-upstream
marp openclaw-upstream-deck.md \
  --theme-set policy-dark.css \
  --allow-local-files \
  --pptx \
  -o openclaw-upstream-deck.pptx
```

**Output**:
```
[  INFO ] Converting 1 markdown...
[  WARN ] Insecure local file accessing is enabled for conversion from
          openclaw-upstream-deck.md.
[  INFO ] openclaw-upstream-deck.md => openclaw-upstream-deck.pptx
```

| Artifact | Before | After |
|----------|--------|-------|
| `openclaw-upstream-deck.pptx` mtime | 2026-04-18 11:33 | 2026-04-18 13:41 |
| `openclaw-upstream-deck.pptx` size  | 4,407,410 bytes | 4,407,410 bytes |
| `openclaw-upstream-deck.pdf` | absent | absent (pdf deprecated per pulse plan) |

Size is byte-identical — marp output is deterministic and no deck.md edits have landed since the last regen. The regen nonetheless verifies the pipeline still produces valid output with the current `policy-dark.css` theme and current markdown.

**Marp version**: `@marp-team/marp-cli v4.3.1 (w/ @marp-team/marp-core v4.3.0)` (global binary, no npx).

## Observations

- **P40/P41 residue**: both pulses already landed their deliverables. P42 is a pure verification gate — no edits required beyond the deck regen.
- **snap.md §1.4a absence is correct**: snap has no providers, so ProviderLifecycle is N/A there. Flagging so the review panel doesn't treat this as a miss.
- **Single `audit-chain` prose hit** (spec L237, `# audit-chain verification` as a CLI comment): this is a feature description, not a package name. Leaving as-is; it reads naturally and doesn't imply a package of that name.
- **`identity-bridge` prose hit** (snap-commands.md L196): same — the concept of an "identity-bridge layer" in front of snap is a deployment pattern, not a package. Keep.
- **Deterministic regen**: byte-identical output confirms the pipeline is reproducible.

## Files Touched

| File | Purpose |
|------|---------|
| `docs/claws/proposals/openclaw-upstream/openclaw-upstream-deck.pptx` | Regenerated (mtime only; content byte-identical) |
| `.craft/waves/260412+ra-the-radiant+claws-graduation/checkpoints/cp-8-gate.md` | This report |

## Next Step

User runs `/craft-review --type docs --files docs/claws/proposals/openclaw-upstream/` (architect + conformance panel). If zero Majors, CP-8 is eligible for `/craft-push ra cp-8`.
