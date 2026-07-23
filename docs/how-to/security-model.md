# Configure the Security Model

Set up tool classification, OBO boundaries, elicitation gates, defense-in-depth, fail modes, bypass controls, and kill switches.

## Classify Tools (R1-R5)

Every tool in a workspace has a risk classification from R1 (lowest) to R5 (highest):

| Risk | Examples                    | Default fail mode         |
| ---- | --------------------------- | ------------------------- |
| R1   | Read, Glob, Grep            | Open                      |
| R2   | Edit, Write                 | Open                      |
| R3   | Bash (non-destructive)      | Warn                      |
| R4   | Bash (destructive), network | Closed                    |
| R5   | Admin, secrets access       | Closed (non-configurable) |

Configure tool classifications in `claws.json`:

```json
{
  "toolClassification": {
    "Read": "R1",
    "Bash": "R4",
    "custom-deploy": "R5"
  }
}
```

## Set OBO Boundaries

The On-Behalf-Of boundary distinguishes FOR-user (agent acting on behalf of user) from AS-user (agent acting as user):

```json
{
  "oboBoundary": {
    "mode": "for-user",
    "escalationRequired": ["R4", "R5"],
    "auditAll": true
  }
}
```

FOR-user mode ensures agents always operate within delegated authority. AS-user actions require explicit elicitation gates.

## Configure Elicitation Gates

Elicitation gates (G-ELICIT) prompt for human confirmation before sensitive operations:

```json
{
  "gates": {
    "G-ELICIT": {
      "triggers": ["R4-tool-call", "obo-as-user", "classification-confidential"],
      "timeout": 300,
      "fallback": "deny"
    }
  }
}
```

## Configure Fail Modes

Risk-based fail modes control what happens when governance checks fail:

```json
{
  "failModes": {
    "R1": "open",
    "R2": "open",
    "R3": "warn",
    "R4": "closed",
    "R5": "closed"
  }
}
```

R5 is always fail-closed. This is non-configurable -- the compiler refuses to emit R5 fail-open.

## Enable Defense-in-Depth

The 5-layer defense model provides overlapping protections:

1. **L1 Advisory** -- governance SKILL.md (prompt-level guidance)
2. **L2 Plugin** -- governance plugin (runtime blocking)
3. **L3 Host** -- GovernanceHost 6-facet interface
4. **L4 Injection** -- 16 injection defense rules
5. **L5 Audit** -- tamper-evident audit chain

Enable all layers:

```json
{
  "defense": {
    "advisory": true,
    "plugin": true,
    "hostEnforcement": true,
    "injectionDefense": true,
    "auditChain": true
  }
}
```

## Set Up Emergency Bypass

For emergencies, the bypass mechanism disables governance enforcement:

```bash
CLAWS_BYPASS=1 claws exec --skill emergency-fix
```

Bypass is audit-logged, time-limited (default 15 minutes), and requires explicit environment variable. It cannot be persisted in config files.

## Configure the Kill Switch

Three kill switch paths for out-of-band shutdown:

```json
{
  "killSwitch": {
    "file": ".claws/KILL",
    "api": "https://governance.example.com/kill",
    "signal": "SIGUSR2"
  }
}
```

Touch `.claws/KILL` or send the signal to immediately halt all agent execution. The kill switch is checked on every tool call -- latency is under 1ms.
