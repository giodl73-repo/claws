# playwright-flow.lobster — workflow shipped by the playwright plugin

name: playwright-playwright-flow
description: testing workflow

steps:
  - id: prepare
    pipeline: playwright/prepare
    out: prepared

  - id: act
    pipeline: playwright/screenshot
    in: prepared
    out: result
