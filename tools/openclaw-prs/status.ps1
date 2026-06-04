param(
  [string]$Repo = "openclaw/openclaw",
  [string[]]$Authors = @("giodl73-repo", "giodl_microsoft"),
  [string]$Search = "fix in:title",
  [int]$Limit = 100,
  [int]$FailureLimit = 5,
  [string]$Distro = $(if ($env:CLAWS_WSL_DISTRO) { $env:CLAWS_WSL_DISTRO } else { "Ubuntu" }),
  [string]$User = $(if ($env:CLAWS_WSL_USER) { $env:CLAWS_WSL_USER } else { "root" })
)

$ErrorActionPreference = "Stop"

function Quote-BashSingle([string]$Value) {
  return "'" + $Value.Replace("'", "'\''") + "'"
}

$authorsCsv = $Authors -join ","

$script = @'
set -euo pipefail
export PATH="$HOME/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

repo="$1"
authors_csv="$2"
search="$3"
limit="$4"
failure_limit="$5"

python3 - "$repo" "$authors_csv" "$search" "$limit" "$failure_limit" <<'PY'
import json
import subprocess
import sys

repo, authors_csv, search, limit, failure_limit = sys.argv[1:]
failure_limit = int(failure_limit)
authors = [author.strip() for author in authors_csv.split(",") if author.strip()]

def run_json(args):
    proc = subprocess.run(args, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if not proc.stdout.strip():
        return None, proc.returncode, proc.stderr.strip()
    try:
        return json.loads(proc.stdout), proc.returncode, proc.stderr.strip()
    except json.JSONDecodeError:
        return None, proc.returncode, proc.stdout.strip() or proc.stderr.strip()

prs_by_number = {}
for author in authors:
    data, code, err = run_json([
        "gh", "pr", "list",
        "--repo", repo,
        "--author", author,
        "--state", "open",
        "--search", search,
        "--limit", str(limit),
        "--json", "number,title,url,isDraft,mergeStateStatus,reviewDecision,headRefName,updatedAt",
    ])
    if data is None:
        print(f"ERROR: could not list PRs for {author}: {err}", file=sys.stderr)
        continue
    for pr in data:
        pr["author"] = author
        prs_by_number[pr["number"]] = pr

prs = sorted(prs_by_number.values(), key=lambda pr: pr.get("updatedAt") or "", reverse=True)
print(f"Open PRs in {repo} matching {search!r}: {len(prs)}")
print("")

if not prs:
    sys.exit(0)

print("| PR | State | Review | Checks | Updated | Title |")
print("| --- | --- | --- | --- | --- | --- |")

details = []
for pr in prs:
    checks, _, check_err = run_json([
        "gh", "pr", "checks", str(pr["number"]),
        "--repo", repo,
        "--watch=false",
        "--json", "name,state,bucket,link",
    ])
    if checks is None:
        checks = []
        check_note = f"checks unavailable: {check_err}"
    else:
        check_note = ""

    failures = [check for check in checks if check.get("bucket") == "fail" or check.get("state") == "FAIL"]
    pending = [check for check in checks if check.get("bucket") == "pending" or check.get("state") in {"PENDING", "QUEUED", "IN_PROGRESS"}]
    checks_summary = f"{len(failures)} fail, {len(pending)} pending"
    state = "draft" if pr.get("isDraft") else (pr.get("mergeStateStatus") or "UNKNOWN")
    review = pr.get("reviewDecision") or "-"
    updated = (pr.get("updatedAt") or "")[:10]
    title = (pr.get("title") or "").replace("|", "\\|")
    print(f"| [#{pr['number']}]({pr['url']}) | {state} | {review} | {checks_summary} | {updated} | {title} |")

    view, _, view_err = run_json([
        "gh", "pr", "view", str(pr["number"]),
        "--repo", repo,
        "--json", "comments,reviews",
    ])
    reviews = (view or {}).get("reviews") or []
    comments = (view or {}).get("comments") or []
    requested = [
        review for review in reviews
        if (review.get("state") or "").upper() in {"CHANGES_REQUESTED", "REQUESTED_CHANGES"}
    ]
    sweeper_items = []
    for item in reviews + comments:
        author = ((item.get("author") or {}).get("login") or "").lower()
        body = (item.get("body") or "").replace("\n", " ").strip()
        if "clawsweeper" in author or "clawsweeper" in body.lower():
            sweeper_items.append((author or "unknown", body[:220]))

    if failures or pending or requested or sweeper_items or check_note or view_err:
        details.append((pr, failures, pending, requested, sweeper_items[-3:], check_note, view_err))

print("")
for pr, failures, pending, requested, sweeper_items, check_note, view_err in details:
    print(f"#{pr['number']} {pr['title']}")
    if check_note:
        print(f"  NOTE: {check_note}")
    if view_err:
        print(f"  NOTE: comments/reviews unavailable: {view_err}")
    for failure in failures[:failure_limit]:
        print(f"  FAIL: {failure.get('name')} {failure.get('link') or ''}".rstrip())
    if len(failures) > failure_limit:
        print(f"  FAIL: ... {len(failures) - failure_limit} more")
    for item in pending[:failure_limit]:
        print(f"  PENDING: {item.get('name')} {item.get('link') or ''}".rstrip())
    if len(pending) > failure_limit:
        print(f"  PENDING: ... {len(pending) - failure_limit} more")
    for review in requested[-3:]:
        author = ((review.get("author") or {}).get("login") or "unknown")
        body = (review.get("body") or "").replace("\n", " ").strip()[:220]
        print(f"  REQUESTED_CHANGES: {author}: {body}")
    for author, body in sweeper_items:
        print(f"  CLAWSWEEPER: {author}: {body}")
    print("")
PY
'@

$script = $script.Replace("`r`n", "`n").Replace("`r", "")
$args = @($Repo, $authorsCsv, $Search, "$Limit", "$FailureLimit") | ForEach-Object { Quote-BashSingle $_ }
$command = "tr -d '\r' | bash -s -- " + ($args -join " ")
$script | wsl.exe -d $Distro -u $User -- bash -lc $command
exit $LASTEXITCODE
