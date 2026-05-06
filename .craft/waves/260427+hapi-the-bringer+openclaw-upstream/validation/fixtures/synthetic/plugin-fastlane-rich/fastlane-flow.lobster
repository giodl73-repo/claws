# fastlane-flow.lobster — workflow shipped by the fastlane plugin

name: fastlane-fastlane-flow
description: mobile workflow

steps:
  - id: prepare
    pipeline: fastlane/prepare
    out: prepared

  - id: act
    pipeline: fastlane/screenshot
    in: prepared
    out: result
