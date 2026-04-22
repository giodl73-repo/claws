# restricted-file-ingest fixture — SOUL

Expected decision verb: **review** on `before_workspace_file_ingest`.

Per CL-07 §1a `FileIngestProvider`, a RESTRICTED-classified file triggers the
review path: the provider returns `{ decision: 'review', approvalHandle }`.
Companion verdicts drive the three terminal outcomes this fixture covers:

- `allow`  — SC-11 approved, file enters agent context
- `deny`   — SC-12 denied, file never reaches agent
- `modify` — SC-13 redirects the pending write to `.openclaw/.stage/` (SC-13
             is a decision-flow-shape variant; the EROFS-triggered variant
             lives in the lobster preset suite per plan 6)

## Policy

- Tool surface: `before_workspace_file_ingest` (peer to `before_tool_call`).
- Classifier: `SECRETS.md` → RESTRICTED.
- Default action on RESTRICTED file-ingest: review + requireApproval.
- Modify path's `redirectPath` MUST be under `.openclaw/.stage/` relative
  to workspace root. Traversal / escape rejection is SC-14's job (pulse 56).

## Notes

- 8-field `approvalHandle` identical to tool-call path (pulse 49 validator).
- Companion signs the verdict with the scenario's HMAC key; validator
  round-trips through the pulse-49 `validateHandle`.
