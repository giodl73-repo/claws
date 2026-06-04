param(
  [string]$Distro = $(if ($env:CLAWS_WSL_DISTRO) { $env:CLAWS_WSL_DISTRO } else { "Ubuntu" }),
  [string]$User = $(if ($env:CLAWS_WSL_USER) { $env:CLAWS_WSL_USER } else { "root" }),
  [string]$Root = $(if ($env:CLAWS_WSL_ROOT) { $env:CLAWS_WSL_ROOT } else { "/root/src" })
)

$ErrorActionPreference = "Stop"

function Quote-BashSingle([string]$Value) {
  return "'" + $Value.Replace("'", "'\''") + "'"
}

$script = @'
set -uo pipefail
root=__ROOT__
find "$root" -maxdepth 1 -type d \( -name "openclaw*" -o -name "lobster*" -o -name "rfcs*" \) -printf "%f\n" | sort | while read -r name; do
    path="$root/$name"
    if git -C "$path" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      branch="$(git -C "$path" branch --show-current 2>/dev/null || true)"
      if status="$(git -C "$path" status --short 2>/dev/null)"; then
        short="$(printf "%s\n" "$status" | sed '/^$/d' | wc -l | tr -d " ")"
        printf "%-48s branch=%-36s dirty=%s\n" "$name" "${branch:-detached}" "$short"
      else
        printf "%-48s branch=%-36s dirty=unknown status=git-status-failed\n" "$name" "${branch:-detached}"
      fi
    else
      printf "%-48s non-git\n" "$name"
    fi
  done
'@

$script = $script.Replace("__ROOT__", (Quote-BashSingle $Root))
$script = $script.Replace("`r`n", "`n").Replace("`r", "")
$script | wsl.exe -d $Distro -u $User -- bash -lc "tr -d '\r' | bash -s"
exit $LASTEXITCODE
