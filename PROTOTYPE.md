# Private Slice Contract

## Thesis

A small standalone command can validate and normalize a Claw package before it
selects a harness, while delegating all host policy and lifecycle behavior to a
harness adapter.

## Evidence Slice

- one local package-directory source;
- one normalized, content-free inspect result;
- strict current Claw package validation;
- structured malformed, unsafe, remote-source, and adapter failures;
- no mutation and no subprocess execution.

## Non-Goals

- selecting the public repository, npm package, or executable name;
- downloading ClawHub artifacts or extracting archives;
- calling OpenClaw or another harness;
- consent, apply, update, status, doctor, remove, or rollback;
- publishing any code or package.

## Deletion Gate

The local `file:` dependency on `clawhub-schema` is acceptable only for this
private evidence slice. It must be deleted in favor of an independently
versioned portable reference-spec package before any public release.

The thesis is disproved if portable validation cannot be separated from
OpenClaw lifecycle policy without copying OpenClaw internals into this repo.
