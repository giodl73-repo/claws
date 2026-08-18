# Session Checkpoint: control-model

- Recorded at: 2026-08-16T04:03:33.400Z
- Agent: GitHub Copilot CLI
- Focus: Completed fork-only CU4 Control UI ordinary command adoption and updated RFC 0029 evidence.
- Result: OpenClaw draft PR #242 at 07afbfde81 routes selected ordinary sends and connected exact-run aborts through ControlModelConversation; RFC PR #8 is at 9caac239aa with CU4 recorded complete; 70 focused tests, UI typecheck, lint/format, and final autoreview are clean.
- Next action: Bound CU5 selected-session approvals, questions, and artifact projection against authorization, stale-action, malformed-artifact, and fallback fixtures before implementation.
- Active branch / PR: OpenClaw user/giodl/control-model-cu4 PR #242; RFC user/giodl/rfc-0029-control-model PR #8
- Known dirty state: claws-hapi contains unrelated pre-existing user changes; only projects/control-model README, SESSION, and the new checkpoint belong to this update.
- Blocking question: Remote check:changed remains unavailable because delegated Blacksmith Testbox access is outside the authenticated organization; focused local proof is complete.
