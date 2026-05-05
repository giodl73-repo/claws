# todoist-flow.lobster — workflow shipped by the todoist plugin

name: todoist-todoist-flow
description: productivity workflow

steps:
  - id: prepare
    pipeline: todoist/prepare
    out: prepared

  - id: act
    pipeline: todoist/create-task
    in: prepared
    out: result
