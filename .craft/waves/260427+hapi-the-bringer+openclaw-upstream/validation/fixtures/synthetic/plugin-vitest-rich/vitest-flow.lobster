# vitest-flow.lobster — workflow shipped by the vitest plugin

name: vitest-vitest-flow
description: testing workflow

steps:
  - id: prepare
    pipeline: vitest/prepare
    out: prepared

  - id: act
    pipeline: vitest/run
    in: prepared
    out: result
