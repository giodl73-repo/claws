# Slice 2: Structured Codex Tool Results

## Candidate

- Evidence: openclaw/openclaw#102961
- Fork PR: https://github.com/giodl73-repo/openclaw/pull/146
- Commit: `728998a348d`
- Base: fork PR #145
- Status: implemented conformance candidate; owner adoption pending

## Ownership

- Semantic owner: Codex-native agent tool runtime.
- Authoritative result boundary: app-server `commandExecution` and
  `fileChange` completion items.
- Correlation/support boundary: native `PostToolUse`, joined by tool-call ID to
  retain original name, arguments, cwd, and channel context.
- Existing projection: Plugin SDK `after_tool_call`.

## Preserved Meaning

- Shell results expose status, exit code, duration, and bounded output.
- File changes expose status and bounded path/kind summaries.
- Shell remains normalized as `exec`; `apply_patch` retains its original input.
- MCP remains native-relay-owned, avoiding duplicate observations.
- Existing result middleware ordering and in-place mutation remain compatible.
- Aborted runs suppress deferred observations rather than emitting stale hooks.

## Deletion Target

Plugin-side success/failure reconstruction from flattened stdout/stderr text.

## Evidence

- 85 native hook relay tests.
- 24 Codex projector/relay tests.
- 25 tool-result middleware tests.
- 6 Plugin SDK API baseline tests.
- Final Codex review: no actionable defects.

## Adoption Questions

- Does the agent-tool runtime owner accept app-server completion as the
  canonical structured observation boundary for native shell and file changes?
- Does the Plugin SDK owner accept the tool-call-ID join and bounded output
  shape as compatible with current `after_tool_call` consumers?
