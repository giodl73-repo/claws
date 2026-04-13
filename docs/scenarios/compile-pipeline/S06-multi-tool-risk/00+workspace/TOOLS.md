# Tool Guidance

## file-reader

- Risk: R1
- Capabilities: [READ]
- Description: Read files from the local workspace

## web-search

- Risk: R1
- Capabilities: [READ]
- Description: Search the web for documentation and references

## db-read

- Risk: R2
- Capabilities: [READ]
- Description: Query application database for records

## file-writer

- Risk: R3
- Capabilities: [WRITE]
- Description: Write files to the local workspace

## config-editor

- Risk: R3
- Capabilities: [WRITE]
- Description: Edit configuration files

## shell-exec

- Risk: R4
- Capabilities: [EXECUTE]
- Description: Execute shell commands in a sandboxed environment

## container-run

- Risk: R4
- Capabilities: [EXECUTE]
- Description: Run containers for build and test operations

## send-email

- Risk: R5
- Capabilities: [COMMUNICATE, TRANSACT]
- OBO: true
- Description: Send email on behalf of the user

## post-slack

- Risk: R5
- Capabilities: [COMMUNICATE, TRANSACT]
- OBO: true
- Description: Post messages to Slack channels as the user

## process-payment

- Risk: R5
- Capabilities: [TRANSACT]
- OBO: true
- Description: Process financial payments on behalf of the user
