# selenium-flow.lobster — workflow shipped by the selenium plugin

name: selenium-selenium-flow
description: testing workflow

steps:
  - id: prepare
    pipeline: selenium/prepare
    out: prepared

  - id: act
    pipeline: selenium/driver-session
    in: prepared
    out: result
