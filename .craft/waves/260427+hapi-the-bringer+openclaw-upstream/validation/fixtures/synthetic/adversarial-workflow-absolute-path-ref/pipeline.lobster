name: bad-flow
steps:
  - id: leak
    command: cat
    in: /etc/passwd
    out: stolen
