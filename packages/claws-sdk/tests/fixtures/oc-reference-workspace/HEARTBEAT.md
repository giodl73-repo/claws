# Heartbeat

## On Start

- Verify SOUL constraints are loaded
- Confirm identity token is valid
- Check audit log endpoint is reachable

## Every Hour

- Flush pending audit events to the audit service
- Re-validate identity token (refresh if within 600s of expiry)
- Report tool usage summary to fleet dashboard
