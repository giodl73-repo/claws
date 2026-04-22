#!/usr/bin/env bash
# no-craftworks-runtime-imports.sh
#
# CI guard: fail CI (exit 1) if any `@craftworks/` runtime IMPORT appears
# anywhere under the roots listed below. Staged here by P54 (clawc-sdk sweep);
# P55 extended it to include clawc-serve/src; P56 narrowed the scan from
# literal substring to runtime-import regex as part of the CP-11 exit-criteria
# amendment (scanner regression fixtures, doc attestations, and scanner
# error-message strings legitimately carry the substring).
#
# Runtime-import gate only. Substring refs in guards/scanners/test fixtures/
# doc attestations are exempt per
# .craft/waves/260412+ra-the-radiant+clawc-graduation/checkpoints/cp-11.md
# Exit Criteria (amended P56).
#
# Usage:
#   scripts/ci/no-craftworks-runtime-imports.sh                # scan defaults
#   scripts/ci/no-craftworks-runtime-imports.sh path/to/src    # scan override
#
# Exit codes:
#   0 — clean (no runtime imports)
#   1 — forbidden runtime imports found (printed to stdout)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ $# -gt 0 ]; then
  ROOTS=("$@")
else
  ROOTS=(
    "packages/claws-sdk/src"
    "packages/claws-serve/src"
  )
fi

# Runtime-import regex: matches the four single-line runtime-import forms that
# Node/TypeScript emitters and bundlers actually produce:
#   1.  `import … from '@craftworks/…'`         (leading whitespace permitted)
#   2.  `import '@craftworks/…'`                 (side-effect import)
#   3.  `require('@craftworks/…')`               (CommonJS, anywhere on line)
#   4.  `import('@craftworks/…')`                (dynamic import, anywhere on line)
#
# Does NOT match substring refs inside doc comments, error-message strings, or
# scanner regression fixtures embedded inside quoted test strings.
#
# Known limitation: a line-split `from\n  '@craftworks/…'` is not catchable with
# a line-oriented grep. TypeScript emitters and common linters (prettier,
# eslint) do not emit this shape, so the gap is theoretical. A thorough close
# would require AST-based scanning (e.g. ts-morph) — recorded as a future
# improvement.
#
# Test fixtures that deliberately carry forbidden import-looking strings inside
# payload strings (to exercise the scanner regression tests) live in
# `*.unit.test.ts` files and are excluded via --exclude.
PATTERN="(^[[:space:]]*import[[:space:]].*@craftworks/|from[[:space:]]+['\"]@craftworks/|require\\([[:space:]]*['\"]@craftworks/|import\\([[:space:]]*['\"]@craftworks/)"

status=0
for root in "${ROOTS[@]}"; do
  case "$root" in
    /* | ?:*)  # absolute (POSIX or Windows drive) — use as-is
      target="$root"
      ;;
    *)
      target="${REPO_ROOT}/${root}"
      ;;
  esac
  if [ ! -d "$target" ]; then
    continue
  fi
  if matches="$(grep -rnE \
    --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' --include='*.cjs' \
    --exclude='*.unit.test.ts' \
    "$PATTERN" "$target" 2>/dev/null || true)"; then
    if [ -n "$matches" ]; then
      echo "FORBIDDEN: @craftworks/ runtime imports found under ${root}:"
      echo "$matches"
      status=1
    fi
  fi
done

exit "$status"
