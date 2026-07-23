# How do I get governance events into our SIEM?

<!-- atom:siem-export (C76) -->

Every governance decision claws makes -- every pinch pass, every pinch fail,
every OBO approval, every kill switch activation -- is recorded in the audit
chain. `claws audit export` gets those events into your SIEM in the format
your SIEM expects.

## Three formats

```
$ claws audit export --format cef > /var/log/siem/claws.log

  Exported 1,247 events in CEF format
```

```
$ claws audit export --format json > /var/log/siem/claws.json

  Exported 1,247 events in JSON format
```

```
$ claws audit export --format syslog | logger -t claws

  Exported 1,247 events in syslog format
```

| Format | Use case                                | SIEM                         |
| ------ | --------------------------------------- | ---------------------------- |
| CEF    | Common Event Format, industry standard  | Splunk, ArcSight, QRadar     |
| JSON   | Structured ingestion, custom dashboards | Sentinel, Datadog, Elastic   |
| syslog | RFC 5424, traditional log collectors    | Any syslog-capable collector |

## What events are exported

Every event in `.claws/audit/chain.jsonl` is exportable. The main event types:

| Event            | Severity     | Meaning                                        |
| ---------------- | ------------ | ---------------------------------------------- |
| `PINCH_PASS`     | INFO         | Governance check passed                        |
| `PINCH_FAIL`     | WARNING/HIGH | Governance violation detected                  |
| `OBO_APPROVED`   | INFO         | Human approved an OBO action                   |
| `OBO_DENIED`     | WARNING      | Human denied (or timeout denied) an OBO action |
| `OBO_TIMEOUT`    | WARNING      | Deny-default triggered on approval timeout     |
| `BUILD_COMPLETE` | INFO         | Compilation + emit finished                    |
| `KILL_ACTIVATED` | CRITICAL     | Kill switch engaged                            |
| `KILL_FLEET`     | CRITICAL     | Fleet-wide kill switch engaged                 |
| `DRIFT_DETECTED` | WARNING      | Workspace diverged from fleet policy           |
| `CHAIN_BREAK`    | CRITICAL     | Audit chain integrity violation                |
| `KEY_ROTATED`    | INFO         | Cryptographic key rotated                      |
| `SNAP_RESTORED`  | WARNING      | Snapshot restore (rollback)                    |

Each event includes: timestamp (ISO 8601), workspace ID, agent name, rule ID,
severity, outcome, and the hash chain link. CEF and syslog map severity to
their native levels. JSON preserves the full event structure.

## Splunk integration

```bash
# File monitor input (inputs.conf)
[monitor:///var/log/siem/claws.log]
sourcetype = claws:cef
index = security
```

Export on a schedule:

```bash
# crontab: export every 5 minutes
*/5 * * * * claws audit export --format cef --since 5m >> /var/log/siem/claws.log
```

The `--since` flag exports only events from the last N minutes, avoiding
duplicate ingestion.

## Microsoft Sentinel integration

```bash
# Export JSON to a watched directory
claws audit export --format json > /var/log/claws/events.json

# Or pipe to the Azure Monitor agent
claws audit export --format json | az monitor custom-log upload \
  --rule-id "claws-governance" --stream "Custom-ClawsEvents"
```

## Datadog integration

```bash
# Pipe JSON to the Datadog agent log file
claws audit export --format json >> /var/log/datadog/claws.json
```

Configure the Datadog agent to tail the file with source `claws` and
service `agent-governance`.

## Continuous export via sidecar

For production deployments, the L5 sidecar can stream events to your SIEM
in real time rather than batch export. The sidecar tails `chain.jsonl` and
forwards each new event as it is appended. No cron, no `--since`, no gaps.

```yaml
# .claws/config/sidecar.yaml
siem:
  enabled: true
  format: cef
  target: /var/log/siem/claws.log
  realtime: true
```

The sidecar handles format conversion, buffering, and retry. If the SIEM
endpoint is unavailable, events queue locally until it recovers. No events
are lost.

## Verifying the chain before export

Always verify chain integrity before exporting for compliance purposes:

```
$ claws audit verify && claws audit export --format cef > evidence.log

  Chain verified: 1,247 events, no breaks.
  Exported 1,247 events in CEF format
```

A broken chain means tampering or corruption. `claws audit verify` catches
it before the events reach your SIEM, so you can investigate rather than
export compromised data.

## Scenario-Driven Additions

### From compliance-evidence scenarios (48 findings applied)

- CEF field mapping defined for all governance event types with explicit severity mapping to the CEF 0-10 scale
- Syslog message size handling: messages exceeding RFC 5424 limits are split with correlation IDs rather than silently truncated
- Consistent PII redaction across all export formats: user-facing fields redacted, audit chain fields preserved, SIEM fields event-only
- Streaming export for large audit chains prevents memory exhaustion; batch and sidecar export modes maintain consistency
- SARIF mapping evaluated for runtime events (retained for compile-time diagnostics, deferred for runtime events pending schema fit)
- Evidence format version pinning ensures cross-version reproducibility of exported events
