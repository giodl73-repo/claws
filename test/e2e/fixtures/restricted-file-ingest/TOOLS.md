# restricted-file-ingest fixture — TOOLS

## tool: workspace.file.ingest

- peer: FileIngestProvider
- hook: before_workspace_file_ingest
- declaredTier: R5
- dataClassification: RESTRICTED
- action: review

R5/RESTRICTED file ingest. The provider returns
`{ decision: 'review', approvalHandle }`; the companion programs the final
verdict (`allow` for SC-11, `deny` for SC-12). SC-13 swaps the provider for
a modify variant that returns `redirectPath: '.openclaw/.stage/SECRETS.md'`.
