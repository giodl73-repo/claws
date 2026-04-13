# file-reader

A simple file-reading skill with proper governance.

## Governance

```yaml
riskLevel: R2
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
  tokenBudget: 10000
  maxRecursionDepth: 3
```

## Tools

### file-read
Reads files from the local filesystem.
Risk: R2
Classification: filesystem

## Agents

### assistant
Tools: file-read

## Scenarios

### Read a text file
- Given: a workspace with a file at path/to/file.txt
- When: user asks to read path/to/file.txt
- Then: returns the file content

### Handle missing file
- Given: a workspace without the requested file
- When: user asks to read nonexistent.txt
- Then: fails with a clear error message
