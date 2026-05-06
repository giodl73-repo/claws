# gradle-android-flow.lobster — workflow shipped by the gradle-android plugin

name: gradle-android-gradle-android-flow
description: mobile workflow

steps:
  - id: prepare
    pipeline: gradle-android/prepare
    out: prepared

  - id: act
    pipeline: gradle-android/build
    in: prepared
    out: result
