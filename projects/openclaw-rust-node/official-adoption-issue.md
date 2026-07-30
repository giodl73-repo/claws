## Summary

Adopt and maintain an official Rust implementation of the OpenClaw node client contract, suitable both as an embeddable library for native applications and as a bounded headless node host.

## Problem to solve

OpenClaw has multiple native node-mode consumers, but there is no supported Rust client for the Gateway node contract. Native products that cannot embed the TypeScript host must either reimplement signing, pairing, reconnect, capability activation, invocation dispatch, cancellation, and result delivery or maintain a product-specific protocol fork.

That duplication is already concrete: a long-lived macOS desktop companion is independently implementing a Rust node and `system.run` integration. Without an OpenClaw-owned Rust implementation and a language-neutral released contract, downstream products can drift from Gateway behavior and accidentally become competing protocol authorities.

## Proposed solution

Accept an official, OpenClaw-governed Rust node client with a deliberately bounded first release:

- canonical v3 Gateway signing and `node-host` identity;
- separate device pairing and node-capability approval state machines;
- reconnect, activation, typed invocation/result delivery, bounded concurrency, timeout, and disconnect cleanup;
- an embeddable library boundary for native desktop hosts;
- an optional foreground/headless host for validation and non-GUI deployments;
- conformance against released OpenClaw Gateway protocol artifacts and fixtures;
- native package acceptance, dependency audit, SBOM, and provenance evidence before publication.

The initial supported surface should remain read-only and namespaced. It should reserve OpenClaw-owned `system.*` commands and explicitly exclude `system.run` until OpenClaw owns a shared execution-policy corpus covering authorization, environment, working directory, process-tree termination, output limits, cancellation, auditing, and emergency disablement.

The implementation can be contributed from the existing experimental repository after maintainers decide:

1. repository placement or transfer;
2. crate and binary naming/publisher identity;
3. protocol, security, and release owners;
4. supported platform and compatibility policy;
5. whether the headless host is an official deliverable or only a conformance harness.

Implementation should land in independently reviewable slices rather than as one import: ownership/RFC, protocol client and runtime, host, then release gates. Missing wire contracts must land and ship in OpenClaw before Rust consumes them.

## Alternatives considered

- **Keep the Rust project permanently third-party.** This can prove feasibility, but cannot provide an OpenClaw support or compatibility commitment and leaves downstream adopters unsure which implementation is authoritative.
- **Generalize the downstream Lobster/Scout implementation.** It currently targets product-specific v2 signing, identity, endpoint authentication, and `system.run` behavior. Promoting those choices would create a second wire contract instead of implementing OpenClaw's canonical one.
- **Wrap the TypeScript node host through a subprocess or FFI.** This increases deployment and lifecycle complexity for native desktop companions and does not meet the small embeddable-library requirement.
- **Let each native application implement node mode independently.** This repeats security-sensitive state machines and increases compatibility drift.

## Impact

- **Affected systems:** native desktop companions, headless/native node hosts, and Gateway protocol maintainers.
- **Severity:** architectural blocker for claiming supported Rust node integration; downstream prototypes can proceed but cannot honestly claim official compatibility.
- **Frequency:** every connection, reconnect, approval, and invocation crosses this boundary.
- **Consequence:** duplicated security-sensitive code, protocol drift, unclear release ownership, and higher integration cost for native adopters.

## Evidence/examples

- Experimental implementation and RFC: https://github.com/giodl73-repo/openclaw-rust-node
- RFC: https://github.com/giodl73-repo/openclaw-rust-node/blob/main/rfcs/0001-rust-node-client-and-host.md
- The implementation has completed real-Gateway proofs for signed connection, issued-device-token reconnect, terminal auth rejection, separate node capability approval, typed invocation/results, runtime failure, timeout, saturation, and disconnect cleanup.
- Native package acceptance runs on Linux x64, Windows x64, and macOS ARM64. RustSec scanning, CycloneDX SBOM generation, and repository-bound artifact provenance are implemented as separate evidence slices.
- Related language-neutral contract request: https://github.com/openclaw/openclaw/issues/115375
- First narrow contract PR (`node.invoke.cancel`): https://github.com/openclaw/openclaw/pull/115390

The existing repository is evidence and a contribution source, not a claim of official status. Official support begins only after OpenClaw accepts ownership and publishes an explicitly supported artifact.

## Do you plan to open a PR for this?

Yes, I plan to implement this myself.

## Additional information

This request is intentionally separate from the language-neutral lifecycle-contract issue. Issue #115375 asks OpenClaw to publish the authoritative cross-language wire boundary; this request asks whether OpenClaw also wants to own and support the Rust implementation consuming that boundary.

The first known adopter is a long-lived macOS desktop companion. Its platform lifecycle, Keychain integration, local authorization, and auditing should remain downstream-owned; the reusable OpenClaw crate should replace only duplicated node protocol and runtime mechanics.
