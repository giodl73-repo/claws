# mysql-flow.lobster — workflow shipped by the mysql plugin

name: mysql-mysql-flow
description: data workflow

steps:
  - id: prepare
    pipeline: mysql/prepare
    out: prepared

  - id: act
    pipeline: mysql/query
    in: prepared
    out: result
