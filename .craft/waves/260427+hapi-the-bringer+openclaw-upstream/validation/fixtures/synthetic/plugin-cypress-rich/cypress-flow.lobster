# cypress-flow.lobster — workflow shipped by the cypress plugin

name: cypress-cypress-flow
description: testing workflow

steps:
  - id: prepare
    pipeline: cypress/prepare
    out: prepared

  - id: act
    pipeline: cypress/run-test
    in: prepared
    out: result
