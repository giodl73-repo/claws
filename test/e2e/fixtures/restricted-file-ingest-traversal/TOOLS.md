# restricted-file-ingest-traversal fixture — TOOLS

## tool: workspace.file.ingest

- peer: FileIngestProvider
- hook: before_workspace_file_ingest
- declaredTier: R5
- dataClassification: RESTRICTED
- action: deny (via path-canonicalizer rejection)

R5/RESTRICTED file ingest. The provider returns `modify` with a
`redirectPath` that escapes `.openclaw/.stage/` in one of four P-03 modes.
The host canonicalizer rejects each with a distinct `invalidReason`; the
merged decision is `deny` and no bytes are written to disk.
