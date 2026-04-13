# Heartbeat

## On Start

- Verify credentials cache
- Run security scan

## Every 10 Minutes

- Execute deploy-check workflow
- Flush audit logs

## On Idle

- Run prod-deploy health check
