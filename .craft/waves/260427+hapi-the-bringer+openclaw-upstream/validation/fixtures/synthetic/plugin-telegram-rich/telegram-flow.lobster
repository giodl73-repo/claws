# telegram-flow.lobster — workflow shipped by the telegram plugin

name: telegram-telegram-flow
description: communication workflow

steps:
  - id: prepare
    pipeline: telegram/prepare
    out: prepared

  - id: act
    pipeline: telegram/send-message
    in: prepared
    out: result
