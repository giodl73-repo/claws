# Claws Final Exam

Date: 2026-08-12

## Baseline

- OpenClaw upstream `main`: `f8c0e1b8325b1fc36e039cf357a2c4602f76d5aa`
- Review lanes: runtime correctness, integration/E2E completeness, and
  contract/documentation coherence
- Supporting repositories inspected: standalone Claws, Awesome Claws,
  ClawHub, and OpenClaw RFCs
- Review mode: read-only

## Verdict

The merged Claws core is substantial and generally defensive, but it does not
yet pass a production-readiness final exam. Three concrete runtime bugs remain,
the public contract has diverged materially from the accepted RFC, and the
ecosystem lacks a real hosted whole-Claw golden path. The strongest existing
proof is local lifecycle and unit coverage; the weakest boundaries are
cross-process authority refresh, MCP convergence, registry/client schema
parity, real package/MCP/cron/provider execution, and cross-platform proof.

## Confirmed Runtime Bugs

| Severity | Finding | Evidence | Required fix |
| --- | --- | --- | --- |
| High | A Gateway started before an external CLI `claws add` or `update` can keep an empty/stale Claw provenance cache. The affected agent is then treated as ordinary and can receive runtime tool grants beyond its reviewed allowlist. | `src/claws/provenance-runtime-read.ts:145`, `src/claws/tool-policy-runtime.ts:59`, `src/agents/conversation-tool-policy-pipeline.ts:32` | Refresh on each runtime config snapshot or invalidate with a cross-process database generation. Add a two-connection reload regression. |
| Medium | A rejected MCP config CAS leaves target ownership provenance pending or downgrades a complete row even though no config mutation occurred. | `src/claws/mcp-update.ts:125,165`, `src/claws/update-plan.ts:513` | Restore/delete the pending row for known `{ok:false}` outcomes; retain pending only for ambiguous failures. |
| Medium | MCP ownership decisions race with global config mutation. Concurrent add/remove can leave a complete claimant whose MCP server was removed. | `src/claws/mcp.ts:198`, `src/claws/lifecycle-mcp-removal.ts:44` | Add a per-MCP-name lifecycle lease spanning ownership recheck, config CAS, and provenance commit. |

No significant runtime defects were found in manifest parsing, plan hashing,
workspace/bootstrap containment, bounded reads, symlink/hardlink rejection,
package leases, cron convergence, export secret preservation, archive
construction, doctor reads, or root provenance CAS.

## Release-Blocking Integration Gaps

1. **No hosted whole-Claw golden path.** ClawHub's merged package-family enum
   still excludes `claw`, so publish, search, resolve, and install are not
   proven as one journey.
2. **Core external boundaries are mocked.** Current tests do not prove a real
   skill/plugin install, MCP connection and tool call, cron execution, or
   cleanup in one lifecycle.
3. **Awesome Claws is static-first.** CI validates generated content and uses
   dry-run/provider-blocked portfolio proof; it does not execute all 50
   packages through lifecycle and claimed provider capabilities.
4. **Standalone interoperability is simulated.** Tests use a fake OpenClaw
   executable and manufactured hosted registry/feed/artifact.
5. **Control UI proof uses a mock Gateway and pinned injected assets**, not a
   disposable real Gateway across add, update, status, and remove.
6. **Recovery stops at the partial state.** Crash/disconnect cutpoints after
   plugin, MCP, and cron mutation are not followed through restart, doctor,
   retry, and no-duplicate cleanup.
7. **OS proof is incomplete.** Standalone and Awesome Claws CI are Ubuntu-only;
   there is no packed Windows/macOS/Linux interoperability matrix.
8. **The author lifecycle remains intentionally incomplete.** `create`,
   `validate`, `dev`, and `build` are shipped; `test` and `publish` are not.

## Contract-Breaking Discrepancies

| Severity | Discrepancy |
| --- | --- |
| Critical | RFC 0016's complete manifest examples use portable `agent` settings that shipped strict schema rejects. |
| Critical | The normative spec says the `CLAW.md` body is documentation-only, while OpenClaw materializes it as managed `SOUL.md`. |
| Critical | Profiles, extensions, `BOOTSTRAP.md`, memory settings, and the project lifecycle ship without an accepted normative contract; their governing RFC PRs remain open. |
| Critical | ClawHub maintains a more-permissive profile validator than OpenClaw, allowing publication to succeed for artifacts that `claws add` rejects. |
| High | Awesome Claws requires `tools.alsoAllow` for profile-bearing entries, but two `coding` profiles need a bounded `tools.allow` and currently fail OpenClaw inspection. |
| High | Normative schema v1 rejects unknown top-level fields while shipped OpenClaw accepts and uses `metadata`. |
| High | Normative `heartbeat.skipWhenBusy` is rejected as retired by shipped OpenClaw. |
| High | The RFC and public command-reference table omit the shipped `create`, `validate`, `dev`, and `build` commands. |

The accepted RFC is also still marked `draft` with a blank issue, its
implementation lists are stale, and current coordination notes contain merged
items in the remaining portfolio.

## Documentation Backlog

- Document that `claws add` currently prints its experimental warning after
  mutation, contrary to the RFC's before-mutation promise.
- Publish the exit-code contract, including that partial and failed both exit
  `1` and require JSON status inspection to distinguish.
- Explain that `inspect` can probe ClawHub artifacts when extensions are
  present.
- State that `alsoAllow` works only with profiles that do not include
  `bundle-mcp`; current `coding`, `messaging`, and `full` require bounded
  `allow`.
- Document Claw ownership warnings in plugin uninstall docs.
- Cross-link whole-Claw ClawHub documentation and its independent experimental
  gate.
- Align the `claws create` package example with generated output.
- Repair the dead `portable-standard-pr-plan.md` link and stale Claws session
  snapshot.
- Correct Awesome Claws' stale RFC number and document catalog invariants.
- Add extension/profile footprint to ClawHub's public manifest summary.

## Minimum Release-Gate Matrix

1. Hosted Ubuntu golden path: exact artifact publication to staging ClawHub,
   standalone resolution, OpenClaw apply with skill/plugin/MCP/cron/workspace/
   bootstrap, provider turn, Control UI, update, export/reapply, and remove.
2. External-failure recovery: post-plugin, MCP, and cron transport-loss
   cutpoints followed by restart, status/doctor, retry, and complete cleanup.
3. Awesome corpus: all 50 packages materialize, add, status, export, and
   remove; claimed providers/capabilities require matching live evidence.
4. Upgrade/interoperability: previous released OpenClaw and standalone
   artifacts upgraded to current while preserving user edits.
5. Windows, macOS, and Linux: packed standalone plus hosted install/build/
   remove; Windows additionally exercises command shims and path semantics.

## Recommended Order

1. Fix the cross-process tool-authority cache bug.
2. Fix both MCP provenance/concurrency bugs.
3. Reconcile and accept the OpenClaw profile/project contract, then share one
   validator and fixture corpus with ClawHub and Awesome Claws.
4. Repair the two invalid Awesome Claws profiles and validator.
5. Build the hosted golden path and recovery lane.
6. Add the three-OS packed interoperability matrix.
7. Close the public docs and coordination backlog.
