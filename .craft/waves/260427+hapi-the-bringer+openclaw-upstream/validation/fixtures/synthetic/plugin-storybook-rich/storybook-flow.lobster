# storybook-flow.lobster — workflow shipped by the storybook plugin

name: storybook-storybook-flow
description: testing workflow

steps:
  - id: prepare
    pipeline: storybook/prepare
    out: prepared

  - id: act
    pipeline: storybook/build
    in: prepared
    out: result
