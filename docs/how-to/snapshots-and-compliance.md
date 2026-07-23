# Manage Snapshots and Compliance Artifacts

Use claws snap for workspace snapshots, check for governance enforcement, and generate compliance evidence.

## Take a Snapshot

Capture the current governance state:

```bash
claws snap --name "pre-upgrade"
```

Snapshots save:

- claws.json configuration
- All .claws/ policies and rules
- Compiled governance artifacts
- Audit chain state

## Restore from Snapshot

Roll back to a named snapshot:

```bash
claws snap list
claws snap restore pre-upgrade
```

Restore verifies the snapshot integrity hash before applying.

## Run Governance Checks

Use `claws check` to enforce policies:

```bash
claws check                          # All checks
claws check --policy soc2-baseline   # Specific policy
claws check --typed                  # Verify typed parameters
claws check --skill deploy-review    # Single skill
```

Check output:

```
claws check
  [PASS] Tool classification: all tools classified
  [PASS] OBO boundary: FOR-user mode enforced
  [PASS] Fail modes: R5 fail-closed confirmed
  [FAIL] Audit chain: 2 unsigned entries found

  1 violation (error), 0 warnings
```

## Generate Compliance Artifacts

Produce evidence packages for regulatory frameworks:

```bash
claws comply --framework soc2 --out compliance/soc2/
claws comply --framework hipaa --out compliance/hipaa/
claws comply --framework eu-ai-act --out compliance/eu-ai-act/
```

SOC2 Type II evidence includes:

- Temporal evidence snapshots (before/after state)
- Control mapping (governance rules to SOC2 controls)
- Audit chain excerpts with HMAC verification

HIPAA evidence includes:

- PHI safeguard documentation
- Access control matrices (permission tiers to data classification)
- Retention policy compliance proof

## Clean Removal

Remove claws governance from a workspace without affecting original files:

```bash
claws uninstall
```

This removes:

- `.claws/` directory and all policies
- `claws.json` configuration
- Generated governance skills and plugins
- Audit logs

Original workspace files (SOUL.md, AGENTS.md, etc.) are not touched. Backups from init remain in `~/.claws-backups/`.

Verify clean removal:

```bash
claws uninstall --verify
# Confirms no claws artifacts remain
```
