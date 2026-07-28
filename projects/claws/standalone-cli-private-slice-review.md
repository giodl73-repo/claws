# Standalone Claw CLI: Private Slice 1 Review

Date: 2026-07-25

Prototype: `C:\src\standalone-claw-cli-prototype`

## Scope

Private, local-only evidence for a harness-neutral Claw command. No public
repository, npm package, executable name, remote source, subprocess, or state
mutation is included.

## Platform Engineering

**Judgment:** proceed to the OpenClaw preview-adapter slice.

- The normalized `claw.cliOutcome.v0` envelope separates portable inspection
  from harness policy and gives callers stable success and diagnostic shapes.
- Package integrity is deterministic: files are ordered by UTF-8 path bytes and
  hashed with explicit path, size, and content boundaries.
- The temporary `file:` dependency on ClawHub's schema avoids introducing a
  third validator, but it is a deletion target. Public distribution requires a
  separately versioned portable reference-spec package.

## Adapter And Security Engineering

**Judgment:** acceptable for non-mutating local evidence only.

- Package traversal fails closed on symlinks, hardlinks, non-regular entries,
  root escapes, invalid UTF-8 metadata, excessive files, and excessive bytes.
- Adapter dispatch is explicit. Unknown harnesses and the unimplemented
  OpenClaw adapter cannot fall through into execution.
- This slice has no externally asserted digest and therefore does not establish
  remote artifact trust. A remote-source slice must verify an expected digest
  before archive extraction or manifest parsing and must retain archive limits.

## New Contributor Experience

**Judgment:** the private developer flow is understandable without claiming a
public command name.

- `inspect` provides a concise human result and a content-free `--json` result.
- Argument, source, package, and adapter failures have distinct codes, phases,
  paths, messages, and exit classes.
- The temporary `node dist/src/cli.js` invocation is intentionally awkward. It
  should become `npx <approved-name>` only after naming and publication are
  explicitly approved.

## Decision

Keep slice 1 private and local. Slice 2 may implement OpenClaw dry-run preview
delegation while preserving OpenClaw ownership of consent, lifecycle policy,
mutation, and provenance. Do not add remote resolution or publish controls in
that slice.
