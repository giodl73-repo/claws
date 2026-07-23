# @bic/openclaw-workspace — Atom Registry

Authoritative atom registry for the workspace package. Every atom listed
here MUST have its declared `Needs` met by a spec-prefix-matched file or
a doc file with `covers: [atom:XX]` frontmatter. See
`devtools/repo-ops/src/check.ts` for validation.

| Atom ID                     | Name                       | Parent   | Needs               |
| --------------------------- | -------------------------- | -------- | ------------------- |
| atom:WS                     | workspace package          | —        | spec                |
| atom:WSP                    | oc-path                    | —        | spec, guide         |
| atom:WSP/rejection-vectors  | 12 rejection vectors       | atom:WSP | pitfalls, scenarios |
| atom:WSP/defence-in-depth   | defence-in-depth rule      | atom:WSP | how-to              |
| atom:WSC                    | canonicalize               | —        | spec, scenarios     |
| atom:WSC/algorithm-version  | algorithm version tracking | atom:WSC | pitfalls            |
| atom:WSA                    | workspace AST              | —        | spec, guide         |
| atom:WSE                    | emitter                    | —        | spec                |
| atom:WSE/lossless-roundtrip | byte-for-byte fidelity     | atom:WSE | pitfalls            |
