# TXD — Doc validation

**Sub-spec of**: [TX-test.md](./TX-test.md)

## 17 diagnostic codes

The doc-validation gate emits findings in three validator groups.

### doc-structure (6 codes)

| Code | Meaning | Severity |
|------|---------|----------|
| `required-top-file` | Missing README.md, ATOMS.md, or CHANGELOG.md | BLOCK |
| `no-extra-toplevel-md` | Unexpected .md at pkg root | BLOCK |
| `required-subdir` | Missing specs/, guides/, or scenarios/ subdir | BLOCK |
| `top-file-empty` | Required top file exists but is empty | BLOCK |
| `optional-subdir-unused` | Optional dir present but no atoms declare the need | WARN |
| `filename-casing` | Filename mixes case inconsistently | WARN |

### atom-coverage (6 codes)

| Code | Meaning | Severity |
|------|---------|----------|
| `spec-need-unsatisfied` | Atom needs 'spec' but no prefix-matched file in specs/ | BLOCK |
| `need-unsatisfied` | Atom needs X but no covers: [atom:Y] in X-dir/ | BLOCK |
| `unknown-atom-in-covers` | covers: [atom:Z] where Z not in ATOMS.md | BLOCK |
| `orphan-parent` | Sub-atom references parent that doesn't exist | BLOCK |
| `duplicate-atom` | Same atom ID declared twice | BLOCK |
| `covers-without-atoms` | File has covers: frontmatter but atom registry empty | WARN |

### readme-reachability (5 codes)

| Code | Meaning | Severity |
|------|---------|----------|
| `root-readme-missing` | docs/README.md doesn't exist | BLOCK |
| `unreachable-from-root-readme` | File exists but not reachable via link chain | BLOCK |
| `broken-link` | README.md link target doesn't exist | BLOCK |
| `circular-link` | Link chain has a cycle | WARN |
| `external-link-unverified` | External URL not reachable (advisory) | WARN |

## Exit-code semantics

- `0` — all green, no findings
- `1` — any BLOCK finding
- `2` — usage error (bad flag, missing --docs-dir)

## Output format

Text format (default):

```
[BLOCK] doc-structure/required-top-file: workspace: missing required top-level file README.md
[WARN]  atom-coverage/covers-without-atoms: specs/extra.md has covers but ATOMS.md is empty

repo-ops check: 1 BLOCK, 1 WARN
```

JSON format (`--json`):

```json
{
  "findings": [
    { "validator": "doc-structure", "severity": "BLOCK", "rule": "required-top-file", ... },
    ...
  ],
  "blockCount": 1,
  "warnCount": 1
}
```

## Fix modes

Some findings are auto-fixable. `--fix` attempts:

- `required-top-file` → creates empty file (WARN: operator should fill)
- `required-subdir` → creates empty dir
- `filename-casing` → renames file

`--fix` NEVER fixes atom-coverage or broken-link findings — those
require the operator to decide what the correct content is.
