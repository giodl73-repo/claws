# flutter-flow.lobster — workflow shipped by the flutter plugin

name: flutter-flutter-flow
description: mobile workflow

steps:
  - id: prepare
    pipeline: flutter/prepare
    out: prepared

  - id: act
    pipeline: flutter/run
    in: prepared
    out: result
