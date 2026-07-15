# PR 6: Gateway Managed Controller

## Objective

Create the internal Gateway adapter that turns the existing local-file managed
layer facade into one selected, read-only, handoff-ready startup authority.

## Dependency

- Fork PR 44: concrete local-file managed config I/O.

## Production scope

- Parse ordered opaque `id=path` declarations without assigning semantic roles.
- Require the live OpenClaw primary config path to appear in the descriptor set.
- Recheck the selected primary after environment selection.
- Prepare and activate the complete chain atomically.
- Block ordinary process-local config mutations while managed startup owns it.
- Store and take one exact accepted snapshot for the bootstrap owner.

## Non-goals

- No public CLI option in this PR.
- No automatic reload or source watcher.
- No writable CLI layer.
- No Lobster-specific IDs or roles.

## Proof

- Scout global, tenant network, and operator files compose through the production
  Gateway startup loader.
- IDs preserve declaration order and remain opaque.
- Duplicate IDs fail before activation.
- Writes fail before disk mutation.
- Without a call site, ordinary startup remains unobservable.

## Review focus

- Primary-path comparison uses OpenClaw's live resolver.
- No synthetic snapshot can become the ordinary primary backup.
- The handoff is complete-config state, not a reference to one layer.
