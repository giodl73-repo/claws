# signal-flow.lobster — workflow shipped by the signal plugin

name: signal-signal-flow
description: communication workflow

steps:
  - id: prepare
    pipeline: signal/prepare
    out: prepared

  - id: act
    pipeline: signal/send-message
    in: prepared
    out: result
