# TXA — Accept-runner

**Sub-spec of**: [TX-test.md](./TX-test.md)

## Manifest schema

Every package with scenarios MUST have a `scenarios/manifest.yaml`:

```yaml
version: 1
series:
  WSP:
    runner: security-sim
    min: 3
    description: "12 oc:// URI rejection vectors"
  WSC:
    runner: compile-sim
    min: 3
```

Schema rules:

- `version: 1` is the only supported value
- Series codes are 3 uppercase letters (regex `/^[A-Z]{3}$/`)
- `runner` is a registered runner name (see below)
- `min` is a positive integer — the minimum scenario count
- `description` is optional

## Runner registry

Runners are the test drivers that execute scenarios in a series.
Five are pre-registered:

- `e2e-loop-sim` — full approval-flow loops
- `approval-flow-sim` — approval without full e2e
- `host-shape-sim` — HostAdapter shape tests
- `compile-sim` — policy-IR compilation
- `security-sim` — rejection-vector scenarios

A manifest entry whose `runner` is NOT registered emits a WARN (not
a BLOCK). Implementation pulses may add new runners post-hoc.

## min-count enforcement

`min: 3` means the series MUST have at least 3 scenario files.
Fewer files → BLOCK. More files → fine. The min is an enforcement
floor, not a target.

See [../pitfalls/validation.md § Min-count surprises](../pitfalls/validation.md)
for the common mistakes.

## Series discovery

The accept-runner walks `{package}/scenarios/` looking for
directories matching the 3-letter series pattern. Every directory
that matches MUST have a manifest entry (undeclared series → BLOCK).
Every manifest entry SHOULD have a directory (missing directory
means the manifest references a series that doesn't exist — WARN).

## Scenario file shape

Each scenario file is a Markdown file with optional `covers:`
frontmatter:

```markdown
---
covers: [atom:WSP/rejection-vectors]
---

# SC-01 · WSP traversal rejection

## Setup

...

## Input

...

## Expected

...
```

The file body is human-readable — runners consume only the
frontmatter + structured sections.
