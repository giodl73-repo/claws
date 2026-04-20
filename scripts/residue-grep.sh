#!/usr/bin/env bash
# residue-grep.sh — 3-pass migration residue scanner for the claws repo.
#
# Authoritative spec: CL-13 v1.7 §Validation (3-pass regex amendment).
#
# Pass 1 (source residue):        @craftworks/(clawc-|agent-sdk|compiler-sdk|craftworks-sdk)
# Pass 2 (cross-scope leak):      @bic/clawc-* inside packages/openclaw-*/ (production code + dependencies)
# Pass 3 (allowlist enforcement): @bic/openclaw-* must be in {workspace, guardrails, policy, snap}
#
# Modes:
#   --mode=staged  Scan only staged files (pre-commit mode; default)
#   --mode=ci      Scan the full repo tracked tree (CI mode)
#
# Exits 0 if no unallowlisted violations, 1 otherwise.
# Prints violations one-per-line in form: PASS<n>\t<path>\t<line>\t<match>
#
# Zero runtime deps: pure bash + POSIX grep. No node_modules, no npx, no tsx.
# Bulk-scan design: one `grep -oHE` per pass (emits file:line:match directly).
# Scales to CI-mode repo-wide scan under 30s target without per-hit subshells.

set -euo pipefail

MODE="staged"
ALLOWLIST="${ALLOWLIST:-.no-craftworks-allowlist.yaml}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# CL-13 v1.7 regex patterns — kept in sync with tools/migration/residue-grep-validator.ts
# (craftworks-side validator diffs this script against the spec on every build).
PASS1_PATTERN='@craftworks/(clawc-|agent-sdk|compiler-sdk|craftworks-sdk)'
PASS2_PATTERN='@bic/clawc-'
PASS3_PATTERN='@bic/openclaw-([a-zA-Z0-9_-]+)'
PASS3_ALLOWED='^(workspace|guardrails|policy|snap|lsp)$'

while [ $# -gt 0 ]; do
  case "$1" in
    --mode=staged) MODE="staged" ;;
    --mode=ci)     MODE="ci" ;;
    --help|-h)
      sed -n '2,18p' "$0"
      exit 0 ;;
    *) echo "residue-grep: unknown arg: $1" >&2; exit 2 ;;
  esac
  shift
done

# File list, then filtered-file list.
if [ "$MODE" = "staged" ]; then
  RAW_FILES="$(git diff --cached --name-only --diff-filter=ACMR || true)"
else
  RAW_FILES="$(git ls-files)"
fi

if [ -z "$RAW_FILES" ]; then exit 0; fi

TMPFILES="$(mktemp)"
trap 'rm -f "$TMPFILES"' EXIT

