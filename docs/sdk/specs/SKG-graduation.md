# SKG — Graduation

**Sub-spec of**: [SK-sdk.md](./SK-sdk.md) · **Absorbs**: CL-08 graduation model

## Graduation states

Every feature in the SDK lives in one of three states:

| State          | Meaning                                     | Visibility                         |
| -------------- | ------------------------------------------- | ---------------------------------- |
| **incubating** | New feature, internal APIs likely to change | Internal subpaths only             |
| **graduated**  | Stable, tested, externally usable           | Exposed on `/api` facade           |
| **deprecated** | Replaced; kept for compat                   | `@deprecated` tag, 2-version grace |

## Graduation criteria

A feature graduates from incubating → graduated when ALL of:

1. **Public-API shape settled**: 1+ minor version of internal
   consumer stability; no breaking changes in the last 4 weeks
2. **Test coverage** meets per-file threshold (95/90/95/95)
3. **Scenarios landed**: every new decision/branch has an L1
   integration scenario OR L2 e2e scenario
4. **Sub-spec merged**: SKA updates to document the public-API
   shape
5. **CHANGELOG entry**: "Graduated {feature} from incubating to
   stable"

## Breaking change policy

Once graduated, changes follow strict semver:

| Change                                     | Bump  | Notice                       |
| ------------------------------------------ | ----- | ---------------------------- |
| Fix a bug (behaviour change to match spec) | patch | CHANGELOG                    |
| Add optional param / new function          | minor | CHANGELOG                    |
| Change error type / remove field           | major | migration guide              |
| Remove function                            | major | 2-version deprecation window |

A graduated feature CANNOT revert to incubating. It can deprecate
and be replaced, but never "un-graduate".

See [../pitfalls/imports.md](../pitfalls/imports.md) for the breaking-change
traps this policy catches.

## Who decides

Graduation is a PR decision by the SDK maintainer + one architect
review. The gating check is the SKA spec update — if the public-API
shape is settled enough to document, it's graduated.
