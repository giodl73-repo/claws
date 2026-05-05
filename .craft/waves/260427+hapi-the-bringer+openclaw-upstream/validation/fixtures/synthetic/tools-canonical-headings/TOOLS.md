# Tools

The canonical heading shape that `policy-substrate`'s `tools-from-tools-md`
extractor recognizes: `### name # R<n>, CAPS`. Use this fixture to verify
policy-generate actually extracts tools end-to-end.

## Tools

### read-file # R1, READ
Read a file from the local filesystem.

### write-file # R3, WRITE
Write a file to the local filesystem.

### http-get # R2, READ, COMMUNICATE, sensitivity:internal
Issue an HTTP GET to an allowlisted host.

### send-email # R5, COMMUNICATE, IRREVERSIBLE_EXTERNAL, sensitivity:restricted
Send an email via the configured SMTP gateway.

### list-dir # R1, READ
List the entries of a directory.
