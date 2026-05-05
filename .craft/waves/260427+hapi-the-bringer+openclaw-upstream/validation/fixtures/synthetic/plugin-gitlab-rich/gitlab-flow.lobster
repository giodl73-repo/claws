# gitlab-flow.lobster — workflow shipped by the gitlab plugin

name: gitlab-gitlab-flow
description: developer workflow

steps:
  - id: prepare
    pipeline: gitlab/prepare
    out: prepared

  - id: act
    pipeline: gitlab/create-mr
    in: prepared
    out: result
