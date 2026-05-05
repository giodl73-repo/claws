# apple-reminders-flow.lobster — workflow shipped by the apple-reminders plugin

name: apple-reminders-apple-reminders-flow
description: productivity workflow

steps:
  - id: prepare
    pipeline: apple-reminders/prepare
    out: prepared

  - id: act
    pipeline: apple-reminders/create-reminder
    in: prepared
    out: result
