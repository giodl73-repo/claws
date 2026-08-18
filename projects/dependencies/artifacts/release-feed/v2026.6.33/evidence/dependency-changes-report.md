# Dependency Change Report

Generated: 2026-07-21T09:27:03.266Z

## Target

- Base: v2026.6.11
- Head lockfile: pnpm-lock.yaml

## Scope

This report compares dependency-related files and resolved lockfile package versions between the selected base and the current checkout.

It reports two related but different things:

- Dependency file changes: package manifests, npm shrinkwrap/package-lock, pnpm workspace config, lockfile, and patches.
- Resolved package changes: package versions added, removed, or changed in pnpm-lock.yaml; inspect shrinkwrap/package-lock diffs directly.

## Summary

**Dependency files**
- Changed files: 206

**Resolved packages**
- Base: 1239
- Head: 1239
- Added: 0
- Removed: 0
- Changed versions: 5

## Dependency File Changes

- `extensions/acpx/npm-shrinkwrap.json`: M
- `extensions/acpx/package.json`: M
- `extensions/admin-http-rpc/package.json`: M
- `extensions/alibaba/package.json`: M
- `extensions/amazon-bedrock-mantle/npm-shrinkwrap.json`: M
- `extensions/amazon-bedrock-mantle/package.json`: M
- `extensions/amazon-bedrock/npm-shrinkwrap.json`: M
- `extensions/amazon-bedrock/package.json`: M
- `extensions/anthropic-vertex/npm-shrinkwrap.json`: M
- `extensions/anthropic-vertex/package.json`: M
- `extensions/anthropic/package.json`: M
- `extensions/arcee/npm-shrinkwrap.json`: M
- `extensions/arcee/package.json`: M
- `extensions/azure-speech/package.json`: M
- `extensions/bonjour/package.json`: M
- `extensions/brave/npm-shrinkwrap.json`: M
- `extensions/brave/package.json`: M
- `extensions/browser/package.json`: M
- `extensions/byteplus/package.json`: M
- `extensions/canvas/package.json`: M
- `extensions/cerebras/npm-shrinkwrap.json`: M
- `extensions/cerebras/package.json`: M
- `extensions/chutes/npm-shrinkwrap.json`: M
- `extensions/chutes/package.json`: M
- `extensions/clickclack/npm-shrinkwrap.json`: M
- `extensions/clickclack/package.json`: M
- `extensions/cloudflare-ai-gateway/npm-shrinkwrap.json`: M
- `extensions/cloudflare-ai-gateway/package.json`: M
- `extensions/codex-supervisor/package.json`: M
- `extensions/codex/npm-shrinkwrap.json`: M
- `extensions/codex/package.json`: M
- `extensions/cohere/npm-shrinkwrap.json`: M
- `extensions/cohere/package.json`: M
- `extensions/comfy/package.json`: M
- `extensions/copilot-proxy/package.json`: M
- `extensions/copilot/npm-shrinkwrap.json`: M
- `extensions/copilot/package.json`: M
- `extensions/deepgram/package.json`: M
- `extensions/deepinfra/npm-shrinkwrap.json`: M
- `extensions/deepinfra/package.json`: M
- `extensions/deepseek/npm-shrinkwrap.json`: M
- `extensions/deepseek/package.json`: M
- `extensions/diagnostics-otel/npm-shrinkwrap.json`: M
- `extensions/diagnostics-otel/package.json`: M
- `extensions/diagnostics-prometheus/npm-shrinkwrap.json`: M
- `extensions/diagnostics-prometheus/package.json`: M
- `extensions/diffs-language-pack/npm-shrinkwrap.json`: M
- `extensions/diffs-language-pack/package.json`: M
- `extensions/diffs/npm-shrinkwrap.json`: M
- `extensions/diffs/package.json`: M
- `extensions/discord/npm-shrinkwrap.json`: M
- `extensions/discord/package.json`: M
- `extensions/document-extract/package.json`: M
- `extensions/duckduckgo/package.json`: M
- `extensions/elevenlabs/package.json`: M
- `extensions/exa/npm-shrinkwrap.json`: M
- `extensions/exa/package.json`: M
- `extensions/fal/package.json`: M
- `extensions/feishu/npm-shrinkwrap.json`: M
- `extensions/feishu/package.json`: M
- `extensions/file-transfer/package.json`: M
- `extensions/firecrawl/npm-shrinkwrap.json`: M
- `extensions/firecrawl/package.json`: M
- `extensions/fireworks/npm-shrinkwrap.json`: M
- `extensions/fireworks/package.json`: M
- `extensions/github-copilot/package.json`: M
- `extensions/gmi/npm-shrinkwrap.json`: M
- `extensions/gmi/package.json`: M
- `extensions/google-meet/npm-shrinkwrap.json`: M
- `extensions/google-meet/package.json`: M
- `extensions/google/package.json`: M
- `extensions/googlechat/npm-shrinkwrap.json`: M
- `extensions/googlechat/package.json`: M
- `extensions/gradium/npm-shrinkwrap.json`: M
- `extensions/gradium/package.json`: M
- `extensions/groq/npm-shrinkwrap.json`: M
- `extensions/groq/package.json`: M
- `extensions/huggingface/package.json`: M
- `extensions/image-generation-core/package.json`: M
- `extensions/imessage/package.json`: M
- `extensions/inworld/npm-shrinkwrap.json`: M
- `extensions/inworld/package.json`: M
- `extensions/irc/npm-shrinkwrap.json`: M
- `extensions/irc/package.json`: M
- `extensions/kilocode/npm-shrinkwrap.json`: M
- `extensions/kilocode/package.json`: M
- `extensions/kimi-coding/npm-shrinkwrap.json`: M
- `extensions/kimi-coding/package.json`: M
- `extensions/line/npm-shrinkwrap.json`: M
- `extensions/line/package.json`: M
- `extensions/litellm/package.json`: M
- `extensions/llama-cpp/npm-shrinkwrap.json`: M
- `extensions/llama-cpp/package.json`: M
- `extensions/llm-task/package.json`: M
- `extensions/lmstudio/package.json`: M
- `extensions/lobster/npm-shrinkwrap.json`: M
- `extensions/lobster/package.json`: M
- `extensions/matrix/npm-shrinkwrap.json`: M
- `extensions/matrix/package.json`: M
- `extensions/mattermost/npm-shrinkwrap.json`: M
- `extensions/mattermost/package.json`: M
- `extensions/media-understanding-core/package.json`: M
- `extensions/memory-core/package.json`: M
- `extensions/memory-lancedb/npm-shrinkwrap.json`: M
- `extensions/memory-lancedb/package.json`: M
- `extensions/memory-wiki/package.json`: M
- `extensions/microsoft-foundry/package.json`: M
- `extensions/microsoft/package.json`: M
- `extensions/migrate-claude/package.json`: M
- `extensions/migrate-hermes/package.json`: M
- `extensions/minimax/package.json`: M
- `extensions/mistral/package.json`: M
- `extensions/moonshot/npm-shrinkwrap.json`: M
- `extensions/moonshot/package.json`: M
- `extensions/msteams/npm-shrinkwrap.json`: M
- `extensions/msteams/package.json`: M
- `extensions/nextcloud-talk/npm-shrinkwrap.json`: M
- `extensions/nextcloud-talk/package.json`: M
- `extensions/nostr/npm-shrinkwrap.json`: M
- `extensions/nostr/package.json`: M
- `extensions/novita/package.json`: M
- `extensions/nvidia/package.json`: M
- `extensions/oc-path/package.json`: M
- `extensions/ollama/package.json`: M
- `extensions/open-prose/package.json`: M
- `extensions/openai/package.json`: M
- `extensions/opencode-go/package.json`: M
- `extensions/opencode/package.json`: M
- `extensions/openrouter/package.json`: M
- `extensions/openshell/npm-shrinkwrap.json`: M
- `extensions/openshell/package.json`: M
- `extensions/parallel/npm-shrinkwrap.json`: M
- `extensions/parallel/package.json`: M
- `extensions/perplexity/npm-shrinkwrap.json`: M
- `extensions/perplexity/package.json`: M
- `extensions/pixverse/npm-shrinkwrap.json`: M
- `extensions/pixverse/package.json`: M
- `extensions/policy/package.json`: M
- `extensions/qa-channel/package.json`: M
- `extensions/qa-lab/package.json`: M
- `extensions/qa-matrix/package.json`: M
- `extensions/qianfan/npm-shrinkwrap.json`: M
- `extensions/qianfan/package.json`: M
- `extensions/qqbot/npm-shrinkwrap.json`: M
- `extensions/qqbot/package.json`: M
- `extensions/qwen/npm-shrinkwrap.json`: M
- `extensions/qwen/package.json`: M
- `extensions/raft/npm-shrinkwrap.json`: M
- `extensions/raft/package.json`: M
- `extensions/runway/package.json`: M
- `extensions/searxng/npm-shrinkwrap.json`: M
- `extensions/searxng/package.json`: M
- `extensions/senseaudio/package.json`: M
- `extensions/sglang/package.json`: M
- `extensions/signal/npm-shrinkwrap.json`: M
- `extensions/signal/package.json`: M
- `extensions/slack/npm-shrinkwrap.json`: M
- `extensions/slack/package.json`: M
- `extensions/sms/npm-shrinkwrap.json`: M
- `extensions/sms/package.json`: M
- `extensions/stepfun/npm-shrinkwrap.json`: M
- `extensions/stepfun/package.json`: M
- `extensions/synology-chat/npm-shrinkwrap.json`: M
- `extensions/synology-chat/package.json`: M
- `extensions/synthetic/package.json`: M
- `extensions/tavily/npm-shrinkwrap.json`: M
- `extensions/tavily/package.json`: M
- `extensions/telegram/package.json`: M
- `extensions/tencent/npm-shrinkwrap.json`: M
- `extensions/tencent/package.json`: M
- `extensions/tlon/npm-shrinkwrap.json`: M
- `extensions/tlon/package.json`: M
- `extensions/together/package.json`: M
- `extensions/tokenjuice/npm-shrinkwrap.json`: M
- `extensions/tokenjuice/package.json`: M
- `extensions/tts-local-cli/package.json`: M
- `extensions/twitch/npm-shrinkwrap.json`: M
- `extensions/twitch/package.json`: M
- `extensions/venice/npm-shrinkwrap.json`: M
- `extensions/venice/package.json`: M
- `extensions/vercel-ai-gateway/npm-shrinkwrap.json`: M
- `extensions/vercel-ai-gateway/package.json`: M
- `extensions/video-generation-core/package.json`: M
- `extensions/vllm/package.json`: M
- `extensions/voice-call/npm-shrinkwrap.json`: M
- `extensions/voice-call/package.json`: M
- `extensions/volcengine/package.json`: M
- `extensions/voyage/package.json`: M
- `extensions/vydra/package.json`: M
- `extensions/web-readability/package.json`: M
- `extensions/webhooks/package.json`: M
- `extensions/whatsapp/npm-shrinkwrap.json`: M
- `extensions/whatsapp/package.json`: M
- `extensions/workboard/package.json`: M
- `extensions/xai/package.json`: M
- `extensions/xiaomi/package.json`: M
- `extensions/zai/npm-shrinkwrap.json`: M
- `extensions/zai/package.json`: M
- `extensions/zalo/npm-shrinkwrap.json`: M
- `extensions/zalo/package.json`: M
- `extensions/zalouser/npm-shrinkwrap.json`: M
- `extensions/zalouser/package.json`: M
- `npm-shrinkwrap.json`: M
- `package.json`: M
- `pnpm-lock.yaml`: M
- `pnpm-workspace.yaml`: M

## Changed Resolved Package Versions

- `agent-base`: +6.0.2 -none
- `axios`: +1.18.0 -1.16.0
- `brace-expansion`: +5.0.7 -5.0.6
- `https-proxy-agent`: +5.0.1 -none
- `tar`: +7.5.20 -7.5.16
