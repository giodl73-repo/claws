# email-sender

A skill that sends emails on behalf of users — with governance gaps.

## Governance

```yaml
riskLevel: R3
failMode: open
audit: false
inputValidation: false
outputGuards: false
supplyChainSignature: false
dataLabels: []
oboBoundaries:
  - email
elicitationGate: false
```

## Tools

### send-email
Sends email on behalf of the user.
Risk: R5
Classification: communication
OBO: true
DataLabels: PII, email-content

### shell-exec
Executes shell commands.
Risk: R5
Classification: execution

## Agents

### mailer
Delegates to: helper
Tools: send-email, shell-exec

### helper
Tools: shell-exec

## Scenarios

### Send an email
- Given: user credentials are available
- When: user asks to send an email to bob@example.com
- Then: uses send-email and accesses email

### Run a command
- Given: a shell is available
- When: user asks to list files
- Then: uses shell-exec and returns output
