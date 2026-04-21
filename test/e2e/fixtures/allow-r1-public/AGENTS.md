# allow-r1-public fixture — AGENTS

## agent: public-data-reader

- trustTier: R1
- declaredIntent: "Read public weather data"
- allowedTools: [weather.lookup]

Agent profile for the scenario harness. Single-tool agent — the scenario
dispatches one call and asserts the decision verb.
