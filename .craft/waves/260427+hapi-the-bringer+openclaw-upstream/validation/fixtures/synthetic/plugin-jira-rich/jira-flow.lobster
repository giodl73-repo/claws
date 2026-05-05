# jira-flow.lobster — workflow shipped by the jira plugin

name: jira-jira-flow
description: work workflow

steps:
  - id: prepare
    pipeline: jira/prepare
    out: prepared

  - id: act
    pipeline: jira/create-ticket
    in: prepared
    out: result
