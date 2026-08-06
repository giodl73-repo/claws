# Codeprints Project

Use this area for Codeprints product framing, owner-led factorization evidence,
and coordination with the implementation repository at `C:\src\codeprints`.

## Active Notes

| Area | File |
| ---- | ---- |
| Current handoff | `SESSION.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| ---- | ---------- | ------ | ------ | ------- |
| `giodl_microsoft/CODEPRINTS` | no PR | `user/giodl/factor-draft-projection` | Verified, uncommitted | Target-neutral FLETCH compatibility proof plus provenance-locked Rust contract draft |

## Current Thesis

```text
working native repository
+ provenance-locked accepted structural candidate
+ explicit owner field decisions
-> reviewable contract draft without replacing native authority
```

The repository inventory and proposal contract must be language-neutral.
Language analyzers supply syntax-specific facts and native proof. C# was first
because Codeprints already had a C# target and compatibility oracle. The Rust
ICELINES pilot proves that .NET is not the product boundary without authorizing
a generated Rust target. Owners can now bind explicit stable IDs to candidates
from one exact proposal digest; this records review but does not extract,
convert, or transfer source authority.

The draft slice adds a second exact decision over accepted Rust candidates. It
emits parser-valid contract text on stdout for `String` and `bool` fields only.
It writes no files, infers no identities or package placement, and rejects
unsupported types rather than narrowing them.

## Next Destination

The next milestone is a usable owner change loop, not broader factorization:
one reviewed Codeprint replaces a repeated structural authority, previews its
semantic/compatibility/native effects, generates only declared structure,
passes unchanged owner tests, beats a matched direct-native change on review
cost, and ejects cleanly. Owner-scenario discovery comes before choosing .NET,
Rust, or another target.

The selected first scenario is FLETCH's shared `CacheIndexEntry` contract.
Phase A now proves target-neutral JSON compatibility value: an additive
`object_path` alias is allowed, while a canonical rename is blocked for old
readers. The next decision is whether to build only the bounded Phase B
Rust/Serde and selector projection and compare it with the retained
direct-native edit.

## Related Areas

- `C:\src\codeprints\docs\product\OWNER_PILOT.md`
- `C:\src\codeprints\docs\specs\V1-MATCHED-NATIVE-VALIDATION.md`
- `C:\src\tracker\dependency-systems\codeprints-usage.md`
