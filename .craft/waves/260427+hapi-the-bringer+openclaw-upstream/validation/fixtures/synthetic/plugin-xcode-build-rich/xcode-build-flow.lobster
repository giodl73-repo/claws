# xcode-build-flow.lobster — workflow shipped by the xcode-build plugin

name: xcode-build-xcode-build-flow
description: mobile workflow

steps:
  - id: prepare
    pipeline: xcode-build/prepare
    out: prepared

  - id: act
    pipeline: xcode-build/build
    in: prepared
    out: result