printf '%s\n' "$RAW_FILES" | while IFS= read -r f; do
  [ -z "$f" ] && continue
  [ -f "$f" ] || continue
  case "$f" in
    *.png|*.jpg|*.gif|*.ico|*.pdf|*.zip|*.tar|*.gz|*.woff|*.woff2|*.ttf|*.otf) continue ;;
    node_modules/*|dist/*|build/*|coverage/*|.git/*) continue ;;
  esac
  printf '%s\n' "$f" >> "$TMPFILES"
done

if [ ! -s "$TMPFILES" ]; then exit 0; fi

# Build allowlist regex file for grep -vEf filtering of file paths.
ALLOWFILE="$(mktemp)"
trap 'rm -f "$TMPFILES" "$ALLOWFILE"' EXIT
if [ -f "$ALLOWLIST" ]; then
  sed -n 's/^[[:space:]]*-[[:space:]]*path:[[:space:]]*["'"'"']\{0,1\}\([^"'"'"']*\)["'"'"']\{0,1\}.*$/\1/p' "$ALLOWLIST" \
    | while IFS= read -r glob; do
      [ -z "$glob" ] && continue
      printf '%s' "$glob" | sed -e 's/[.]/\\./g' -e 's|\*\*|__DBL__|g' -e 's|\*|[^/]*|g' -e 's|__DBL__|.*|g' -e 's|^|^|' -e 's|$|$|'
      echo
    done >> "$ALLOWFILE"
fi

# grep -vEf with an empty file matches nothing; ensure at least one never-match line.
if [ ! -s "$ALLOWFILE" ]; then
  echo '__NEVER_MATCHES__' > "$ALLOWFILE"
fi

VIOLATIONS_FILE="$(mktemp)"
trap 'rm -f "$TMPFILES" "$ALLOWFILE" "$VIOLATIONS_FILE"' EXIT

# ── Pass 1 file set: TMPFILES minus any path matching an allowlist regex.
PASS1_FILES="$(grep -vEf "$ALLOWFILE" "$TMPFILES" 2>/dev/null || true)"
PASS1_FILES_TMP="$(mktemp)"
trap 'rm -f "$TMPFILES" "$ALLOWFILE" "$VIOLATIONS_FILE" "$PASS1_FILES_TMP"' EXIT
printf '%s\n' "$PASS1_FILES" > "$PASS1_FILES_TMP"

# Pass 1 scan. `-o` prints the match only; `-H` forces filename display;
# `-n` adds line number. Output: path:lineno:match — split on first two colons.
if [ -s "$PASS1_FILES_TMP" ]; then
  (xargs -a "$PASS1_FILES_TMP" -d '\n' -r grep -oHn -E "$PASS1_PATTERN" 2>/dev/null || true) \
    | while IFS= read -r line; do
        [ -z "$line" ] && continue
        file="${line%%:*}"; rest="${line#*:}"
        lineno="${rest%%:*}"; match="${rest#*:}"
        printf 'PASS1\t%s\t%s\t%s\n' "$file" "$lineno" "$match" >> "$VIOLATIONS_FILE"
      done
fi

# ── Pass 2: @bic/clawc-* in packages/openclaw-* src|dist.
grep -E '^packages/openclaw-[^/]+/(src|dist)/' "$TMPFILES" > "${TMPFILES}.pass2" 2>/dev/null || true
if [ -s "${TMPFILES}.pass2" ]; then
  (xargs -a "${TMPFILES}.pass2" -d '\n' -r grep -oHn -E "${PASS2_PATTERN}[a-zA-Z0-9_-]+" 2>/dev/null || true) \
    | while IFS= read -r line; do
        [ -z "$line" ] && continue
        file="${line%%:*}"; rest="${line#*:}"
        lineno="${rest%%:*}"; match="${rest#*:}"
        printf 'PASS2\t%s\t%s\t%s\n' "$file" "$lineno" "$match" >> "$VIOLATIONS_FILE"
      done
fi
rm -f "${TMPFILES}.pass2"

# ── Pass 2b: @bic/clawc-* in production dependencies of packages/openclaw-*/package.json.
(grep -E '^packages/openclaw-[^/]+/package\.json$' "$TMPFILES" || true) | while IFS= read -r pkg; do
  [ -z "$pkg" ] && continue
  deps_block="$(awk '
    /^[[:space:]]*"dependencies"[[:space:]]*:[[:space:]]*\{/ {
      inblock = 1; depth = 0;
      line = $0;
      for (i = 1; i <= length(line); i++) {
        c = substr(line, i, 1);
        if (c == "{") depth++;
        else if (c == "}") depth--;
      }
      if (depth == 0) { inblock = 0; print line; next; }
      print line; next;
    }
    inblock {
      print $0;
      line = $0;
      for (i = 1; i <= length(line); i++) {
        c = substr(line, i, 1);
        if (c == "{") depth++;
        else if (c == "}") depth--;
      }
      if (depth == 0) inblock = 0;
    }
  ' "$pkg" 2>/dev/null || true)"
  if printf '%s' "$deps_block" | grep -qE "$PASS2_PATTERN"; then
    match="$(printf '%s' "$deps_block" | grep -oE "${PASS2_PATTERN}[a-zA-Z0-9_-]+" | head -1 || true)"
    printf 'PASS2\t%s\t0\t%s\n' "$pkg" "$match" >> "$VIOLATIONS_FILE"
  fi
done

# ── Pass 3: @bic/openclaw-* must resolve to {workspace,guardrails,policy,snap,lsp}.
#    Skip allowlisted paths (parity with Pass 1).
(xargs -a "$TMPFILES" -d '\n' -r grep -oHn -E "$PASS3_PATTERN" 2>/dev/null || true) \
  | while IFS= read -r line; do
      [ -z "$line" ] && continue
      file="${line%%:*}"; rest="${line#*:}"
      lineno="${rest%%:*}"; match="${rest#*:}"
      # Skip allowlisted paths.
      if printf '%s' "$file" | grep -qEf "$ALLOWFILE"; then continue; fi
      suffix="${match#@bic/openclaw-}"
      if ! printf '%s' "$suffix" | grep -qE "$PASS3_ALLOWED"; then
        printf 'PASS3\t%s\t%s\t%s\n' "$file" "$lineno" "$match" >> "$VIOLATIONS_FILE"
      fi
    done

if [ ! -s "$VIOLATIONS_FILE" ]; then
  echo "residue-grep: mode=${MODE} — 0 violations"
  exit 0
fi

echo "residue-grep: mode=${MODE} — VIOLATIONS FOUND"
cat "$VIOLATIONS_FILE"
exit 1
