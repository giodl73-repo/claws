# whatsapp-flow.lobster — workflow shipped by the whatsapp plugin

name: whatsapp-whatsapp-flow
description: communication workflow

steps:
  - id: prepare
    pipeline: whatsapp/prepare
    out: prepared

  - id: act
    pipeline: whatsapp/send-message
    in: prepared
    out: result
