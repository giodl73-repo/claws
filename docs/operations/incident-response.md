# What happens after I pull the kill switch?

<!-- atom:incident-response (C87) -->

> **Status: Design** -- this guide describes planned functionality.
> Implementation has not started. See `design/claws/CLAUDE.md` for current status.

Something went wrong. An agent exfiltrated data, sent unauthorized messages,
or behaved in a way that triggered your incident response process. You pulled
the kill switch. Now what?

The full cycle: detect, kill, export, analyze, remediate, resume.

## 1. Kill

You already did this, or you're about to:

```
$ claws kill agent-research --reason "data exfiltration detected, IR-2026-0411"

  Killed: agent-research
  All tool calls blocked. Audit event logged.
  Reason: data exfiltration detected, IR-2026-0411
```

For a fleet-wide incident:

```
$ claws kill --fleet --confirm --reason "active incident IR-2026-0411"

  Killed: 47 agents across fleet
  All tool calls blocked. Audit events logged.
  Reason: active incident IR-2026-0411
```

`--confirm` is required for fleet kill. `--reason` is required for all kills.
The reason is recorded in the audit chain and exported to your SIEM. Every
killed agent immediately returns `{ block: true }` for all `before_tool_call`
hooks. No tool calls execute. No exceptions.

## 2. Forensic export

Export the audit chain for your incident response team:

```
$ claws audit export --format json > IR-2026-0411-audit.json

  Exported 1,247 events in JSON format
  Chain integrity: verified (no breaks)
```

The export includes every governance decision, every OBO approval/denial,
every tool call that was blocked or allowed, with timestamps and hash chain
links. This is your forensic record. It survives legal discovery because
every event is hash-chained and (if configured) counter-signed by an
external timestamp authority.

For SIEM ingestion during the incident:

```bash
claws audit export --format cef > /var/log/siem/IR-2026-0411.log
```

## 3. Blast radius analysis

Review what the compromised agent had access to and what it actually did:

```
$ claws audit history --agent agent-research --since 7d

  Events: 342 (last 7 days)
  Tools used: web-search (127), file-read (89), send-email (3)
  OBO actions: 3 (2 approved, 1 denied)
  Violations: 1 (G-CLASS, tool "send-email" at T2 workspace)

  Timeline:
    Apr 04 09:14  web-search (R1)          ALLOWED
    Apr 04 09:15  file-read (R2)           ALLOWED
    ...
    Apr 10 14:22  send-email (R5)          OBO APPROVED  ← investigate
    Apr 10 14:23  send-email (R5)          OBO APPROVED  ← investigate
    Apr 10 16:41  send-email (R5)          OBO DENIED    (timeout)
    Apr 11 08:00  KILL                     IR-2026-0411
```

The blast radius is everything between the first suspicious event and the
kill. The audit chain gives you exact timestamps, exact tool calls, and
exact approval decisions. No guessing.

## 4. Snapshot restore

If the agent corrupted workspace state (modified config, deleted policies,
tampered with governance artifacts), restore from the last known-good snapshot:

```
$ claws snap restore pre-upgrade

  Restored: .claws/ from snapshot "pre-upgrade" (Apr 01 09:00)
  Files restored: 14
  Audit chain: preserved (appended restore event)
```

The restore replaces `.claws/` contents but appends the restore event to the
audit chain -- the chain is never truncated. You can see both the incident
and the recovery in the same timeline.

## 5. Remediate

Fix the root cause. Typical post-incident actions:

```bash
# Tighten the workspace trust tier
# Edit claws.json: "trustTier": 2 → "trustTier": 1

# Rebuild with tighter governance
claws build

# Verify the fix
claws pinch --strict
```

If the incident was fleet-wide, push the remediated policy to all workspaces:

```
$ claws broadcast --confirm --reason "post-incident remediation IR-2026-0411"

  Pushed updated policies to 47 workspaces. 0 violations.
```

## 6. Resume

Once remediation is verified, resume the agent:

```
$ claws resume agent-research

  Resumed: agent-research
  Governance: active (23 rules, trust tier T1)
  Audit event logged.
```

For fleet-wide resume after fleet-wide kill:

```bash
claws resume --fleet --confirm --reason "remediation complete IR-2026-0411"
```

## The full cycle

```
detect → kill → export → analyze → restore → remediate → resume
  |        |       |         |         |          |          |
  SIEM    claws   claws    claws     claws      claws      claws
  alert   kill    audit    audit     snap       build +    resume
                  export   history   restore    broadcast
```

Every step is a claws command. Every step produces an audit event. The
entire incident response is recorded in the same hash chain as the incident
itself. Your auditor sees one continuous timeline from detection through
recovery.

## Fleet-wide verification after resume

After resuming, verify the entire fleet is clean:

```
$ claws pinch --fleet

  47 workspaces checked. 0 violations.
  All workspaces at policy version 2026-04-11-post-IR.
```

The incident is closed when pinch passes fleet-wide and the audit chain
shows an unbroken sequence from kill through resume.
