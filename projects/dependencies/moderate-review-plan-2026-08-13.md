# Moderate Dependency Review Plan - 2026-08-13

## Queue Shape

The full workbook review is complete. All 2,624 identities now have exact
review records; no automated-triage rows remain.

| Final cohort | Reviewed rows | Review method |
| --- | ---: | --- |
| Cargo R3 transitives | 560 | Target-aware Cargo tree; separate Linux runtime, build-only, and non-Linux lock entries |
| npm R3 direct | 31 | Exact usage, network/auth/parser reach, lifecycle, CFS, and owner review |
| npm R3 transitive | 402 | Shared parent chains with exact version and reach matching |
| npm R2 direct | 82 | Optional plugin owner and bundled/default-enabled reach |
| npm R2 transitive | 686 | Exact parent/plugin graph |
| Previously automated Low | 582 | Exact build, test, docs, release, optional, and runtime reach |

Already reviewed Gradle, SwiftPM, GitHub Actions, containers, and the earlier
priority queue remain closed unless their exact versions or usage paths change.

## Review Order

1. Lifecycle/install scripts and native/remote artifact acquisition.
2. Direct npm R3 authentication, process, network, parser, update, and secrets
   surfaces.
3. Remaining direct npm R3 by workspace owner.
4. Transitive npm R3 grouped by direct parent.
5. Direct npm R2 grouped by optional plugin.
6. Transitive npm R2 grouped by parent/plugin.
7. Cargo with target-aware reachability rather than treating every lock entry
   as shipped Linux runtime.

## First Cohort Result: Lifecycle Scripts

Thirteen Moderate rows had lifecycle scripts. One (`esbuild@0.28.1`) was
already in the pilot; all thirteen now have exact script and CFS review.

- Escalated to High:
  - `@matrix-org/matrix-sdk-crypto-nodejs@0.6.1`: downloads a native crypto
    binary from GitHub without digest verification.
  - `node-llama-cpp@3.19.1`: postinstall resolves/downloads or compiles native
    llama.cpp artifacts.
  - `onnxruntime-node@1.19.2`: downloads and extracts CUDA libraries without
    an expected digest.
- Remain Moderate:
  - no-op or environment checks: `@google/genai`, `baileys`;
  - registry-packaged binary selection/chmod: `@tloncorp/tlon-skill`,
    `esbuild`;
  - bundled prebuild or local compilation: `fsevents`, `koffi`, `node-pty`,
    `tree-sitter-bash`.

The first sensitive direct npm slice reviewed nine more exact rows:

- R4 security boundaries: `@noble/ed25519`, `@openclaw/fs-safe`, `dotenv`, and
  `ipaddr.js`;
- R3 core network paths: `undici` and `web-push`;
- R2 optional provider paths: `@aws-sdk/credential-provider-node`,
  `@smithy/node-http-handler`, and `google-auth-library`.

Eight versions are CFS-admitted. `@openclaw/fs-safe@0.5.5` is not: CFS
currently resolves `0.5.2` as its latest available version. The exact security
boundary version needs admission or an explicitly validated version decision;
neither a protected-feed bypass nor an unvalidated downgrade is acceptable.

The next process and native-control slice reviewed five exact rows:

- R4 execution/control boundaries: `execa`, its transitive `cross-spawn`,
  `playwright-core`, and `quickjs-wasi`;
- R2 optional native computer control: `@trycua/cua-driver`.

Four versions are CFS-admitted. `@trycua/cua-driver@0.19.3` is not; CFS
currently resolves `0.19.0` as its latest available version.

## Directness Correction

The generated inventory still carried stale direct flags even though the
scanner had already been corrected. Re-deriving npm directness from pnpm
importers and release-lock root declarations changed 90 records from direct to
transitive, including 39 Moderate/R3 rows. The workbook builder also now marks
the five completed pilot rows as reviewed rather than automated triage.

## Parser, Archive, and Content Slice

Ten direct parser/content rows now have exact reach and CFS review:

- R4 security boundaries: `acorn@8.17.0` for Code Mode syntax and module-access
  enforcement, `dompurify@3.4.13` for Control UI XSS prevention, and
  `jszip@3.10.1` for ClawHub plugin archive verification and installation;
- R3 shipped parsers: `file-type@22.0.1`, `json5@2.2.3`,
  `markdown-it@14.3.0`, and `yaml@2.9.0`;
- R2 optional untrusted-content parsers: `clawpdf@0.3.0`,
  `@mozilla/readability@0.6.0`, and `linkedom@0.18.13`.

All ten exact versions are CFS-admitted and returned no exact-version OSV
advisory. Local controls include PDF extraction budgets, bounded MIME sniffing,
HTML size/depth checks, archive integrity and extraction limits, conservative
Code Mode parse failure, and explicit HTML sanitization.

## Media and Native Parser Slice

Seven additional direct rows now have exact reach and CFS review:

- R4 execution or credential-presentation boundaries: `jiti@2.7.0`,
  `rastermill@0.3.1`, and `qrcode@1.5.4`;
