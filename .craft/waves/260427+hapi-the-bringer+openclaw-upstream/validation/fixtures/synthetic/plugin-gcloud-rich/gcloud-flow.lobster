# gcloud-flow.lobster — workflow shipped by the gcloud plugin

name: gcloud-gcloud-flow
description: infra workflow

steps:
  - id: prepare
    pipeline: gcloud/prepare
    out: prepared

  - id: act
    pipeline: gcloud/list-projects
    in: prepared
    out: result
