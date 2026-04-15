# Tool Guidance

## Tool Guidance

| Tool | Guidance |
| --- | --- |
| `Bash` | Only run safe commands. Never rm -rf or format disk. |
| `Read` | Read any file in the workspace. |
| `Write` | Write files only in src/ and tests/ directories. |
| `DatabaseQuery` | Production read access to analytics DB. Risk: R4 |
| `SendSlack` | Send messages on behalf of the user via Slack API. OBO: true |
