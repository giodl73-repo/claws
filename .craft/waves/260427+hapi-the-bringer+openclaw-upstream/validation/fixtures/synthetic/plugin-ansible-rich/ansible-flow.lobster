# ansible-flow.lobster — workflow shipped by the ansible plugin

name: ansible-ansible-flow
description: infra workflow

steps:
  - id: prepare
    pipeline: ansible/prepare
    out: prepared

  - id: act
    pipeline: ansible/ping
    in: prepared
    out: result
