---
name: apps-and-swabble
description: macOS / iOS / Android companion apps + Swabble wake-word daemon — protocol consumption, LAN pairing, version sync, SwiftUI conventions
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Apps + Swabble

## The three native apps

OpenClaw ships three platform-specific native apps. Each acts as a
control surface and full client to an OpenClaw gateway, connecting as
`role: node`.

| App | Path | Stack | Maturity |
|---|---|---|---|
| **macOS** | `apps/macos/` | Swift + SwiftUI | mature |
| **iOS** | `apps/ios/` | Swift + SwiftUI | super-alpha; internal-use only |
| **Android** | `apps/android/` | Kotlin + Jetpack Compose | active rebuild from scratch (4-step onboarding, security hardening, dual flavors `play` + `thirdParty`) |

All three provide chat, talk, voice, and canvas surfaces. iOS and
Android can invoke node capabilities (camera, location, screen
recording, notifications). The macOS app integrates with the daemon
([`daemon-lifecycle.md`](daemon-lifecycle.md)) and Control UI.

## Shared OpenClawKit

`apps/shared/OpenClawKit/Sources/` — protocol models + wake-word gate
utilities consumed by both macOS and iOS. Multi-platform (iOS 17+,
macOS 15+).

| Module | Purpose |
|---|---|
| `OpenClawProtocol/GatewayModels.swift` | Codegen output from `pnpm protocol:gen:swift` ([`gateway-protocol.md`](gateway-protocol.md)). One of two destinations (other is `apps/macos/Sources/OpenClawProtocol/GatewayModels.swift`). |
| `SwabbleKit` | shared wake-word gate (used by Swabble + the apps) |

The Swift codegen pipeline maintains both copies byte-identical.

## Swabble — wake-word hook daemon

`Swabble/` is a separate top-level directory. **Swift 6.2 wake-word
hook daemon** targeting macOS 26+. Name reflects "swab + BLE", but
the actual purpose is on-device wake-word detection via
Speech.framework — **zero network**.

| Feature | Detail |
|---|---|
| Default wake word | `clawd` (alias `claude`) |
| Hook protocol | runs any command when wake-gated transcript passes min-character + cooldown thresholds |
| `SwabbleKit` product | shared wake-gate utilities for iOS / macOS |
| launchd integration | start/stop/install stubs |
| File transcription | TXT / SRT with time ranges |

Usage:

| Command | Purpose |
|---|---|
| `swift run swabble serve` | foreground daemon |
| `swift run swabble test-hook "hello world"` | validates hooks |

Config at `~/.config/swabble/config.json`.

## Mobile LAN pairing

Mobile apps connect to a gateway via plaintext `ws://` **loopback-only
by default**.

Pairing flow:

1. **Discovery** — iOS / Android scan LAN for gateway via mDNS (or manual host:port entry).
2. **Setup code** — user enters 6-digit code from gateway; device sends pairing request.
3. **Approval** — operator approves via `openclaw devices approve <requestId>`.
4. **Auth** — on approval, app receives `authToken` + `authDeviceToken` for subsequent node/operator sessions.

Private-network `ws://` requires `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`
at the gateway (`AGENTS.md`). Tailscale / public networks must use
`wss://` or a tunnel.

Connection bootstrap: `GatewayClientOptions` (`src/gateway/client.ts`)
with role, scopes, device identity negotiation.

## Gateway-protocol consumption

Each app imports `OpenClawProtocol` models and establishes a persistent
WebSocket to the gateway:

| App | Consumer |
|---|---|
| macOS | Swift + Foundation `URLSessionWebSocketTask` |
| iOS | same |
| Android | native WebSocket stack (OkHttp / Ktor) |

All three implement device auth (Ed25519 signatures), reconnect with
gap tolerance, and subscribe to event streams for chat / voice / canvas
commands. Codable round-trip via `JSONDecoder().decode(GatewayFrame.self, ...)`
on Swift; equivalent JSON deserialization on Android.

## Versioning

### iOS — CalVer pinning

`apps/ios/version.json` holds e.g.:

```json
{ "version": "2026.4.27" }
```

`pnpm ios:version:sync` reads this and auto-generates:

- `apps/ios/Config/Version.xcconfig`
- `apps/ios/fastlane/metadata/en-US/release_notes.txt`

Fastlane increments the numeric build number per TestFlight iteration
(see `apps/ios/VERSIONING.md`).

### Android

`apps/android/app/build.gradle.kts` hardcodes:

```kotlin
versionName = "2026.4.27"
versionCode = 2026042700
```

`pnpm android:bundle:release` auto-bumps both before signing release
AABs (Play and third-party flavors).

### macOS

`apps/macos/Sources/Info.plist` updated **manually** during releases.
No auto-sync.

This per-platform version-bump matrix is the primary release-time
checklist (`AGENTS.md`, recapped in [`build-and-release.md`](build-and-release.md)).

## CI release workflows

| Workflow | Purpose |
|---|---|
| `macos-release.yml` | Validates existing GitHub release tags; preflight checks. |
| `npm-telegram-beta-e2e.yml` | E2E test harness for gateway + Telegram channel; live-frontier or mock-openai modes. |

iOS TestFlight + Android Play releases via Fastlane + Gradle signing
configs (local-only keystores; not in repo).

## Footguns

1. **SwiftUI Observation conventions.** Use `@Observable` + `@Bindable` (not legacy `ObservableObject`). `AGENTS.md` rule.
2. **"Restart app" semantics.** "Restart iOS/Android apps" = **rebuild + reinstall + relaunch**, not kill/launch. Caching of compiled SwiftUI / Compose can mask code changes — always do a full rebuild.
3. **Always test real devices first.** Simulator / emulator after device validates. `AGENTS.md`: *"Before simulator/emulator testing, check real iOS/Android devices."*
4. **Protocol codegen drift.** `pnpm protocol:check` ensures Swift models stay in sync with gateway schema. Manual edits to generated Swift get overwritten on next regen.
5. **Plaintext `ws://` is loopback-only.** Mobile pairing on a private network without `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` will refuse to connect. Easy to misdiagnose as a firewall issue.

## Files I'd link from any apps PR

1. `apps/ios/README.md` — super-alpha status, build, TestFlight flow.
2. `apps/android/README.md` — rebuild checklist, Gradle config, Play restrictions.
3. `apps/macos/README.md` — dev, packaging, signing.
4. `Swabble/README.md` — wake-word daemon + SwabbleKit.
5. `apps/ios/VERSIONING.md` — CalVer pinning + Fastlane workflow.
6. `AGENTS.md:172-181` — mobile LAN pairing, restart-app semantics, SwiftUI rules.

## Read next

- [`gateway-protocol.md`](gateway-protocol.md) — Swift codegen pipeline that feeds these apps.
- [`daemon-lifecycle.md`](daemon-lifecycle.md) — macOS app integration with the gateway daemon.
- [`build-and-release.md`](build-and-release.md) — version-bump matrix.
- [`canvas-host.md`](canvas-host.md) — UI surface the apps render via WKWebView/WebView.
