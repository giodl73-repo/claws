# code-workspace

A verified Tier 3 skill with full governance coverage.

## Governance

```yaml
riskLevel: R3
failMode: closed
audit: true
inputValidation: true
outputGuards: true
supplyChainSignature: true
dataLabels:
  - internal
oboBoundaries: []
elicitationGate: false
reasoningLimits:
  tokenBudget: 50000
  maxRecursionDepth: 5
  maxSteps: 10
```

## Tools

### file-read
Reads files from the local filesystem.
Risk: R2
Classification: filesystem

### file-write
Writes files to the local filesystem.
Risk: R3
Classification: filesystem

## Agents

### assistant
Tools: file-read, file-write

## Scenarios

### Read a workspace file
- Given: a workspace with source files
- When: user asks to read src/main.ts
- Then: returns the file content with PII redacted

### Write a workspace file
- Given: a workspace with write permissions
- When: user asks to write output to result.txt
- Then: validates input and writes the file

### Handle oversized input
- Given: a workspace with bounded limits
- When: user sends input exceeding 4096 characters
- Then: rejects with a clear error message
