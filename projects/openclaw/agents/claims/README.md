# Agent task claims

`active/` contains pushed coordination claims for work in progress.
`completed/` contains terminal claims worth preserving as handoff evidence.

Copy `template.yaml` to:

```text
active/<task-slug>.yaml
```

Do not put credentials, raw logs, transcripts, or private user data in a claim.
Git claims reduce accidental duplication but are not atomic locks.
