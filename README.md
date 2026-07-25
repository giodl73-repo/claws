# Standalone Claw CLI Prototype

Private evidence slice for a harness-neutral Claw command. This repository has
no public remote, no publishable package, no `bin` name, and no claim on the
unscoped `claws` npm package.

The current slice validates and inspects a local Claw package without invoking
a harness or mutating local state:

```powershell
npm install
npm run build
node dist/src/cli.js inspect test/fixtures/valid --json
```

The intended future command shape remains:

```text
npx <name> <claw> --agent openclaw --dry-run
```

`<name>` is deliberately unresolved. The package and executable names will be
selected before any public repository or npm publication is created.

## Ownership Boundary

The standalone layer owns portable source resolution, integrity, package
validation, inspection, and adapter dispatch. Harnesses continue to own policy,
consent, mutation, provenance, status, update, doctor, and removal.

The prototype temporarily consumes ClawHub's private schema package through a
local `file:` dependency. This avoids a third validator while proving the CLI
shape. It must be replaced by a separately versioned portable reference-spec
package before distribution.
