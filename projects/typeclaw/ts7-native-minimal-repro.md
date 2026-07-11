# TS7 / Native Minimal Compiler API Repro

Last verified: 2026-07-10

This is the smallest repro for the TypeClaw blocker without cloning OpenClaw.
It shows that current TS7/native packages do not provide the classic root
compiler API shape that OpenClaw runtime/tooling code still needs.

## Repro

```powershell
$tmp = Join-Path $env:TEMP ("typeclaw-repro-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
Set-Location $tmp
npm init -y
npm install typescript@7.0.1-rc @typescript/native-preview@7.0.0-dev.20260705.1
node -e "const pkgs=['typescript','@typescript/native-preview']; for (const p of pkgs) { const pkg=require(p + '/package.json'); console.log(p + '@' + pkg.version); console.log(JSON.stringify(pkg.exports,null,2)); } try { const ts=require('typescript'); console.log('root typeof transpileModule', typeof ts.transpileModule); } catch(e) { console.log('typescript root error:', e.message); } const native=require('@typescript/native-preview'); console.log('native-preview root keys:', Object.keys(native).join(','));"
Set-Location -
Remove-Item -Recurse -Force $tmp
```

## Verified Output Shape

```text
typescript@7.0.1-rc
{
  "./package.json": "./package.json",
  "./unstable/sync": "./dist/api/sync/api.js",
  "./unstable/async": "./dist/api/async/api.js",
  "./unstable/fs": "./dist/api/fs.js",
  "./unstable/proto": "./dist/api/proto.js",
  "./unstable/ast": "./dist/ast/index.js",
  "./unstable/ast/is": "./dist/ast/is.js",
  "./unstable/ast/factory": "./dist/ast/factory.generated.js",
  "./unstable/ast/utils": "./dist/ast/utils.js",
  "./unstable/ast/scanner": "./dist/ast/scanner.js",
  "./unstable/ast/visitor": "./dist/ast/visitor.js",
  "./unstable/ast/clone": "./dist/ast/clone.js"
}
@typescript/native-preview@7.0.0-dev.20260705.1
{
  "./package.json": "./package.json",
  ".": "./lib/version.cjs",
  "./unstable/sync": "./dist/api/sync/api.js",
  "./unstable/async": "./dist/api/async/api.js",
  "./unstable/fs": "./dist/api/fs.js",
  "./unstable/proto": "./dist/api/proto.js",
  "./unstable/ast": "./dist/ast/index.js",
  "./unstable/ast/is": "./dist/ast/is.js",
  "./unstable/ast/factory": "./dist/ast/factory.generated.js",
  "./unstable/ast/utils": "./dist/ast/utils.js",
  "./unstable/ast/scanner": "./dist/ast/scanner.js",
  "./unstable/ast/visitor": "./dist/ast/visitor.js",
  "./unstable/ast/clone": "./dist/ast/clone.js"
}
typescript root error: No "exports" main defined in ...\node_modules\typescript\package.json
native-preview root keys: version,versionMajorMinor
```

## Why This Matters for OpenClaw

OpenClaw currently needs these classic compiler APIs in production runtime or
tooling paths:

- `transpileModule`
- `createProgram`
- `createPrinter`
- `parseJsonConfigFileContent`
- `readConfigFile`
- `sys`
- `SyntaxKind`

The current native package root only exposes version metadata. The regular
`typescript@7.0.1-rc` package has no root export at all. That means OpenClaw can
continue using `tsgo` for fast typecheck lanes, but cannot replace the classic
compiler API package until either:

1. TS7/native exposes a compatibility facade; or
2. OpenClaw implements targeted adapters for the unstable API surface; and
3. missing direct parity for `transpileModule` and tsconfig parsing is resolved.
