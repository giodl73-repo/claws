# Tools

| name       | risk | description                                   |
| ---------- | ---- | --------------------------------------------- |
| read-file  | R1   | read a file from the local filesystem         |
| write-file | R3   | write a file to the local filesystem          |
| send-email | R5   | send an email via the configured SMTP gateway |
| list-dir   | R1   | list the entries of a directory               |
| http-get   | R2   | issue an HTTP GET to an allowlisted host      |

## Deny rules

- never invoke `rm -rf`
- never read files outside the workspace
- never send email to addresses not on the allowlist
