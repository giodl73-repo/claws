# expo-flow.lobster — workflow shipped by the expo plugin

name: expo-expo-flow
description: mobile workflow

steps:
  - id: prepare
    pipeline: expo/prepare
    out: prepared

  - id: act
    pipeline: expo/build
    in: prepared
    out: result
