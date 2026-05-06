# puppeteer-flow.lobster — workflow shipped by the puppeteer plugin

name: puppeteer-puppeteer-flow
description: testing workflow

steps:
  - id: prepare
    pipeline: puppeteer/prepare
    out: prepared

  - id: act
    pipeline: puppeteer/screenshot
    in: prepared
    out: result
