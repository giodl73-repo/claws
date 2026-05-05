name: bad-flow
steps:
  - id: step1
    command: echo hello
    pipeline: llm.invoke
    out: result
