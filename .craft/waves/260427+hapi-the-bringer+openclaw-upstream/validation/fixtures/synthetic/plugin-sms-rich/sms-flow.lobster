# sms-flow.lobster — workflow shipped by the sms plugin

name: sms-sms-flow
description: communication workflow

steps:
  - id: prepare
    pipeline: sms/prepare
    out: prepared

  - id: act
    pipeline: sms/send-sms
    in: prepared
    out: result
