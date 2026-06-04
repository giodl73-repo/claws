# Copilot Model Proxies

Local reference for Gio's Copilot-backed Codex, Claude, and Agency GPT-5.5 setup.

## Commands

Codex through GitHub Copilot:

```powershell
codex-copilot-proxy --port 8080
codex-copilot
```

Claude Code through GitHub Copilot:

```powershell
cccproxy --port 8088
claude-copilot
```

Agency Copilot GPT-5.5:

```powershell
agency-copilot-gpt55
```

## Locations

- Wrappers: `C:\Users\giodl\bin\*copilot*`
- Codex config: `C:\Users\giodl\.codex\config.toml`
- Codex config backup: `C:\Users\giodl\.codex\config.toml.pre-copilot-20260603-161217.bak`
- Personal Codex skill: `C:\Users\giodl\.codex\skills\copilot-model-proxies`

## Installed Packages

```text
@galin.iliev/codex-proxy@0.4.1
cccproxy@1.4.0
```

## Notes

The wrappers intentionally use permissive local-agent flags for a trusted workstation:

- Codex wrapper uses `--yolo`.
- Claude wrapper uses `--dangerously-skip-permissions`.
- Agency wrapper uses `--yolo`.

Normal `codex` remains usable without the Copilot proxy. The Copilot provider is configured in `config.toml`, but the `codex-copilot` wrapper opts into it explicitly.
