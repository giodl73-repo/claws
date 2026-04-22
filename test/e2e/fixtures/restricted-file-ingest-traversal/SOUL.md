# restricted-file-ingest-traversal fixture — SOUL

Extension of `restricted-file-ingest` for P-03 path-traversal defence
(SC-14, pulse 56 D2).

Expected decision verb: **deny** with specific `invalidReason` per traversal
mode. Provider returns `{ decision: 'modify', redirectPath: <escape> }`; host
canonicalizer rejects each of the four P-03 vectors and emits a
`DecisionEntry` with the matching `invalidReason`:

- `../outside/escape.txt`                    → `redirect-path-escape`
- `STAGE~1.FOO/x`                            → `redirect-path-short-name`
- `.openclaw/.stage/SECRETS.md:hidden`       → `redirect-path-ads`
- `.openclaw/.stage/link-outside` (symlink)  → `redirect-path-symlink-escape`

No file is written anywhere on disk for any of the four rejection cases
(SC-14 F-07 byte-level invariant). An audit-chain DecisionEntry with the
correct `invalidReason` is still emitted (SC-14 F-08 — silent rejection
would blind forensic analysis).

## Policy

- Tool surface: `before_workspace_file_ingest`.
- Classifier: `SECRETS.md` → RESTRICTED.
- Provider returns `modify` with a traversal-shaped `redirectPath`.
- Host's `canonicalizeRedirect` (P-03 canonicalizer at
  `@bic/openclaw-workspace/path-canonical`) catches every vector and
  routes the merged decision to `deny` with the matching `invalidReason`.

## Notes

- The canonicalizer is a pure function on steps 1-5 + 7; step 6 (`fs.realpath`)
  is exercised by the prestaged-symlink integration fallback when the CI
  runner lacks `SeCreateSymbolicLinkPrivilege`.
