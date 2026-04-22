# two-provider-host fixture — TOOLS

## tool: records.export

- declaredTier: R5
- capability: data.restricted.read
- dataClassification: RESTRICTED
- requiredProviders: [security-review, compliance-review]

The single tool under SC-08/09/10. Both providers see the same
invocation and stamp their own `approvalHandle`s when they return
`review`; each handle's `contentHash` MUST equal the host-supplied
`ctx.canonicalInvocationHash`.
