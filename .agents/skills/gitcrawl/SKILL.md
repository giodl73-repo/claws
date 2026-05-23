---
name: gitcrawl
description: "GitHub archive: issue/PR search, sync freshness, duplicate clusters, gh-shim PR status, and Gitcrawl repo work."
metadata:
  openclaw:
    homepage: https://github.com/openclaw/gitcrawl
    requires:
      bins:
        - gitcrawl
    install:
      - kind: go
        module: github.com/openclaw/gitcrawl/cmd/gitcrawl@latest
        bins:
          - gitcrawl
---

# Gitcrawl

Use local GitHub issue/PR archives before live GitHub search. Check freshness first:

```bash
command -v gitcrawl || {
  command -v go >/dev/null || {
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y golang-go
  }
  go install github.com/openclaw/gitcrawl/cmd/gitcrawl@latest
  install -D -m 0755 "$(go env GOPATH)/bin/gitcrawl" /usr/local/bin/gitcrawl
}
gitcrawl doctor --json
```

If `doctor` reports no config or a missing database, initialize once:

```bash
gitcrawl init --json
```

For specific issue/PR work, prefer a targeted refresh before broad discovery:

```bash
gitcrawl sync openclaw/openclaw --numbers <issue-or-pr-number> --include-pr-details --json
gitcrawl threads openclaw/openclaw --numbers <issue-or-pr-number> --include-closed --json
```

Avoid broad `gitcrawl sync openclaw/openclaw --state open --include-pr-details` unless explicitly refreshing the archive; it can take many minutes. Use targeted syncs for normal PR/issue triage.

Find candidates:

```bash
gitcrawl neighbors openclaw/openclaw --number <issue-or-pr-number> --limit 12 --json
gitcrawl search issues "query" -R openclaw/openclaw --state open --json number,title,url
gitcrawl clusters openclaw/openclaw --sort size --min-size 5
gitcrawl cluster-detail openclaw/openclaw --id <cluster-id>
```

For PR triage, start cached and go live only before mutation/merge decisions:

```bash
gitcrawl gh pr status <number-or-url> -R openclaw/openclaw --compact
gitcrawl gh pr view <number-or-url> -R openclaw/openclaw --json number,title,state,url,isDraft,headRef,headSha
gitcrawl gh --live pr status <number-or-url> -R openclaw/openclaw --compact
```

Use live `gh` plus checkout proof before commenting, labeling, closing, reopening, merging, or filing a PR review:

```bash
gh pr view <number> --json number,title,state,mergedAt,body,files,comments,reviews,statusCheckRollup
gh issue view <number> --json number,title,state,body,comments,closedAt
```

Report absolute dates, repo names, issue/PR numbers, cluster ids, and source gaps. Do not close/label from similarity alone; require matching intent plus live verification.
