# claws-pr-review — review bot for microsoft.ghe.com PRs

A polling architect-style review bot for `bic/lobster` (and pluggable for other GHE repos). Posts as `giodl`. Code lives at `packages/claws-review-bot/`.

## Three layers

1. **Voice** (markdown — source of truth for what we comment on, how, and how hard we hold)
2. **Harness** (TS — single-process review per PR delta; no scenes, no DB)
3. **Ingestion** (TS — polls GHE every N minutes, decides which PRs need a delta-review)

## Layer 1: voice

Five composable markdown files in `packages/claws-review-bot/voice/`, concatenated in this order to form the system prompt:

| File | Role |
|---|---|
| `voice.md` | Meta-stance, identity (`giodl`), tone, severity vocabulary, finding categories, marker conventions, what this bot does NOT do |
| `watches.md` | Yield model (non-negotiable / strong / soft / OOS) + the watch list (W1-W11) — what we hold the line on and how hard |
| `specs.md` | R0 protocol — locate sources of truth (CLAUDE.md walk-up, design docs, API-REFERENCE, etc.) before any other round |
| `code.md` | Code-side lenses L1-L7 (Rust safety, plex-mock parity, OpenClaw shard, Azure Linux build, lobster_web wire-format, feature-flag/rollback, cross-repo ripples) |
| `drift.md` | Four-truths model (PR ↔ spec ↔ code ↔ tests); drift categories as first-class findings; the rule that the bot does not pick a side |

Marker: `<!-- claws-lobster-architect:hold|initial|reeval:<sha>|approve -->`. Distinct from `architect-review` (ilygre), `automaton` (lukas), `peer-review` (harryf).

Future files added without restructuring: `verdicts.md` (output templates), `grammar.md` (comment-body grammar for re-parsing), `coordination.md` (cross-repo paired-PR protocol), `tests.md` (testing watches if they grow).

## Layer 2: harness — single-process, differential review

**The PR is the ledger.** No SQLite, no scene state files. Each tick reads the PR's own comment history to reconstruct finding state.

**Per tick:**

```
1. gh pr view --json comments,headRefOid
2. find our most recent <!-- claws-lobster-architect:* --> comment
   → that IS the prior ledger
3. find author comments after that timestamp
   → those are rebuttals to absorb
4. if headRefOid == sha-in-our-last-comment AND no new author comments → skip
5. otherwise: claude --print --append-system-prompt <voice/*.md concatenated> with input:
   - PR metadata (title, body)
   - the diff (last-reviewed-sha..current-head)
   - our last verdict comment (the in-band ledger)
   - new author replies to absorb
   - explicit instruction: differential review — do NOT re-derive resolved findings.
     For each open finding: did its evidence change? Update status.
     For the diff: scan for NEW findings only (regression detection).
     Author rebuttals: absorb if convincing per yield-model in watches.md, rebut if not.
6. post / edit the verdict comment
```

The Claude session runs the round protocol internally (R0 sources of truth → R1 read → R2 drift → R3 lenses → R4 counter-search → R5 verdict), using the `Agent` tool to fan out to per-lens sub-agents in parallel where useful.

**Three verdict shapes:**

| Trigger | Marker | Shape |
|---|---|---|
| First review | `:initial` | R0 sources-of-truth digest + full findings F1..Fn |
| Delta with open findings | `:reeval:<sha>` | "K resolved, M still open, N new" + delta findings only |
| All findings resolved | `:approve` | Approve + ledger summary |

The hold marker (`:hold`) is replaced by `:approve` when ledger is clean.

## Layer 3: ingestion — polling

**State** — one optional flat file `seen.json` mapping `<repo>/<pr>` → `<last-seen-pr-updated-at>` to skip PRs that haven't moved. That's it. No DB.

**Loop**:

```
every 10 min:
  for each repo in watchlist (P0: bic/lobster):
    list open PRs updated since (max last-seen-updated-at - 1h) for safety
    for each PR:
      if PR.updated_at > seen[PR.id]:
        run-review-tick(PR)
        seen[PR.id] = PR.updated_at
```

`run-review-tick` is layer 2.

## Operational shape (P2 onward)

| Component | Tech | Auth |
|---|---|---|
| Poll loop + tick runner | Azure Container Apps Job (cron, 10 min) | GHE PAT for `giodl` (KeyVault) |
| Anthropic API key | KeyVault secret | Container App Managed Identity |
| `seen.json` (optional) | Azure Storage Blob (or just regenerate from comment history) | Managed Identity |

**No queue, no Storage Tables, no SQLite.** The PR comment history is the database.

**Subscription**: personal VS Enterprise sub (`148f5576-...`, tenant `d38cd9ac-...`). See memory `reference_azure_subscription.md`. Pre-flight egress probe to `microsoft.ghe.com` required before standing up the Container App — likely fine but unconfirmed for personal-tenant resources.

## Phasing

- **P0** — voice files written, manually invoked locally as `cat voice/*.md | claude --print "review PR https://microsoft.ghe.com/bic/lobster/pull/N"` (no infra). Dogfood on a single live PR; iterate the voice based on output quality.
- **P1** — local polling loop on dev machine; posts comments live; uses giodl PAT directly. ~150 lines of TS.
- **P2** — Azure Container Apps Job + KeyVault. Single Bicep file. No queue, no DB.
- **P3** — extend to a second repo (`bic/aether` or `bic/craft`) — per-repo voice/ subdirectory; shared `voice.md` + `drift.md`, repo-specific `watches.md` / `code.md` / `specs.md`.

## Out of scope (for now)

- **Webhook-driven ingestion** — polling is fine; review latency tolerance is minutes
- **Multi-model consensus** — `lukas`/automaton already does this on aether
- **Eval-impact gating** — `akbhatna` already does this on aether
- **Style/format checklist** — `harryf` does this on lobster
- **Replying-to-other-bots conversation threading** — humans handle bot-to-bot discussion
- **Cross-PR pattern detection** — could be P4+ but not now

## Open questions

- Bot identity escalation — when do we move from `giodl` to a service account or GitHub App on GHE? Probably when the bot becomes trusted enough that its volume embarrasses the personal-account framing, or when org-level branch protection requires a verified signing identity.
- Cost ceiling — review run budget per PR head SHA. Tentatively: $1/review, hard-stop if a single tick exceeds 30 min wall-clock.
- Egress confirmation — does a personal-tenant Azure Container App actually reach `microsoft.ghe.com`? Probe before P2.
- Verdict comment editing vs replacement — when the head SHA changes, do we edit the existing `:reeval:<old-sha>` comment to be `:reeval:<new-sha>`, or post a new one and let the old one sit? Editing keeps the PR thread shorter; posting a new comment preserves audit trail. Lean toward posting new (audit) but worth deciding before P1.
