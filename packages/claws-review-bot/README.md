# @bic/claws-review-bot

Architect-style PR reviewer for `microsoft.ghe.com` repos, posting as `giodl`. Modeled on `ilygre`'s multi-round protocol with lobster-native lenses.

See `.craft/plans/claws-pr-review.md` (one level up) for the full design.

## Quickstart

```bash
# Install
npm install @bic/claws-review-bot
# (or, in the monorepo)
npm run build -- --workspace=@bic/claws-review-bot

# Single-PR review (dry run, prints verdict to stdout)
claws-review-bot tick bic/lobster#634 --dry-run

# Poll a repo continuously (dry-run by default)
claws-review-bot poll --repo bic/lobster --interval-min 10

# Poll and actually post comments
claws-review-bot poll --repo bic/lobster --post

# Author-side preflight (current branch vs main)
claws-review-bot preflight --base main

# Inspect the assembled voice for a given mode
claws-review-bot voice --mode reviewer | less
```

## Architecture

Three layers, each with a single responsibility:

1. **Voice** (`voice/*.md`) — what we say, how, and how hard we hold. Composable: each mode concatenates a different file set.
2. **Harness** (`src/`) — single-process review per PR delta. No DB; the PR comment history is the ledger (the most recent `<!-- claws-lobster-architect:* -->` comment IS the finding state).
3. **Ingestion** (`src/poll.ts`) — `gh pr list` → dedupe by `updated_at` → tick → repeat.

## Modes

| Mode | Wrapper file | Subcommand |
|---|---|---|
| Reviewer (post verdict) | (none — base voice) | `tick`, `poll` |
| Preflight (pre-push self-review) | `voice/modes/preflight.md` | `preflight` |
| Reply (respond to reviewer comments) | `voice/modes/reply.md` | (interactive — `claude --append-system-prompt`) |

## Model Backend

Local runs default to the relay backend, which shells out to Claude Code:

```bash
claws-review-bot tick bic/lobster#634 --dry-run
```

Production runs use Azure OpenAI directly:

```bash
LLM_BACKEND=azure-openai \
AOAI_ENDPOINT=https://<resource>.cognitiveservices.azure.com \
AOAI_DEPLOYMENT=reviewer-gpt-5.5 \
AOAI_API_KEY=<key> \
AOAI_REASONING_EFFORT=high \
AOAI_VERBOSITY=medium \
AOAI_MAX_COMPLETION_TOKENS=32000 \
claws-review-bot tick bic/lobster#634 --dry-run
```

GPT-5.x and o-series deployment names use the reasoning-model request shape:
`developer` + `user` messages, `max_completion_tokens`, `reasoning_effort`,
optional `verbosity`, and no `temperature`. Legacy GPT-4.x deployment names keep
the low-temperature chat shape.

For GPT-5.5, create an Azure OpenAI deployment such as `reviewer-gpt-5.5` that
points at the `gpt-5.5` model. The reeval deployment can be a cheaper GPT-5.x
deployment, for example `reviewer-gpt-5.4-mini`, by setting
`AOAI_DEPLOYMENT_REEVAL`.

## Authentication

- **GHE**: requires `gh` CLI authenticated to `microsoft.ghe.com` (`gh auth login --hostname microsoft.ghe.com`).
- **Local relay**: requires `claude` CLI installed and authenticated.
- **Azure OpenAI**: requires `AOAI_ENDPOINT`, `AOAI_DEPLOYMENT`, and `AOAI_API_KEY`.

## Posting discipline

- The bot posts as the authenticated `gh` user (currently `giodl`).
- `--post` is opt-in. Default behavior is dry-run.
- The bot will NOT edit existing comments; new state lands as new comments. This preserves audit trail.

## What this bot does NOT do

- Style/format checklist (covered by `harryf` peer-review on lobster)
- Eval-impact gating (covered by `akbhatna` on aether)
- Multi-model consensus (covered by `lukas`/automaton on aether)
- Author-side reply impersonation (only the PR author replies on their own behalf)

See `voice/voice.md` "What this bot does NOT do" for the full list.
