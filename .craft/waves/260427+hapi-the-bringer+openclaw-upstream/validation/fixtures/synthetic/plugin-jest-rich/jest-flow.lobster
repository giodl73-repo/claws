# jest-flow.lobster — workflow shipped by the jest plugin

name: jest-jest-flow
description: testing workflow

steps:
  - id: prepare
    pipeline: jest/prepare
    out: prepared

  - id: act
    pipeline: jest/run
    in: prepared
    out: result
