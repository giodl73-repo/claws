# allow-r1-public fixture — TOOLS

## tool: weather.lookup

- declaredTier: R1
- capability: network.http.read
- dataClassification: PUBLIC
- action: allow

Minimal R1 tool that exercises the allow path. The scenario harness stamps
one invocation record (`invocationId`, `canonicalInvocationHash`) and asserts
the merged decision resolves to `allow` on first merger pass.
