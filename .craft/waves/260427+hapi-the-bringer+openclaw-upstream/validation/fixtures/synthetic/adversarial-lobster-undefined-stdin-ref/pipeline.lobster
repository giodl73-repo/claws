name: bad-flow
steps:
  - id: step1
    command: cat
    in: nonexistent-step.stdout
    out: result