- R3 shipped media/parser paths: `@silvia-odwyer/photon-node@0.3.4`,
  `web-tree-sitter@0.26.11`, and `highlight.js@11.11.1`;
- R2 optional external media service: `node-edge-tts@1.2.10`.

All seven exact versions are CFS-admitted and returned no exact-version OSV
advisory. The reviewed controls include plugin safe-path and loader selection,
image pixel and command-trust limits, private QR temp workspaces, bounded
Tree-sitter source/time, Photon allocation cleanup, sanitized highlighting,
and root-bounded staged TTS output.

## Update, Install, and Durable-State Slice

Eight direct rows now have exact reach and CFS review:

- R4 restore, policy, scheduling, or state boundaries: `tar@7.5.22`,
  `semver@7.8.5`, `minimatch@10.2.5`, `croner@10.0.1`, and
  `kysely@0.29.4`;
- R3 source, workspace, and watcher paths: `hosted-git-info@10.1.1`,
  `ignore@7.0.6`, and `chokidar@5.0.0`.

All eight exact versions are CFS-admitted and returned no exact-version OSV
advisory. The reviewed controls include verified staged restores, restricted
compatibility grammar, default-deny path policy, fail-closed ignore budgets,
bounded watcher recovery, DST-aware schedule correction, safe Git source
normalization, and SQLite statement-cache invalidation.

## Network Service and Telegram Slice

Six direct rows now have exact reach and CFS review:

- R4 process-wide network routing: `@openclaw/proxyline@0.3.4`;
- R3 inbound HTTP server framework: `express@5.2.1`;
- R2 optional discovery and Telegram channel packages:
  `@homebridge/ciao@1.3.10`, `grammy@1.45.1`,
  `@grammyjs/runner@2.0.3`, and
  `@grammyjs/transformer-throttler@1.2.1`.

All six exact versions are CFS-admitted and returned no exact-version OSV
advisory. The reviewed controls include proxy credential/TLS validation and
lifecycle restoration, loopback authenticated HTTP binding and CSRF handling,
bounded mDNS metadata, Telegram account/transport isolation, throttling,
per-chat sequencing, liveness, restart backoff, and sensitive error redaction.

## Provider and Protocol SDK Slice

Seven direct rows now have exact reach and CFS review:

- R4 protocol and browser boundaries: `@agentclientprotocol/sdk@1.3.0`,
  `@modelcontextprotocol/sdk@1.30.0`, and
  `@modelcontextprotocol/ext-apps@1.7.5`;
- R3 shipped provider clients: `@anthropic-ai/sdk@0.115.0`,
  `@mistralai/mistralai@2.5.0`, and `openai@6.49.0`;
- R2 optional AWS graph/type surface: `@smithy/types@4.16.1`.

All seven exact versions are CFS-admitted and returned no exact-version OSV
advisory. The reviewed controls include provider fetch/header and stream
limits, ACP startup buffering and conservative permission mapping, MCP
transport/auth isolation with deadlines and catalog bounds, and sandboxed MCP
App messaging with focus, command, size, rate, and teardown checks.

## Control UI Runtime Slice

Sixteen direct rows now have exact reach and feed review:

- R4 remote-control and terminal boundaries: `@novnc/novnc@1.7.0`,
  `@openclaw/libterminal@0.3.2`, and `ghostty-web@0.4.0`;
- R3 editor/runtime groups: six CodeMirror/Lezer packages, three Lit packages,
  two TanStack virtualization packages, `@awesome.me/webawesome@3.10.0`, and
  `@openclaw/uirouter@0.1.1`.

All sixteen exact versions returned no exact-version OSV advisory. Fifteen are
CFS-admitted. `@openclaw/uirouter@0.1.1` is unavailable from both public npm
and CFS despite an integrity-pinned baseline lock entry; do not bypass the
protected feed. The reviewed controls include ws/wss-only noVNC transport and
server-granted view-only mode, per-tab Ghostty WASM isolation, terminal
lifecycle cleanup, text-safe CodeMirror state, Lit template/controller
lifecycle, and focus-preserving transcript virtualization.

## Full Queue Closure

The remaining cohorts closed with these corrections:

- npm transitive R3: 402 reviewed; six platform PTY packages escalated to
  High/R4, ten declaration-only rows moved to Low/R0, and 47 dormant or
  CLI-only rows moved to R1;
- npm direct R2: 82 reviewed; 18 build/test/type-only rows moved to Low,
  `sqlite-vec@0.1.9` moved to R3, and `werift@0.24.1` retained its
  `rx.mini` parent remediation;
- npm transitive R2: 686 reviewed; 445 remain Moderate/R2, 198 are Low/R1,
  and 43 are Low/R0;
- Cargo: 560 reviewed; 313 are R4 runtime, 26 R3 runtime, and 221 R1
  build-only or lock-only;
- previously automated Low: 582 reviewed; 574 remain Low and eight moved to
  Moderate runtime exposure.

Final workbook totals are 33 High, 1,707 Moderate, 878 Low, and six explicit
Unknown evidence gaps.
