---
covers: [atom:TXA, atom:TXD/17-codes]
---

# Accept-test system

End-to-end walk through the accept-test system: manifest-driven
series, scenario discovery, runner dispatch, min-count enforcement,
and doc-validation coverage.

## The three-layer model

```
  package/
    scenarios/
      manifest.yaml          ← 1. manifest: series → runner + min
      WSP/                   ← 2. series dir
        SC-01-traversal.md   ← 3. scenario files
        SC-02-drive.md
        SC-03-symlink.md
```

## Running

```bash
# From package root
claws test accept
```

Scans `scenarios/manifest.yaml`, discovers every declared series,
walks series dirs, runs each scenario through its registered
runner, reports pass/fail.

## Min-count enforcement

Every manifest entry declares a `min`. If the series dir has fewer
files than `min`, the accept-runner reports a BLOCK:

```
[BLOCK] accept-runner/under-min-count: workspace/scenarios/WSP/ has 2 scenarios; manifest requires min 3
```

See [../pitfalls/validation.md § P-01 Min-count surprises](../pitfalls/validation.md).

## Undeclared series

A series DIR without a manifest ENTRY is a BLOCK:

```
[BLOCK] accept-runner/undeclared-series: workspace: scenarios/XYZ/ has no entry in manifest.yaml
```

Every dir must be declared; no implicit series.

## Unknown runner

A manifest entry whose `runner` is not registered emits a WARN:

```
[WARN]  accept-runner/unknown-runner: workspace/scenarios/WSP/: runner 'future-sim' not registered
```

This lets implementation pulses land scenarios ahead of the runner.
The runner lands later and the WARN disappears.

## The 17 doc diagnostic codes

Accept-runner focus is on scenario discovery. The SIBLING
doc-validation gate (TXD) emits 17 codes across doc-structure,
atom-coverage, and readme-reachability. See
[../specs/TXD-doc-validation.md § 17 diagnostic codes](../specs/TXD-doc-validation.md)
for the full list.

## CI integration

- `claws test accept` runs in every PR (via claws-action)
- `claws doctor` also runs accept-runner as one of its checks
- Per-package `test:accept` npm script can target a single package

## Writing a new scenario

1. Pick the correct 3-letter series code
2. Create `scenarios/{CODE}/SC-NN-{slug}.md`
3. Add frontmatter (if the series' parent atom declares need
   'scenarios')
4. Fill in the standard sections: Setup, Input, Expected, Proves
5. If min-count increments, ensure you've met the new min

The accept-runner picks the new file up on the next run — no
registration step.
