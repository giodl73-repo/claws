# Dockerfile — claws-review-bot Container Apps Job image.
#
# Build from monorepo root:
#   docker build -f packages/claws-review-bot/Dockerfile -t claws-review-bot:local .
#
# Push to GHCR:
#   docker tag claws-review-bot:local ghcr.io/<owner>/claws-review-bot:latest
#   docker push ghcr.io/<owner>/claws-review-bot:latest

FROM node:20-bookworm-slim AS base

# Install gh CLI (for `gh api` calls inside the bot)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg \
  && mkdir -p -m 755 /etc/apt/keyrings \
  && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
  && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y --no-install-recommends gh \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy monorepo manifest + workspace pkg manifest first, install deps
COPY package.json package-lock.json ./
COPY packages/claws-review-bot/package.json ./packages/claws-review-bot/
RUN npm ci --workspace=@bic/claws-review-bot --include-workspace-root

# Container deployment uses LLM_BACKEND=azure-openai (set by Bicep), which
# calls AOAI directly via fetch. No claude CLI needed in the image — that
# path is local-dev only via the relay.

# Copy source + voice + build
COPY packages/claws-review-bot/tsconfig.json packages/claws-review-bot/tsup.config.ts ./packages/claws-review-bot/
COPY packages/claws-review-bot/src ./packages/claws-review-bot/src
COPY packages/claws-review-bot/voice ./packages/claws-review-bot/voice
COPY packages/claws-review-bot/bin ./packages/claws-review-bot/bin

WORKDIR /app/packages/claws-review-bot
RUN npm run build

# GH_HOST + GH_TOKEN come from env vars at runtime (set by Container Apps secrets)
ENV NODE_ENV=production

ENTRYPOINT ["node", "bin/claws-review-bot.js"]
CMD ["poll", "--repo", "bic/lobster", "--once", "--post"]
