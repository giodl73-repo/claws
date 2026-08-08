# Tools

Canonical heading shape: `### name # R<n>, CAPS, sensitivity:level`.

## Tools

### read-file # R1, READ, sensitivity:internal

Read a file from the local filesystem. Safe; observe-only.

### list-dir # R1, READ, sensitivity:internal

List the entries of a directory.

### write-file # R3, WRITE, sensitivity:internal

Write a file to the local filesystem. Mutating; reversible.

### http-get # R2, READ, COMMUNICATE, sensitivity:internal

Issue an HTTP GET to an allowlisted host.

### send-email # R5, COMMUNICATE, IRREVERSIBLE_EXTERNAL, sensitivity:restricted

Send an email via the configured SMTP gateway. R5 because outbound
communications are irreversible.
