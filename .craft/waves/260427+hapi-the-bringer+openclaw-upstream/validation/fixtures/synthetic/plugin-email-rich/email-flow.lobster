# email-flow.lobster — workflow shipped by the email plugin

name: email-email-flow
description: communication workflow

steps:
  - id: prepare
    pipeline: email/prepare
    out: prepared

  - id: act
    pipeline: email/send-email
    in: prepared
    out: result
