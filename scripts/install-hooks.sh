#!/usr/bin/env bash
# install-hooks.sh — copy scripts/hooks/*.template into .git/hooks/.
#
# Run once after cloning the repo. Contributors whose hooks aren't
# installed will see CI rejections instead of local ones.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
SRC="${REPO_ROOT}/scripts/hooks"
DST="${REPO_ROOT}/.git/hooks"

mkdir -p "$DST"

for template in "$SRC"/*.template; do
  [ -f "$template" ] || continue
  hook_name="$(basename "$template" .template)"
  cp "$template" "${DST}/${hook_name}"
  chmod +x "${DST}/${hook_name}"
  echo "installed: .git/hooks/${hook_name}"
done
