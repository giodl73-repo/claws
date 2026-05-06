# kafka-flow.lobster — workflow shipped by the kafka plugin

name: kafka-kafka-flow
description: data workflow

steps:
  - id: prepare
    pipeline: kafka/prepare
    out: prepared

  - id: act
    pipeline: kafka/produce
    in: prepared
    out: result
