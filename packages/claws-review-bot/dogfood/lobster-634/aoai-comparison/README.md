# AOAI backend calibration — PR #634 head SHA `7e6e0d541`

Same voice files, same PR, same head SHA. Different LLM backends.

| Backend | Output (lines) | F1 severity | Caught the dead /auth/callback route? | Notes |
|---|---|---|---|---|
| Claude Opus 4.7 (relay) | 54 | **Major \| block** | **Yes** — F1 [drift:code-code], traces runtime behavior end to end | Most rigorous. Block-tier finding. |
| gpt-4.1 (AOAI) | 88 | Major (no block) | No | Listed 6 padded test-coverage findings; missed the architecture bug. |
| o4-mini reasoning (AOAI) | 39 | Major (no block) | No, but caught a sibling LQ about scheme drift in dev-start.sh | 1 consolidated finding + 1 sharp LQ. Better than gpt-4.1 but missed the F1 architecture catch. |
| gpt-5 (AOAI) | 36 | Major | **Yes — as LQ1 not block** | Asked "where in msalAuth.ts is redirectUri set to /auth/callback to match?" Same issue, less forceful framing. |

## Decision

Use **gpt-5 deployment** for production. Verdict quality is close enough to Claude's. Collaborative LQ framing is actually safer for a production bot — less likely to be wrong-and-aggressive when the bot misreads code.

## Cost (per review at gpt-5 pricing)

- ~40k input tokens × $1.25/M = $0.05
- ~10k output tokens × $10/M = $0.10
- **~$0.15 per review**
- At 50 reviews/day on bic/lobster: ~$225/month

## What was tested

- Voice files: `voice/{voice,watches,specs,code,drift,grammar}.md` at commit `5546210d`
- TS harness: `bin/claws-review-bot.js tick bic/lobster#634 --dry-run` with `LLM_BACKEND=azure-openai`
- Each backend: same prompt, fresh PR fetch, head SHA `7e6e0d541`
